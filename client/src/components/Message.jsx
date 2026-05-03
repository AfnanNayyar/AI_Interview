export default function Message({ msg, setupName }) {
  const isUser = msg.role === "user";

  if (isUser) {
    return (
      <div style={s.rowRight}>
        <div style={s.bubbleUser}>
          <p style={s.bubbleText}>{msg.text}</p>
          <span style={s.time}>{msg.time}</span>
        </div>
        <div style={{ ...s.avatar, ...s.avatarUser }}>
          {(setupName || "U").charAt(0).toUpperCase()}
        </div>
      </div>
    );
  }

  // ── Detect final report — render as rich card ─────────────
  if (/INTERVIEW COMPLETE\s*[—\-]\s*Final Report/i.test(msg.text)) {
    return <FinalReportCard msg={msg} />;
  }

  const score = msg.score ?? extractScore(msg.text);
  const sections = parseAIMessage(msg.text);

  return (
    <div style={s.rowLeft}>
      <div style={s.avatarAI}>AI</div>
      <div style={{ ...s.bubbleAI, ...(msg.isError ? s.bubbleError : {}) }}>

        {/* Score badge */}
        {score !== null && (
          <div style={s.scoreBadge}>
            <span>📊</span>
            <span style={s.scoreLabel}>Answer Score:</span>
            <span style={{ ...s.scoreValue, color: score >= 7 ? "#68d391" : score >= 5 ? "#f6ad55" : "#fc8181" }}>
              {score}/10
            </span>
            <div style={s.scoreBarBg}>
              <div style={{ ...s.scoreBarFill, width: `${score * 10}%`, background: score >= 7 ? "#68d391" : score >= 5 ? "#f6ad55" : "#fc8181" }} />
            </div>
          </div>
        )}

        {/* Rendered sections */}
        {sections.map((sec, i) => {
          if (sec.type === "warning") return (
            <div key={i} style={s.warningBlock}>
              <span style={s.warnIcon}>⚠️</span>
              <span style={s.warnText}>{sec.text}</span>
            </div>
          );
          if (sec.type === "strength") return (
            <div key={i} style={{ ...s.feedbackBlock, borderLeft: "3px solid #68d391" }}>
              <span style={s.feedbackIcon}>✅</span>
              <div>
                <span style={{ ...s.feedbackLabel, color: "#68d391" }}>Strength </span>
                <span style={s.feedbackBody}>{sec.text}</span>
              </div>
            </div>
          );
          if (sec.type === "gap") return (
            <div key={i} style={{ ...s.feedbackBlock, borderLeft: "3px solid #fc8181" }}>
              <span style={s.feedbackIcon}>❌</span>
              <div>
                <span style={{ ...s.feedbackLabel, color: "#fc8181" }}>Gap </span>
                <span style={s.feedbackBody}>{sec.text}</span>
              </div>
            </div>
          );
          if (sec.type === "tip") return (
            <div key={i} style={{ ...s.feedbackBlock, borderLeft: "3px solid #f6ad55" }}>
              <span style={s.feedbackIcon}>💡</span>
              <div>
                <span style={{ ...s.feedbackLabel, color: "#f6ad55" }}>Tip </span>
                <span style={s.feedbackBody}>{sec.text}</span>
              </div>
            </div>
          );
          if (sec.type === "question") return (
            <div key={i} style={s.questionBlock}>
              <span style={s.questionLabel}>{sec.label}</span>
              <span style={s.questionText}>{sec.text}</span>
            </div>
          );
          return (
            <p key={i} style={s.plainText}>{renderBold(sec.text)}</p>
          );
        })}

        <span style={{ ...s.time, textAlign: "right", display: "block" }}>{msg.time}</span>
      </div>
    </div>
  );
}

// ── Final Report Card ─────────────────────────────────────────
function FinalReportCard({ msg }) {
  const text = msg.text;
  const get = (pattern, fallback = "—") => {
    const m = text.match(pattern);
    return m ? m[1].trim() : fallback;
  };

  const tech    = get(/Technical Skills[:\s]+(\d+)\s*\/\s*10/i, "0");
  const comm    = get(/Communication[:\s]+(\d+)\s*\/\s*10/i, "0");
  const problem = get(/Problem Solving[:\s]+(\d+)\s*\/\s*10/i, "0");
  const overall = get(/Overall Score[:\s]+(\d+)\s*\/\s*10/i, "0");
  const strength= get(/Top Strength[:\s]+([^\n⚠✅📋🏆]+)/i);
  const weakness= get(/Key Weakness[:\s]+([^\n✅📋]+)/i);
  const hiring  = get(/Hiring Recommendation[:\s]+(Yes|No|Maybe)/i, "Maybe");

  const scoreColor = (v) => parseInt(v) >= 7 ? "#68d391" : parseInt(v) >= 5 ? "#f6ad55" : "#fc8181";

  const hiringCfg = {
    Yes:   { color: "#68d391", bg: "rgba(72,187,120,0.1)",   border: "rgba(72,187,120,0.3)",   label: "✅ Hiring Recommendation: Yes" },
    Maybe: { color: "#f6ad55", bg: "rgba(246,173,85,0.1)",   border: "rgba(246,173,85,0.3)",   label: "⚠️ Hiring Recommendation: Maybe" },
    No:    { color: "#fc8181", bg: "rgba(252,129,129,0.08)", border: "rgba(252,129,129,0.25)", label: "❌ Hiring Recommendation: No" },
  };
  const rec = hiringCfg[hiring] || hiringCfg["Maybe"];

  const skills = [
    { label: "Technical Skills",  val: tech },
    { label: "Communication",     val: comm },
    { label: "Problem Solving",   val: problem },
    { label: "Overall Score",     val: overall },
  ];

  return (
    <div style={s.rowLeft}>
      <div style={s.avatarAI}>AI</div>
      <div style={s.reportCard}>
        <div style={s.reportHeader}>
          <span style={s.reportIcon}>📋</span>
          <span style={s.reportTitle}>INTERVIEW COMPLETE — Final Report</span>
        </div>

        <div style={s.reportSkills}>
          {skills.map(({ label, val }) => (
            <div key={label} style={s.skillRow}>
              <div style={s.skillMeta}>
                <span style={s.skillLabel}>{label}</span>
                <span style={{ ...s.skillVal, color: scoreColor(val) }}>{val}/10</span>
              </div>
              <div style={s.skillBarBg}>
                <div style={{ ...s.skillBarFill, width: `${parseInt(val) * 10}%`, background: scoreColor(val) }} />
              </div>
            </div>
          ))}
        </div>

        <div style={s.reportFeedbackGrid}>
          <div style={s.strengthMini}>
            <div style={s.miniLabel}>🏆 Top Strength</div>
            <div style={s.miniText}>{strength}</div>
          </div>
          <div style={s.weaknessMini}>
            <div style={s.miniLabel}>⚠️ Key Weakness</div>
            <div style={s.miniText}>{weakness}</div>
          </div>
        </div>

        <div style={{ ...s.hiringBadge, background: rec.bg, border: `1px solid ${rec.border}`, color: rec.color }}>
          {rec.label}
        </div>

        <span style={{ ...s.time, display: "block", textAlign: "right", marginTop: "10px" }}>{msg.time}</span>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────
function extractScore(text) {
  const m = text.match(/Answer Score[:\s]+(\d+)\s*\/\s*10/i);
  return m ? parseInt(m[1]) : null;
}

function parseAIMessage(text) {
  const lines = text.split("\n").filter((l) => l.trim() !== "");
  const sections = [];

  for (const line of lines) {
    const t = line.trim();

    if (/^Answer Score[:\s]+\d+\s*\/\s*10/i.test(t)) continue;
    if (/^[-=]{4,}/.test(t) || /^---/.test(t)) continue;

    if (/^⚠️/.test(t) || /^That'?s not a complete answer/i.test(t)) {
      sections.push({ type: "warning", text: t.replace(/^⚠️\s*/, "") });
    } else if (/^✅\s*Strength[:\s]/i.test(t) || /^Strength[:\s]/i.test(t)) {
      sections.push({ type: "strength", text: t.replace(/^✅\s*Strength[:\s]*/i, "").replace(/^Strength[:\s]*/i, "") });
    } else if (/^❌\s*Gap[:\s]/i.test(t) || /^Gap[:\s]/i.test(t)) {
      sections.push({ type: "gap", text: t.replace(/^❌\s*Gap[:\s]*/i, "").replace(/^Gap[:\s]*/i, "") });
    } else if (/^💡\s*Tip[:\s]/i.test(t) || /^Tip[:\s]/i.test(t)) {
      sections.push({ type: "tip", text: t.replace(/^💡\s*Tip[:\s]*/i, "").replace(/^Tip[:\s]*/i, "") });
    } else if (/^\*{0,2}Question\s+\d+[:\*]*/i.test(t)) {
      const match = t.match(/^\*{0,2}(Question\s+\d+)[:\*]*\s*(.*)/i);
      if (match) {
        sections.push({ type: "question", label: match[1] + ":", text: match[2].replace(/\*+/g, "") });
      } else {
        sections.push({ type: "plain", text: t.replace(/\*+/g, "") });
      }
    } else {
      if (sections.length > 0 && sections[sections.length - 1].type === "plain") {
        sections[sections.length - 1].text += "\n" + t;
      } else {
        sections.push({ type: "plain", text: t });
      }
    }
  }

  return sections.length > 0 ? sections : [{ type: "plain", text }];
}

function renderBold(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i} style={{ color: "#c3d9f0" }}>{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>
  );
}

// ── Styles ────────────────────────────────────────────────────
const s = {
  rowLeft:    { display: "flex", alignItems: "flex-start", gap: "10px", maxWidth: "86%" },
  rowRight:   { display: "flex", alignItems: "flex-end", gap: "10px", maxWidth: "72%", alignSelf: "flex-end", marginLeft: "auto" },
  avatarAI:   { width: "34px", height: "34px", borderRadius: "50%", background: "rgba(99,179,237,0.12)", border: "1px solid rgba(99,179,237,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "700", color: "#63b3ed", fontFamily: "'Courier New', monospace", flexShrink: 0, marginTop: "4px" },
  avatar:     { width: "34px", height: "34px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "700", flexShrink: 0 },
  avatarUser: { background: "rgba(104,211,145,0.12)", border: "1px solid rgba(104,211,145,0.3)", color: "#68d391", fontFamily: "'Courier New', monospace" },
  bubbleAI:   { background: "rgba(99,179,237,0.06)", border: "1px solid rgba(99,179,237,0.15)", borderRadius: "4px 14px 14px 14px", padding: "14px 16px", flex: 1 },
  bubbleUser: { background: "rgba(99,179,237,0.14)", border: "1px solid rgba(99,179,237,0.28)", borderRadius: "14px 14px 4px 14px", padding: "12px 16px" },
  bubbleError:{ background: "rgba(252,129,129,0.06)", border: "1px solid rgba(252,129,129,0.2)" },
  bubbleText: { fontSize: "15px", color: "#c8d8e8", margin: 0, lineHeight: 1.65, fontFamily: "'Georgia', serif" },
  time:       { fontSize: "11px", color: "#3d5068", marginTop: "6px", fontFamily: "'Courier New', monospace" },

  scoreBadge:   { display: "flex", alignItems: "center", gap: "8px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(99,179,237,0.15)", borderRadius: "8px", padding: "8px 12px", marginBottom: "12px", flexWrap: "wrap" },
  scoreLabel:   { fontSize: "12px", color: "#6b7f99", fontFamily: "'Courier New', monospace", textTransform: "uppercase", letterSpacing: "0.06em" },
  scoreValue:   { fontSize: "16px", fontWeight: "800", fontFamily: "'Courier New', monospace" },
  scoreBarBg:   { flex: 1, minWidth: "80px", height: "4px", background: "rgba(255,255,255,0.07)", borderRadius: "99px", overflow: "hidden" },
  scoreBarFill: { height: "100%", borderRadius: "99px", transition: "width 0.6s ease" },

  warningBlock: { display: "flex", gap: "10px", alignItems: "flex-start", background: "rgba(252,129,129,0.07)", border: "1px solid rgba(252,129,129,0.2)", borderRadius: "8px", padding: "10px 12px", marginBottom: "10px" },
  warnIcon:     { fontSize: "16px", flexShrink: 0 },
  warnText:     { fontSize: "14px", color: "#fc8181", lineHeight: 1.6, fontFamily: "'Georgia', serif" },

  feedbackBlock: { display: "flex", gap: "10px", alignItems: "flex-start", marginBottom: "8px", padding: "10px 12px", background: "rgba(0,0,0,0.15)", borderRadius: "8px" },
  feedbackIcon:  { fontSize: "15px", flexShrink: 0, marginTop: "1px" },
  feedbackLabel: { fontSize: "12px", fontWeight: "700", fontFamily: "'Courier New', monospace", textTransform: "uppercase", letterSpacing: "0.06em" },
  feedbackBody:  { fontSize: "14px", color: "#a0b8cc", lineHeight: 1.65, fontFamily: "'Georgia', serif" },

  questionBlock: { background: "rgba(99,179,237,0.06)", border: "1px solid rgba(99,179,237,0.18)", borderRadius: "8px", padding: "12px 14px", marginBottom: "8px", marginTop: "4px" },
  questionLabel: { fontSize: "13px", fontWeight: "800", color: "#63b3ed", fontFamily: "'Courier New', monospace", marginRight: "6px" },
  questionText:  { fontSize: "15px", color: "#d0e4f5", lineHeight: 1.7, fontFamily: "'Georgia', serif" },

  plainText: { fontSize: "15px", color: "#c8d8e8", lineHeight: 1.7, margin: "0 0 8px", fontFamily: "'Georgia', serif" },

  // Final Report Card
  reportCard:   { flex: 1, background: "rgba(10,15,30,0.7)", border: "1px solid rgba(99,179,237,0.22)", borderRadius: "14px", padding: "18px 20px" },
  reportHeader: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid rgba(99,179,237,0.12)" },
  reportIcon:   { fontSize: "20px" },
  reportTitle:  { fontSize: "13px", fontWeight: "700", color: "#63b3ed", fontFamily: "'Courier New', monospace", textTransform: "uppercase", letterSpacing: "0.06em" },

  reportSkills: { marginBottom: "14px" },
  skillRow:     { marginBottom: "10px" },
  skillMeta:    { display: "flex", justifyContent: "space-between", marginBottom: "5px" },
  skillLabel:   { fontSize: "13px", color: "#8899b4", fontFamily: "'Courier New', monospace" },
  skillVal:     { fontSize: "13px", fontWeight: "800", fontFamily: "'Courier New', monospace" },
  skillBarBg:   { height: "5px", background: "rgba(255,255,255,0.06)", borderRadius: "99px", overflow: "hidden" },
  skillBarFill: { height: "100%", borderRadius: "99px", transition: "width 1s ease" },

  reportFeedbackGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" },
  strengthMini: { background: "rgba(72,187,120,0.07)", border: "1px solid rgba(72,187,120,0.2)", borderRadius: "8px", padding: "10px 12px" },
  weaknessMini: { background: "rgba(252,129,129,0.07)", border: "1px solid rgba(252,129,129,0.2)", borderRadius: "8px", padding: "10px 12px" },
  miniLabel:    { fontSize: "10px", fontWeight: "700", color: "#6b7f99", fontFamily: "'Courier New', monospace", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "5px" },
  miniText:     { fontSize: "13px", color: "#a0b8cc", lineHeight: 1.5, fontFamily: "'Georgia', serif" },

  hiringBadge: { borderRadius: "8px", padding: "10px 14px", textAlign: "center", fontSize: "14px", fontWeight: "700", fontFamily: "'Georgia', serif" },
};