// client/src/pages/Setup.jsx

import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

const DIFFICULTIES = ["Easy", "Medium", "Hard"];
const EXPERIENCES  = ["Fresher", "1–3 Years", "3–5 Years", "5+ Years"];

const CATEGORIES = [
  { id:"technical",     icon:"💻", label:"Technical",       desc:"DSA, coding, CS fundamentals" },
  { id:"hr",            icon:"🤝", label:"HR & Behavioral", desc:"STAR method, soft skills" },
  { id:"system_design", icon:"🏗️", label:"System Design",   desc:"Architecture, scalability" },
  { id:"domain",        icon:"🧠", label:"Domain / Role",   desc:"Role-specific expertise" },
  { id:"mixed",         icon:"🎲", label:"Mixed",           desc:"All of the above, randomized" },
];

const MODES = [
  { id:"text",  icon:"⌨️", label:"Text Mode",  desc:"Type your answers in chat" },
  { id:"audio", icon:"🎙️", label:"Audio Mode", desc:"Speak your answers via mic" },
];

export default function Setup() {
  const navigate = useNavigate();
  const fileRef  = useRef(null);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name:"", company:"", role:"", experience:"",
    difficulty:"", category:"mixed", mode:"text",
  });
  const [resumeFile, setResumeFile]       = useState(null);
  const [resumeText, setResumeText]       = useState("");
  const [resumeLoading, setResumeLoading] = useState(false);
  const [errors, setErrors]               = useState({});
  const [dragOver, setDragOver]           = useState(false);

  const set = (field, value) => { setForm(f => ({ ...f, [field]:value })); setErrors(e => ({ ...e, [field]:"" })); };
  const handleChange = (e) => set(e.target.name, e.target.value);

  const handleFile = (file) => {
    if (!file) return;
    setResumeFile(file);
    setResumeLoading(true);
    if (file.type === "text/plain") {
      const r = new FileReader();
      r.onload = (ev) => { setResumeText(ev.target.result?.slice(0,3000)||""); setResumeLoading(false); };
      r.onerror = () => setResumeLoading(false);
      r.readAsText(file);
    } else {
      setResumeText(`[Uploaded: ${file.name}]`);
      setResumeLoading(false);
    }
  };

  const validateStep1 = () => {
    const e = {};
    if (!form.name.trim())    e.name       = "Name is required";
    if (!form.company.trim()) e.company    = "Company is required";
    if (!form.role.trim())    e.role       = "Role is required";
    if (!form.experience)     e.experience = "Select experience level";
    return e;
  };

  const handleNext = () => {
    const errs = validateStep1();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setStep(2);
  };

  const handleSubmit = () => {
    if (!form.difficulty) { setErrors({ difficulty:"Select a difficulty" }); return; }
    navigate("/chat", { state:{ setup:{ ...form, audioMode:form.mode==="audio", resumeText:resumeText||null } } });
  };

  const diffCol = {
    Easy:   { c:"#22c55e", bg:"rgba(34,197,94,.12)",  b:"rgba(34,197,94,.35)"  },
    Medium: { c:"#f59e0b", bg:"rgba(245,158,11,.12)", b:"rgba(245,158,11,.35)" },
    Hard:   { c:"#ef4444", bg:"rgba(239,68,68,.12)",  b:"rgba(239,68,68,.35)"  },
  };

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing:border-box; margin:0; padding:0; }
        input:focus { outline:none; border-color:rgba(99,179,237,.5)!important; box-shadow:0 0 0 3px rgba(99,179,237,.08); }
        input::placeholder { color:#2d3748; }
        .opt:hover  { border-color:rgba(99,179,237,.4)!important; background:rgba(99,179,237,.06)!important; }
        .card-sel-hover:hover { border-color:rgba(99,179,237,.35)!important; transform:translateY(-2px); }
        .submit-btn:hover { opacity:.9; transform:translateY(-2px); }
        .submit-btn:active { transform:translateY(0); }
        .back-link:hover { color:#63b3ed!important; }
        .drop:hover { border-color:rgba(99,179,237,.4)!important; background:rgba(99,179,237,.04)!important; }
        .remove-btn:hover { color:#f87171!important; }
      `}</style>

      <div style={s.grid}/>

      <button className="back-link" onClick={() => step===1 ? navigate("/") : setStep(1)}
        style={{ position:"fixed", top:20, left:24, zIndex:50, background:"rgba(255,255,255,.04)", border:"1px solid rgba(99,179,237,.15)", color:"#8899b4", borderRadius:10, padding:"8px 16px", fontSize:13, cursor:"pointer", fontFamily:"'DM Mono',monospace", transition:"color .2s" }}
      >← {step===1?"Home":"Back"}</button>

      <div style={{ position:"relative", zIndex:1, width:"100%", maxWidth:560 }}>
        <div style={s.card}>

          {/* Progress */}
          <div style={{ marginBottom:28 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"#4a5568", letterSpacing:".1em" }}>STEP {step} OF 2</span>
              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"#63b3ed" }}>{step===1?"Basic Info":"Preferences"}</span>
            </div>
            <div style={{ height:4, background:"rgba(255,255,255,.06)", borderRadius:99, overflow:"hidden" }}>
              <div style={{ height:"100%", borderRadius:99, background:"linear-gradient(90deg,#3182ce,#63b3ed)", width:step===1?"50%":"100%", transition:"width .4s cubic-bezier(.4,0,.2,1)" }}/>
            </div>
          </div>

          <h2 style={s.title}>{step===1?"Setup Your Interview":"Customize Your Session"}</h2>
          <p style={s.sub}>{step===1?"Tell us about the role you're targeting.":"Pick difficulty, topic focus, and interview mode."}</p>

          {/* ══ STEP 1 ══ */}
          {step===1 && (
            <div key="step1" style={{ animation:"fadeUp .35s ease" }}>
              <F label="Your Name" error={errors.name}>
                <input style={{...s.inp,...(errors.name?s.inpErr:{})}} name="name" placeholder="e.g. Afnan Nayyar" value={form.name} onChange={handleChange} autoFocus/>
              </F>
              <F label="Target Company" error={errors.company}>
                <input style={{...s.inp,...(errors.company?s.inpErr:{})}} name="company" placeholder="e.g. Google, Amazon" value={form.company} onChange={handleChange}/>
              </F>
              <F label="Job Role" error={errors.role}>
                <input style={{...s.inp,...(errors.role?s.inpErr:{})}} name="role" placeholder="e.g. ML Engineer, Data Analyst" value={form.role} onChange={handleChange}/>
              </F>
              <F label="Experience Level" error={errors.experience}>
                <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
                  {EXPERIENCES.map(exp=>(
                    <button key={exp} className="opt" onClick={()=>set("experience",exp)}
                      style={{...s.opt,...(form.experience===exp?s.optSel:{})}}>{exp}</button>
                  ))}
                </div>
              </F>

              {/* Resume upload */}
              <F label="Resume / CV (Optional — AI generates personalized questions)">
                <div className="drop"
                  onDragOver={e=>{e.preventDefault();setDragOver(true)}}
                  onDragLeave={()=>setDragOver(false)}
                  onDrop={e=>{e.preventDefault();setDragOver(false);handleFile(e.dataTransfer.files[0])}}
                  onClick={()=>fileRef.current?.click()}
                  style={{ border:`2px dashed ${dragOver?"rgba(99,179,237,.5)":resumeFile?"rgba(34,197,94,.4)":"rgba(99,179,237,.18)"}`, borderRadius:12, padding:"22px 16px", textAlign:"center", cursor:"pointer", background:resumeFile?"rgba(34,197,94,.03)":"rgba(255,255,255,.02)", transition:"all .2s" }}
                >
                  <input ref={fileRef} type="file" accept=".pdf,.txt,.docx" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])}/>
                  {resumeLoading ? (
                    <div style={{color:"#63b3ed",fontSize:13}}>⏳ Reading resume...</div>
                  ) : resumeFile ? (
                    <div>
                      <div style={{fontSize:24,marginBottom:6}}>✅</div>
                      <div style={{fontSize:13,color:"#22c55e",fontWeight:700}}>{resumeFile.name}</div>
                      <div style={{fontSize:11,color:"#4a5568",marginTop:3}}>AI will tailor questions to your resume</div>
                      <button className="remove-btn" onClick={e=>{e.stopPropagation();setResumeFile(null);setResumeText("");}}
                        style={{marginTop:8,fontSize:11,color:"#9ca3af",background:"none",border:"none",cursor:"pointer",transition:"color .2s"}}>✕ Remove</button>
                    </div>
                  ) : (
                    <div>
                      <div style={{fontSize:32,marginBottom:8}}>📄</div>
                      <div style={{fontSize:13,color:"#8899b4",fontWeight:600}}>Drop your resume here</div>
                      <div style={{fontSize:11,color:"#4a5568",marginTop:3}}>PDF · DOCX · TXT</div>
                      <div style={{fontSize:11,color:"#63b3ed",marginTop:8,fontFamily:"'DM Mono',monospace"}}>Click to browse</div>
                    </div>
                  )}
                </div>
              </F>

              <button className="submit-btn" onClick={handleNext} style={{...s.btn,marginTop:8}}>Next: Preferences →</button>
            </div>
          )}

          {/* ══ STEP 2 ══ */}
          {step===2 && (
            <div key="step2" style={{ animation:"fadeUp .35s ease" }}>

              <F label="Difficulty" error={errors.difficulty}>
                <div style={{display:"flex",gap:10}}>
                  {DIFFICULTIES.map(d=>{
                    const col=diffCol[d]; const sel=form.difficulty===d;
                    return(
                      <button key={d} className="opt" onClick={()=>set("difficulty",d)}
                        style={{...s.opt,...(sel?{borderColor:col.b,color:col.c,background:col.bg,boxShadow:`0 0 16px ${col.bg}`}:{}),flex:1,justifyContent:"center"}}>
                        {d==="Easy"?"🟢":d==="Medium"?"🟡":"🔴"} {d}
                      </button>
                    );
                  })}
                </div>
              </F>

              <F label="Question Category — What should the AI focus on?">
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  {CATEGORIES.map(cat=>{
                    const sel=form.category===cat.id;
                    return(
                      <div key={cat.id} className="card-sel-hover" onClick={()=>set("category",cat.id)}
                        style={{ border:`1px solid ${sel?"rgba(99,179,237,.5)":"rgba(99,179,237,.12)"}`, background:sel?"rgba(99,179,237,.1)":"rgba(255,255,255,.02)", borderRadius:12, padding:"14px", cursor:"pointer", transition:"all .2s", boxShadow:sel?"0 0 20px rgba(99,179,237,.1)":"none" }}>
                        <div style={{fontSize:22,marginBottom:5}}>{cat.icon}</div>
                        <div style={{fontSize:13,fontWeight:700,color:sel?"#63b3ed":"#a0b8d0",marginBottom:3}}>{cat.label}</div>
                        <div style={{fontSize:11,color:"#4a5568",lineHeight:1.4}}>{cat.desc}</div>
                      </div>
                    );
                  })}
                </div>
              </F>

              <F label="Interview Mode">
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  {MODES.map(m=>{
                    const sel=form.mode===m.id;
                    return(
                      <div key={m.id} className="card-sel-hover" onClick={()=>set("mode",m.id)}
                        style={{ border:`1px solid ${sel?"rgba(99,179,237,.5)":"rgba(99,179,237,.12)"}`, background:sel?"rgba(99,179,237,.1)":"rgba(255,255,255,.02)", borderRadius:12, padding:"16px", cursor:"pointer", transition:"all .2s", display:"flex", alignItems:"center", gap:12 }}>
                        <div style={{fontSize:26}}>{m.icon}</div>
                        <div>
                          <div style={{fontSize:14,fontWeight:700,color:sel?"#63b3ed":"#a0b8d0"}}>{m.label}</div>
                          <div style={{fontSize:11,color:"#4a5568"}}>{m.desc}</div>
                        </div>
                        {sel&&<div style={{marginLeft:"auto",width:8,height:8,borderRadius:"50%",background:"#63b3ed",boxShadow:"0 0 8px #63b3ed"}}/>}
                      </div>
                    );
                  })}
                </div>
              </F>

              {/* Summary */}
              {form.name&&form.difficulty&&(
                <div style={{display:"flex",alignItems:"flex-start",gap:12,background:"rgba(99,179,237,.05)",border:"1px solid rgba(99,179,237,.15)",borderRadius:12,padding:"14px 16px",marginBottom:20}}>
                  <span style={{fontSize:20}}>🎯</span>
                  <div style={{fontSize:13,color:"#8899b4",lineHeight:1.7}}>
                    <strong style={{color:"#63b3ed"}}>{form.name}</strong> · <strong style={{color:"#63b3ed"}}>{form.role}</strong> @ <strong style={{color:"#63b3ed"}}>{form.company}</strong><br/>
                    <span style={{fontSize:11,color:"#4a5568"}}>
                      {form.experience} · {form.difficulty} · {CATEGORIES.find(c=>c.id===form.category)?.label} · {form.mode==="audio"?"🎙️ Audio":"⌨️ Text"}{resumeFile?" · 📄 Resume":""}
                    </span>
                  </div>
                </div>
              )}

              <div style={{display:"flex",gap:12}}>
                <button onClick={()=>setStep(1)}
                  style={{flex:1,background:"rgba(255,255,255,.04)",border:"1px solid rgba(99,179,237,.15)",color:"#63b3ed",borderRadius:12,padding:"14px",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"'Sora',sans-serif",transition:"all .2s"}}>
                  ← Back
                </button>
                <button className="submit-btn" onClick={handleSubmit} style={{...s.btn,flex:2,marginTop:0}}>
                  Begin Interview →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function F({ label, error, children }) {
  return (
    <div style={{ marginBottom:22 }}>
      <label style={{ display:"block", fontSize:11, color:"#4a5568", marginBottom:8, fontFamily:"'DM Mono',monospace", letterSpacing:".1em", textTransform:"uppercase" }}>{label}</label>
      {children}
      {error && <p style={{ color:"#fc8181", fontSize:12, marginTop:6, fontFamily:"'DM Mono',monospace" }}>⚠ {error}</p>}
    </div>
  );
}

const s = {
  page:  { minHeight:"100vh", background:"#070b14", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Sora',sans-serif", position:"relative", padding:"60px 16px" },
  grid:  { position:"fixed", inset:0, backgroundImage:"linear-gradient(rgba(99,179,237,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(99,179,237,.025) 1px,transparent 1px)", backgroundSize:"64px 64px", pointerEvents:"none" },
  card:  { background:"rgba(255,255,255,.03)", border:"1px solid rgba(99,179,237,.12)", borderRadius:20, padding:"36px 40px", backdropFilter:"blur(16px)", boxSizing:"border-box", boxShadow:"0 0 80px rgba(99,179,237,.05),0 40px 80px rgba(0,0,0,.4)" },
  title: { fontSize:26, fontWeight:800, color:"#e8edf5", margin:"0 0 8px", letterSpacing:"-.02em" },
  sub:   { fontSize:14, color:"#6b7f99", margin:"0 0 28px", lineHeight:1.6 },
  inp:   { width:"100%", background:"rgba(255,255,255,.05)", border:"1px solid rgba(99,179,237,.18)", borderRadius:10, padding:"12px 16px", color:"#e8edf5", fontSize:15, outline:"none", boxSizing:"border-box", transition:"all .2s", fontFamily:"'Sora',sans-serif" },
  inpErr:{ borderColor:"rgba(252,129,129,.5)" },
  opt:   { background:"rgba(255,255,255,.04)", border:"1px solid rgba(99,179,237,.18)", color:"#8899b4", borderRadius:8, padding:"9px 18px", fontSize:14, cursor:"pointer", fontFamily:"'Sora',sans-serif", transition:"all .18s", display:"flex", alignItems:"center", gap:6 },
  optSel:{ borderColor:"rgba(99,179,237,.55)", color:"#63b3ed", background:"rgba(99,179,237,.12)" },
  btn:   { width:"100%", background:"linear-gradient(135deg,#3182ce,#63b3ed)", color:"#070b14", border:"none", borderRadius:12, padding:"15px", fontSize:16, fontWeight:800, cursor:"pointer", fontFamily:"'Sora',sans-serif", letterSpacing:".01em", boxShadow:"0 4px 24px rgba(99,179,237,.25)", transition:"all .25s" },
};