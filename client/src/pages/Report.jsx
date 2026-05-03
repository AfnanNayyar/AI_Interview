import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";

export default function Report() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state;

  useEffect(() => {
    if (!state?.setup) navigate("/", { replace: true });
  }, []);

  if (!state?.setup) return null;

  const {
    setup,
    scores = [],
    questionCount = 0,
    sessionSecs = 0,
    xp = 0,
    badges = [],
    messages = [],
  } = state;

  // ── Compute skill scores from message history ─────────────
  const avg = scores.length > 0
    ? scores.reduce((a, b) => a + b, 0) / scores.length
    : 0;

  // Split scores into rough buckets for skill breakdown
  const techScores    = scores.filter((_, i) => i % 3 === 0);
  const commScores    = scores.filter((_, i) => i % 3 === 1);
  const problemScores = scores.filter((_, i) => i % 3 === 2);

  const mean = (arr) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

  const techScore    = mean(techScores)    || Math.round(avg);
  const commScore    = mean(commScores);
  const problemScore = mean(problemScores) || Math.round(avg);
  const overallScore = Math.round(avg);

  // ── Parse strength/improve from last AI message ───────────
  const lastAI = [...messages].reverse().find((m) => m.role === "assistant" && !m.isError);
  const lastText = lastAI?.text || "";

  const strengthMatch = lastText.match(/Top Strength[:\s]+([^\n🔑⚠✅]+)/i)
    || lastText.match(/Strength[:\s]+([^\n]+)/i);
  const weaknessMatch = lastText.match(/Key Weakness[:\s]+([^\n✅]+)/i)
    || lastText.match(/Gap[:\s]+([^\n]+)/i)
    || lastText.match(/Improve[:\s]+([^\n]+)/i);
  const hiringMatch   = lastText.match(/Hiring Recommendation[:\s]+(Yes|No|Maybe)/i);

  const strength  = strengthMatch?.[1]?.trim() || "None demonstrated";
  const weakness  = weaknessMatch?.[1]?.trim() || "Needs improvement";
  const hiring    = hiringMatch?.[1] || (overallScore >= 7 ? "Yes" : overallScore >= 5 ? "Maybe" : "No");

  const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const hiringConfig = {
    Yes:   { label: "✅ Yes — Hire!",              bg: "rgba(72,187,120,0.15)",  border: "rgba(72,187,120,0.35)",  color: "#68d391" },
    Maybe: { label: "⚠️ Maybe — Keep Practicing",  bg: "rgba(246,173,85,0.1)",   border: "rgba(246,173,85,0.3)",   color: "#f6ad55" },
    No:    { label: "❌ No — Keep Practicing",      bg: "rgba(252,129,129,0.1)",  border: "rgba(252,129,129,0.3)",  color: "#fc8181" },
  };
  const rec = hiringConfig[hiring] || hiringConfig["Maybe"];

  const skillRows = [
    { label: "Technical Skills",  score: techScore },
    { label: "Communication",     score: commScore },
    { label: "Problem Solving",   score: problemScore },
    { label: "Overall Score",     score: overallScore },
  ];

  const scoreColor = (s) => s >= 7 ? "#68d391" : s >= 5 ? "#f6ad55" : "#fc8181";

  return (
    <div style={s.page}>
      <div style={s.grid} />

      <div style={s.card}>
        {/* Header */}
        <div style={s.header}>
          <div style={s.iconWrap}>📊</div>
          <h1 style={s.title}>Interview Complete!</h1>
          <p style={s.subtitle}>{setup.role} @ {setup.company}</p>
        </div>

        {/* Skill bars — matches screenshot 4 layout */}
        <div style={s.skillsSection}>
          {skillRows.map(({ label, score }) => (
            <div key={label} style={s.skillRow}>
              <div style={s.skillMeta}>
                <span style={s.skillLabel}>{label}</span>
                <span style={{ ...s.skillScore, color: scoreColor(score) }}>{score}/10</span>
              </div>
              <div style={s.barBg}>
                <div style={{
                  ...s.barFill,
                  width: `${score * 10}%`,
                  background: scoreColor(score),
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* Stats row — Questions / XP Earned / Duration */}
        <div style={s.statsRow}>
          <div style={s.statBox}>
            <div style={s.statIcon}>❓</div>
            <div style={s.statNum}>{questionCount}</div>
            <div style={s.statLabel}>QUESTIONS</div>
          </div>
          <div style={s.statBox}>
            <div style={s.statIcon}>🔥</div>
            <div style={{ ...s.statNum, color: "#fc8181" }}>{xp}</div>
            <div style={s.statLabel}>XP EARNED</div>
          </div>
          <div style={s.statBox}>
            <div style={s.statIcon}>⏱</div>
            <div style={{ ...s.statNum, color: "#63b3ed", fontFamily: "'Courier New', monospace" }}>{fmtTime(sessionSecs)}</div>
            <div style={s.statLabel}>DURATION</div>
          </div>
        </div>

        {/* Badges earned */}
        {badges.length > 0 && (
          <div style={s.badgesSection}>
            <div style={s.sectionLabel}>BADGES EARNED</div>
            <div style={s.badgesList}>
              {badges.map((b, i) => (
                <span key={i} style={s.badge}>{b}</span>
              ))}
            </div>
          </div>
        )}

        {/* Strength / Improve cards — matches screenshot 4 */}
        <div style={s.feedbackGrid}>
          <div style={s.strengthCard}>
            <div style={s.feedbackCardLabel}>
              <span style={{ color: "#68d391" }}>✅</span> STRENGTH
            </div>
            <p style={s.feedbackCardText}>{strength}</p>
          </div>
          <div style={s.improveCard}>
            <div style={s.feedbackCardLabel}>
              <span style={{ color: "#a78bfa" }}>🔷</span> IMPROVE
            </div>
            <p style={s.feedbackCardText}>{weakness}</p>
          </div>
        </div>

        {/* Hiring recommendation banner */}
        <div style={{
          ...s.hiringBanner,
          background: rec.bg,
          border: `1px solid ${rec.border}`,
          color: rec.color,
        }}>
          {rec.label}
        </div>

        {/* Action buttons */}
        <div style={s.actions}>
          <button style={s.newBtn} onClick={() => navigate("/setup")}>
            ↺ New Session
          </button>
          <button style={s.reviewBtn} onClick={() => navigate("/chat", { state: { setup } })}>
            Review Chat →
          </button>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    background: "#0a0f1e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Georgia', serif",
    position: "relative",
    padding: "40px 16px",
    boxSizing: "border-box",
  },
  grid: {
    position: "absolute", inset: 0,
    backgroundImage: "linear-gradient(rgba(99,179,237,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(99,179,237,0.03) 1px,transparent 1px)",
    backgroundSize: "48px 48px", pointerEvents: "none",
  },
  card: {
    position: "relative", zIndex: 1,
    width: "100%", maxWidth: "480px",
    background: "rgba(255,255,255,0.025)",
    border: "1px solid rgba(99,179,237,0.14)",
    borderRadius: "20px", padding: "36px 32px",
    boxSizing: "border-box",
    boxShadow: "0 0 80px rgba(99,179,237,0.06)",
  },

  // Header
  header: { textAlign: "center", marginBottom: "28px" },
  iconWrap: { fontSize: "40px", marginBottom: "12px" },
  title: { fontSize: "26px", fontWeight: "700", color: "#e8edf5", margin: "0 0 6px", letterSpacing: "-0.02em" },
  subtitle: { fontSize: "14px", color: "#6b7f99", margin: 0 },

  // Skills
  skillsSection: { marginBottom: "24px" },
  skillRow: { marginBottom: "14px" },
  skillMeta: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" },
  skillLabel: { fontSize: "14px", color: "#a0b8cc", fontFamily: "'Courier New', monospace" },
  skillScore: { fontSize: "15px", fontWeight: "800", fontFamily: "'Courier New', monospace" },
  barBg: { height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "99px", overflow: "hidden" },
  barFill: { height: "100%", borderRadius: "99px", transition: "width 1s ease" },

  // Stats
  statsRow: { display: "flex", gap: "10px", marginBottom: "20px" },
  statBox: { flex: 1, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(99,179,237,0.1)", borderRadius: "10px", padding: "12px 8px", textAlign: "center" },
  statIcon: { fontSize: "18px", marginBottom: "4px" },
  statNum: { fontSize: "20px", fontWeight: "800", color: "#f6ad55", fontFamily: "'Courier New', monospace", lineHeight: 1 },
  statLabel: { fontSize: "9px", color: "#3d5068", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'Courier New', monospace", marginTop: "4px" },

  // Badges
  badgesSection: { marginBottom: "20px" },
  sectionLabel: { fontSize: "10px", color: "#3d5068", textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: "'Courier New', monospace", marginBottom: "8px" },
  badgesList: { display: "flex", flexWrap: "wrap", gap: "8px" },
  badge: {
    background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.3)",
    color: "#c4b5fd", borderRadius: "999px", padding: "5px 14px",
    fontSize: "12px", fontWeight: "600", fontFamily: "'Courier New', monospace",
  },

  // Feedback cards
  feedbackGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" },
  strengthCard: { background: "rgba(72,187,120,0.06)", border: "1px solid rgba(72,187,120,0.2)", borderRadius: "10px", padding: "14px" },
  improveCard: { background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: "10px", padding: "14px" },
  feedbackCardLabel: { fontSize: "10px", fontWeight: "700", fontFamily: "'Courier New', monospace", textTransform: "uppercase", letterSpacing: "0.1em", color: "#6b7f99", marginBottom: "8px", display: "flex", gap: "5px", alignItems: "center" },
  feedbackCardText: { fontSize: "13px", color: "#a0b8cc", lineHeight: 1.6, margin: 0 },

  // Hiring banner
  hiringBanner: {
    borderRadius: "10px", padding: "14px", textAlign: "center",
    fontSize: "15px", fontWeight: "700", fontFamily: "'Georgia', serif",
    marginBottom: "20px", letterSpacing: "0.02em",
  },

  // Buttons
  actions: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" },
  newBtn: {
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(99,179,237,0.2)",
    color: "#a0b8cc", borderRadius: "10px", padding: "13px",
    fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: "'Georgia', serif",
  },
  reviewBtn: {
    background: "#63b3ed", color: "#0a0f1e", border: "none",
    borderRadius: "10px", padding: "13px",
    fontSize: "14px", fontWeight: "700", cursor: "pointer", fontFamily: "'Georgia', serif",
    boxShadow: "0 4px 16px rgba(99,179,237,0.25)",
  },
};