// client/src/components/ChatBox.jsx — Fixed version
// Bugs fixed:
// 1. AI asking multiple questions without waiting for answers
// 2. Report scores not matching AI final report (now parsed directly from AI text)
// 3. Feedback badges (✅ Strength / ❌ Gap / 💡 Tip) shown on every AI message
// 4. Interview end triggers too early — now strictly requires INTERVIEW COMPLETE + Hiring Recommendation
// 5. Confidence meter updates dynamically on every scored answer
// 6. View Report button guarded — only works after interview is done
// 7. Strengths & Improvements parsed and passed to report correctly

import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { sendMessage } from "../services/api";

// ─── Feedback Badge Renderer ──────────────────────────────────────────────────
// Parses AI message text and renders ✅ Strength / ❌ Gap / 💡 Tip / ❓ Question blocks

const BADGE_PATTERNS = [
  { regex: /^(✅\s*Strength[:\s]*|Strength[:\s]+)/i,                   type:"strength",  icon:"✅", label:"Strength",      border:"#22c55e", bg:"rgba(34,197,94,0.08)",   color:"#4ade80" },
  { regex: /^(❌\s*Gap[:\s]*|Gap[:\s]+)/i,                             type:"gap",       icon:"❌", label:"Gap",            border:"#ef4444", bg:"rgba(239,68,68,0.08)",   color:"#f87171" },
  { regex: /^(💡\s*(?:Tip|Hint)[:\s]*|Tip[:\s]+|Hint[:\s]+)/i,        type:"tip",       icon:"💡", label:"Tip",            border:"#f59e0b", bg:"rgba(245,158,11,0.08)",  color:"#fbbf24" },
  { regex: /^(⚠️\s*(?:Please|Warning|Note)[^]*)$/i,                    type:"warning",   icon:"⚠️", label:"Incomplete",     border:"#f97316", bg:"rgba(249,115,22,0.08)",  color:"#fb923c" },
  { regex: /^(Feedback[:\s]+)/i,                                        type:"feedback",  icon:"📝", label:"Feedback",       border:"#a78bfa", bg:"rgba(167,139,250,0.08)", color:"#c4b5fd" },
  { regex: /^(Score[:\s]+|Answer Score[:\s]+|Rating[:\s]+)/i,          type:"score",     icon:"⭐", label:"Score",          border:"#fb923c", bg:"rgba(251,146,60,0.08)",  color:"#fdba74" },
  { regex: /^(Next\s*Question[:\s*#\d]*|Question\s*\d+\s*:)/i,         type:"question",  icon:"❓", label:"Next Question",  border:"#38bdf8", bg:"rgba(56,189,248,0.08)",  color:"#7dd3fc" },
];

const parseAndRenderAI = (rawText) => {
  // ── Strip <think>...</think> tags (frontend safety net) ──
  let text = rawText
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "")
    .replace(/<think>[\s\S]*/gi, "")   // unclosed tag
    .trim();

  const lines = text.split("\n");
  const blocks = [];
  let current = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (current) { blocks.push(current); current = null; }
      continue;
    }
    let matched = false;
    for (const p of BADGE_PATTERNS) {
      if (p.regex.test(trimmed)) {
        if (current) blocks.push(current);
        const content = trimmed.replace(p.regex, "").replace(/^[:\-–\s]+/, "").trim();
        current = { ...p, lines: content ? [content] : [] };
        matched = true;
        break;
      }
    }
    if (!matched) {
      if (current) current.lines.push(trimmed);
      else current = { type:"text", lines:[trimmed] };
    }
  }
  if (current) blocks.push(current);

  return blocks.map((block, i) => {
    const content = block.lines.join(" ").trim();
    if (block.type === "text") {
      return (
        <p key={i} style={{ margin:"4px 0", lineHeight:1.75, color:"#c8d8e8", fontSize:14 }}>
          {boldify(content)}
        </p>
      );
    }
    if (!content) return null;
    return (
      <div key={i} style={{
        margin:"7px 0",
        padding:"9px 14px",
        borderLeft:`3px solid ${block.border}`,
        background:block.bg,
        borderRadius:"0 8px 8px 0",
      }}>
        <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom: content ? 4 : 0 }}>
          <span style={{ fontSize:13 }}>{block.icon}</span>
          <span style={{ fontSize:10, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:block.color, fontFamily:"'DM Mono',monospace" }}>
            {block.label}
          </span>
        </div>
        {content && (
          <p style={{ margin:0, fontSize:14, lineHeight:1.65, color:"#e2e8f0" }}>
            {boldify(content)}
          </p>
        )}
      </div>
    );
  });
};

// Bold **text** renderer
const boldify = (text) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i} style={{ color:"#c3d9f0" }}>{p.slice(2,-2)}</strong>
      : <span key={i}>{p}</span>
  );
};

// ─── Parse Final Report from AI text ─────────────────────────────────────────
// Reads the AI's INTERVIEW COMPLETE message and extracts real scores + strengths/improvements

const parseFinalReport = (text) => {
  const getScore = (label) => {
    const m = text.match(new RegExp(`${label}[:\\s]+([\\d.]+)\\s*/\\s*10`, "i"));
    return m ? parseFloat(m[1]) : null;
  };

  const technical  = getScore("Technical Skills")  || getScore("Technical");
  const comm       = getScore("Communication");
  const problem    = getScore("Problem Solving")    || getScore("Problem-Solving");
  const overall    = getScore("Overall Score")      || getScore("Overall");

  // Extract strengths — lines after "Top Strength" or "Strength:"
  const strengthMatch = text.match(/(?:Top\s+)?Strength[s]?[:\s]+([^\n❌⚠️✅]+)/i);
  const weaknessMatch = text.match(/(?:Key\s+)?Weakness(?:es)?[:\s]+([^\n✅❌]+)/i);

  const strengths    = strengthMatch ? [strengthMatch[1].trim()] : [];
  const improvements = weaknessMatch ? [weaknessMatch[1].trim()] : [];

  return {
    technicalSkills: technical  ?? overall ?? 5,
    communication:   comm       ?? overall ?? 5,
    problemSolving:  problem    ?? overall ?? 5,
    overallScore:    overall    ?? 5,
    strengths,
    improvements,
  };
};

// ─── Main ChatBox Component ───────────────────────────────────────────────────

const ChatBox = ({ setup }) => {
  const navigate = useNavigate();

  const [messages, setMessages]               = useState([{
    role: "assistant",
    text: `Hello ${setup?.name || ""}! 👋 I'm your AI interviewer today.\n\nYou're preparing for a **${setup?.role || "position"}** role at **${setup?.company || "your target company"}**.\n\nDifficulty: **${setup?.difficulty || "Medium"}** · Category: **${setup?.category || "Mixed"}**${setup?.resumeText ? "\n\n📄 I've reviewed your resume and will ask personalized questions." : ""}\n\nLet's begin. Are you ready?`,
    timestamp: Date.now(),
  }]);

  const [input, setInput]                     = useState("");
  const [loading, setLoading]                 = useState(false);
  const [isListening, setIsListening]         = useState(false);
  const [isSpeaking, setIsSpeaking]           = useState(false);
  const [questionCount, setQuestionCount]     = useState(0);
  const [confidence, setConfidence]           = useState(50);
  const [xp, setXp]                           = useState(0);
  const [sessionTime, setSessionTime]         = useState(0);
  const [questionTime, setQuestionTime]       = useState(0);
  const [isTimerRunning, setIsTimerRunning]   = useState(false);
  const [streak, setStreak]                   = useState(0);
  const [interviewDone, setInterviewDone]     = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [badges, setBadges]                   = useState([]);
  const [showBadge, setShowBadge]             = useState(null);
  const [scoreHistory, setScoreHistory]       = useState([]);
  const [showReport, setShowReport]           = useState(false);
  const [finalReportData, setFinalReportData] = useState(null); // ← stores parsed AI final report

  const audioMode        = setup?.audioMode || false;
  const bottomRef        = useRef(null);
  const inputRef         = useRef(null);
  const recogRef         = useRef(null);
  const synthRef         = useRef(window.speechSynthesis);
  // Seed history with the opening greeting — prevents duplicate Question 1
  // The server checks history to decide if it's still in "ready phase"
  const historyRef       = useRef([{
    role: "assistant",
    content: `Hello ${setup?.name || ""}! I'm your AI interviewer today. You're preparing for a ${setup?.role || "position"} role at ${setup?.company || "your target company"}. Difficulty: ${setup?.difficulty || "Medium"} · Category: ${setup?.category || "Mixed"}. Let's begin. Are you ready?`,
  }]);
  const sessionTimerRef  = useRef(null);
  const questionTimerRef = useRef(null);
  // Track highest question number seen — prevents re-counting re-asked questions
  const maxQRef          = useRef(0);

  // ── Timers ──────────────────────────────────────────────────────
  useEffect(() => {
    sessionTimerRef.current = setInterval(() => setSessionTime(t => t + 1), 1000);
    return () => clearInterval(sessionTimerRef.current);
  }, []);

  useEffect(() => {
    if (showReport) {
      clearInterval(sessionTimerRef.current);
      clearInterval(questionTimerRef.current);
      setIsTimerRunning(false);
    }
  }, [showReport]);

  useEffect(() => {
    if (isTimerRunning) {
      questionTimerRef.current = setInterval(() => setQuestionTime(t => t + 1), 1000);
    } else {
      clearInterval(questionTimerRef.current);
    }
    return () => clearInterval(questionTimerRef.current);
  }, [isTimerRunning]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, loading]);
  useEffect(() => {
    if (audioMode) setTimeout(() => speak(messages[0]?.text || ""), 700);
    else inputRef.current?.focus();
  }, []);

  // ── Helpers ─────────────────────────────────────────────────────
  const fmtTime = (s) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  // Extract per-answer score from AI feedback (not the final report)
  const extractAnswerScore = (text) => {
    // Only match simple per-answer scores — avoid matching final report multi-scores
    // Require "Answer Score" or "Score:" prefix for safety
    const m = text.match(/(?:Answer\s+Score|Score)[:\s]+(\d+)\s*\/\s*10/i);
    const val = m ? parseInt(m[1]) : null;
    return (val !== null && val >= 0 && val <= 10) ? val : null;
  };

  const awardBadge = (badge) => {
    setBadges(prev => {
      if (prev.find(b => b.id === badge.id)) return prev;
      setShowBadge(badge);
      setTimeout(() => setShowBadge(null), 3000);
      return [...prev, badge];
    });
  };

  const updateConfidence = (score) => {
    if (score === null) return;
    setConfidence(prev => {
      if (score >= 8) return Math.min(100, prev + 10);
      if (score >= 6) return Math.min(100, prev + 5);
      if (score >= 4) return Math.max(20, prev - 3);
      return Math.max(10, prev - 8);
    });
    setScoreHistory(prev => [...prev, score]);
    setXp(prev => prev + score * 10);

    if (score >= 9) awardBadge({ id:"perfect", icon:"💎", label:"Perfect Answer!", color:"#38bdf8" });
    if (score >= 7) {
      setStreak(s => {
        const ns = s + 1;
        if (ns >= 3) awardBadge({ id:"streak3", icon:"🔥", label:"3x Streak!", color:"#f97316" });
        if (ns >= 5) awardBadge({ id:"streak5", icon:"⚡", label:"5x Streak!", color:"#eab308" });
        return ns;
      });
    } else if (score < 5) {
      setStreak(0);
    }
  };

  // ── TTS ─────────────────────────────────────────────────────────
  const speak = (text) => {
    if (!audioMode) return;
    synthRef.current.cancel();
    const clean = text.replace(/\*\*/g,"").replace(/[✅❌💡📊⚠️🏅❓📝⭐]/g,"").replace(/={3,}/g,"");
    const u = new SpeechSynthesisUtterance(clean);
    u.rate=0.92; u.pitch=1; u.volume=1;
    const voices = synthRef.current.getVoices();
    const v = voices.find(v=>v.lang.startsWith("en")&&v.name.includes("Google"))
           || voices.find(v=>v.lang.startsWith("en")) || voices[0];
    if (v) u.voice = v;
    u.onstart = () => setIsSpeaking(true);
    u.onend   = () => { setIsSpeaking(false); if (audioMode) startListening(); };
    synthRef.current.speak(u);
  };

  // ── STT ─────────────────────────────────────────────────────────
  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Use Chrome or Edge for voice input."); return; }
    const r = new SR();
    r.lang="en-US"; r.interimResults=false;
    r.onstart  = () => setIsListening(true);
    r.onend    = () => setIsListening(false);
    r.onerror  = () => setIsListening(false);
    r.onresult = (e) => { const t=e.results[0][0].transcript; setInput(t); setTimeout(()=>handleSend(t),300); };
    recogRef.current = r; r.start();
  };
  const stopListening = () => { recogRef.current?.stop(); setIsListening(false); };

  // ── Send ─────────────────────────────────────────────────────────
  const handleSend = async (override) => {
    const text = (override || input).trim();
    if (!text || loading) return;
    synthRef.current.cancel(); stopListening();

    setMessages(p => [...p, { role:"user", text, timestamp: Date.now() }]);
    setInput(""); setLoading(true);
    setIsTimerRunning(false); setQuestionTime(0);
    historyRef.current = [...historyRef.current, { role:"user", content:text }];

    try {
      const { reply: aiText = "Could you elaborate?" } = await sendMessage(text, setup, historyRef.current.slice(-14), avgScore);

      setMessages(p => [...p, { role:"assistant", text:aiText, timestamp: Date.now() }]);
      historyRef.current = [...historyRef.current, { role:"assistant", content:aiText }];

      // ── BUG FIX 1: Only parse per-answer score from non-final messages ──
      // Detect final report FIRST so we don't misread its scores as answer scores
      const isFinalReport = (
        (aiText.includes("INTERVIEW COMPLETE") || aiText.includes("Final Report") || aiText.includes("INTERVIEW REPORT"))
        && aiText.includes("Hiring Recommendation")
        && aiText.includes("Overall Score")
      );

      if (isFinalReport) {
        // ── BUG FIX 2: Parse real scores directly from AI final report text ──
        const parsed = parseFinalReport(aiText);
        parsed.totalQuestions = maxQRef.current;
        parsed.duration       = fmtTime(sessionTime);
        setFinalReportData(parsed);

        setIsTimerRunning(false);
        setInterviewDone(true);
        clearInterval(sessionTimerRef.current);
        clearInterval(questionTimerRef.current);
        awardBadge({ id:"complete", icon:"🏆", label:"Interview Complete!", color:"#f59e0b" });
        // Auto-show report after 2.5s so user can read the final message
        setTimeout(() => setShowReport(true), 2500);

      } else {
        // ── Update confidence on every scored answer ──
        const hasFeedback = aiText.includes("✅") || aiText.includes("Strength:") || aiText.includes("Feedback:") || aiText.includes("Answer Score");
        if (maxQRef.current >= 1 && hasFeedback) {
          const score = extractAnswerScore(aiText);
          updateConfidence(score);
        }

        // ── Count questions — only increment for NEW higher question numbers ──
        const qMatch = aiText.match(/Question\s+(\d+)\s*:/i);
        const qNum   = qMatch ? parseInt(qMatch[1]) : null;
        if (qNum !== null && qNum > maxQRef.current) {
          maxQRef.current = qNum;
          setQuestionCount(qNum);
          setIsTimerRunning(true);
          setQuestionTime(0);
          if (!interviewStarted) setInterviewStarted(true);
          if (qNum === 1) awardBadge({ id:"first", icon:"🎯", label:"First Question!", color:"#22c55e" });
          if (qNum === 5) awardBadge({ id:"halfway", icon:"🏃", label:"Halfway There!",  color:"#8b5cf6" });
        }
      }

      speak(aiText);
    } catch(err) {
      console.error("Chat error:", err);
      const rawMsg = err?.message || err?.response?.data?.error || "Connection error.";
      const errMsg = rawMsg.includes("rate_limit") || rawMsg.includes("Rate limit")
        ? "⏳ API rate limit reached. Please wait 1-2 minutes before trying again."
        : rawMsg.includes("connect") || rawMsg.includes("network")
        ? "🔌 Cannot connect to server. Make sure backend is running on port 5000."
        : rawMsg;
      setIsTimerRunning(false);
      clearInterval(questionTimerRef.current);
      setMessages(p => [...p, { role:"assistant", text:"⚠️ " + errMsg, isError:true, timestamp: Date.now() }]);
    } finally {
      setLoading(false);
      if (!audioMode) setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e) => { if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleSend();} };

  const avgScore   = scoreHistory.length
    ? Math.round((scoreHistory.reduce((a,b)=>a+b,0)/scoreHistory.length)*10)/10
    : null;
  const confColor  = confidence >= 75 ? "#22c55e" : confidence >= 50 ? "#f59e0b" : "#ef4444";
  const diffCol    = { Hard:"#ef4444", Medium:"#f59e0b", Easy:"#22c55e" }[setup?.difficulty] || "#63b3ed";

  // ── Report screen ─────────────────────────────────────────────────
  if (showReport) {
    // Use AI-parsed final report if available, otherwise fall back to calculated scores
    const rep = finalReportData || {
      technicalSkills: avgScore ?? 5,
      communication:   avgScore ? Math.round(avgScore * 0.9) : 5,
      problemSolving:  avgScore ? Math.round(avgScore * 1.05) : 5,
      overallScore:    avgScore ?? 5,
      strengths:       [],
      improvements:    [],
      totalQuestions:  maxQRef.current,
      duration:        fmtTime(sessionTime),
    };

    const avg     = rep.overallScore;
    const verdict = avg >= 7.5 ? { text:"✅ Strong Hire",            color:"#22c55e", bg:"rgba(34,197,94,.08)",   border:"rgba(34,197,94,.25)"  }
                  : avg >= 5   ? { text:"⚠️ Maybe — Keep Practicing", color:"#f59e0b", bg:"rgba(245,158,11,.08)", border:"rgba(245,158,11,.25)" }
                               : { text:"❌ Not Ready Yet",            color:"#ef4444", bg:"rgba(239,68,68,.08)",  border:"rgba(239,68,68,.25)"  };

    const bars = [
      ["Technical Skills", rep.technicalSkills],
      ["Communication",    rep.communication],
      ["Problem Solving",  rep.problemSolving],
      ["Overall Score",    rep.overallScore],
    ];

    const barColor = (s) => s >= 7.5 ? "#22c55e" : s >= 5 ? "#f59e0b" : "#ef4444";

    return (
      <div style={{ minHeight:"100vh", background:"#070b14", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Sora',sans-serif", padding:24 }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
          @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        `}</style>
        <div style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(99,179,237,.2)", borderRadius:24, padding:"48px 40px", maxWidth:520, width:"100%", animation:"fadeUp .5s ease" }}>

          {/* Header */}
          <div style={{ textAlign:"center", marginBottom:32 }}>
            <div style={{ fontSize:52, marginBottom:12 }}>{avg>=8?"🏆":avg>=6?"🎖️":"📈"}</div>
            <h2 style={{ fontSize:26, fontWeight:800, color:"#e8edf5", margin:"0 0 6px" }}>Interview Complete!</h2>
            <p style={{ fontSize:14, color:"#6b7f99", margin:0 }}>{setup?.role} @ {setup?.company}</p>
          </div>

          {/* Score bars */}
          {bars.map(([label, score]) => (
            <div key={label} style={{ marginBottom:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <span style={{ fontSize:13, color:"#8899b4", fontFamily:"'DM Mono',monospace" }}>{label}</span>
                <span style={{ fontSize:13, fontWeight:700, color: barColor(score), fontFamily:"'DM Mono',monospace" }}>{score}/10</span>
              </div>
              <div style={{ height:8, background:"rgba(255,255,255,.06)", borderRadius:99, overflow:"hidden" }}>
                <div style={{ height:"100%", borderRadius:99, background:`linear-gradient(90deg,${barColor(score)}88,${barColor(score)})`, width:`${score*10}%`, transition:"width 1s ease", boxShadow:`0 0 8px ${barColor(score)}55` }}/>
              </div>
            </div>
          ))}

          {/* Stats row */}
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:28, marginBottom:20 }}>
            {[["❓",rep.totalQuestions,"QUESTIONS","#38bdf8"],["🔥",xp,"XP EARNED","#f59e0b"],["⏱️",rep.duration,"DURATION","#22c55e"]].map(([icon,val,label,color])=>(
              <div key={label} style={{ textAlign:"center" }}>
                <div style={{ fontSize:11, color:"#4a5568", fontFamily:"'DM Mono',monospace", marginBottom:4 }}>{icon}</div>
                <div style={{ fontSize:22, fontWeight:800, color, fontFamily:"'DM Mono',monospace" }}>{val}</div>
                <div style={{ fontSize:10, color:"#4a5568", fontFamily:"'DM Mono',monospace" }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Badges */}
          {badges.length > 0 && (
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:11, color:"#4a5568", fontFamily:"'DM Mono',monospace", letterSpacing:".1em", marginBottom:10 }}>BADGES EARNED</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {badges.map(b=>(
                  <div key={b.id} style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 12px", borderRadius:99, fontSize:12, fontWeight:700, background:`${b.color}18`, color:b.color, border:`1px solid ${b.color}44` }}>
                    {b.icon} {b.label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strengths & Improvements */}
          {(rep.strengths.length > 0 || rep.improvements.length > 0) && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
              {rep.strengths.length > 0 && (
                <div style={{ background:"rgba(34,197,94,.05)", border:"1px solid rgba(34,197,94,.2)", borderRadius:12, padding:14 }}>
                  <div style={{ fontSize:11, color:"#4ade80", fontFamily:"'DM Mono',monospace", marginBottom:8, letterSpacing:".06em" }}>✅ STRENGTH</div>
                  {rep.strengths.map((s,i)=><p key={i} style={{ margin:"0 0 4px", fontSize:12, color:"#cbd5e1", lineHeight:1.6 }}>{s}</p>)}
                </div>
              )}
              {rep.improvements.length > 0 && (
                <div style={{ background:"rgba(239,68,68,.05)", border:"1px solid rgba(239,68,68,.2)", borderRadius:12, padding:14 }}>
                  <div style={{ fontSize:11, color:"#f87171", fontFamily:"'DM Mono',monospace", marginBottom:8, letterSpacing:".06em" }}>📈 IMPROVE</div>
                  {rep.improvements.map((s,i)=><p key={i} style={{ margin:"0 0 4px", fontSize:12, color:"#cbd5e1", lineHeight:1.6 }}>{s}</p>)}
                </div>
              )}
            </div>
          )}

          {/* Verdict */}
          <div style={{ background:verdict.bg, border:`1px solid ${verdict.border}`, borderRadius:12, padding:"12px 16px", marginBottom:24, textAlign:"center" }}>
            <span style={{ fontSize:14, fontWeight:700, color:verdict.color }}>{verdict.text}</span>
          </div>

          {/* Buttons */}
          <div style={{ display:"flex", gap:12 }}>
            <button onClick={()=>{ synthRef.current.cancel(); stopListening(); navigate("/setup"); }}
              style={{ flex:1, background:"rgba(255,255,255,.04)", border:"1px solid rgba(99,179,237,.2)", color:"#63b3ed", borderRadius:12, padding:13, fontSize:14, fontWeight:600, cursor:"pointer" }}>
              ↺ New Session
            </button>
            <button onClick={()=>setShowReport(false)}
              style={{ flex:1, background:"linear-gradient(135deg,#3182ce,#63b3ed)", border:"none", color:"#070b14", borderRadius:12, padding:13, fontSize:14, fontWeight:800, cursor:"pointer" }}>
              Review Chat →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Chat UI ──────────────────────────────────────────────────
  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        @keyframes bounce   { 0%,80%,100%{transform:translateY(0);opacity:.4} 40%{transform:translateY(-6px);opacity:1} }
        @keyframes blink    { 0%,100%{opacity:1} 50%{opacity:.25} }
        @keyframes ripple   { 0%{transform:scale(1);opacity:.8} 100%{transform:scale(2.4);opacity:0} }
        @keyframes badgePop { 0%{transform:translateY(20px);opacity:0} 20%{transform:translateY(-4px);opacity:1} 80%{opacity:1} 100%{transform:translateY(-10px);opacity:0} }
        @keyframes fadeUp   { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(99,179,237,.2);border-radius:4px}
        textarea:focus{outline:none;border-color:rgba(99,179,237,.45)!important;}
        textarea::placeholder{color:#2d3748;}
        .mic-btn{position:relative;}
        .mic-btn.on::after{content:'';position:absolute;inset:-5px;border-radius:50%;border:2px solid #ef4444;animation:ripple 1s ease-out infinite;}
        .send-btn:hover:not(:disabled){opacity:.88;transform:translateY(-1px);}
        .send-btn:disabled{opacity:.4;cursor:not-allowed;}
        .msg-row{animation:fadeUp .3s ease;}
        .new-btn:hover{background:rgba(99,179,237,.1)!important;}
        .report-btn:hover{opacity:.88;}
      `}</style>

      {/* Badge pop */}
      {showBadge && (
        <div style={{ position:"fixed", top:80, right:24, zIndex:200, display:"flex", alignItems:"center", gap:10, padding:"12px 20px", borderRadius:14, background:`${showBadge.color}18`, border:`1px solid ${showBadge.color}55`, backdropFilter:"blur(12px)", animation:"badgePop 3s ease forwards", pointerEvents:"none" }}>
          <span style={{ fontSize:22 }}>{showBadge.icon}</span>
          <div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.4)", fontFamily:"'DM Mono',monospace", letterSpacing:".08em" }}>BADGE UNLOCKED</div>
            <div style={{ fontSize:14, fontWeight:700, color:showBadge.color }}>{showBadge.label}</div>
          </div>
        </div>
      )}

      <div style={s.layout}>

        {/* ════ SIDEBAR ════ */}
        <aside style={s.sidebar}>
          <div style={{ fontSize:13, fontWeight:700, color:"#63b3ed", fontFamily:"'DM Mono',monospace", letterSpacing:".06em", marginBottom:20, textTransform:"uppercase" }}>
            🎯 AI Interviewer
          </div>

          {/* Candidate info */}
          <div style={s.sideCard}>
            {[["Candidate",setup?.name],["Company",setup?.company],["Role",setup?.role],["Experience",setup?.experience]].map(([l,v])=>(
              <div key={l} style={{ marginBottom:12 }}>
                <div style={s.lbl}>{l}</div>
                <div style={s.val}>{v||"—"}</div>
              </div>
            ))}
            <div>
              <div style={s.lbl}>Difficulty</div>
              <span style={{ fontSize:12, fontWeight:700, color:diffCol, background:`${diffCol}18`, border:`1px solid ${diffCol}44`, padding:"2px 10px", borderRadius:99 }}>{setup?.difficulty}</span>
            </div>
          </div>

          {/* Session stats */}
          <div style={s.sideCard}>
            <div style={s.lbl}>SESSION STATS</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:8 }}>
              {[
                ["⏱️","Time",     fmtTime(sessionTime), "#63b3ed"],
                ["❓","Questions", questionCount,         "#8b5cf6"],
                ["⭐","Avg Score", avgScore?`${avgScore}/10`:"—", "#f59e0b"],
                ["🔥","XP",       xp,                    "#22c55e"],
              ].map(([icon,label,val,color])=>(
                <div key={label} style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.06)", borderRadius:10, padding:"10px 8px", textAlign:"center" }}>
                  <div style={{ fontSize:16, marginBottom:3 }}>{icon}</div>
                  <div style={{ fontSize:15, fontWeight:700, color, fontFamily:"'DM Mono',monospace" }}>{val}</div>
                  <div style={{ fontSize:9, color:"#4a5568", letterSpacing:".08em", marginTop:1 }}>{label.toUpperCase()}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Confidence meter */}
          <div style={s.sideCard}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <div style={s.lbl}>CONFIDENCE</div>
              <span style={{ fontSize:13, fontWeight:700, color:confColor, fontFamily:"'DM Mono',monospace" }}>{confidence}%</span>
            </div>
            <div style={{ height:8, background:"rgba(255,255,255,.06)", borderRadius:99, overflow:"hidden" }}>
              <div style={{ height:"100%", borderRadius:99, background:`linear-gradient(90deg,${confColor}88,${confColor})`, width:`${confidence}%`, transition:"width .8s cubic-bezier(.4,0,.2,1)" }}/>
            </div>
            <div style={{ fontSize:10, color:"#4a5568", marginTop:6, fontFamily:"'DM Mono',monospace" }}>
              {confidence>=75?"💪 Strong performance":confidence>=50?"🟡 Building up":"⚠️ Keep going"}
            </div>
          </div>

          {/* Question timer */}
          {isTimerRunning && !interviewDone && (
            <div style={{ ...s.sideCard, background:"rgba(245,158,11,.06)", borderColor:"rgba(245,158,11,.2)" }}>
              <div style={s.lbl}>QUESTION TIMER</div>
              <div style={{ fontSize:26, fontWeight:800, color:"#f59e0b", fontFamily:"'DM Mono',monospace", marginTop:4 }}>{fmtTime(questionTime)}</div>
              <div style={{ fontSize:10, color:"#4a5568", marginTop:2 }}>Time on current question</div>
            </div>
          )}

          {/* Streak */}
          {streak >= 2 && (
            <div style={{ ...s.sideCard, background:"rgba(249,115,22,.06)", borderColor:"rgba(249,115,22,.2)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:22 }}>🔥</span>
                <div>
                  <div style={{ fontSize:15, fontWeight:700, color:"#f97316" }}>{streak}x Streak!</div>
                  <div style={{ fontSize:10, color:"#4a5568" }}>Great answers in a row</div>
                </div>
              </div>
            </div>
          )}

          {/* Badges */}
          {badges.length > 0 && (
            <div style={s.sideCard}>
              <div style={s.lbl}>BADGES</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:8 }}>
                {badges.map(b=>(
                  <div key={b.id} title={b.label} style={{ width:32, height:32, borderRadius:8, background:`${b.color}18`, border:`1px solid ${b.color}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>{b.icon}</div>
                ))}
              </div>
            </div>
          )}

          {/* Rate limit warning */}
          {messages.some(m=>m.isError&&m.text?.includes("rate limit")) && (
            <div style={{ background:"rgba(245,158,11,.06)", border:"1px solid rgba(245,158,11,.25)", borderRadius:10, padding:"10px 12px" }}>
              <div style={{ fontSize:11, color:"#f59e0b", fontWeight:700 }}>⏳ Rate Limit Hit</div>
              <div style={{ fontSize:10, color:"#4a5568", marginTop:3 }}>Wait 1-2 mins then continue</div>
            </div>
          )}

          {/* Audio status */}
          {audioMode && (
            <div style={{ ...s.sideCard, background:"rgba(99,102,241,.06)", borderColor:"rgba(99,102,241,.2)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:"#22c55e", boxShadow:"0 0 6px #22c55e", animation:"blink 2s infinite" }}/>
                <span style={{ fontSize:12, color:"#818cf8", fontWeight:600 }}>
                  {isSpeaking?"🔊 Speaking...":isListening?"🎙️ Listening...":"Audio ON"}
                </span>
              </div>
            </div>
          )}

          <div style={{ flex:1 }}/>

          {/* View Report — only clickable when interview is done */}
          <button
            className="report-btn"
            onClick={() => { if (interviewDone) setShowReport(true); }}
            disabled={!interviewDone}
            style={{
              width:"100%",
              background: interviewDone ? "rgba(99,179,237,.08)" : "rgba(255,255,255,.02)",
              border:`1px solid ${interviewDone ? "rgba(99,179,237,.2)" : "rgba(255,255,255,.06)"}`,
              color: interviewDone ? "#63b3ed" : "#3a4a5a",
              borderRadius:10, padding:"10px", fontSize:12, fontWeight:700,
              cursor: interviewDone ? "pointer" : "not-allowed",
              fontFamily:"'DM Mono',monospace", marginBottom:8,
              transition:"opacity .2s",
              opacity: interviewDone ? 1 : 0.4,
            }}
          >
            📊 {interviewDone ? "View Report" : "Report (finish interview)"}
          </button>

          {interviewDone && (
            <div style={{ background:"rgba(34,197,94,.06)", border:"1px solid rgba(34,197,94,.2)", borderRadius:10, padding:"10px 12px", textAlign:"center" }}>
              <div style={{ fontSize:12, color:"#22c55e", fontWeight:700 }}>✅ Interview Complete</div>
              <div style={{ fontSize:10, color:"#4a5568", marginTop:3 }}>Final time: {fmtTime(sessionTime)}</div>
            </div>
          )}

          <button className="new-btn"
            onClick={()=>{ synthRef.current.cancel(); stopListening(); navigate("/setup"); }}
            style={{ width:"100%", background:"rgba(255,255,255,.03)", border:"1px solid rgba(99,179,237,.15)", color:"#6b7f99", borderRadius:10, padding:"10px", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"'DM Mono',monospace", transition:"all .2s" }}>
            ↺ New Session
          </button>
        </aside>

        {/* ════ CHAT AREA ════ */}
        <div style={s.chatWrap}>
          {/* Header */}
          <div style={s.header}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background: interviewDone?"#f59e0b":"#22c55e", boxShadow:`0 0 8px ${interviewDone?"#f59e0b":"#22c55e"}`, animation:"blink 2s infinite" }}/>
              <span style={s.headerTxt}>{interviewDone ? "Interview Complete" : "Interview in Progress"}</span>
              {setup?.category && (
                <span style={{ fontSize:11, color:"#4a5568", fontFamily:"'DM Mono',monospace", background:"rgba(255,255,255,.04)", padding:"2px 10px", borderRadius:99, border:"1px solid rgba(255,255,255,.07)", textTransform:"uppercase" }}>
                  {setup.category}
                </span>
              )}
            </div>
            <div style={{ display:"flex", gap:14, alignItems:"center" }}>
              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color: interviewDone?"#22c55e":"#63b3ed", fontWeight: interviewDone?700:400 }}>
                {interviewDone?"🏁 Done":"⏱"} {fmtTime(sessionTime)}
              </span>
              {isSpeaking  && <span style={{ fontSize:12, color:"#818cf8", animation:"blink 1s infinite" }}>🔊 Speaking...</span>}
              {isListening && <span style={{ fontSize:12, color:"#ef4444", animation:"blink .6s infinite" }}>🎙️ Listening...</span>}
            </div>
          </div>

          {/* Messages */}
          <div style={s.msgs}>
            {messages.map((msg, i) => (
              <div key={i} className="msg-row" style={{ display:"flex", justifyContent:msg.role==="user"?"flex-end":"flex-start", alignItems:"flex-end", gap:10, marginBottom:16 }}>
                {msg.role==="assistant" && <div style={s.av}>AI</div>}
                <div style={{ maxWidth:"72%", borderRadius:14, padding:"13px 17px", lineHeight:1.75, ...(msg.role==="user"?s.bubU:s.bubAI), ...(msg.isError?s.bubErr:{}) }}>
                  {/* ── BUG FIX 3: Use badge renderer for ALL AI messages ── */}
                  {msg.role === "assistant"
                    ? <div>{parseAndRenderAI(msg.text)}</div>
                    : <div style={{ fontSize:15, color:"#c8d8e8" }}>{boldify(msg.text)}</div>
                  }
                  <div style={{ fontSize:10, color:"#3a4a5a", marginTop:6, textAlign:"right", fontFamily:"'DM Mono',monospace" }}>
                    {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}) : ""}
                  </div>
                </div>
                {msg.role==="user" && <div style={{...s.av,...s.avU}}>{setup?.name?.charAt(0).toUpperCase()||"U"}</div>}
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="msg-row" style={{ display:"flex", alignItems:"flex-end", gap:10, marginBottom:16 }}>
                <div style={s.av}>AI</div>
                <div style={{ ...s.bubAI, padding:"14px 18px", borderRadius:14 }}>
                  <div style={{ display:"flex", gap:5, alignItems:"center" }}>
                    {[0,.18,.36].map((d,i)=>(
                      <div key={i} style={{ width:7, height:7, borderRadius:"50%", background:"#63b3ed", animation:`bounce 1.2s ${d}s infinite ease-in-out` }}/>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Input area */}
          <div style={s.inputBar}>
            <div style={{ fontSize:10, color:"rgba(255,255,255,.15)", textAlign:"center", marginBottom:8, fontFamily:"'DM Mono',monospace", letterSpacing:".04em" }}>
              <kbd style={{ background:"rgba(255,255,255,.06)", padding:"1px 5px", borderRadius:3 }}>Enter</kbd> to send &nbsp;·&nbsp;
              <kbd style={{ background:"rgba(255,255,255,.06)", padding:"1px 5px", borderRadius:3 }}>Shift+Enter</kbd> new line
            </div>
            <div style={{ display:"flex", gap:10, alignItems:"flex-end" }}>
              <button className={`mic-btn ${isListening?"on":""}`}
                onClick={isListening?stopListening:startListening}
                disabled={loading||isSpeaking||interviewDone}
                style={{ width:46, height:46, borderRadius:12, flexShrink:0, background:isListening?"rgba(239,68,68,.15)":audioMode?"rgba(99,102,241,.12)":"rgba(255,255,255,.04)", border:isListening?"1px solid rgba(239,68,68,.5)":audioMode?"1px solid rgba(99,102,241,.3)":"1px solid rgba(99,179,237,.18)", color:isListening?"#ef4444":audioMode?"#818cf8":"#63b3ed", fontSize:18, cursor:"pointer", transition:"all .2s", display:"flex", alignItems:"center", justifyContent:"center" }}>
                {isListening?"⏹":"🎙️"}
              </button>
              <textarea ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKeyDown}
                disabled={loading||interviewDone}
                placeholder={interviewDone?"Interview complete — view your report above":audioMode?"Speak or type your answer...":"Type your answer here..."}
                rows={1}
                style={{ flex:1, resize:"none", background:"rgba(255,255,255,.04)", border:"1px solid rgba(99,179,237,.18)", borderRadius:12, padding:"13px 16px", color:"#e8edf5", fontSize:15, fontFamily:"'Sora',sans-serif", lineHeight:1.6, maxHeight:110, overflowY:"auto", transition:"border-color .2s" }}
                onInput={e=>{e.target.style.height="auto";e.target.style.height=Math.min(e.target.scrollHeight,110)+"px";}}
              />
              <button className="send-btn" onClick={()=>handleSend()} disabled={loading||!input.trim()||interviewDone}
                style={{ width:46, height:46, borderRadius:12, flexShrink:0, background:"linear-gradient(135deg,#3182ce,#63b3ed)", border:"none", color:"#fff", fontSize:18, cursor:"pointer", transition:"all .2s", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 16px rgba(99,179,237,.3)" }}>
                ➤
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatBox;

const s = {
  page:    { minHeight:"100vh", background:"#070b14", display:"flex", fontFamily:"'Sora',sans-serif", overflow:"hidden", height:"100vh" },
  layout:  { display:"flex", width:"100%", height:"100vh" },
  sidebar: { width:230, flexShrink:0, borderRight:"1px solid rgba(99,179,237,.08)", background:"rgba(255,255,255,.015)", display:"flex", flexDirection:"column", padding:"20px 14px", gap:10, overflowY:"auto" },
  sideCard:{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.06)", borderRadius:12, padding:"12px", flexShrink:0 },
  lbl:     { fontSize:9, letterSpacing:".12em", color:"#4a5568", fontFamily:"'DM Mono',monospace", textTransform:"uppercase", marginBottom:4, fontWeight:600 },
  val:     { fontSize:13, fontWeight:600, color:"#a0b8d0" },
  chatWrap:{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" },
  header:  { padding:"14px 22px", borderBottom:"1px solid rgba(99,179,237,.08)", background:"rgba(255,255,255,.015)", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 },
  headerTxt:{ fontSize:12, color:"#6b7f99", fontFamily:"'DM Mono',monospace", letterSpacing:".08em", textTransform:"uppercase" },
  msgs:    { flex:1, overflowY:"auto", padding:"22px 24px" },
  av:      { width:32, height:32, borderRadius:"50%", background:"rgba(99,179,237,.12)", border:"1px solid rgba(99,179,237,.25)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#63b3ed", fontFamily:"'DM Mono',monospace", flexShrink:0 },
  avU:     { background:"rgba(34,197,94,.1)", border:"1px solid rgba(34,197,94,.25)", color:"#22c55e" },
  bubAI:   { background:"rgba(99,179,237,.06)", border:"1px solid rgba(99,179,237,.12)", borderBottomLeftRadius:4 },
  bubU:    { background:"rgba(99,179,237,.14)", border:"1px solid rgba(99,179,237,.28)", borderBottomRightRadius:4 },
  bubErr:  { background:"rgba(239,68,68,.07)",  border:"1px solid rgba(239,68,68,.2)" },
  inputBar:{ padding:"12px 22px 18px", borderTop:"1px solid rgba(99,179,237,.08)", background:"rgba(255,255,255,.015)", flexShrink:0 },
};