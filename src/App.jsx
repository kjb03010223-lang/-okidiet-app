import { useState, useEffect, useRef } from "react";

// ─── Config ───────────────────────────────────────────────────────────────────
const GOAL_DATE_STR = "2025-06-09";
const SK = "okidiet_v4";

const CHECKLIST_ITEMS = [
  { id:"c1", label:"カロリー 1,400 kcal以内", emoji:"🍱" },
  { id:"c2", label:"タンパク質 120g", emoji:"🥩" },
  { id:"c3", label:"脂質 40g以内", emoji:"🫒" },
  { id:"c4", label:"炭水化物 130〜150g", emoji:"🍙" },
  { id:"c5", label:"歩数 7,000歩", emoji:"👟" },
  { id:"c6", label:"ジム有酸素 45分", emoji:"🏃‍♀️" },
  { id:"c7", label:"散歩 20分", emoji:"🚶‍♀️" },
];
const GOALS = { kcal:1400, protein:120, fat:40, carb:150 };

function getDaysLeft() {
  // Use a fixed "today" calculation based on real calendar
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  const todayMs = Date.UTC(y, m, d);
  const goalMs  = Date.UTC(2025, 5, 9); // June = month 5
  return Math.max(0, Math.ceil((goalMs - todayMs) / 86400000));
}

function todayKey() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;
}

function load()      { try { return JSON.parse(localStorage.getItem(SK)) || {}; } catch { return {}; } }
function persist(d)  { localStorage.setItem(SK, JSON.stringify(d)); }

// ─── UI atoms ─────────────────────────────────────────────────────────────────
function Glass({ children, style={} }) {
  return (
    <div style={{
      background:"rgba(255,255,255,0.10)", backdropFilter:"blur(20px)",
      WebkitBackdropFilter:"blur(20px)", borderRadius:24,
      border:"1px solid rgba(255,255,255,0.22)",
      padding:"18px 16px", marginBottom:14,
      boxShadow:"0 8px 32px rgba(0,30,80,0.18), inset 0 1px 0 rgba(255,255,255,0.15)",
      ...style
    }}>{children}</div>
  );
}

function SecLabel({ children }) {
  return <div style={{ fontSize:10, fontWeight:700, letterSpacing:2.5, textTransform:"uppercase",
    color:"rgba(255,255,255,0.5)", marginBottom:12, fontFamily:"'DM Sans',sans-serif" }}>{children}</div>;
}

function Ring({ pct, c1, c2, size=64, stroke=6, children }) {
  const uid = useRef(`r${Math.random().toString(36).slice(2,6)}`).current;
  const r = (size-stroke)/2, circ = 2*Math.PI*r, dash = Math.min(pct/100,1)*circ;
  return (
    <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
        <defs>
          <linearGradient id={uid} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={c1}/><stop offset="100%" stopColor={c2}/>
          </linearGradient>
        </defs>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`url(#${uid})`} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={circ-dash} strokeLinecap="round"
          style={{ transition:"stroke-dashoffset 0.7s cubic-bezier(.4,0,.2,1)" }}/>
      </svg>
      <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",
        fontSize:10,fontWeight:800,color:"#fff",fontFamily:"'DM Sans',sans-serif" }}>{children}</div>
    </div>
  );
}

function Bar({ label, value, target, c, unit }) {
  const pct = Math.min((value||0)/target*100,100);
  const over = (value||0)>target;
  return (
    <div style={{ marginBottom:11 }}>
      <div style={{ display:"flex",justifyContent:"space-between",fontSize:12,
        fontWeight:600,color:"rgba(255,255,255,0.85)",marginBottom:4 }}>
        <span>{label}</span>
        <span style={{ color:over?"#ffb3b3":"rgba(255,255,255,0.5)" }}>{value??0}{unit}/{target}{unit}</span>
      </div>
      <div style={{ height:5,background:"rgba(255,255,255,0.1)",borderRadius:99,overflow:"hidden" }}>
        <div style={{ height:"100%",width:`${pct}%`,background:over?"#ffb3b3":c,borderRadius:99,transition:"width 0.6s" }}/>
      </div>
    </div>
  );
}

// ─── Editable record row ──────────────────────────────────────────────────────
function EditableRecord({ dateKey, record, onSave, onDelete }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    kcal: record.kcal ?? "", burn: record.burn ?? "",
    protein: record.protein ?? "", fat: record.fat ?? "",
    carb: record.carb ?? "", weight: record.weight ?? "",
  });
  const hf = e => setF(p=>({...p,[e.target.name]:e.target.value}));
  const n = v => v!==""?parseFloat(v):null;

  function save() {
    const kcal=n(f.kcal), burn=n(f.burn);
    const balance=(kcal??0)-(burn??0);
    onSave(dateKey, { ...record, kcal, burn, balance, wChange:parseFloat((balance/7200).toFixed(3)),
      protein:n(f.protein), fat:n(f.fat), carb:n(f.carb), weight:n(f.weight), ts:new Date().toISOString() });
    setOpen(false);
  }

  const inpSm = {
    width:"100%", padding:"9px 11px", borderRadius:12,
    border:"1px solid rgba(255,255,255,0.2)",
    background:"rgba(255,255,255,0.08)",
    color:"#fff", fontSize:14, fontFamily:"'DM Sans',sans-serif",
    fontWeight:600, outline:"none", boxSizing:"border-box",
  };
  const lbl = { fontSize:9,letterSpacing:1.5,textTransform:"uppercase",
    color:"rgba(255,255,255,0.45)",display:"block",marginBottom:4,fontWeight:700 };

  const ck = Object.values(record.checks||{}).filter(Boolean).length;

  return (
    <Glass style={{ marginBottom:10, padding:"14px 14px" }}>
      <div onClick={()=>setOpen(o=>!o)} style={{ cursor:"pointer" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <span style={{ fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.9)",letterSpacing:0.5 }}>
            📅 {dateKey}
          </span>
          <div style={{ display:"flex",gap:6,alignItems:"center" }}>
            <span style={{ fontSize:10,fontWeight:700,letterSpacing:1,
              background:"rgba(100,220,180,0.15)",color:"rgba(150,255,220,0.8)",
              border:"1px solid rgba(100,220,180,0.25)",borderRadius:99,padding:"2px 8px" }}>
              ✓ {ck}/{CHECKLIST_ITEMS.length}
            </span>
            <span style={{ fontSize:16,color:"rgba(255,255,255,0.4)",transition:"transform 0.25s",
              transform:open?"rotate(180deg)":"rotate(0)" }}>⌄</span>
          </div>
        </div>
        <div style={{ display:"flex",gap:5,flexWrap:"wrap",marginTop:8 }}>
          {[
            {l:"摂取",v:record.kcal,u:"kcal",c:"rgba(255,180,80,0.8)"},
            {l:"消費",v:record.burn,u:"kcal",c:"rgba(100,220,180,0.8)"},
            {l:"P",v:record.protein,u:"g",c:"rgba(255,160,180,0.8)"},
            {l:"F",v:record.fat,u:"g",c:"rgba(255,200,120,0.8)"},
            {l:"C",v:record.carb,u:"g",c:"rgba(160,220,255,0.8)"},
            record.weight!=null&&{l:"体重",v:record.weight,u:"kg",c:"rgba(200,160,255,0.9)"},
          ].filter(Boolean).filter(x=>x.v!=null).map(x=>(
            <span key={x.l} style={{ fontSize:11,fontWeight:700,
              background:"rgba(255,255,255,0.07)",color:x.c,
              borderRadius:99,padding:"2px 8px",border:"1px solid rgba(255,255,255,0.08)" }}>
              {x.l} {x.v}{x.u}
            </span>
          ))}
        </div>
      </div>

      {open && (
        <div style={{ marginTop:14,borderTop:"1px solid rgba(255,255,255,0.1)",paddingTop:14 }}>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10 }}>
            {[
              {name:"kcal",label:"摂取kcal"},{name:"burn",label:"消費kcal"},
              {name:"protein",label:"P (g)"},{name:"fat",label:"F (g)"},
              {name:"carb",label:"C (g)"},{name:"weight",label:"体重 (kg)"},
            ].map(fi=>(
              <div key={fi.name}>
                <label style={lbl}>{fi.label}</label>
                <input style={inpSm} type="number" name={fi.name}
                  value={f[fi.name]} onChange={hf} inputMode="decimal"/>
              </div>
            ))}
          </div>
          <div style={{ display:"flex",gap:8 }}>
            <button onClick={save} style={{
              flex:1,padding:"10px",borderRadius:14,border:"none",cursor:"pointer",
              background:"linear-gradient(135deg,rgba(100,220,180,0.4),rgba(96,210,224,0.4))",
              color:"#fff",fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:13,
              border:"1px solid rgba(100,220,180,0.4)",
            }}>保存 ✓</button>
            <button onClick={()=>{ if(confirm("この記録を削除しますか？")) onDelete(dateKey); }} style={{
              padding:"10px 16px",borderRadius:14,border:"1px solid rgba(255,120,120,0.3)",
              background:"rgba(255,100,100,0.12)",color:"rgba(255,180,180,0.9)",
              fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:13,cursor:"pointer",
            }}>削除</button>
          </div>
        </div>
      )}
    </Glass>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [records, setRecords] = useState(load);
  const [tab, setTab]         = useState("today");
  const [f, setF]             = useState({ kcal:"",burn:"",weight:"",protein:"",fat:"",carb:"" });
  const [checks, setChecks]   = useState({});
  const [flash, setFlash]     = useState(false);

  const dk = todayKey();
  const daysLeft = getDaysLeft();

  useEffect(()=>{
    const r = records[dk]||{};
    setF({ kcal:r.kcal??"",burn:r.burn??"",weight:r.weight??"",
      protein:r.protein??"",fat:r.fat??"",carb:r.carb??"" });
    setChecks(r.checks||{});
  },[]);

  useEffect(()=>{ persist(records); },[records]);

  const hf = e => setF(p=>({...p,[e.target.name]:e.target.value}));

  function toggleCheck(id) {
    const next = {...checks,[id]:!checks[id]};
    setChecks(next);
    setRecords(p=>({...p,[dk]:{...(p[dk]||{}),checks:next}}));
  }

  function saveToday() {
    const n = v => v!==""?parseFloat(v):null;
    const kcal=n(f.kcal), burn=n(f.burn);
    const balance=(kcal??0)-(burn??0);
    setRecords(p=>({...p,[dk]:{...(p[dk]||{}),kcal,burn,balance,
      wChange:parseFloat((balance/7200).toFixed(3)),
      weight:n(f.weight),protein:n(f.protein),fat:n(f.fat),carb:n(f.carb),
      checks,ts:new Date().toISOString()}}));
    setFlash(true); setTimeout(()=>setFlash(false),1800);
  }

  function updateRecord(dateKey, newRec) {
    setRecords(p=>({...p,[dateKey]:newRec}));
  }
  function deleteRecord(dateKey) {
    setRecords(p=>{ const next={...p}; delete next[dateKey]; return next; });
  }

  const tr = records[dk]||{};
  const sortedDates = Object.keys(records).sort();

  // Projected weight
  function projWeight(upTo) {
    let base=null;
    for(const d of sortedDates){ if(records[d]?.weight!=null){base=records[d].weight;break;} }
    if(base==null) return null;
    let w=base;
    for(const d of sortedDates){
      if(d>upTo) break;
      w+=records[d]?.wChange??0;
    }
    return parseFloat(w.toFixed(2));
  }

  // Totals for "これまで" tab
  const allDates = sortedDates;
  const totals = allDates.reduce((acc,d)=>{
    const r=records[d];
    acc.days++;
    if(r.kcal!=null)    { acc.kcal+=r.kcal;    acc.kcalDays++; }
    if(r.burn!=null)    { acc.burn+=r.burn;     acc.burnDays++; }
    if(r.protein!=null) { acc.protein+=r.protein; acc.pfcDays++; }
    if(r.fat!=null)     { acc.fat+=r.fat; }
    if(r.carb!=null)    { acc.carb+=r.carb; }
    acc.balance+=r.balance??0;
    acc.wChange+=r.wChange??0;
    acc.checkDone+=Object.values(r.checks||{}).filter(Boolean).length;
    acc.checkTotal+=CHECKLIST_ITEMS.length;
    return acc;
  },{ days:0,kcal:0,kcalDays:0,burn:0,burnDays:0,protein:0,fat:0,carb:0,pfcDays:0,
      balance:0,wChange:0,checkDone:0,checkTotal:0 });

  const avgKcal  = totals.kcalDays  ? Math.round(totals.kcal/totals.kcalDays)  : null;
  const avgBurn  = totals.burnDays  ? Math.round(totals.burn/totals.burnDays)  : null;
  const avgP     = totals.pfcDays   ? Math.round(totals.protein/totals.pfcDays): null;
  const avgF     = totals.pfcDays   ? Math.round(totals.fat/totals.pfcDays)    : null;
  const avgC     = totals.pfcDays   ? Math.round(totals.carb/totals.pfcDays)   : null;

  // Weights for trend
  const weightEntries = sortedDates.filter(d=>records[d]?.weight!=null)
    .map(d=>({d,w:records[d].weight}));
  const firstW = weightEntries[0]?.w ?? null;
  const lastW  = weightEntries[weightEntries.length-1]?.w ?? null;

  const checkDone = Object.values(checks).filter(Boolean).length;

  // ── Styles
  const inp = {
    width:"100%",padding:"13px 16px",borderRadius:16,
    border:"1px solid rgba(255,255,255,0.22)",
    background:"rgba(255,255,255,0.09)",backdropFilter:"blur(8px)",
    color:"#fff",fontSize:16,fontFamily:"'DM Sans',sans-serif",
    fontWeight:600,outline:"none",boxSizing:"border-box",
  };
  const lbl = {
    fontSize:10,letterSpacing:1.8,textTransform:"uppercase",
    color:"rgba(255,255,255,0.5)",display:"block",marginBottom:6,
    fontFamily:"'DM Sans',sans-serif",fontWeight:700,
  };

  const TABS = [
    {id:"today",  icon:"🌊", label:"今日"},
    {id:"total",  icon:"📊", label:"これまで"},
    {id:"record", icon:"✏️",  label:"記録"},
    {id:"edit",   icon:"🔧",  label:"修正"},
  ];

  return (
    <div style={{ minHeight:"100vh",position:"relative",overflowX:"hidden",
      // Sunset-ocean gradient: deep navy → ocean blue → teal → warm sunset horizon → peach glow at bottom
      background:"linear-gradient(180deg, #0f1f4a 0%, #1a3a6b 12%, #1b6ca8 28%, #2196c4 42%, #5bc4c4 56%, #e8905a 72%, #f0b87a 84%, #f7d4a0 95%, #fcebd4 100%)",
      fontFamily:"'DM Sans',sans-serif" }}>

      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=Playfair+Display:ital@0;1&display=swap" rel="stylesheet"/>

      <style>{`
        input::placeholder{color:rgba(255,255,255,0.25);}
        input:focus{border-color:rgba(255,200,120,0.6)!important;background:rgba(255,255,255,0.15)!important;}
        *{-webkit-tap-highlight-color:transparent;box-sizing:border-box;}
        @keyframes rise{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes bubble{0%{transform:translateY(0)}50%{transform:translateY(-14px)}100%{transform:translateY(0)}}
        @keyframes sway{0%{transform:rotate(-2deg)}50%{transform:rotate(2deg)}100%{transform:rotate(-2deg)}}
        @keyframes sunpulse{0%{opacity:0.5}50%{opacity:0.8}100%{opacity:0.5}}
        .rise{animation:rise 0.5s cubic-bezier(.2,.8,.2,1) both;}
      `}</style>

      {/* ── BG layers ── */}
      {/* Sunset horizon glow */}
      <div style={{ position:"fixed",top:"58%",left:0,right:0,height:120,pointerEvents:"none",zIndex:0,
        background:"linear-gradient(180deg,transparent,rgba(232,144,90,0.25),rgba(240,184,122,0.15),transparent)",
        animation:"sunpulse 4s ease-in-out infinite" }}/>
      {/* Underwater caustic (upper) */}
      <div style={{ position:"fixed",top:0,left:0,right:0,height:"55%",pointerEvents:"none",zIndex:0,
        background:"radial-gradient(ellipse 60% 40% at 50% 10%,rgba(255,220,100,0.1) 0%,transparent 70%)" }}/>
      {/* Bubbles */}
      {[8,22,38,55,68,82,14,47,76].map((l,i)=>(
        <div key={i} style={{
          position:"fixed",left:`${l}%`,bottom:`${[8,20,5,35,12,28,52,18,42][i]}%`,
          width:[7,4,9,5,4,8,6,4,5][i],height:[7,4,9,5,4,8,6,4,5][i],
          borderRadius:"50%",border:"1px solid rgba(255,255,255,0.35)",
          background:"rgba(255,255,255,0.06)",
          animation:`bubble ${[4.5,6,5,7,3.5,5.5,4,6.5,5][i]}s ease-in-out ${[0,1,2,0.5,1.5,0.3,0.8,2,1.2][i]}s infinite`,
          pointerEvents:"none",zIndex:0,
        }}/>
      ))}
      {/* Seaweed */}
      {[4,91].map((l,i)=>(
        <div key={i} style={{ position:"fixed",bottom:0,left:`${l}%`,pointerEvents:"none",zIndex:0,
          opacity:0.35,animation:`sway ${2.5+i*0.5}s ease-in-out infinite`,transformOrigin:"bottom center" }}>
          {[0,1,2,3].map(j=>(
            <div key={j} style={{ width:13,height:32,borderRadius:i===0?"50% 0 50% 50%":"0 50% 50% 50%",
              background:"rgba(50,160,100,0.65)",marginTop:-6 }}/>
          ))}
        </div>
      ))}

      {/* ── HERO ── */}
      <div style={{ position:"relative",zIndex:1,textAlign:"center",padding:"40px 24px 24px",color:"#fff" }}>
        {/* Horizon shimmer line */}
        <div style={{ position:"absolute",top:80,left:"50%",transform:"translateX(-50%)",
          width:"130%",height:1,
          background:"linear-gradient(90deg,transparent,rgba(255,200,100,0.5),rgba(255,140,80,0.35),transparent)",
          filter:"blur(1px)",pointerEvents:"none" }}/>
        {/* Sun glow */}
        <div style={{ position:"absolute",top:60,left:"50%",transform:"translateX(-50%)",
          width:80,height:40,borderRadius:"50%",
          background:"radial-gradient(ellipse,rgba(255,200,80,0.25) 0%,transparent 70%)",
          filter:"blur(8px)",pointerEvents:"none" }}/>

        <div style={{ fontSize:10,letterSpacing:4,fontWeight:700,color:"rgba(255,255,255,0.55)",marginBottom:8 }}>
          OKINAWA JOURNEY
        </div>
        <div style={{ fontFamily:"'Playfair Display',serif",fontSize:28,fontStyle:"italic",color:"#fff",
          textShadow:"0 2px 20px rgba(0,60,120,0.5)",marginBottom:4 }}>
          Dive into your best self
        </div>
        <div style={{ fontSize:11,color:"rgba(255,220,160,0.75)",letterSpacing:0.5,marginBottom:22 }}>
          6月9日の沖縄まで、一緒に泳ぎ切ろう 🌊
        </div>

        {/* Countdown */}
        <div style={{ position:"relative",display:"inline-block" }}>
          <svg width={220} height={110} style={{ position:"absolute",top:-14,left:"50%",
            transform:"translateX(-50%)",opacity:0.45 }}>
            <path d="M15,95 A95,95 0 0,1 205,95" fill="none"
              stroke="url(#hg)" strokeWidth={1.5}/>
            <defs>
              <linearGradient id="hg" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="transparent"/>
                <stop offset="30%" stopColor="#ffd080"/>
                <stop offset="70%" stopColor="#ff9060"/>
                <stop offset="100%" stopColor="transparent"/>
              </linearGradient>
            </defs>
          </svg>
          <div style={{
            background:"rgba(255,255,255,0.09)",backdropFilter:"blur(20px)",
            WebkitBackdropFilter:"blur(20px)",
            border:"1px solid rgba(255,255,255,0.25)",borderRadius:28,
            padding:"18px 52px",
            boxShadow:"0 16px 48px rgba(0,20,60,0.3),inset 0 1px 0 rgba(255,255,255,0.18)",
          }}>
            <div style={{ fontFamily:"'Playfair Display',serif",fontSize:60,color:"#fff",lineHeight:1,fontWeight:400,
              textShadow:"0 4px 20px rgba(0,80,160,0.4)" }}>
              {daysLeft}
            </div>
            <div style={{ fontSize:9,letterSpacing:3,color:"rgba(255,220,160,0.8)",fontWeight:700,marginTop:6 }}>
              DAYS TO GO ✈️
            </div>
          </div>
        </div>
      </div>

      {/* Wave */}
      <svg viewBox="0 0 1440 48" style={{ display:"block",position:"relative",zIndex:1,marginBottom:-1 }}>
        <path d="M0,24 C320,48 560,0 720,24 C880,48 1120,0 1440,24 L1440,48 L0,48 Z"
          fill="rgba(255,255,255,0.06)"/>
      </svg>

      {/* ── TABS ── */}
      <div style={{ position:"sticky",top:0,zIndex:20,padding:"8px 12px 8px",
        backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",
        background:"rgba(10,30,70,0.35)",borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display:"flex",gap:6 }}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              flex:1,padding:"9px 2px",borderRadius:13,border:"none",cursor:"pointer",
              fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:11,
              transition:"all 0.25s cubic-bezier(.2,.8,.2,1)",letterSpacing:0.3,
              background: tab===t.id
                ? "linear-gradient(135deg,rgba(255,200,100,0.25),rgba(255,130,80,0.2))"
                : "transparent",
              color: tab===t.id ? "rgba(255,220,150,0.95)" : "rgba(255,255,255,0.38)",
              boxShadow: tab===t.id ? "0 2px 12px rgba(0,0,0,0.2),inset 0 1px 0 rgba(255,255,255,0.1)" : "none",
              border: tab===t.id ? "1px solid rgba(255,180,80,0.3)" : "1px solid transparent",
            }}>
              {t.icon}<br/>{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ padding:"14px 13px 70px",position:"relative",zIndex:1 }}>

        {/* ════ 今日 ════ */}
        {tab==="today" && (
          <div className="rise">
            {/* Balance */}
            <Glass>
              <SecLabel>⚡️ 今日のカロリー収支</SecLabel>
              <div style={{ display:"flex",justifyContent:"space-around",marginBottom:14 }}>
                {[
                  {label:"摂取",val:tr.kcal,unit:"kcal",c:"rgba(255,190,90,0.9)"},
                  {label:"消費",val:tr.burn,unit:"kcal",c:"rgba(100,220,200,0.9)"},
                ].map(s=>(
                  <div key={s.label} style={{ textAlign:"center" }}>
                    <div style={{ fontSize:30,fontWeight:900,color:"#fff",lineHeight:1 }}>{s.val??"-"}</div>
                    <div style={{ fontSize:10,color:s.c,fontWeight:700,letterSpacing:1,marginTop:3 }}>{s.label} {s.unit}</div>
                  </div>
                ))}
              </div>
              {tr.balance!=null && (
                <div style={{ textAlign:"center" }}>
                  <div style={{ display:"inline-block",padding:"7px 22px",borderRadius:99,
                    background:tr.balance<=0?"rgba(100,220,180,0.15)":"rgba(255,120,80,0.15)",
                    border:`1px solid ${tr.balance<=0?"rgba(100,220,180,0.4)":"rgba(255,120,80,0.3)"}` }}>
                    <span style={{ fontSize:15,fontWeight:800,color:tr.balance<=0?"#80ffcc":"#ffb3a0" }}>
                      {tr.balance>0?"+":""}{tr.balance} kcal
                    </span>
                    <span style={{ fontSize:11,color:"rgba(255,255,255,0.4)",marginLeft:8 }}>
                      {tr.wChange!=null?`${tr.wChange>0?"▲":"▼"} ${Math.abs(tr.wChange)}kg`:""}
                    </span>
                  </div>
                </div>
              )}
            </Glass>

            {/* PFC rings */}
            <Glass>
              <SecLabel>💪 PFCバランス</SecLabel>
              <div style={{ display:"flex",justifyContent:"space-around" }}>
                {[
                  {key:"protein",label:"P",sub:"タンパク質",goal:120,c1:"#ff9a9e",c2:"#fecfef"},
                  {key:"fat",    label:"F",sub:"脂質",      goal:40, c1:"#ffecd2",c2:"#fcb69f"},
                  {key:"carb",   label:"C",sub:"炭水化物",  goal:150,c1:"#a1ffce",c2:"#60e0e0"},
                ].map(p=>(
                  <div key={p.key} style={{ textAlign:"center" }}>
                    <Ring pct={(tr[p.key]||0)/p.goal*100} c1={p.c1} c2={p.c2} size={66} stroke={7}>
                      {Math.round((tr[p.key]||0)/p.goal*100)}%
                    </Ring>
                    <div style={{ fontSize:14,fontWeight:900,color:"#fff",marginTop:5 }}>
                      {tr[p.key]??0}<span style={{ fontSize:10 }}>g</span>
                    </div>
                    <div style={{ fontSize:9,color:"rgba(255,255,255,0.45)",fontWeight:700,letterSpacing:1 }}>{p.label} / {p.goal}g</div>
                  </div>
                ))}
              </div>
            </Glass>

            {/* Weight */}
            <Glass>
              <SecLabel>⚖️ 体重チェック</SecLabel>
              {tr.weight!=null ? (
                <>
                  <div style={{ display:"flex",justifyContent:"space-around",alignItems:"center" }}>
                    {[{label:"実績",val:tr.weight,c:"rgba(255,190,90,0.95)"},
                      {label:"予測",val:projWeight(dk),c:"rgba(100,220,200,0.95)"}].map(w=>(
                      <div key={w.label} style={{ textAlign:"center" }}>
                        <div style={{ fontSize:9,fontWeight:700,letterSpacing:2,color:"rgba(255,255,255,0.45)",marginBottom:5 }}>{w.label}</div>
                        <div style={{ fontFamily:"'Playfair Display',serif",fontSize:38,color:w.c,lineHeight:1 }}>{w.val??"-"}</div>
                        <div style={{ fontSize:10,color:"rgba(255,255,255,0.35)" }}>kg</div>
                      </div>
                    ))}
                  </div>
                  {projWeight(dk)!=null && (
                    <div style={{ textAlign:"center",marginTop:10,fontSize:12,fontWeight:700,
                      color:(tr.weight-projWeight(dk))<=0?"#80ffcc":"#ffb3a0" }}>
                      差: {parseFloat((tr.weight-projWeight(dk)).toFixed(2))>0?"+":""}
                      {parseFloat((tr.weight-projWeight(dk)).toFixed(2))} kg
                    </div>
                  )}
                </>
              ) : (
                <p style={{ color:"rgba(255,255,255,0.3)",textAlign:"center",fontSize:13 }}>
                  記録タブで体重を入力してね 🌊
                </p>
              )}
            </Glass>

            {/* Goals bars */}
            <Glass>
              <SecLabel>🎯 目標 vs 記録</SecLabel>
              <Bar label="カロリー" value={tr.kcal} target={1400} c="linear-gradient(90deg,#ffecd2,#fcb69f)" unit="kcal"/>
              <Bar label="タンパク質" value={tr.protein} target={120} c="linear-gradient(90deg,#ff9a9e,#fecfef)" unit="g"/>
              <Bar label="脂質" value={tr.fat} target={40} c="linear-gradient(90deg,#fbc2eb,#a18cd1)" unit="g"/>
              <Bar label="炭水化物" value={tr.carb} target={150} c="linear-gradient(90deg,#a1ffce,#60e0e0)" unit="g"/>
            </Glass>

            {/* Checklist */}
            <Glass>
              <SecLabel>✅ 今日のミッション {checkDone}/{CHECKLIST_ITEMS.length}</SecLabel>
              {CHECKLIST_ITEMS.map(item=>(
                <div key={item.id} onClick={()=>toggleCheck(item.id)} style={{
                  display:"flex",alignItems:"center",gap:10,
                  padding:"8px 10px",borderRadius:12,marginBottom:5,cursor:"pointer",
                  background:checks[item.id]?"rgba(100,220,180,0.12)":"rgba(255,255,255,0.04)",
                  border:`1px solid ${checks[item.id]?"rgba(100,220,180,0.35)":"rgba(255,255,255,0.07)"}`,
                  transition:"all 0.2s",
                }}>
                  <div style={{ width:20,height:20,borderRadius:7,flexShrink:0,
                    background:checks[item.id]?"linear-gradient(135deg,#4cd9b0,#5ec8f2)":"rgba(255,255,255,0.08)",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    border:`1px solid ${checks[item.id]?"transparent":"rgba(255,255,255,0.15)"}` }}>
                    {checks[item.id]&&<span style={{ color:"#fff",fontSize:11 }}>✓</span>}
                  </div>
                  <span style={{ fontSize:13 }}>{item.emoji}</span>
                  <span style={{ fontSize:12,fontWeight:600,transition:"all 0.2s",
                    color:checks[item.id]?"rgba(160,255,220,0.9)":"rgba(255,255,255,0.7)",
                    textDecoration:checks[item.id]?"line-through":"none" }}>{item.label}</span>
                </div>
              ))}
            </Glass>
          </div>
        )}

        {/* ════ これまで ════ */}
        {tab==="total" && (
          <div className="rise">
            <Glass style={{ textAlign:"center" }}>
              <SecLabel>📅 記録期間</SecLabel>
              <div style={{ fontFamily:"'Playfair Display',serif",fontSize:48,color:"#fff",lineHeight:1 }}>{totals.days}</div>
              <div style={{ fontSize:10,letterSpacing:2,color:"rgba(255,200,120,0.8)",fontWeight:700,marginTop:4 }}>DAYS RECORDED</div>
            </Glass>

            <Glass>
              <SecLabel>🔥 カロリー累計</SecLabel>
              {[
                {label:"総摂取",val:totals.kcal,unit:"kcal",c:"rgba(255,190,90,0.9)"},
                {label:"総消費",val:totals.burn,unit:"kcal",c:"rgba(100,220,200,0.9)"},
                {label:"総収支",val:totals.balance,unit:"kcal",c:totals.balance<=0?"rgba(100,220,180,0.9)":"rgba(255,130,100,0.9)"},
                {label:"平均摂取/日",val:avgKcal,unit:"kcal",c:"rgba(255,220,160,0.8)"},
                {label:"平均消費/日",val:avgBurn,unit:"kcal",c:"rgba(160,255,220,0.8)"},
              ].map(s=>(
                <div key={s.label} style={{ display:"flex",justifyContent:"space-between",
                  alignItems:"center",padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
                  <span style={{ fontSize:12,color:"rgba(255,255,255,0.6)",fontWeight:600 }}>{s.label}</span>
                  <span style={{ fontSize:15,fontWeight:800,color:s.c }}>{s.val??"-"}{s.val!=null?s.unit:""}</span>
                </div>
              ))}
            </Glass>

            <Glass>
              <SecLabel>💪 PFC 平均 / 日</SecLabel>
              <div style={{ display:"flex",justifyContent:"space-around" }}>
                {[
                  {label:"P タンパク質",val:avgP,goal:120,c1:"#ff9a9e",c2:"#fecfef"},
                  {label:"F 脂質",val:avgF,goal:40,c1:"#ffecd2",c2:"#fcb69f"},
                  {label:"C 炭水化物",val:avgC,goal:150,c1:"#a1ffce",c2:"#60e0e0"},
                ].map(p=>(
                  <div key={p.label} style={{ textAlign:"center" }}>
                    <Ring pct={(p.val||0)/p.goal*100} c1={p.c1} c2={p.c2} size={66} stroke={7}>
                      {p.val?Math.round(p.val/p.goal*100):0}%
                    </Ring>
                    <div style={{ fontSize:15,fontWeight:900,color:"#fff",marginTop:5 }}>
                      {p.val??"-"}<span style={{ fontSize:10 }}>g</span>
                    </div>
                    <div style={{ fontSize:9,color:"rgba(255,255,255,0.4)",fontWeight:700,marginTop:2 }}>{p.label}</div>
                  </div>
                ))}
              </div>
            </Glass>

            <Glass>
              <SecLabel>⚖️ 体重の推移</SecLabel>
              {weightEntries.length>=2 ? (
                <div style={{ display:"flex",justifyContent:"space-around",alignItems:"center" }}>
                  {[{label:"スタート",val:firstW,c:"rgba(255,190,90,0.9)"},
                    {label:"最新",val:lastW,c:"rgba(100,220,200,0.9)"}].map(w=>(
                    <div key={w.label} style={{ textAlign:"center" }}>
                      <div style={{ fontSize:9,letterSpacing:2,color:"rgba(255,255,255,0.4)",fontWeight:700,marginBottom:4 }}>{w.label}</div>
                      <div style={{ fontFamily:"'Playfair Display',serif",fontSize:36,color:w.c }}>{w.val}</div>
                      <div style={{ fontSize:10,color:"rgba(255,255,255,0.3)" }}>kg</div>
                    </div>
                  ))}
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontSize:9,letterSpacing:2,color:"rgba(255,255,255,0.4)",fontWeight:700,marginBottom:4 }}>変化</div>
                    <div style={{ fontFamily:"'Playfair Display',serif",fontSize:36,
                      color:(lastW-firstW)<=0?"#80ffcc":"#ffb3a0" }}>
                      {(lastW-firstW)>0?"+":""}{parseFloat((lastW-firstW).toFixed(2))}
                    </div>
                    <div style={{ fontSize:10,color:"rgba(255,255,255,0.3)" }}>kg</div>
                  </div>
                </div>
              ) : (
                <p style={{ color:"rgba(255,255,255,0.3)",textAlign:"center",fontSize:13 }}>
                  体重を2日以上記録すると推移が見られます
                </p>
              )}
            </Glass>

            <Glass>
              <SecLabel>✅ チェックリスト達成率</SecLabel>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontFamily:"'Playfair Display',serif",fontSize:44,color:"#fff" }}>
                  {totals.checkTotal ? Math.round(totals.checkDone/totals.checkTotal*100) : 0}
                  <span style={{ fontSize:20 }}>%</span>
                </div>
                <div style={{ fontSize:11,color:"rgba(255,200,120,0.7)",fontWeight:600,marginTop:4 }}>
                  {totals.checkDone} / {totals.checkTotal} items
                </div>
              </div>
              <div style={{ height:8,background:"rgba(255,255,255,0.1)",borderRadius:99,marginTop:12,overflow:"hidden" }}>
                <div style={{ height:"100%",borderRadius:99,
                  background:"linear-gradient(90deg,#a1ffce,#60e0e0,#fcb69f)",
                  width:`${totals.checkTotal?totals.checkDone/totals.checkTotal*100:0}%`,
                  transition:"width 0.8s" }}/>
              </div>
            </Glass>
          </div>
        )}

        {/* ════ 記録 ════ */}
        {tab==="record" && (
          <div className="rise">
            <Glass>
              <SecLabel>🎯 今日のミッション</SecLabel>
              {CHECKLIST_ITEMS.map(item=>(
                <div key={item.id} onClick={()=>toggleCheck(item.id)} style={{
                  display:"flex",alignItems:"center",gap:10,
                  padding:"10px 12px",borderRadius:14,marginBottom:6,cursor:"pointer",
                  background:checks[item.id]?"rgba(100,220,180,0.15)":"rgba(255,255,255,0.05)",
                  border:`1px solid ${checks[item.id]?"rgba(100,220,180,0.4)":"rgba(255,255,255,0.08)"}`,
                  transition:"all 0.22s",
                }}>
                  <div style={{ width:22,height:22,borderRadius:8,flexShrink:0,
                    background:checks[item.id]?"linear-gradient(135deg,#4cd9b0,#5ec8f2)":"rgba(255,255,255,0.09)",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    border:`1px solid ${checks[item.id]?"transparent":"rgba(255,255,255,0.18)"}`,transition:"all 0.22s" }}>
                    {checks[item.id]&&<span style={{ color:"#fff",fontSize:13,fontWeight:900 }}>✓</span>}
                  </div>
                  <span style={{ fontSize:14 }}>{item.emoji}</span>
                  <span style={{ fontSize:13,fontWeight:600,transition:"all 0.22s",
                    color:checks[item.id]?"rgba(160,255,220,0.9)":"rgba(255,255,255,0.78)",
                    textDecoration:checks[item.id]?"line-through":"none" }}>{item.label}</span>
                </div>
              ))}
            </Glass>

            <Glass>
              <SecLabel>🍱 食事の記録</SecLabel>
              {[{name:"kcal",label:"摂取カロリー",ph:"1400"},
                {name:"protein",label:"タンパク質 P (g)",ph:"120"},
                {name:"fat",label:"脂質 F (g)",ph:"40"},
                {name:"carb",label:"炭水化物 C (g)",ph:"140"}].map(fi=>(
                <div key={fi.name} style={{ marginBottom:12 }}>
                  <label style={lbl}>{fi.label}</label>
                  <input style={inp} type="number" name={fi.name}
                    value={f[fi.name]} onChange={hf} placeholder={fi.ph} inputMode="decimal"/>
                </div>
              ))}
            </Glass>

            <Glass>
              <SecLabel>🏃‍♀️ 運動 & 体重</SecLabel>
              <div style={{ marginBottom:12 }}>
                <label style={lbl}>消費カロリー (kcal)</label>
                <input style={inp} type="number" name="burn" value={f.burn}
                  onChange={hf} placeholder="300" inputMode="numeric"/>
              </div>
              <div>
                <label style={lbl}>今日の体重 (kg)</label>
                <input style={inp} type="number" name="weight" value={f.weight}
                  onChange={hf} placeholder="57.5" inputMode="decimal" step="0.1"/>
              </div>
            </Glass>

            <button onClick={saveToday} style={{
              width:"100%",padding:"16px",borderRadius:20,
              background:flash
                ?"linear-gradient(135deg,rgba(100,220,180,0.35),rgba(96,210,224,0.35))"
                :"linear-gradient(135deg,rgba(255,200,100,0.25),rgba(255,140,80,0.2))",
              backdropFilter:"blur(12px)",
              color:"#fff",fontFamily:"'Playfair Display',serif",
              fontStyle:"italic",fontSize:18,cursor:"pointer",
              border:"1px solid rgba(255,200,100,0.35)",
              boxShadow:"0 8px 32px rgba(0,30,80,0.25)",
              transition:"all 0.3s",
            }}>
              {flash ? "✓ Saved!" : "Save today's record 🌊"}
            </button>
          </div>
        )}

        {/* ════ 修正 ════ */}
        {tab==="edit" && (
          <div className="rise">
            <Glass style={{ marginBottom:14 }}>
              <SecLabel>🔧 記録の修正・削除</SecLabel>
              <p style={{ fontSize:12,color:"rgba(255,255,255,0.5)",margin:0,lineHeight:1.6 }}>
                タップして展開 → 数値を変えて「保存」で上書きできます。
                今日の記録は「記録」タブからも更新できます。
              </p>
            </Glass>
            {sortedDates.length===0 ? (
              <div style={{ textAlign:"center",padding:"40px 0",color:"rgba(255,255,255,0.3)",fontWeight:700 }}>
                <div style={{ fontSize:40,marginBottom:12 }}>🌊</div>まだ記録がないよ
              </div>
            ) : [...sortedDates].reverse().map(d=>(
              <EditableRecord key={d} dateKey={d} record={records[d]}
                onSave={updateRecord} onDelete={deleteRecord}/>
            ))}
          </div>
        )}
      </div>

      {/* Bottom coral SVG */}
      <div style={{ position:"fixed",bottom:0,left:0,right:0,pointerEvents:"none",zIndex:0 }}>
        <svg viewBox="0 0 400 70" style={{ display:"block",width:"100%",opacity:0.2 }}>
          <path d="M20,70 L20,46 Q24,28 28,46 L28,70" fill="#ff8080"/>
          <path d="M28,70 L28,36 Q32,18 36,36 L36,70" fill="#ff8080"/>
          <path d="M360,70 L360,42 Q364,24 368,42 L368,70" fill="#c0a0e0"/>
          <path d="M368,70 L368,52 Q372,36 376,52 L376,70" fill="#c0a0e0"/>
          <path d="M160,70 Q162,52 158,36 Q162,50 166,30 Q163,50 168,64 L168,70" fill="#50b080"/>
          <path d="M230,70 Q232,48 228,34 Q233,48 237,28 Q234,48 240,60 L240,70" fill="#50b080"/>
          <ellipse cx="100" cy="68" rx="9" ry="5" fill="#f0d090" opacity="0.8"/>
          <ellipse cx="300" cy="67" rx="7" ry="4" fill="#e0b8f0" opacity="0.8"/>
        </svg>
      </div>
    </div>
  );
}
