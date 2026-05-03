// server/controllers/chatController.js

import dotenv from "dotenv";
dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// ─────────────────────────────────────────────────────────────────────────────
// MODEL ROTATION — each model has its OWN separate rate limit bucket on Groq.
// Primary: best quality. Fallbacks used automatically on 429.
// llama-3.3-70b-versatile  → 30 RPM / 6K TPM / 14,400 RPD
// llama-3.1-8b-instant     → 30 RPM / 6K TPM / 14,400 RPD  (fastest, lightest)
// gemma2-9b-it             → 30 RPM / 15K TPM / 14,400 RPD  (highest TPM!)
// ─────────────────────────────────────────────────────────────────────────────
const MODELS = [
  "llama-3.3-70b-versatile",  // Primary — best quality
  "llama-3.1-8b-instant",     // Fallback 1 — fastest, separate quota
  "openai/gpt-oss-120b",             // Fallback 2 — highest TPM (15K), separate quota
];

// Call Groq with automatic model rotation on 429
const callGroq = async (messages, maxTokens = 700, temperature = 0.65) => {
  let lastError = null;
  for (const model of MODELS) {
    try {
      const res = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
      });

      if (res.status === 429) {
        console.warn(`⏳ Rate limit hit on ${model}, trying next model...`);
        lastError = `Rate limit on ${model}`;
        continue; // try next model
      }

      if (!res.ok) {
        const err = await res.json();
        if (res.status === 401) throw new Error("__AUTH__");
        throw new Error(err?.error?.message || `API error ${res.status}`);
      }

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content?.trim();
      if (!reply) throw new Error("Empty response");
      return { reply, model }; // success

    } catch (err) {
      if (err.message === "__AUTH__") throw new Error("Invalid Groq API key.");
      lastError = err.message;
      // If it's not a rate limit error, don't try next model
      if (!err.message.includes("rate") && !err.message.includes("429") && !err.message.includes("Rate limit")) {
        throw err;
      }
    }
  }
  // All models exhausted
  throw new Error("All models are rate limited. Please wait 60 seconds and try again.");
};

const CATEGORY_PROMPTS = {
  technical:     "Focus ONLY on technical questions: DSA, algorithms, data structures, coding problems, CS fundamentals, time/space complexity.",
  hr:            "Focus ONLY on HR and behavioral questions using the STAR method: teamwork, conflict resolution, leadership, strengths/weaknesses, career goals.",
  system_design: "Focus ONLY on system design: scalability, databases, APIs, microservices, caching, load balancing, architecture trade-offs.",
  domain:        "Focus ONLY on domain-specific and role-specific questions directly relevant to the job role and required skills.",
  mixed:         "Mix questions across: technical skills, behavioral/HR, system design, and role-specific topics. Rotate between them.",
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Is this the opening phase before Question 1 was asked?
// ─────────────────────────────────────────────────────────────────────────────
const isInReadyPhase = (history) => {
  return !history.some(
    h => h.role === "assistant" && /\*{0,2}Question\s+\d+\*{0,2}/i.test(h.content)
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Readiness check — STRICT exact match only, no fuzzy logic
// This prevents typos like "ues", "ok1", "yes i think" from being caught here
// ─────────────────────────────────────────────────────────────────────────────
const READY_PHRASES = new Set([
  "yes", "ok", "okay", "sure", "ready", "yep", "yup", "yeah", "alright",
  "let's go", "lets go", "start", "begin", "go", "go ahead",
  "i'm ready", "im ready", "let's start", "lets start",
  "sounds good", "absolutely", "of course",
]);

const isReadinessResponse = (message) => {
  const cleaned = message.trim().toLowerCase().replace(/[!.,?]/g, "");
  return READY_PHRASES.has(cleaned);
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Detect a genuinely empty/meaningless answer AFTER Q1 is asked.
// STRICT — only exact matches to known empty phrases.
// Typos like "ues", short answers like "i think x", "my name is y" pass through.
// ─────────────────────────────────────────────────────────────────────────────
const EMPTY_ANSWERS = new Set([
  "idk", "i don't know", "i dont know", "not sure", "no idea",
  "i have no idea", "pass", "skip", "don't know", "dunno",
  "no", "nope", "nothing", "none", "never mind", "nevermind",
  "hmm", "hm", "uh", "um", "...",
]);

const isEmptyAnswer = (message, history) => {
  if (isInReadyPhase(history)) return false; // never intercept in ready phase
  const cleaned = message.trim().toLowerCase().replace(/[!.,?]/g, "");
  return EMPTY_ANSWERS.has(cleaned);
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Count consecutive empty answers since the last real answer or new question.
// Walks backwards through history and stops at first non-empty user message.
// ─────────────────────────────────────────────────────────────────────────────
const countConsecutiveEmpties = (history) => {
  let count = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const h = history[i];
    if (h.role === "user") {
      const cleaned = h.content.trim().toLowerCase().replace(/[!.,?]/g, "");
      if (EMPTY_ANSWERS.has(cleaned)) {
        count++;
      } else {
        break; // hit a real answer — stop
      }
    }
  }
  return count;
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Get the current question number and text from the last AI message
// ─────────────────────────────────────────────────────────────────────────────
const getLastQuestion = (history) => {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role !== "assistant") continue;
    const content = history[i].content;
    const numMatch  = content.match(/\*{0,2}Question\s+(\d+)\*{0,2}/i);
    const textMatch = content.match(/\*{0,2}Question\s+\d+\*{0,2}[:\s*]*([^\n]+)/i);
    if (numMatch) {
      return {
        num:  parseInt(numMatch[1]),
        text: textMatch ? textMatch[1].replace(/\*+/g, "").trim() : "",
      };
    }
  }
  return { num: 1, text: "" };
};

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT
// ─────────────────────────────────────────────────────────────────────────────
const buildSystemPrompt = (setup, avgScore) => {
  const { name, company, role, experience, difficulty, category, resumeText } = setup || {};
  const categoryGuide = CATEGORY_PROMPTS[category] || CATEGORY_PROMPTS.mixed;

  const resumeSection = resumeText
    ? `\nCANDIDATE RESUME:\n"""\n${resumeText.slice(0, 2000)}\n"""\nTailor questions to their specific projects and experience listed above.\n`
    : "";

  let difficultyNote = "";
  if (avgScore != null) {
    if      (avgScore < 4)   difficultyNote = `\n⚠️ Avg score ${avgScore}/10 — ask foundational questions only, be encouraging.\n`;
    else if (avgScore < 6)   difficultyNote = `\n📊 Avg score ${avgScore}/10 — keep questions basic to medium.\n`;
    else if (avgScore >= 8.5) difficultyNote = `\n🔥 Avg score ${avgScore}/10 — increase depth, add edge cases.\n`;
  }

  return `You are a professional interviewer at ${company || "a top tech company"}.
Interviewing: ${name || "the candidate"} for ${role || "Software Engineer"}.
Experience: ${experience || "mid-level"} | Difficulty: ${difficulty || "medium"} | Category: ${category || "mixed"}
${resumeSection}${difficultyNote}
════════════════════════════════════════
CATEGORY: ${categoryGuide}
════════════════════════════════════════
RULES — FOLLOW EXACTLY:

1. ASK EXACTLY 8 QUESTIONS TOTAL. After the 8th answer → Final Report immediately.
   Track question numbers carefully. Never ask Question 9 or beyond.

2. AFTER EVERY REAL ANSWER — respond in EXACTLY this format (no deviations):
   ✅ Strength: [what they said that was correct or good]
   ❌ Gap: [what was missing or wrong — be specific to their answer]
   💡 Tip: [one concrete improvement they can make]
   📊 Answer Score: X/10
   **Question [N+1]:** [next question — relevant to ${role || "the role"}]

3. QUESTION FORMAT: Always **Question [N]:** [text] — bold, numbered, on its own line.

4. ONE question per message. Never bundle two questions together.

5. DIFFICULTY CALIBRATION:
   Easy   → definitions, what-is questions, simple examples
   Medium → applied knowledge, why/how, trade-offs
   Hard   → design decisions, optimization, edge cases

6. FINAL REPORT after Question 8 answer:
   ════════════════════════
   📊 INTERVIEW COMPLETE — Final Report
   ════════════════════════
   Technical Skills:    X/10
   Communication:       X/10
   Problem Solving:     X/10
   Overall Score:       X/10
   ────────────────────────
   🏅 Top Strength: [from the actual interview]
   ⚠️  Key Weakness: [from the actual interview]
   ✅ Hiring Recommendation: [Strong Yes / Yes / Maybe / No]
   ════════════════════════

Always evaluate what the candidate ACTUALLY SAID. Never give generic feedback.`;
};

// ─────────────────────────────────────────────────────────────────────────────
// HINT PROMPT
// ─────────────────────────────────────────────────────────────────────────────
const buildHintPrompt = (setup) => `You are a helpful interview coach at ${setup?.company || "a company"} for a ${setup?.role || "Software Engineer"} role.
Give a nudge only — point in the right direction, do NOT reveal the full answer.
Keep it 2-3 sentences. End with "Now give it another try!"
Format: 💡 Hint: [nudge]`;

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────────────────────
export const handleChat = async (req, res) => {
  try {
    const { message, setup, history = [], avgScore } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required." });

    // ── 1. Hint request ────────────────────────────────────────
    if (message.startsWith("__hint__")) {
      const lastAI = [...history].reverse().find(h => h.role === "assistant")?.content || "";
      try {
        const { reply: hint } = await callGroq([
          { role: "system", content: buildHintPrompt(setup) },
          { role: "user",   content: `Current question: "${lastAI}". Give a hint without revealing the answer.` },
        ], 150, 0.5);
        return res.status(200).json({ reply: hint, isHint: true });
      } catch {
        return res.status(200).json({
          reply: "💡 Hint: Think about the core concept and break it into smaller steps. Now give it another try!",
          isHint: true,
        });
      }
    }

    // ── 2. Readiness — ONLY before Question 1 ─────────────────
    if (isReadinessResponse(message) && isInReadyPhase(history)) {
      const name = setup?.name ? `, ${setup.name}` : "";
      return res.status(200).json({
        reply: `Great${name}! Let's begin.\n\n**Question 1:** Tell me about yourself and why you're interested in the ${setup?.role || "role"} at ${setup?.company || "this company"}.`,
      });
    }

    // ── 3. Empty/meaningless answer — strict handling ──────────
    // Only triggers for exact known-empty phrases (idk, pass, hmm, etc.)
    // Typos, short-but-real answers, and anything else go straight to the AI
    if (isEmptyAnswer(message, history)) {
      const empties = countConsecutiveEmpties([...history, { role: "user", content: message }]);
      const { num: qNum, text: qText } = getLastQuestion(history);
      const questionText = qText || `Tell me about yourself and why you're interested in the ${setup?.role || "role"} at ${setup?.company || "this company"}.`;

      if (empties === 1) {
        return res.status(200).json({
          reply: `⚠️ That's not a complete answer. In a real interview you need to elaborate with specific details, examples, or your reasoning.\n\n**Question ${qNum}:** ${questionText}`,
        });
      }

      if (empties >= 2) {
        const nextQNum = qNum + 1;
        try {
          const { reply: skipReply } = await callGroq([
            { role: "system", content: buildSystemPrompt(setup, avgScore) },
            ...history,
            {
              role: "user",
              content: `[SYSTEM NOTE: Candidate did not answer Question ${qNum} after two attempts. Output ONLY: "📊 Answer Score: 0/10 — No answer provided." then ask **Question ${nextQNum}:** with a new relevant question for a ${setup?.role || "Software Engineer"} at ${setup?.company || "this company"}. Do NOT repeat Question ${qNum}.]`,
            },
          ], 250, 0.4);
          return res.status(200).json({ reply: skipReply });
        } catch (err) {
          return res.status(429).json({ error: err.message });
        }
      }
    }

    // ── 4. Normal AI turn ──────────────────────────────────────
    try {
      const { reply } = await callGroq([
        { role: "system", content: buildSystemPrompt(setup, avgScore) },
        ...history,
        { role: "user", content: message },
      ], 700, 0.65);
      return res.status(200).json({ reply });
    } catch (err) {
      if (err.message.includes("rate") || err.message.includes("All models")) {
        return res.status(429).json({ error: err.message });
      }
      throw err;
    }

  } catch (error) {
    console.error("Server Error:", error.message);
    return res.status(500).json({ error: "Server error: " + error.message });
  }
};