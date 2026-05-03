// client/src/pages/Home.jsx

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const COMPANIES = ["Google", "Amazon", "Microsoft", "Meta", "Apple", "Netflix"];
const ROLES     = ["SWE", "ML Engineer", "Data Scientist", "DevOps", "Product Manager", "Designer"];

const STATS = [
  { value: "12K+", label: "Interviews Done",  icon: "🎯" },
  { value: "94%",  label: "Success Rate",     icon: "📈" },
  { value: "8.4",  label: "Avg Score / 10",   icon: "⭐" },
  { value: "50+",  label: "Roles Covered",    icon: "💼" },
];

const FEATURES = [
  { icon: "🤖", title: "AI Interviewer",      desc: "Adapts questions in real-time to your answers" },
  { icon: "✅", title: "Live Feedback",       desc: "Strength · Gap · Tip after every answer" },
  { icon: "🎙️", title: "Voice Mode",          desc: "Speak your answers — AI listens and responds" },
  { icon: "⏱️", title: "Timed Sessions",      desc: "Pressure-test yourself with countdown timers" },
  { icon: "📊", title: "Scorecard Report",    desc: "Detailed analytics after every session" },
  { icon: "📄", title: "Resume-Based Qs",     desc: "Upload your CV — AI generates tailored questions" },
];

const BADGES = [
  { icon: "🔥", label: "On Fire",      color: "#f97316" },
  { icon: "⚡", label: "Speed Demon",  color: "#eab308" },
  { icon: "🧠", label: "Big Brain",    color: "#8b5cf6" },
  { icon: "💎", label: "Diamond",      color: "#38bdf8" },
  { icon: "🏆", label: "Champion",     color: "#22c55e" },
];

export default function Home() {
  const navigate = useNavigate();
  const [xp, setXp]             = useState(0);
  const [level, setLevel]       = useState(1);
  const [tick, setTick]         = useState(0);
  const [compIdx, setCompIdx]   = useState(0);
  const [roleIdx, setRoleIdx]   = useState(0);
  const [hoveredFeature, setHoveredFeature] = useState(null);
  const canvasRef = useRef(null);

  // Animate XP bar filling
  useEffect(() => {
    let v = 0;
    const id = setInterval(() => {
      v += 3;
      if (v >= 72) { clearInterval(id); v = 72; }
      setXp(v);
      if (v > 30)  setLevel(2);
      if (v > 60)  setLevel(3);
    }, 18);
    return () => clearInterval(id);
  }, []);

  // Rotating company/role ticker
  useEffect(() => {
    const id = setInterval(() => {
      setTick(t => t + 1);
      setCompIdx(i => (i + 1) % COMPANIES.length);
      setRoleIdx(i => (i + 1) % ROLES.length);
    }, 2000);
    return () => clearInterval(id);
  }, []);

  // Particle canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.3,
      dx: (Math.random() - 0.5) * 0.3,
      dy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.5 + 0.1,
    }));

    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(99,179,237,${p.alpha})`;
        ctx.fill();
        p.x += p.dx; p.y += p.dy;
        if (p.x < 0 || p.x > canvas.width)  p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  const xpPct = `${xp}%`;

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&family=DM+Mono:wght@400;500&display=swap');

        @keyframes fadeUp   { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes glow     { 0%,100%{text-shadow:0 0 20px rgba(99,179,237,.4)} 50%{text-shadow:0 0 40px rgba(99,179,237,.9),0 0 80px rgba(99,179,237,.4)} }
        @keyframes pulse    { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
        @keyframes slideIn  { from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:translateX(0)} }
        @keyframes shimmer  { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes spin     { to{transform:rotate(360deg)} }
        @keyframes countUp  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes xpFill   { from{width:0} to{width:${xpPct}} }
        @keyframes badgePop { 0%{transform:scale(0.8);opacity:0} 100%{transform:scale(1);opacity:1} }
        @keyframes float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }

        * { box-sizing:border-box; margin:0; padding:0; }

        .start-btn {
          background: linear-gradient(135deg, #63b3ed 0%, #4299e1 50%, #3182ce 100%);
          color: #0a0f1e;
          border: none;
          border-radius: 14px;
          padding: 18px 48px;
          font-size: 18px;
          font-weight: 800;
          font-family: 'Sora', sans-serif;
          letter-spacing: .02em;
          cursor: pointer;
          transition: all .25s ease;
          box-shadow: 0 8px 32px rgba(99,179,237,.35), 0 0 0 0 rgba(99,179,237,.4);
          animation: pulse 2.5s ease-in-out infinite;
        }
        .start-btn:hover {
          transform: translateY(-3px) scale(1.03);
          box-shadow: 0 16px 48px rgba(99,179,237,.5), 0 0 60px rgba(99,179,237,.2);
          animation: none;
        }
        .start-btn:active { transform: translateY(0) scale(.98); }

        .feature-card {
          background: rgba(255,255,255,.03);
          border: 1px solid rgba(99,179,237,.12);
          border-radius: 16px;
          padding: 22px;
          cursor: default;
          transition: all .25s ease;
        }
        .feature-card:hover {
          background: rgba(99,179,237,.07);
          border-color: rgba(99,179,237,.35);
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(99,179,237,.12);
        }

        .stat-card {
          background: rgba(255,255,255,.03);
          border: 1px solid rgba(99,179,237,.1);
          border-radius: 14px;
          padding: 20px;
          text-align: center;
          transition: all .2s;
        }
        .stat-card:hover {
          border-color: rgba(99,179,237,.3);
          background: rgba(99,179,237,.05);
        }

        .badge-chip {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 99px;
          font-size: 12px;
          font-weight: 700;
          font-family: 'DM Mono', monospace;
          border: 1px solid;
          transition: transform .2s;
          animation: badgePop .5s ease forwards;
        }
        .badge-chip:hover { transform: scale(1.08); }

        .ticker-text {
          animation: slideIn .35s ease forwards;
          display: inline-block;
        }

        .xp-bar-fill {
          height: 100%;
          border-radius: 99px;
          background: linear-gradient(90deg, #3182ce, #63b3ed, #90cdf4);
          background-size: 200% auto;
          animation: shimmer 2s linear infinite;
          transition: width 1.5s cubic-bezier(.4,0,.2,1);
          width: ${xpPct};
        }

        .hero-icon { animation: float 3s ease-in-out infinite; }
        .section-fade { animation: fadeUp .7s ease forwards; }
      `}</style>

      {/* Particle canvas */}
      <canvas ref={canvasRef} style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0 }}/>

      {/* Grid overlay */}
      <div style={s.grid}/>

      {/* ── NAVBAR ── */}
      <nav style={s.nav}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={s.navLogo}>🎯</div>
          <span style={s.navBrand}>InterviewAI</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          {/* XP pill */}
          <div style={s.xpPill}>
            <span style={{ fontSize:11, color:"#4a5568", fontFamily:"'DM Mono',monospace" }}>LVL</span>
            <span style={{ fontSize:13, fontWeight:700, color:"#63b3ed" }}>{level}</span>
            <div style={{ width:60, height:6, background:"rgba(255,255,255,.08)", borderRadius:99, overflow:"hidden" }}>
              <div className="xp-bar-fill"/>
            </div>
            <span style={{ fontSize:11, color:"#4a5568", fontFamily:"'DM Mono',monospace" }}>{xp} XP</span>
          </div>
          <button onClick={() => navigate("/setup")} style={s.navBtn}>Start →</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={s.hero}>

        {/* Live ticker badge */}
        <div style={s.tickerBadge}>
          <div style={{ width:7, height:7, borderRadius:"50%", background:"#22c55e", boxShadow:"0 0 8px #22c55e" }}/>
          <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"#6b7f99", letterSpacing:".1em" }}>
            PREPARING FOR
          </span>
          <span key={tick} className="ticker-text" style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"#63b3ed", fontWeight:600 }}>
            {ROLES[roleIdx]} @ {COMPANIES[compIdx]}
          </span>
        </div>

        {/* Hero icon */}
        <div className="hero-icon" style={{ fontSize:64, marginBottom:8, lineHeight:1 }}>🎯</div>

        {/* Headline */}
        <h1 style={s.headline}>
          Ace Your Next<br/>
          <span style={s.headlineAccent}>Interview</span>
        </h1>

        <p style={s.sub}>
          An AI that interviews you like a real hiring manager —<br/>
          adapts to your role, gives instant feedback, and tracks your growth.
        </p>

        {/* Feature pills */}
        <div style={{ display:"flex", flexWrap:"wrap", gap:10, justifyContent:"center", marginBottom:36 }}>
          {["🎙️ Voice Mode", "⏱️ Timed Sessions", "📊 Scorecard", "📄 Resume AI", "🎮 Gamified"].map(f => (
            <div key={f} style={s.pill}>{f}</div>
          ))}
        </div>

        {/* CTA */}
        <button className="start-btn" onClick={() => navigate("/setup")}>
          Start Interview →
        </button>
        <div style={{ fontSize:12, color:"#4a5568", marginTop:14, fontFamily:"'DM Mono',monospace", letterSpacing:".06em" }}>
          No account needed · 100% free · Powered by AI
        </div>

        {/* Badges */}
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", justifyContent:"center", marginTop:28 }}>
          {BADGES.map((b, i) => (
            <div key={b.label} className="badge-chip"
              style={{
                background:`${b.color}18`, color:b.color, borderColor:`${b.color}44`,
                animationDelay:`${i * .1}s`,
              }}
            >
              <span>{b.icon}</span> {b.label}
            </div>
          ))}
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="section-fade" style={s.section}>
        <div style={s.sectionLabel}>BY THE NUMBERS</div>
        <div style={s.statsGrid}>
          {STATS.map((st, i) => (
            <div key={st.label} className="stat-card" style={{ animationDelay:`${i*.1}s` }}>
              <div style={{ fontSize:28, marginBottom:6 }}>{st.icon}</div>
              <div style={{ fontSize:32, fontWeight:800, color:"#63b3ed", fontFamily:"'Sora',sans-serif", lineHeight:1 }}>
                {st.value}
              </div>
              <div style={{ fontSize:12, color:"#4a5568", marginTop:6, fontFamily:"'DM Mono',monospace", letterSpacing:".06em" }}>
                {st.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="section-fade" style={s.section}>
        <div style={s.sectionLabel}>WHAT MAKES IT DIFFERENT</div>
        <h2 style={s.sectionTitle}>Everything you need to land the job</h2>
        <div style={s.featuresGrid}>
          {FEATURES.map((f, i) => (
            <div key={f.title} className="feature-card"
              onMouseEnter={() => setHoveredFeature(i)}
              onMouseLeave={() => setHoveredFeature(null)}
            >
              <div style={{ fontSize:32, marginBottom:12 }}>{f.icon}</div>
              <div style={{ fontSize:15, fontWeight:700, color:"#e8edf5", marginBottom:6, fontFamily:"'Sora',sans-serif" }}>
                {f.title}
              </div>
              <div style={{ fontSize:13, color:"#6b7f99", lineHeight:1.6, fontFamily:"'Sora',sans-serif" }}>
                {f.desc}
              </div>
              {hoveredFeature === i && (
                <div style={{ marginTop:12 }}>
                  <div style={{ width:"100%", height:2, background:"linear-gradient(90deg,transparent,#63b3ed,transparent)", borderRadius:2 }}/>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="section-fade" style={s.section}>
        <div style={s.sectionLabel}>HOW IT WORKS</div>
        <h2 style={s.sectionTitle}>From zero to interview-ready in minutes</h2>
        <div style={{ display:"flex", gap:0, flexWrap:"wrap", justifyContent:"center", marginTop:32, position:"relative" }}>
          {[
            { step:"01", icon:"⚙️", title:"Setup",    desc:"Pick your role, company, difficulty & interview mode" },
            { step:"02", icon:"🤖", title:"Interview", desc:"AI asks smart questions one at a time, just like a real interviewer" },
            { step:"03", icon:"✅", title:"Feedback",  desc:"Get instant ✅ Strength · ❌ Gap · 💡 Tip after every answer" },
            { step:"04", icon:"📊", title:"Report",    desc:"View your scorecard with scores, badges & hiring recommendation" },
          ].map((item, i) => (
            <div key={item.step} style={{ display:"flex", alignItems:"stretch", flex:"1 1 220px" }}>
              <div style={{
                background:"rgba(255,255,255,.03)", border:"1px solid rgba(99,179,237,.12)",
                borderRadius:16, padding:"28px 22px", flex:1, margin:8,
                transition:"all .2s",
              }}>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"#63b3ed", letterSpacing:".1em", marginBottom:12 }}>
                  STEP {item.step}
                </div>
                <div style={{ fontSize:32, marginBottom:12 }}>{item.icon}</div>
                <div style={{ fontSize:15, fontWeight:700, color:"#e8edf5", marginBottom:8, fontFamily:"'Sora',sans-serif" }}>
                  {item.title}
                </div>
                <div style={{ fontSize:13, color:"#6b7f99", lineHeight:1.65, fontFamily:"'Sora',sans-serif" }}>
                  {item.desc}
                </div>
              </div>
              {i < 3 && (
                <div style={{ display:"flex", alignItems:"center", padding:"0 4px", color:"#2d3748", fontSize:20, flexShrink:0 }}>→</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA BOTTOM ── */}
      <section style={{ ...s.section, textAlign:"center", paddingBottom:80 }}>
        <div style={{
          background:"rgba(99,179,237,.05)", border:"1px solid rgba(99,179,237,.15)",
          borderRadius:24, padding:"56px 40px", maxWidth:600, margin:"0 auto",
        }}>
          <div style={{ fontSize:48, marginBottom:16 }}>🚀</div>
          <h2 style={{ fontSize:28, fontWeight:800, color:"#e8edf5", marginBottom:12, fontFamily:"'Sora',sans-serif" }}>
            Ready to level up?
          </h2>
          <p style={{ fontSize:15, color:"#6b7f99", lineHeight:1.7, marginBottom:32, fontFamily:"'Sora',sans-serif" }}>
            Join thousands of candidates who practice smarter, get better feedback, and walk into interviews with confidence.
          </p>
          <button className="start-btn" onClick={() => navigate("/setup")}>
            Begin Your Interview →
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={s.footer}>
        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"#2d3748", letterSpacing:".08em" }}>
          INTERVIEWAI · AI-POWERED MOCK INTERVIEWS · FREE TO USE
        </div>
      </footer>
    </div>
  );
}

/* ── Styles ── */
const s = {
  page: {
    minHeight:"100vh", background:"#070b14",
    fontFamily:"'Sora',sans-serif", color:"#e8edf5",
    position:"relative", overflowX:"hidden",
  },
  grid: {
    position:"fixed", inset:0, zIndex:0,
    backgroundImage:"linear-gradient(rgba(99,179,237,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(99,179,237,.025) 1px,transparent 1px)",
    backgroundSize:"64px 64px", pointerEvents:"none",
  },
  nav: {
    position:"sticky", top:0, zIndex:100,
    display:"flex", alignItems:"center", justifyContent:"space-between",
    padding:"14px 32px",
    background:"rgba(7,11,20,.85)", backdropFilter:"blur(20px)",
    borderBottom:"1px solid rgba(99,179,237,.08)",
  },
  navLogo: {
    width:34, height:34, borderRadius:10, fontSize:18,
    background:"linear-gradient(135deg,rgba(99,179,237,.2),rgba(49,130,206,.2))",
    border:"1px solid rgba(99,179,237,.25)",
    display:"flex", alignItems:"center", justifyContent:"center",
  },
  navBrand: {
    fontSize:15, fontWeight:700, color:"#e8edf5",
    fontFamily:"'DM Mono',monospace", letterSpacing:".04em",
  },
  xpPill: {
    display:"flex", alignItems:"center", gap:8,
    background:"rgba(255,255,255,.04)", border:"1px solid rgba(99,179,237,.12)",
    borderRadius:99, padding:"6px 14px",
  },
  navBtn: {
    background:"rgba(99,179,237,.12)", border:"1px solid rgba(99,179,237,.3)",
    color:"#63b3ed", borderRadius:8, padding:"8px 18px",
    fontSize:13, fontWeight:700, cursor:"pointer",
    fontFamily:"'DM Mono',monospace", transition:"all .2s",
  },
  hero: {
    position:"relative", zIndex:1,
    display:"flex", flexDirection:"column", alignItems:"center",
    padding:"80px 24px 60px", textAlign:"center",
  },
  tickerBadge: {
    display:"flex", alignItems:"center", gap:10,
    background:"rgba(255,255,255,.04)", border:"1px solid rgba(99,179,237,.15)",
    borderRadius:99, padding:"8px 18px", marginBottom:32,
  },
  headline: {
    fontSize:"clamp(40px,7vw,76px)", fontWeight:800, lineHeight:1.1,
    color:"#e8edf5", marginBottom:16, letterSpacing:"-.03em",
    animation:"fadeUp .8s ease forwards",
  },
  headlineAccent: {
    color:"#63b3ed",
    animation:"glow 3s ease-in-out infinite",
  },
  sub: {
    fontSize:17, color:"#6b7f99", lineHeight:1.75,
    maxWidth:520, marginBottom:32,
    animation:"fadeUp .9s .1s ease both",
  },
  pill: {
    background:"rgba(255,255,255,.04)", border:"1px solid rgba(99,179,237,.18)",
    borderRadius:99, padding:"7px 16px", fontSize:13,
    color:"#8ab4d4", fontFamily:"'DM Mono',monospace",
    letterSpacing:".03em",
  },
  section: {
    position:"relative", zIndex:1,
    maxWidth:1100, margin:"0 auto", padding:"48px 24px",
  },
  sectionLabel: {
    fontFamily:"'DM Mono',monospace", fontSize:11, color:"#4a5568",
    letterSpacing:".14em", textTransform:"uppercase", marginBottom:12, textAlign:"center",
  },
  sectionTitle: {
    fontSize:"clamp(22px,4vw,34px)", fontWeight:800, color:"#e8edf5",
    textAlign:"center", letterSpacing:"-.02em", marginBottom:8,
  },
  statsGrid: {
    display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",
    gap:16, marginTop:24,
  },
  featuresGrid: {
    display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",
    gap:16, marginTop:24,
  },
  footer: {
    position:"relative", zIndex:1,
    borderTop:"1px solid rgba(99,179,237,.06)",
    padding:"24px", textAlign:"center",
  },
};