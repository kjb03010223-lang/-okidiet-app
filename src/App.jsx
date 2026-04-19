import { useState, useEffect, useRef } from "react";

// ─── Config ───────────────────────────────────────────────────────────────────
const BMR = 1280; // 基礎代謝
const SK = "okidiet_v5";

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
  const now = new Date();
  const todayMs = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const goalMs  = Date.UTC(2026, 5, 9);
  return Math.max(0, Math.ceil((goalMs - todayMs) / 86400000));
}

function todayKey() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;
}

function load()     { try { return JSON.parse(localStorage.getItem(SK)) || {}; } catch { return {}; } }
function persist(d) { localStorage.setItem(SK, JSON.stringify(d)); }

function sumMeals(meals=[]) {
  return meals.reduce((acc, m) => ({
    kcal:    acc.kcal    + (parseFloat(m.kcal)    || 0),
    protein: acc.protein + (parseFloat(m.protein) || 0),
    fat:     acc.fat     + (parseFloat(m.fat)      || 0),
    carb:    acc.carb    + (parseFloat(m.carb)     || 0),
  }), { kcal:0, protein:0, fat:0, carb:0 });
}

function sumExercise(exercises=[]) {
  return exercises.reduce((acc, e) => acc + (parseFloat(e.kcal) || 0), 0);
}

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
        <span style={{ color:over?"#ffb3b3":"rgba(255,255,255,0.5)" }}>{Math.round(value??0)}{unit}/{target}{unit}</span>
      </div>
      <div style={{ height:5,background:"rgba(255,255,255,0.1)",borderRadius:99,overflow:"hidden" }}>
        <div style={{ height:"100%",width:`${pct}%`,background:over?"#ffb3b3":c,borderRadius:99,transition:"width 0.6s" }}/>
      </div>
    </div>
  );
}

// ─── Meal entry row ───────────────────────────────────────────────────────────
function MealRow({ meal, onDelete }) {
  return (
    <div style={{ display:"flex",alignItems:"center",gap:6,padding:"7px 10px",
      borderRadius:12,marginBottom:5,background:"rgba(255,255,255,0.06)",
      border:"1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.85)" }}>{meal.name||"食事"}</div>
        <div style={{ display:"flex",gap:6,marginTop:2,flexWrap:"wrap" }}>
          {[
            {l:"kcal",v:meal.kcal,c:"rgba(255,190,90,0.8)"},
            meal.protein&&{l:"P",v:meal.protein+"g",c:"rgba(255,160,180,0.8)"},
            meal.fat&&{l:"F",v:meal.fat+"g",c:"rgba(255,200,120,0.8)"},
            meal.carb&&{l:"C",v:meal.carb+"g",c:"rgba(160,220,255,0.8)"},
          ].filter(Boolean).map(x=>(
            <span key={x.l} style={{ fontSize:10,fontWeight:700,color:x.c }}>{x.l} {x.v}</span>
          ))}
        </div>
      </div>
      <button onClick={onDelete} style={{ background:"rgba(255,80,80,0.15)",border:"1px solid rgba(255,80,80,0.25)",
        color:"rgba(255,160,160,0.8)",borderRadius:8,padding:"4px 8px",cursor:"pointer",fontSize:12 }}>✕</button>
    </div>
  );
}

// ─── Exercise entry row ───────────────────────────────────────────────────────
function ExerciseRow({ ex, onDelete }) {
  return (
    <div style={{ display:"flex",alignItems:"center",gap:6,padding:"7px 10px",
      borderRadius:12,marginBottom:5,background:"rgba(100,220,180,0.06)",
      border:"1px solid rgba(100,220,180,0.12)" }}>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.85)" }}>{ex.name||"運動"}</div>
        <div style={{ display:"flex",gap:6,marginTop:2 }}>
          {ex.kcal&&<span style={{ fontSize:10,fontWeight:700,color:"rgba(100,220,180,0.85)" }}>🔥 {ex.kcal} kcal</span>}
          {ex.duration&&<span style={{ fontSize:10,fontWeight:700,color:"rgba(160,220,255,0.7)" }}>⏱ {ex.duration}分</span>}
        </div>
      </div>
      <button onClick={onDelete} style={{ background:"rgba(255,80,80,0.15)",border:"1px solid rgba(255,80,80,0.25)",
        color:"rgba(255,160,160,0.8)",borderRadius:8,padding:"4px 8px",cursor:"pointer",fontSize:12 }}>✕</button>
    </div>
  );
}

// ─── Editable record row (edit tab) ──────────────────────────────────────────
function EditableRecord({ dateKey, record, onSave, onDelete }) {
  const [open, setOpen] = useState(false);
  const meals = record.meals || [];
  const exercises = record.exercises || [];
  const totals = sumMeals(meals);
  const burnEx = sumExercise(exercises);
  const totalBurn = BMR + burnEx;
  const balance = totals.kcal - totalBurn;

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
            {l:"摂取",v:Math.round(totals.kcal),u:"kcal",c:"rgba(255,180,80,0.8)"},
            {l:"消費計",v:Math.round(totalBurn),u:"kcal",c:"rgba(100,220,180,0.8)"},
            {l:"P",v:Math.round(totals.protein),u:"g",c:"rgba(255,160,180,0.8)"},
            record.weight!=null&&{l:"体重",v:record.weight,u:"kg",c:"rgba(200,160,255,0.9)"},
          ].filter(Boolean).map(x=>(
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
          <div style={{ fontSize:11,color:"rgba(255,255,255,0.45)",marginBottom:8 }}>
            食事 {meals.length}件 / 運動 {exercises.length}件
            {record.weight!=null && ` / 体重 ${record.weight}kg`}
          </div>
          <div style={{ display:"flex",gap:8 }}>
            <button onClick={()=>{ if(confirm("この記録を削除しますか？")) onDelete(dateKey); }} style={{
              flex:1,padding:"10px 16px",borderRadius:14,border:"1px solid rgba(255,120,120,0.3)",
              background:"rgba(255,100,100,0.12)",color:"rgba(255,180,180,0.9)",
              fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:13,cursor:"pointer",
            }}>この日の記録を削除</button>
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
  const [checks, setChecks]   = useState({});

  // Meal form
  const [mealF, setMealF] = useState({ name:"", kcal:"", protein:"", fat:"", carb:"" });
  // Exercise form
  const [exF, setExF]     = useState({ name:"", kcal:"", duration:"" });
  // Weight form
  const [weightF, setWeightF] = useState("");

  const [flashMeal, setFlashMeal]   = useState(false);
  const [flashEx, setFlashEx]       = useState(false);
  const [flashW, setFlashW]         = useState(false);

  const dk = todayKey();
  const daysLeft = getDaysLeft();

  useEffect(()=>{
    const r = records[dk]||{};
    setChecks(r.checks||{});
    setWeightF(r.weight!=null ? r.weight : "");
  },[]);

  useEffect(()=>{ persist(records); },[records]);

  function getToday() { return records[dk]||{ meals:[], exercises:[], checks:{} }; }

  function toggleCheck(id) {
    const next = {...checks,[id]:!checks[id]};
    setChecks(next);
    setRecords(p=>({...p,[dk]:{...getToday(),...(p[dk]||{}),checks:next}}));
  }

  function addMeal() {
    if(!mealF.kcal) return;
    const meal = { id:Date.now(), name:mealF.name||"食事", kcal:parseFloat(mealF.kcal)||0,
      protein:parseFloat(mealF.protein)||0, fat:parseFloat(mealF.fat)||0, carb:parseFloat(mealF.carb)||0 };
    const today = getToday();
    const meals = [...(today.meals||[]), meal];
    setRecords(p=>({...p,[dk]:{...today,...(p[dk]||{}),meals,checks}}));
    setMealF({ name:"", kcal:"", protein:"", fat:"", carb:"" });
    setFlashMeal(true); setTimeout(()=>setFlashMeal(false),1500);
  }

  function deleteMeal(id) {
    const today = { ...getToday(), ...(records[dk]||{}) };
    const meals = (today.meals||[]).filter(m=>m.id!==id);
    setRecords(p=>({...p,[dk]:{...today,meals}}));
  }

  function addExercise() {
    if(!exF.kcal && !exF.duration) return;
    const ex = { id:Date.now(), name:exF.name||"運動", kcal:parseFloat(exF.kcal)||0, duration:parseFloat(exF.duration)||0 };
    const today = { ...getToday(), ...(records[dk]||{}) };
    const exercises = [...(today.exercises||[]), ex];
    setRecords(p=>({...p,[dk]:{...today,exercises}}));
    setExF({ name:"", kcal:"", duration:"" });
    setFlashEx(true); setTimeout(()=>setFlashEx(false),1500);
  }

  function deleteExercise(id) {
    const today = { ...getToday(), ...(records[dk]||{}) };
    const exercises = (today.exercises||[]).filter(e=>e.id!==id);
    setRecords(p=>({...p,[dk]:{...today,exercises}}));
  }

  function saveWeight() {
    if(weightF==="") return;
    const today = { ...getToday(), ...(records[dk]||{}) };
    setRecords(p=>({...p,[dk]:{...today,weight:parseFloat(weightF)}}));
    setFlashW(true); setTimeout(()=>setFlashW(false),1500);
  }

  function deleteRecord(dateKey) {
    setRecords(p=>{ const next={...p}; delete next[dateKey]; return next; });
  }

  // Today's computed totals
  const todayRec = records[dk]||{ meals:[], exercises:[], checks:{} };
  const todayMeals = todayRec.meals||[];
  const todayEx    = todayRec.exercises||[];
  const mTotals    = sumMeals(todayMeals);
  const exBurn     = sumExercise(todayEx);
  const totalBurn  = BMR + exBurn;
  const balance    = Math.round(mTotals.kcal - totalBurn);
  const wChange    = parseFloat((balance/7200).toFixed(3));

  const sortedDates = Object.keys(records).sort();
  const checkDone   = Object.values(checks).filter(Boolean).length;

  // Weight trend
  const weightEntries = sortedDates.filter(d=>records[d]?.weight!=null)
    .map(d=>({d,w:records[d].weight}));
  const firstW = weightEntries[0]?.w ?? null;
  const lastW  = weightEntries[weightEntries.length-1]?.w ?? null;

  // Totals across all days
  const allTotals = sortedDates.reduce((acc,d)=>{
    const r = records[d]||{};
    const mt = sumMeals(r.meals||[]);
    const eb = sumExercise(r.exercises||[]);
    const tb = BMR + eb;
    acc.days++;
    acc.kcal    += mt.kcal;
    acc.protein += mt.protein;
    acc.fat     += mt.fat;
    acc.carb    += mt.carb;
    acc.burn    += tb;
    acc.exBurn  += eb;
    acc.balance += mt.kcal - tb;
    acc.checkDone  += Object.values(r.checks||{}).filter(Boolean).length;
    acc.checkTotal += CHECKLIST_ITEMS.length;
    return acc;
  },{ days:0,kcal:0,protein:0,fat:0,carb:0,burn:0,exBurn:0,balance:0,checkDone:0,checkTotal:0 });

  const avgKcal = allTotals.days ? Math.round(allTotals.kcal/allTotals.days) : null;
  const avgBurn = allTotals.days ? Math.round(allTotals.burn/allTotals.days) : null;
  const avgP    = allTotals.days ? Math.round(allTotals.protein/allTotals.days) : null;
  const avgF    = allTotals.days ? Math.round(allTotals.fat/allTotals.days) : null;
  const avgC    = allTotals.days ? Math.round(allTotals.carb/allTotals.days) : null;

  // ── input styles
  const inp = {
    width:"100%",padding:"11px 14px",borderRadius:14,
    border:"1px solid rgba(255,255,255,0.22)",
    background:"rgba(255,255,255,0.09)",backdropFilter:"blur(8px)",
    color:"#fff",fontSize:15,fontFamily:"'DM Sans',sans-serif",
    fontWeight:600,outline:"none",boxSizing:"border-box",
  };
  const inpSm = { ...inp, padding:"9px 11px", fontSize:14, borderRadius:12 };
  const lbl = {
    fontSize:10,letterSpacing:1.8,textTransform:"uppercase",
    color:"rgba(255,255,255,0.5)",display:"block",marginBottom:5,
    fontFamily:"'DM Sans',sans-serif",fontWeight:700,
  };

  const TABS = [
    {id:"today",  icon:"🌊", label:"今日"},
    {id:"total",  icon:"📊", label:"これまで"},
    {id:"record", icon:"✏️",  label:"記録"},
    {id:"edit",   icon:"🔧",  label:"修正"},
  ];

  const addBtn = (flash, label, onClick, accent="rgba(255,200,100,0.25)") => (
    <button onClick={onClick} style={{
      width:"100%",padding:"12px",borderRadius:16,
      background:flash?"linear-gradient(135deg,rgba(100,220,180,0.35),rgba(96,210,224,0.35))":accent,
      backdropFilter:"blur(12px)",
      color:"#fff",fontFamily:"'DM Sans',sans-serif",
      fontWeight:700,fontSize:14,cursor:"pointer",
      border:"1px solid rgba(255,200,100,0.3)",
      boxShadow:"0 4px 16px rgba(0,30,80,0.2)",
      transition:"all 0.3s",marginTop:8,
    }}>
      {flash ? "✓ 追加しました！" : label}
    </button>
  );

  return (
    <div style={{ minHeight:"100vh",position:"relative",overflowX:"hidden",
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

      {/* BG layers */}
      <div style={{ position:"fixed",top:"58%",left:0,right:0,height:120,pointerEvents:"none",zIndex:0,
        background:"linear-gradient(180deg,transparent,rgba(232,144,90,0.25),rgba(240,184,122,0.15),transparent)",
        animation:"sunpulse 4s ease-in-out infinite" }}/>
      <div style={{ position:"fixed",top:0,left:0,right:0,height:"55%",pointerEvents:"none",zIndex:0,
        background:"radial-gradient(ellipse 60% 40% at 50% 10%,rgba(255,220,100,0.1) 0%,transparent 70%)" }}/>
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
      {[4,91].map((l,i)=>(
        <div key={i} style={{ position:"fixed",bottom:0,left:`${l}%`,pointerEvents:"none",zIndex:0,
          opacity:0.35,animation:`sway ${2.5+i*0.5}s ease-in-out infinite`,transformOrigin:"bottom center" }}>
          {[0,1,2,3].map(j=>(
            <div key={j} style={{ width:13,height:32,borderRadius:i===0?"50% 0 50% 50%":"0 50% 50% 50%",
              background:"rgba(50,160,100,0.65)",marginTop:-6 }}/>
          ))}
        </div>
      ))}

      {/* HERO */}
      <div style={{ position:"relative",zIndex:1,textAlign:"center",padding:"40px 24px 24px",color:"#fff" }}>
        <div style={{ position:"absolute",top:80,left:"50%",transform:"translateX(-50%)",
          width:"130%",height:1,
          background:"linear-gradient(90deg,transparent,rgba(255,200,100,0.5),rgba(255,140,80,0.35),transparent)",
          filter:"blur(1px)",pointerEvents:"none" }}/>
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

        <div style={{ position:"relative",display:"inline-block" }}>
          <svg width={220} height={110} style={{ position:"absolute",top:-14,left:"50%",
            transform:"translateX(-50%)",opacity:0.45 }}>
            <path d="M15,95 A95,95 0 0,1 205,95" fill="none" stroke="url(#hg)" strokeWidth={1.5}/>
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
              textShadow:"0 4px 20px rgba(0,80,160,0.4)" }}>{daysLeft}</div>
            <div style={{ fontSize:9,letterSpacing:3,color:"rgba(255,220,160,0.8)",fontWeight:700,marginTop:6 }}>
              DAYS TO GO ✈️
            </div>
          </div>
        </div>
      </div>

      <svg viewBox="0 0 1440 48" style={{ display:"block",position:"relative",zIndex:1,marginBottom:-1 }}>
        <path d="M0,24 C320,48 560,0 720,24 C880,48 1120,0 1440,24 L1440,48 L0,48 Z"
          fill="rgba(255,255,255,0.06)"/>
      </svg>

      {/* TABS */}
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
                ?"linear-gradient(135deg,rgba(255,200,100,0.25),rgba(255,130,80,0.2))"
                :"transparent",
              color: tab===t.id ? "rgba(255,220,150,0.95)" : "rgba(255,255,255,0.38)",
              boxShadow: tab===t.id ? "0 2px 12px rgba(0,0,0,0.2),inset 0 1px 0 rgba(255,255,255,0.1)" : "none",
              border: tab===t.id ? "1px solid rgba(255,180,80,0.3)" : "1px solid transparent",
            }}>
              {t.icon}<br/>{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ padding:"14px 13px 80px",position:"relative",zIndex:1 }}>

        {/* ════ 今日 ════ */}
        {tab==="today" && (
          <div className="rise">

            {/* Balance — BMR-based */}
            <Glass>
              <SecLabel>⚡️ 今日のカロリー収支</SecLabel>
              <div style={{ display:"flex",justifyContent:"space-around",marginBottom:14 }}>
                {[
                  {label:"摂取",val:Math.round(mTotals.kcal),unit:"kcal",c:"rgba(255,190,90,0.9)"},
                  {label:"消費計",val:Math.round(totalBurn),unit:"kcal",c:"rgba(100,220,200,0.9)"},
                ].map(s=>(
                  <div key={s.label} style={{ textAlign:"center" }}>
                    <div style={{ fontSize:30,fontWeight:900,color:"#fff",lineHeight:1 }}>{s.val??"-"}</div>
                    <div style={{ fontSize:10,color:s.c,fontWeight:700,letterSpacing:1,marginTop:3 }}>{s.label} {s.unit}</div>
                  </div>
                ))}
              </div>
              <div style={{ textAlign:"center",fontSize:11,color:"rgba(255,255,255,0.38)",marginBottom:10 }}>
                消費 = 基礎代謝 {BMR} + 運動 {Math.round(exBurn)} kcal
              </div>
              <div style={{ textAlign:"center" }}>
                <div style={{ display:"inline-block",padding:"7px 22px",borderRadius:99,
                  background:balance<=0?"rgba(100,220,180,0.15)":"rgba(255,120,80,0.15)",
                  border:`1px solid ${balance<=0?"rgba(100,220,180,0.4)":"rgba(255,120,80,0.3)"}` }}>
                  <span style={{ fontSize:15,fontWeight:800,color:balance<=0?"#80ffcc":"#ffb3a0" }}>
                    {balance>0?"+":""}{balance} kcal
                  </span>
                  <span style={{ fontSize:11,color:"rgba(255,255,255,0.4)",marginLeft:8 }}>
                    {wChange>0?"▲":"▼"} {Math.abs(wChange)}kg
                  </span>
                </div>
              </div>
            </Glass>

            {/* PFC rings */}
            <Glass>
              <SecLabel>💪 PFCバランス（本日合計）</SecLabel>
              <div style={{ display:"flex",justifyContent:"space-around" }}>
                {[
                  {key:"protein",label:"P",sub:"タンパク質",goal:120,val:mTotals.protein,c1:"#ff9a9e",c2:"#fecfef"},
                  {key:"fat",    label:"F",sub:"脂質",      goal:40, val:mTotals.fat,    c1:"#ffecd2",c2:"#fcb69f"},
                  {key:"carb",   label:"C",sub:"炭水化物",  goal:150,val:mTotals.carb,   c1:"#a1ffce",c2:"#60e0e0"},
                ].map(p=>(
                  <div key={p.key} style={{ textAlign:"center" }}>
                    <Ring pct={p.val/p.goal*100} c1={p.c1} c2={p.c2} size={66} stroke={7}>
                      {Math.round(p.val/p.goal*100)}%
                    </Ring>
                    <div style={{ fontSize:14,fontWeight:900,color:"#fff",marginTop:5 }}>
                      {Math.round(p.val)}<span style={{ fontSize:10 }}>g</span>
                    </div>
                    <div style={{ fontSize:9,color:"rgba(255,255,255,0.45)",fontWeight:700,letterSpacing:1 }}>{p.label} / {p.goal}g</div>
                  </div>
                ))}
              </div>
            </Glass>

            {/* Meals list */}
            {todayMeals.length>0 && (
              <Glass>
                <SecLabel>🍱 食事記録 ({todayMeals.length}件)</SecLabel>
                {todayMeals.map(m=>(
                  <MealRow key={m.id} meal={m} onDelete={()=>deleteMeal(m.id)}/>
                ))}
                <div style={{ display:"flex",justifyContent:"space-between",padding:"8px 10px",
                  borderTop:"1px solid rgba(255,255,255,0.1)",marginTop:4,
                  fontSize:12,fontWeight:700,color:"rgba(255,200,120,0.9)" }}>
                  <span>合計</span>
                  <span>{Math.round(mTotals.kcal)} kcal</span>
                </div>
              </Glass>
            )}

            {/* Exercise list */}
            {todayEx.length>0 && (
              <Glass>
                <SecLabel>🏃‍♀️ 運動記録 ({todayEx.length}件)</SecLabel>
                {todayEx.map(e=>(
                  <ExerciseRow key={e.id} ex={e} onDelete={()=>deleteExercise(e.id)}/>
                ))}
                <div style={{ display:"flex",justifyContent:"space-between",padding:"8px 10px",
                  borderTop:"1px solid rgba(255,255,255,0.1)",marginTop:4,
                  fontSize:12,fontWeight:700,color:"rgba(100,220,180,0.9)" }}>
                  <span>運動消費合計</span>
                  <span>{Math.round(exBurn)} kcal</span>
                </div>
              </Glass>
            )}

            {/* Weight */}
            <Glass>
              <SecLabel>⚖️ 体重チェック</SecLabel>
              {todayRec.weight!=null ? (
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontFamily:"'Playfair Display',serif",fontSize:48,
                    color:"rgba(255,190,90,0.95)",lineHeight:1 }}>{todayRec.weight}</div>
                  <div style={{ fontSize:10,color:"rgba(255,255,255,0.35)" }}>kg</div>
                </div>
              ) : (
                <p style={{ color:"rgba(255,255,255,0.3)",textAlign:"center",fontSize:13,margin:0 }}>
                  記録タブで体重を入力してね 🌊
                </p>
              )}
            </Glass>

            {/* Goals bars */}
            <Glass>
              <SecLabel>🎯 目標 vs 記録</SecLabel>
              <Bar label="カロリー" value={mTotals.kcal} target={1400} c="linear-gradient(90deg,#ffecd2,#fcb69f)" unit="kcal"/>
              <Bar label="タンパク質" value={mTotals.protein} target={120} c="linear-gradient(90deg,#ff9a9e,#fecfef)" unit="g"/>
              <Bar label="脂質" value={mTotals.fat} target={40} c="linear-gradient(90deg,#fbc2eb,#a18cd1)" unit="g"/>
              <Bar label="炭水化物" value={mTotals.carb} target={150} c="linear-gradient(90deg,#a1ffce,#60e0e0)" unit="g"/>
            </Glass>

            {/* Checklist — today tab only */}
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
              <div style={{ fontFamily:"'Playfair Display',serif",fontSize:48,color:"#fff",lineHeight:1 }}>{allTotals.days}</div>
              <div style={{ fontSize:10,letterSpacing:2,color:"rgba(255,200,120,0.8)",fontWeight:700,marginTop:4 }}>DAYS RECORDED</div>
            </Glass>

            <Glass>
              <SecLabel>🔥 カロリー累計</SecLabel>
              {[
                {label:"総摂取",val:Math.round(allTotals.kcal),unit:"kcal",c:"rgba(255,190,90,0.9)"},
                {label:"総消費（基礎+運動）",val:Math.round(allTotals.burn),unit:"kcal",c:"rgba(100,220,200,0.9)"},
                {label:"　うち運動消費",val:Math.round(allTotals.exBurn),unit:"kcal",c:"rgba(140,240,200,0.7)"},
                {label:"総収支",val:Math.round(allTotals.balance),unit:"kcal",c:allTotals.balance<=0?"rgba(100,220,180,0.9)":"rgba(255,130,100,0.9)"},
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
                  {allTotals.checkTotal ? Math.round(allTotals.checkDone/allTotals.checkTotal*100) : 0}
                  <span style={{ fontSize:20 }}>%</span>
                </div>
                <div style={{ fontSize:11,color:"rgba(255,200,120,0.7)",fontWeight:600,marginTop:4 }}>
                  {allTotals.checkDone} / {allTotals.checkTotal} items
                </div>
              </div>
              <div style={{ height:8,background:"rgba(255,255,255,0.1)",borderRadius:99,marginTop:12,overflow:"hidden" }}>
                <div style={{ height:"100%",borderRadius:99,
                  background:"linear-gradient(90deg,#a1ffce,#60e0e0,#fcb69f)",
                  width:`${allTotals.checkTotal?allTotals.checkDone/allTotals.checkTotal*100:0}%`,
                  transition:"width 0.8s" }}/>
              </div>
            </Glass>
          </div>
        )}

        {/* ════ 記録 ════ */}
        {tab==="record" && (
          <div className="rise">

            {/* 食事を追加 */}
            <Glass>
              <SecLabel>🍱 食事を追加</SecLabel>
              <div style={{ marginBottom:10 }}>
                <label style={lbl}>食事名（任意）</label>
                <input style={inpSm} type="text" placeholder="朝食 / ランチ / おやつ..."
                  value={mealF.name} onChange={e=>setMealF(p=>({...p,name:e.target.value}))}/>
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
                {[
                  {key:"kcal",label:"カロリー (kcal)",ph:"500"},
                  {key:"protein",label:"P タンパク質 (g)",ph:"30"},
                  {key:"fat",label:"F 脂質 (g)",ph:"15"},
                  {key:"carb",label:"C 炭水化物 (g)",ph:"60"},
                ].map(fi=>(
                  <div key={fi.key}>
                    <label style={lbl}>{fi.label}</label>
                    <input style={inpSm} type="number" placeholder={fi.ph} inputMode="decimal"
                      value={mealF[fi.key]} onChange={e=>setMealF(p=>({...p,[fi.key]:e.target.value}))}/>
                  </div>
                ))}
              </div>
              {addBtn(flashMeal, "食事を追加 🍽", addMeal, "linear-gradient(135deg,rgba(255,190,90,0.2),rgba(255,140,80,0.15))")}
            </Glass>

            {/* 運動を追加 */}
            <Glass>
              <SecLabel>🏃‍♀️ 運動を追加</SecLabel>
              <div style={{ marginBottom:10 }}>
                <label style={lbl}>運動名（任意）</label>
                <input style={inpSm} type="text" placeholder="ジム / ウォーキング / 水泳..."
                  value={exF.name} onChange={e=>setExF(p=>({...p,name:e.target.value}))}/>
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
                <div>
                  <label style={lbl}>消費カロリー (kcal)</label>
                  <input style={inpSm} type="number" placeholder="200" inputMode="numeric"
                    value={exF.kcal} onChange={e=>setExF(p=>({...p,kcal:e.target.value}))}/>
                </div>
                <div>
                  <label style={lbl}>時間 (分)</label>
                  <input style={inpSm} type="number" placeholder="45" inputMode="numeric"
                    value={exF.duration} onChange={e=>setExF(p=>({...p,duration:e.target.value}))}/>
                </div>
              </div>
              {addBtn(flashEx, "運動を追加 💪", addExercise, "linear-gradient(135deg,rgba(100,220,180,0.2),rgba(96,210,224,0.15))")}
            </Glass>

            {/* 体重を記録（別カード） */}
            <Glass>
              <SecLabel>⚖️ 体重を記録</SecLabel>
              <label style={lbl}>今日の体重 (kg)</label>
              <input style={inp} type="number" placeholder="57.5" inputMode="decimal" step="0.1"
                value={weightF} onChange={e=>setWeightF(e.target.value)}/>
              <button onClick={saveWeight} style={{
                width:"100%",padding:"12px",borderRadius:16,
                background:flashW
                  ?"linear-gradient(135deg,rgba(100,220,180,0.35),rgba(96,210,224,0.35))"
                  :"linear-gradient(135deg,rgba(200,160,255,0.2),rgba(160,120,220,0.15))",
                backdropFilter:"blur(12px)",
                color:"#fff",fontFamily:"'DM Sans',sans-serif",
                fontWeight:700,fontSize:14,cursor:"pointer",
                border:"1px solid rgba(200,160,255,0.3)",
                boxShadow:"0 4px 16px rgba(0,30,80,0.2)",
                transition:"all 0.3s",marginTop:8,
              }}>
                {flashW ? "✓ 保存しました！" : "体重を保存 ⚖️"}
              </button>
            </Glass>

            {/* Today's log summary */}
            {(todayMeals.length>0 || todayEx.length>0) && (
              <Glass>
                <SecLabel>📋 本日の記録まとめ</SecLabel>
                {todayMeals.length>0 && <>
                  <div style={{ fontSize:11,color:"rgba(255,200,120,0.7)",fontWeight:700,marginBottom:6 }}>
                    食事 {todayMeals.length}件 · 合計 {Math.round(mTotals.kcal)} kcal
                  </div>
                  {todayMeals.map(m=><MealRow key={m.id} meal={m} onDelete={()=>deleteMeal(m.id)}/>)}
                </>}
                {todayEx.length>0 && <>
                  <div style={{ fontSize:11,color:"rgba(100,220,180,0.7)",fontWeight:700,marginBottom:6,marginTop:8 }}>
                    運動 {todayEx.length}件 · 消費 {Math.round(exBurn)} kcal
                  </div>
                  {todayEx.map(e=><ExerciseRow key={e.id} ex={e} onDelete={()=>deleteExercise(e.id)}/>)}
                </>}
              </Glass>
            )}
          </div>
        )}

        {/* ════ 修正 ════ */}
        {tab==="edit" && (
          <div className="rise">
            <Glass style={{ marginBottom:14 }}>
              <SecLabel>🔧 記録の確認・削除</SecLabel>
              <p style={{ fontSize:12,color:"rgba(255,255,255,0.5)",margin:0,lineHeight:1.6 }}>
                タップして展開 → 日ごとの記録を確認・削除できます。
                食事・運動の個別削除は「🌊今日」または「✏️記録」タブから行えます。
              </p>
            </Glass>
            {sortedDates.length===0 ? (
              <div style={{ textAlign:"center",padding:"40px 0",color:"rgba(255,255,255,0.3)",fontWeight:700 }}>
                <div style={{ fontSize:40,marginBottom:12 }}>🌊</div>まだ記録がないよ
              </div>
            ) : [...sortedDates].reverse().map(d=>(
              <EditableRecord key={d} dateKey={d} record={records[d]}
                onSave={()=>{}} onDelete={deleteRecord}/>
            ))}
          </div>
        )}
      </div>

      {/* Bottom coral */}
      <div style={{ position:"fixed",bottom:0,left:0,right:0,pointerEvents:"none",zIndex:0 }}>
        <svg viewBox="0 0 400 70" style={{ display:"block",width:"100%",opacity:0.2 }}>
          <path d="M20,70 L20,46 Q24,28 28,46 L28,70" fill="#ff8080"/>
          <path d="M28,70 L28,36 Q32,18 36,36 L36,70" fill="#ff8080"/>
          <path d="M360,70 L360,42 Q364,24 368,42 L368,70" fill="#c0a0e0"/>
          <path d="M368,70 L368,52 Q372,36 376,52 L376,70" fill="#c0a0e0"/>
          <path d="M160,70 Q162,52 158,36 Q162,50 166,30 Q163,50 168,64 L168,70" fill="#50b080"/>
          <ellipse cx="100" cy="68" rx="9" ry="5" fill="#f0d090" opacity="0.8"/>
          <ellipse cx="300" cy="67" rx="7" ry="4" fill="#e0b8f0" opacity="0.8"/>
        </svg>
      </div>
    </div>
  );
}
