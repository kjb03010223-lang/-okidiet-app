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

  // Selected date for record tab (defaults to today, can be changed to past)
  const [selectedDate, setSelectedDate] = useState(todayKey());

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

  // When selectedDate changes in record tab, sync weightF
  useEffect(()=>{
    const r = records[selectedDate]||{};
    setWeightF(r.weight!=null ? r.weight : "");
  },[selectedDate]);

  useEffect(()=>{ persist(records); },[records]);

  function getRecord(dateKey) { return records[dateKey]||{ meals:[], exercises:[], checks:{} }; }
  function getToday() { return getRecord(dk); }

  function toggleCheck(id) {
    const next = {...checks,[id]:!checks[id]};
    setChecks(next);
    setRecords(p=>({...p,[dk]:{...getToday(),...(p[dk]||{}),checks:next}}));
  }

  function addMeal() {
    if(!mealF.kcal) return;
    const meal = { id:Date.now(), name:mealF.name||"食事", kcal:parseFloat(mealF.kcal)||0,
      protein:parseFloat(mealF.protein)||0, fat:parseFloat(mealF.fat)||0, carb:parseFloat(mealF.carb)||0 };
    const rec = getRecord(selectedDate);
    const meals = [...(rec.meals||[]), meal];
    setRecords(p=>({...p,[selectedDate]:{...rec,...(p[selectedDate]||{}),meals}}));
    setMealF({ name:"", kcal:"", protein:"", fat:"", carb:"" });
    setFlashMeal(true); setTimeout(()=>setFlashMeal(false),1500);
  }

  function deleteMeal(id, dateKey=dk) {
    const rec = { ...getRecord(dateKey), ...(records[dateKey]||{}) };
    const meals = (rec.meals||[]).filter(m=>m.id!==id);
    setRecords(p=>({...p,[dateKey]:{...rec,meals}}));
  }

  function addExercise() {
    if(!exF.kcal && !exF.duration) return;
    const ex = { id:Date.now(), name:exF.name||"運動", kcal:parseFloat(exF.kcal)||0, duration:parseFloat(exF.duration)||0 };
    const rec = { ...getRecord(selectedDate), ...(records[selectedDate]||{}) };
    const exercises = [...(rec.exercises||[]), ex];
    setRecords(p=>({...p,[selectedDate]:{...rec,exercises}}));
    setExF({ name:"", kcal:"", duration:"" });
    setFlashEx(true); setTimeout(()=>setFlashEx(false),1500);
  }

  function deleteExercise(id, dateKey=dk) {
    const rec = { ...getRecord(dateKey), ...(records[dateKey]||{}) };
    const exercises = (rec.exercises||[]).filter(e=>e.id!==id);
    setRecords(p=>({...p,[dateKey]:{...rec,exercises}}));
  }

  function saveWeight() {
    if(weightF==="") return;
    const rec = { ...getRecord(selectedDate), ...(records[selectedDate]||{}) };
    setRecords(p=>({...p,[selectedDate]:{...rec,weight:parseFloat(weightF)}}));
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

        @keyframes swimR{0%{transform:translateX(-160px) translateY(0px) scaleX(1)}25%{transform:translateX(calc(50vw) translateY(-18px) scaleX(1)}50%{transform:translateX(calc(100vw + 160px)) translateY(4px) scaleX(1)}50.01%{transform:translateX(calc(100vw + 160px)) translateY(4px) scaleX(-1)}100%{transform:translateX(-160px) translateY(0px) scaleX(-1)}}
        @keyframes swimR2{0%{transform:translateX(-120px) translateY(0px)}30%{transform:translateX(40vw) translateY(-22px)}70%{transform:translateX(80vw) translateY(8px)}100%{transform:translateX(calc(100vw + 120px)) translateY(-5px)}}
        @keyframes swimL{0%{transform:translateX(calc(100vw + 140px)) translateY(0px) scaleX(-1)}100%{transform:translateX(-140px) translateY(0px) scaleX(-1)}}
        @keyframes floatfish{0%{transform:translateX(-100px) translateY(0px) scaleX(1)}100%{transform:translateX(calc(100vw + 100px)) translateY(0px) scaleX(1)}}
        @keyframes bobY{0%{transform:translateY(0px) rotate(-3deg)}33%{transform:translateY(-12px) rotate(2deg)}66%{transform:translateY(4px) rotate(-1deg)}100%{transform:translateY(0px) rotate(-3deg)}}
        @keyframes wiggle{0%{transform:rotate(-8deg)}50%{transform:rotate(8deg)}100%{transform:rotate(-8deg)}}
        @keyframes jellyFloat{0%{transform:translateY(0px) scaleY(1)}40%{transform:translateY(-20px) scaleY(0.88)}80%{transform:translateY(-8px) scaleY(1.05)}100%{transform:translateY(0px) scaleY(1)}}
        @keyframes turtleSwim{0%{transform:translateX(-110px) translateY(0) scaleX(1)}100%{transform:translateX(calc(100vw + 110px)) translateY(0) scaleX(1)}}
        @keyframes octopusBob{0%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-16px) rotate(4deg)}100%{transform:translateY(0) rotate(-4deg)}}
        @keyframes starfish{0%{transform:rotate(0deg) scale(1)}50%{transform:rotate(180deg) scale(1.1)}100%{transform:rotate(360deg) scale(1)}}
        @keyframes clownfish{0%{transform:translateX(-80px) translateY(0) scaleX(1)}50%{transform:translateX(45vw) translateY(-15px) scaleX(1)}100%{transform:translateX(calc(100vw+80px)) translateY(5px) scaleX(1)}}
        @keyframes narwhal{0%{transform:translateX(calc(100vw+120px)) scaleX(-1)}100%{transform:translateX(-120px) scaleX(-1)}}
        @keyframes seahorseFloat{0%{transform:translateY(0) rotate(-5deg)}25%{transform:translateY(-14px) rotate(3deg)}75%{transform:translateY(6px) rotate(-2deg)}100%{transform:translateY(0) rotate(-5deg)}}
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

      <style>{`
        input::placeholder{color:rgba(255,255,255,0.25);}
        input:focus{border-color:rgba(255,200,120,0.6)!important;background:rgba(255,255,255,0.15)!important;}
        *{-webkit-tap-highlight-color:transparent;box-sizing:border-box;}
        @keyframes rise{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes bubble{0%{transform:translateY(0)}50%{transform:translateY(-14px)}100%{transform:translateY(0)}}
        @keyframes sway{0%{transform:rotate(-2deg)}50%{transform:rotate(2deg)}100%{transform:rotate(-2deg)}}
        @keyframes sunpulse{0%{opacity:0.5}50%{opacity:0.8}100%{opacity:0.5}}
        .rise{animation:rise 0.5s cubic-bezier(.2,.8,.2,1) both;}

        /* Cross left→right: starts offscreen left, exits offscreen right */
        @keyframes crossLR{
          0%{transform:translateX(-180px)}
          100%{transform:translateX(calc(100vw + 180px))}
        }
        /* Cross right→left: starts offscreen right, exits offscreen left, flipped */
        @keyframes crossRL{
          0%{transform:translateX(calc(100vw + 180px)) scaleX(-1)}
          100%{transform:translateX(-180px) scaleX(-1)}
        }
        /* Wavy swim left→right */
        @keyframes waveLR{
          0%  {transform:translateX(-180px) translateY(0px)}
          20% {transform:translateX(20vw) translateY(-20px)}
          40% {transform:translateX(40vw) translateY(10px)}
          60% {transform:translateX(60vw) translateY(-15px)}
          80% {transform:translateX(80vw) translateY(8px)}
          100%{transform:translateX(calc(100vw + 180px)) translateY(0px)}
        }
        /* Wavy swim right→left flipped */
        @keyframes waveRL{
          0%  {transform:translateX(calc(100vw + 180px)) translateY(0px) scaleX(-1)}
          20% {transform:translateX(80vw) translateY(-18px) scaleX(-1)}
          40% {transform:translateX(60vw) translateY(12px) scaleX(-1)}
          60% {transform:translateX(40vw) translateY(-10px) scaleX(-1)}
          80% {transform:translateX(20vw) translateY(6px) scaleX(-1)}
          100%{transform:translateX(-180px) translateY(0px) scaleX(-1)}
        }
        /* Gentle float up-down (stays on screen) */
        @keyframes floatUD{
          0%  {transform:translateY(0px) rotate(0deg)}
          30% {transform:translateY(-22px) rotate(3deg)}
          60% {transform:translateY(8px) rotate(-2deg)}
          100%{transform:translateY(0px) rotate(0deg)}
        }
        /* Jelly pulse */
        @keyframes jellyPulse{
          0%  {transform:translateY(0px) scaleY(1) scaleX(1)}
          40% {transform:translateY(-18px) scaleY(0.85) scaleX(1.1)}
          70% {transform:translateY(-6px) scaleY(1.08) scaleX(0.96)}
          100%{transform:translateY(0px) scaleY(1) scaleX(1)}
        }
        /* Wiggle in place */
        @keyframes wiggle{
          0%  {transform:rotate(-10deg) scale(1)}
          25% {transform:rotate(8deg) scale(1.05)}
          50% {transform:rotate(-6deg) scale(1)}
          75% {transform:rotate(10deg) scale(1.03)}
          100%{transform:rotate(-10deg) scale(1)}
        }
        /* Slow spin */
        @keyframes spinSlow{
          0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}
        }
        /* Seahorse bob */
        @keyframes seahorseBob{
          0%  {transform:translateY(0) rotate(-8deg)}
          33% {transform:translateY(-18px) rotate(5deg)}
          66% {transform:translateY(6px) rotate(-4deg)}
          100%{transform:translateY(0) rotate(-8deg)}
        }
        /* Drift diagonally across screen */
        @keyframes driftDiag{
          0%  {transform:translate(-120px, 60px)}
          100%{transform:translate(calc(100vw + 120px), -40px)}
        }
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

      {/* ══════════════════════════════════════════
          SEA CREATURES — faithful hand-drawn style
          ══════════════════════════════════════════ */}

      {/* 🐳 Blue whale — crosses L→R slowly at top 15% */}
      <div style={{position:"fixed",top:"14%",left:0,pointerEvents:"none",zIndex:0,
        animation:"crossLR 26s linear 0s infinite"}}>
        <svg width="130" height="70" viewBox="0 0 130 70" style={{opacity:0.55}}>
          {/* body */}
          <path d="M18,38 Q30,18 70,22 Q105,24 115,38 Q105,54 70,52 Q30,56 18,38Z" fill="#7ec8e8" stroke="#5aa8c8" strokeWidth="1.8" strokeLinejoin="round"/>
          {/* belly patch */}
          <path d="M30,42 Q55,52 90,46 Q75,58 45,56 Q28,54 30,42Z" fill="#b8e4f4" opacity="0.7"/>
          {/* tail */}
          <path d="M112,34 Q128,20 130,14 Q124,26 130,34 Q124,42 130,48 Q128,54 112,42Z" fill="#7ec8e8" stroke="#5aa8c8" strokeWidth="1.6"/>
          {/* flipper */}
          <path d="M55,48 Q48,60 38,62 Q36,56 50,52Z" fill="#6ab8d8" stroke="#5aa8c8" strokeWidth="1.4"/>
          {/* dorsal fin */}
          <path d="M75,22 Q82,8 86,6 Q84,14 88,20Z" fill="#6ab8d8" stroke="#5aa8c8" strokeWidth="1.4"/>
          {/* eye */}
          <circle cx="28" cy="34" r="4" fill="white" stroke="#5aa8c8" strokeWidth="1"/>
          <circle cx="29" cy="34" r="2" fill="#2a4858"/>
          <circle cx="29.8" cy="33" r="0.8" fill="white"/>
          {/* smile */}
          <path d="M20,40 Q28,46 36,40" fill="none" stroke="#5aa8c8" strokeWidth="1.2" strokeLinecap="round"/>
          {/* blowhole spout */}
          <path d="M72,20 Q70,10 68,4" stroke="#b8e8f8" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6"/>
          <path d="M75,18 Q74,10 76,6" stroke="#b8e8f8" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5"/>
        </svg>
      </div>

      {/* 🐬 Dolphin — wavy swim R→L at 28% */}
      <div style={{position:"fixed",top:"26%",left:0,pointerEvents:"none",zIndex:0,
        animation:"waveRL 18s linear 4s infinite"}}>
        <svg width="90" height="54" viewBox="0 0 90 54" style={{opacity:0.6}}>
          {/* body */}
          <path d="M15,28 Q25,12 55,16 Q78,18 84,28 Q78,40 55,42 Q25,46 15,28Z" fill="#8ad4e4" stroke="#5ab4c8" strokeWidth="1.6"/>
          {/* belly */}
          <path d="M25,34 Q50,44 74,36 Q62,48 38,46Z" fill="#cceef8" opacity="0.7"/>
          {/* beak */}
          <path d="M12,26 Q2,22 0,28 Q2,34 12,30Z" fill="#8ad4e4" stroke="#5ab4c8" strokeWidth="1.4"/>
          {/* dorsal */}
          <path d="M52,16 Q58,4 62,2 Q60,10 64,14Z" fill="#72c4d8" stroke="#5ab4c8" strokeWidth="1.4"/>
          {/* tail */}
          <path d="M82,24 Q92,14 94,8 Q88,20 94,28 Q88,36 92,44 Q90,50 82,32Z" fill="#8ad4e4" stroke="#5ab4c8" strokeWidth="1.4"/>
          {/* flipper */}
          <path d="M40,40 Q32,52 24,52 Q24,46 38,44Z" fill="#72c4d8" stroke="#5ab4c8" strokeWidth="1.2"/>
          {/* eye */}
          <circle cx="20" cy="24" r="3.5" fill="white" stroke="#5ab4c8" strokeWidth="1"/>
          <circle cx="21" cy="24" r="1.8" fill="#1a3848"/>
          <circle cx="21.6" cy="23.2" r="0.7" fill="white"/>
          {/* smile line */}
          <path d="M8,30 Q14,35 20,30" fill="none" stroke="#5ab4c8" strokeWidth="1" strokeLinecap="round"/>
        </svg>
      </div>

      {/* 🦈 Shark — crosses R→L at 55%, menacingly */}
      <div style={{position:"fixed",top:"52%",left:0,pointerEvents:"none",zIndex:0,
        animation:"crossRL 22s linear 8s infinite"}}>
        <svg width="100" height="56" viewBox="0 0 100 56" style={{opacity:0.48}}>
          {/* body */}
          <path d="M12,30 Q22,14 58,18 Q84,20 92,30 Q84,42 58,44 Q22,48 12,30Z" fill="#a0b8c8" stroke="#7898a8" strokeWidth="1.6"/>
          {/* belly */}
          <path d="M28,36 Q55,46 80,38 Q68,50 42,48Z" fill="#d8e8f0" opacity="0.7"/>
          {/* dorsal fin */}
          <path d="M50,18 Q54,4 58,0 Q56,8 60,16Z" fill="#8aa8b8" stroke="#7898a8" strokeWidth="1.4"/>
          {/* tail */}
          <path d="M90,26 Q102,14 104,8 Q98,22 104,30 Q98,38 102,48 Q100,54 90,34Z" fill="#a0b8c8" stroke="#7898a8" strokeWidth="1.4"/>
          {/* pectoral fin */}
          <path d="M44,42 Q34,54 24,56 Q24,48 40,44Z" fill="#8aa8b8" stroke="#7898a8" strokeWidth="1.2"/>
          {/* small fin */}
          <path d="M64,42 Q70,50 74,50 Q70,46 72,42Z" fill="#8aa8b8" stroke="#7898a8" strokeWidth="1"/>
          {/* eye */}
          <circle cx="20" cy="26" r="3.5" fill="white" stroke="#7898a8" strokeWidth="1"/>
          <circle cx="20.5" cy="26" r="2" fill="#1a2830"/>
          {/* gill slits */}
          <path d="M34,22 Q32,30 34,36" fill="none" stroke="#7898a8" strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
          <path d="M40,20 Q38,30 40,38" fill="none" stroke="#7898a8" strokeWidth="1" strokeLinecap="round" opacity="0.4"/>
        </svg>
      </div>

      {/* 🐢 Sea turtle — diagonal drift L→R at 40% */}
      <div style={{position:"fixed",top:"36%",left:0,pointerEvents:"none",zIndex:0,
        animation:"driftDiag 28s linear 2s infinite"}}>
        <svg width="80" height="72" viewBox="0 0 80 72" style={{opacity:0.55}}>
          {/* shell */}
          <ellipse cx="40" cy="40" rx="24" ry="20" fill="#8bbf7a" stroke="#5a9050" strokeWidth="1.8"/>
          {/* shell pattern */}
          <ellipse cx="40" cy="40" rx="16" ry="13" fill="#a0d490" opacity="0.5"/>
          <path d="M30,30 L50,30 M30,50 L50,50 M40,24 L40,56 M28,36 L52,36 M28,44 L52,44" stroke="#5a9050" strokeWidth="0.8" opacity="0.35"/>
          {/* head */}
          <ellipse cx="40" cy="22" rx="10" ry="8" fill="#8bbf7a" stroke="#5a9050" strokeWidth="1.6"/>
          <circle cx="36" cy="20" r="2.5" fill="white" stroke="#5a9050" strokeWidth="0.8"/>
          <circle cx="36.6" cy="20" r="1.2" fill="#1a3010"/>
          <circle cx="37.1" cy="19.4" r="0.5" fill="white"/>
          <circle cx="44" cy="20" r="2.5" fill="white" stroke="#5a9050" strokeWidth="0.8"/>
          <circle cx="44.6" cy="20" r="1.2" fill="#1a3010"/>
          <circle cx="45.1" cy="19.4" r="0.5" fill="white"/>
          <path d="M36,26 Q40,28 44,26" fill="none" stroke="#5a9050" strokeWidth="1" strokeLinecap="round"/>
          {/* flippers */}
          <path d="M20,34 Q6,24 2,16 Q8,24 4,32 Q8,40 18,42Z" fill="#78b068" stroke="#5a9050" strokeWidth="1.4"/>
          <path d="M60,34 Q74,24 78,16 Q72,24 76,32 Q72,40 62,42Z" fill="#78b068" stroke="#5a9050" strokeWidth="1.4"/>
          <path d="M22,52 Q10,64 6,70 Q12,60 8,54 Q14,58 24,56Z" fill="#78b068" stroke="#5a9050" strokeWidth="1.4"/>
          <path d="M58,52 Q70,64 74,70 Q68,60 72,54 Q66,58 56,56Z" fill="#78b068" stroke="#5a9050" strokeWidth="1.4"/>
          {/* tail */}
          <path d="M36,58 Q40,68 44,58" fill="#78b068" stroke="#5a9050" strokeWidth="1.2"/>
        </svg>
      </div>

      {/* 🪼 Jellyfish — floats gently top-right area */}
      <div style={{position:"fixed",top:"8%",right:"15%",pointerEvents:"none",zIndex:0,
        animation:"jellyPulse 5s ease-in-out 0s infinite"}}>
        <svg width="56" height="80" viewBox="0 0 56 80" style={{opacity:0.52}}>
          {/* bell */}
          <path d="M4,24 Q4,2 28,2 Q52,2 52,24 Q52,36 28,38 Q4,36 4,24Z" fill="#d4a0e8" stroke="#b070cc" strokeWidth="1.6"/>
          <path d="M8,26 Q8,14 28,14 Q48,14 48,26 Q38,30 28,30 Q18,30 8,26Z" fill="#e8c4f8" opacity="0.6"/>
          {/* spots */}
          <circle cx="20" cy="18" r="3" fill="white" opacity="0.4"/>
          <circle cx="34" cy="16" r="2" fill="white" opacity="0.3"/>
          {/* tentacles — wavy lines */}
          <path d="M12,36 Q8,46 12,54 Q8,62 10,72" fill="none" stroke="#c080dc" strokeWidth="1.8" strokeLinecap="round"/>
          <path d="M18,37 Q14,48 18,56 Q15,64 17,74" fill="none" stroke="#c080dc" strokeWidth="1.8" strokeLinecap="round"/>
          <path d="M24,38 Q22,50 24,58 Q22,66 24,76" fill="none" stroke="#c080dc" strokeWidth="1.8" strokeLinecap="round"/>
          <path d="M32,38 Q34,50 32,58 Q34,66 32,76" fill="none" stroke="#c080dc" strokeWidth="1.8" strokeLinecap="round"/>
          <path d="M38,37 Q42,48 38,56 Q41,64 39,74" fill="none" stroke="#c080dc" strokeWidth="1.8" strokeLinecap="round"/>
          <path d="M44,36 Q48,46 44,54 Q48,62 46,72" fill="none" stroke="#c080dc" strokeWidth="1.8" strokeLinecap="round"/>
          {/* eyes */}
          <circle cx="21" cy="22" r="3" fill="white" stroke="#b070cc" strokeWidth="0.8"/>
          <circle cx="22" cy="22" r="1.4" fill="#3a1858"/>
          <circle cx="35" cy="22" r="3" fill="white" stroke="#b070cc" strokeWidth="0.8"/>
          <circle cx="36" cy="22" r="1.4" fill="#3a1858"/>
        </svg>
      </div>

      {/* 🐡 Pufferfish — floatUD right side, mid screen */}
      <div style={{position:"fixed",top:"44%",right:"6%",pointerEvents:"none",zIndex:0,
        animation:"floatUD 5.5s ease-in-out 1s infinite"}}>
        <svg width="68" height="68" viewBox="0 0 68 68" style={{opacity:0.55}}>
          {/* round body */}
          <circle cx="34" cy="36" r="26" fill="#f0d870" stroke="#c8a828" strokeWidth="1.8"/>
          {/* belly */}
          <ellipse cx="34" cy="44" rx="18" ry="12" fill="#fffacc" opacity="0.6"/>
          {/* spines */}
          {[[34,6,34,0],[48,10,54,5],[58,22,64,17],[62,36,70,34],[58,50,64,55],[48,60,54,65],[34,64,34,70],[20,60,14,65],[10,50,4,55],[6,36,−2,34],[10,22,4,17],[20,10,14,5]].map(([x1,y1,x2,y2],i)=>(
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#c8a828" strokeWidth="1.4" strokeLinecap="round"/>
          ))}
          {/* eye */}
          <circle cx="26" cy="32" r="6" fill="white" stroke="#c8a828" strokeWidth="1.2"/>
          <circle cx="27.5" cy="32" r="3.2" fill="#2a3810"/>
          <circle cx="28.5" cy="30.8" r="1.2" fill="white"/>
          {/* mouth */}
          <path d="M28,44 Q34,48 40,44" fill="none" stroke="#c8a828" strokeWidth="1.5" strokeLinecap="round"/>
          {/* side fins */}
          <path d="M8,34 Q0,28 2,22 Q4,30 0,36 Q2,42 6,38Z" fill="#e8c830" stroke="#c8a828" strokeWidth="1.2"/>
          <path d="M60,34 Q68,28 66,22 Q64,30 68,36 Q66,42 62,38Z" fill="#e8c830" stroke="#c8a828" strokeWidth="1.2"/>
          {/* top fin */}
          <path d="M28,10 Q34,2 40,10" fill="#e8c830" stroke="#c8a828" strokeWidth="1.4"/>
        </svg>
      </div>

      {/* 🐠 Clownfish — wavy L→R at 62% */}
      <div style={{position:"fixed",top:"60%",left:0,pointerEvents:"none",zIndex:0,
        animation:"waveLR 13s ease-in-out 6s infinite"}}>
        <svg width="58" height="46" viewBox="0 0 58 46" style={{opacity:0.62}}>
          {/* body */}
          <ellipse cx="28" cy="23" rx="22" ry="16" fill="#f07030" stroke="#c05010" strokeWidth="1.8"/>
          {/* tail */}
          <path d="M4,14 Q−4,8 −6,4 Q−2,12 −6,20 Q−4,28 4,22Z" fill="#f07030" stroke="#c05010" strokeWidth="1.6"/>
          {/* white stripes */}
          <path d="M16,7 Q14,23 16,39" stroke="white" strokeWidth="5" strokeLinecap="round" opacity="0.9"/>
          <path d="M30,6 Q28,23 30,40" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.7"/>
          {/* dorsal fin */}
          <path d="M18,8 Q24,−2 34,6" fill="#e86020" stroke="#c05010" strokeWidth="1.4"/>
          {/* bottom fins */}
          <path d="M20,38 Q16,48 10,48 Q12,42 22,40Z" fill="#e86020" stroke="#c05010" strokeWidth="1.2"/>
          {/* eye */}
          <circle cx="38" cy="20" r="5" fill="white" stroke="#c05010" strokeWidth="1"/>
          <circle cx="39.5" cy="20" r="2.8" fill="#1a1a1a"/>
          <circle cx="40.2" cy="19" r="1" fill="white"/>
          {/* mouth curve */}
          <path d="M44,26 Q48,28 52,24" fill="none" stroke="#c05010" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      </div>

      {/* 🐙 Octopus — wiggle bottom-left */}
      <div style={{position:"fixed",bottom:"14%",left:"8%",pointerEvents:"none",zIndex:1,
        animation:"wiggle 3s ease-in-out 0s infinite"}}>
        <svg width="72" height="88" viewBox="0 0 72 88" style={{opacity:0.52}}>
          {/* head */}
          <ellipse cx="36" cy="30" rx="28" ry="26" fill="#e07898" stroke="#c05878" strokeWidth="1.8"/>
          {/* head shine */}
          <ellipse cx="28" cy="20" rx="10" ry="7" fill="#f8b0c8" opacity="0.4"/>
          {/* eyes */}
          <circle cx="24" cy="26" r="6" fill="white" stroke="#c05878" strokeWidth="1.2"/>
          <circle cx="26" cy="26" r="3.5" fill="#1a0818"/>
          <circle cx="27" cy="24.5" r="1.3" fill="white"/>
          <circle cx="48" cy="26" r="6" fill="white" stroke="#c05878" strokeWidth="1.2"/>
          <circle cx="50" cy="26" r="3.5" fill="#1a0818"/>
          <circle cx="51" cy="24.5" r="1.3" fill="white"/>
          {/* smile */}
          <path d="M30,38 Q36,44 42,38" fill="none" stroke="#c05878" strokeWidth="1.5" strokeLinecap="round"/>
          {/* cheeks */}
          <circle cx="20" cy="34" r="4" fill="#f890b0" opacity="0.4"/>
          <circle cx="52" cy="34" r="4" fill="#f890b0" opacity="0.4"/>
          {/* tentacles — 7 wavy ones */}
          <path d="M12,52 Q6,62 10,72 Q6,80 8,88" fill="none" stroke="#c05878" strokeWidth="3" strokeLinecap="round"/>
          <path d="M20,56 Q14,66 18,76 Q14,84 16,88" fill="none" stroke="#c05878" strokeWidth="3" strokeLinecap="round"/>
          <path d="M28,58 Q24,70 28,78 Q26,84 26,88" fill="none" stroke="#c05878" strokeWidth="3" strokeLinecap="round"/>
          <path d="M36,60 Q36,72 36,80 Q38,84 36,88" fill="none" stroke="#c05878" strokeWidth="3" strokeLinecap="round"/>
          <path d="M44,58 Q48,70 44,78 Q46,84 46,88" fill="none" stroke="#c05878" strokeWidth="3" strokeLinecap="round"/>
          <path d="M52,56 Q58,66 54,76 Q58,84 56,88" fill="none" stroke="#c05878" strokeWidth="3" strokeLinecap="round"/>
          <path d="M60,52 Q66,62 62,72 Q66,80 64,88" fill="none" stroke="#c05878" strokeWidth="3" strokeLinecap="round"/>
          {/* suction cups on tentacles */}
          {[[8,72],[16,76],[28,78],[36,80],[44,78],[54,76],[62,72]].map(([cx,cy],i)=>(
            <circle key={i} cx={cx} cy={cy} r="1.5" fill="white" opacity="0.5"/>
          ))}
        </svg>
      </div>

      {/* 🐟 Small fish school — fast L→R at 72% */}
      <div style={{position:"fixed",top:"70%",left:0,pointerEvents:"none",zIndex:0,
        animation:"crossLR 10s linear 3s infinite"}}>
        <svg width="100" height="44" viewBox="0 0 100 44" style={{opacity:0.58}}>
          {[[0,18,1],[22,8,0.9],[44,24,1.1],[14,32,0.85],[36,14,1],[60,28,0.9],[8,6,0.8]].map(([x,y,sc],i)=>(
            <g key={i} transform={`translate(${x},${y}) scale(${sc})`}>
              <ellipse cx="12" cy="7" rx="10" ry="6" fill={["#60c8e8","#80d8c0","#70d0b8","#88ddc8","#58c0e0","#78d4bc","#68ccda"][i]} stroke={["#40a8c8","#60b8a0","#50b0a0","#68c0a8","#38a0c8","#58b49c","#48acba"][i]} strokeWidth="1.2"/>
              <path d="M0,3 Q−7,−1 −7,7 Q−7,15 0,11Z" fill={["#60c8e8","#80d8c0","#70d0b8","#88ddc8","#58c0e0","#78d4bc","#68ccda"][i]} stroke={["#40a8c8","#60b8a0","#50b0a0","#68c0a8","#38a0c8","#58b49c","#48acba"][i]} strokeWidth="1"/>
              <circle cx="18" cy="5" r="2.5" fill="white" stroke={["#40a8c8","#60b8a0","#50b0a0","#68c0a8","#38a0c8","#58b49c","#48acba"][i]} strokeWidth="0.8"/>
              <circle cx="18.6" cy="5" r="1.1" fill="#1a2830"/>
            </g>
          ))}
        </svg>
      </div>

      {/* 🦞 Crab — wiggles bottom-right */}
      <div style={{position:"fixed",bottom:"8%",right:"12%",pointerEvents:"none",zIndex:1,
        animation:"wiggle 2.2s ease-in-out 0.5s infinite"}}>
        <svg width="64" height="52" viewBox="0 0 64 52" style={{opacity:0.55}}>
          {/* body */}
          <ellipse cx="32" cy="30" rx="18" ry="13" fill="#e05838" stroke="#b83818" strokeWidth="1.8"/>
          <ellipse cx="32" cy="28" rx="13" ry="9" fill="#f07858" opacity="0.55"/>
          {/* eyes on stalks */}
          <line x1="24" y1="18" x2="20" y2="12" stroke="#b83818" strokeWidth="1.8" strokeLinecap="round"/>
          <circle cx="20" cy="10" r="4" fill="white" stroke="#b83818" strokeWidth="1"/>
          <circle cx="20.8" cy="10" r="2" fill="#1a0808"/>
          <line x1="40" y1="18" x2="44" y2="12" stroke="#b83818" strokeWidth="1.8" strokeLinecap="round"/>
          <circle cx="44" cy="10" r="4" fill="white" stroke="#b83818" strokeWidth="1"/>
          <circle cx="44.8" cy="10" r="2" fill="#1a0808"/>
          {/* smile */}
          <path d="M26,34 Q32,40 38,34" fill="none" stroke="#b83818" strokeWidth="1.5" strokeLinecap="round"/>
          {/* claws */}
          <path d="M14,24 Q4,16 0,10 Q4,18 0,24 Q4,30 14,28" fill="#e05838" stroke="#b83818" strokeWidth="1.6"/>
          <path d="M50,24 Q60,16 64,10 Q60,18 64,24 Q60,30 50,28" fill="#e05838" stroke="#b83818" strokeWidth="1.6"/>
          {/* legs */}
          <path d="M16,32 Q8,28 4,22" stroke="#b83818" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
          <path d="M16,36 Q6,36 2,32" stroke="#b83818" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
          <path d="M18,40 Q10,46 6,48" stroke="#b83818" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
          <path d="M48,32 Q56,28 60,22" stroke="#b83818" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
          <path d="M48,36 Q58,36 62,32" stroke="#b83818" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
          <path d="M46,40 Q54,46 58,48" stroke="#b83818" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
        </svg>
      </div>

      {/* 🐟 Manta ray — drifts diagonally R→L at 18% */}
      <div style={{position:"fixed",top:"16%",left:0,pointerEvents:"none",zIndex:0,
        animation:"crossRL 30s linear 14s infinite"}}>
        <svg width="110" height="70" viewBox="0 0 110 70" style={{opacity:0.44}}>
          {/* wings */}
          <path d="M55,35 Q10,6 2,35 Q10,62 55,42 Q100,62 108,35 Q100,6 55,28Z" fill="#7090c0" stroke="#5070a8" strokeWidth="1.8"/>
          {/* body center */}
          <ellipse cx="55" cy="35" rx="14" ry="10" fill="#8aa8d0" opacity="0.7"/>
          {/* head horns */}
          <path d="M42,28 Q34,18 30,12" fill="none" stroke="#5070a8" strokeWidth="2" strokeLinecap="round"/>
          <path d="M68,28 Q76,18 80,12" fill="none" stroke="#5070a8" strokeWidth="2" strokeLinecap="round"/>
          {/* eyes */}
          <circle cx="44" cy="30" r="3" fill="white" stroke="#5070a8" strokeWidth="1"/>
          <circle cx="44.8" cy="30" r="1.5" fill="#1a2040"/>
          <circle cx="66" cy="30" r="3" fill="white" stroke="#5070a8" strokeWidth="1"/>
          <circle cx="66.8" cy="30" r="1.5" fill="#1a2040"/>
          {/* mouth */}
          <path d="M48,38 Q55,42 62,38" fill="none" stroke="#5070a8" strokeWidth="1.4" strokeLinecap="round"/>
          {/* tail */}
          <path d="M55,44 Q52,58 50,68" fill="none" stroke="#5070a8" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>

      {/* ⭐ Starfish — slow spin, bottom center */}
      <div style={{position:"fixed",bottom:"6%",left:"42%",pointerEvents:"none",zIndex:1,
        animation:"spinSlow 15s linear 0s infinite"}}>
        <svg width="50" height="50" viewBox="0 0 50 50" style={{opacity:0.52}}>
          <path d="M25,3 L28,18 L42,8 L31,20 L46,25 L31,30 L42,42 L28,32 L25,47 L22,32 L8,42 L19,30 L4,25 L19,20 L8,8 L22,18 Z" fill="#f8a830" stroke="#d08010" strokeWidth="1.6"/>
          <circle cx="25" cy="25" r="7" fill="#ffc848" stroke="#d08010" strokeWidth="1.2"/>
          {/* face */}
          <circle cx="23" cy="23" r="1.5" fill="#8a5010"/>
          <circle cx="27" cy="23" r="1.5" fill="#8a5010"/>
          <path d="M22,27 Q25,30 28,27" fill="none" stroke="#8a5010" strokeWidth="1" strokeLinecap="round"/>
        </svg>
      </div>

      {/* 🌊 Seahorse — seahorseBob, top-right floater */}
      <div style={{position:"fixed",top:"32%",right:"8%",pointerEvents:"none",zIndex:0,
        animation:"seahorseBob 7s ease-in-out 2s infinite"}}>
        <svg width="44" height="76" viewBox="0 0 44 76" style={{opacity:0.52}}>
          {/* snout */}
          <path d="M22,14 Q8,14 4,20 Q2,28 10,30" fill="none" stroke="#c07840" strokeWidth="2" strokeLinecap="round"/>
          {/* head */}
          <ellipse cx="22" cy="20" rx="14" ry="12" fill="#e8a860" stroke="#c07840" strokeWidth="1.8"/>
          {/* crown spines */}
          <path d="M14,10 Q12,2 10,0" stroke="#c07840" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
          <path d="M20,8 Q20,0 20,−2" stroke="#c07840" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
          <path d="M26,10 Q28,2 30,0" stroke="#c07840" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
          {/* eye */}
          <circle cx="16" cy="18" r="4" fill="white" stroke="#c07840" strokeWidth="1"/>
          <circle cx="17" cy="18" r="2.2" fill="#2a1810"/>
          <circle cx="17.8" cy="17" r="0.9" fill="white"/>
          {/* body segments */}
          <path d="M14,30 Q10,40 12,50 Q16,60 22,64 Q26,68 24,72 Q20,76 18,76" fill="none" stroke="#c07840" strokeWidth="18" strokeLinecap="round"/>
          <path d="M14,30 Q10,40 12,50 Q16,60 22,64 Q26,68 24,72 Q20,76 18,76" fill="none" stroke="#e8a860" strokeWidth="14" strokeLinecap="round"/>
          {/* segment lines */}
          {[34,40,46,52,58,64].map((y,i)=>(
            <path key={i} d={`M${10+i},${y} Q${18+i},${y+2} ${26+i-2},${y}`} fill="none" stroke="#c07840" strokeWidth="1" opacity="0.5"/>
          ))}
          {/* dorsal fin */}
          <path d="M28,28 Q36,22 38,18 Q34,24 36,30Z" fill="#d09050" stroke="#c07840" strokeWidth="1.2"/>
          {/* tail curl */}
          <path d="M18,76 Q14,82 18,86 Q24,88 26,82" fill="none" stroke="#c07840" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
      </div>

      {/* 🦑 Squid — crosses R→L at 80% */}
      <div style={{position:"fixed",top:"78%",left:0,pointerEvents:"none",zIndex:0,
        animation:"waveRL 16s linear 9s infinite"}}>
        <svg width="48" height="100" viewBox="0 0 48 100" style={{opacity:0.48, transform:"rotate(90deg)", transformOrigin:"center"}}>
          {/* mantle */}
          <path d="M10,10 Q24,2 38,10 Q44,30 38,50 Q24,58 10,50 Q4,30 10,10Z" fill="#e8c0f0" stroke="#c090d0" strokeWidth="1.6"/>
          {/* fins */}
          <path d="M10,40 Q2,50 4,58 Q10,52 12,48Z" fill="#d8a8e0" stroke="#c090d0" strokeWidth="1.2"/>
          <path d="M38,40 Q46,50 44,58 Q38,52 36,48Z" fill="#d8a8e0" stroke="#c090d0" strokeWidth="1.2"/>
          {/* eyes */}
          <circle cx="18" cy="28" r="5" fill="white" stroke="#c090d0" strokeWidth="1.2"/>
          <circle cx="19.5" cy="28" r="2.8" fill="#2a1840"/>
          <circle cx="20.5" cy="26.8" r="1" fill="white"/>
          <circle cx="30" cy="28" r="5" fill="white" stroke="#c090d0" strokeWidth="1.2"/>
          <circle cx="31.5" cy="28" r="2.8" fill="#2a1840"/>
          <circle cx="32.5" cy="26.8" r="1" fill="white"/>
          {/* arms */}
          {[[14,58,8,74,10,88],[18,60,14,76,14,92],[22,62,22,78,22,94],[26,62,30,78,30,94],[30,60,34,76,34,92],[34,58,40,74,38,88]].map(([x1,y1,x2,y2,x3,y3],i)=>(
            <path key={i} d={`M${x1},${y1} Q${x2},${y2} ${x3},${y3}`} fill="none" stroke="#c090d0" strokeWidth="1.6" strokeLinecap="round"/>
          ))}
          {/* two long tentacles */}
          <path d="M20,60 Q16,78 18,100" fill="none" stroke="#c090d0" strokeWidth="2" strokeLinecap="round"/>
          <path d="M28,60 Q32,78 30,100" fill="none" stroke="#c090d0" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>

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

            {/* Today's date */}
            <div style={{ textAlign:"center",marginBottom:4,marginTop:-4 }}>
              <span style={{ fontSize:11,fontWeight:700,letterSpacing:1.5,
                color:"rgba(255,220,160,0.6)",fontFamily:"'DM Sans',sans-serif" }}>
                {new Date().toLocaleDateString("ja-JP",{year:"numeric",month:"long",day:"numeric",weekday:"short"})}
              </span>
            </div>

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
                  <MealRow key={m.id} meal={m} onDelete={()=>deleteMeal(m.id, dk)}/>
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
                  <ExerciseRow key={e.id} ex={e} onDelete={()=>deleteExercise(e.id, dk)}/>
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
              {weightEntries.length>=2 ? (() => {
                const W = 320, H = 130, PAD = { t:14, b:28, l:36, r:12 };
                const ws = weightEntries.map(e=>e.w);
                const minW = Math.min(...ws), maxW = Math.max(...ws);
                const rng = maxW - minW || 0.5;
                const gW = W - PAD.l - PAD.r, gH = H - PAD.t - PAD.b;
                const px = i => PAD.l + (i/(weightEntries.length-1))*gW;
                const py = w => PAD.t + (1-(w-minW)/rng)*gH;
                const pts = weightEntries.map((e,i)=>({ x:px(i), y:py(e.w), w:e.w, d:e.d }));
                const path = pts.map((p,i)=>i===0?`M${p.x},${p.y}`:`L${p.x},${p.y}`).join(" ");
                const area = `${path} L${pts[pts.length-1].x},${H-PAD.b} L${pts[0].x},${H-PAD.b} Z`;
                const diff = parseFloat((lastW-firstW).toFixed(2));
                // y-axis labels: 3 ticks
                const ticks = [minW, (minW+maxW)/2, maxW].map(v=>parseFloat(v.toFixed(1)));
                return (
                  <>
                    <div style={{ display:"flex",justifyContent:"space-around",marginBottom:14 }}>
                      {[{label:"スタート",val:firstW,c:"rgba(255,190,90,0.9)"},
                        {label:"最新",val:lastW,c:"rgba(100,220,200,0.9)"},
                        {label:"変化",val:(diff>0?"+":"")+diff,c:diff<=0?"#80ffcc":"#ffb3a0",unit:"kg"}].map(w=>(
                        <div key={w.label} style={{ textAlign:"center" }}>
                          <div style={{ fontSize:9,letterSpacing:1.5,color:"rgba(255,255,255,0.4)",fontWeight:700,marginBottom:3 }}>{w.label}</div>
                          <div style={{ fontFamily:"'Playfair Display',serif",fontSize:26,color:w.c,lineHeight:1 }}>{w.val}</div>
                          {!w.unit&&<div style={{ fontSize:9,color:"rgba(255,255,255,0.3)" }}>kg</div>}
                        </div>
                      ))}
                    </div>
                    <div style={{ overflowX:"auto" }}>
                      <svg width={W} height={H} style={{ display:"block",maxWidth:"100%" }}>
                        <defs>
                          <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#60e0e0" stopOpacity="0.35"/>
                            <stop offset="100%" stopColor="#60e0e0" stopOpacity="0.02"/>
                          </linearGradient>
                          <linearGradient id="wl" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#a1ffce"/>
                            <stop offset="100%" stopColor="#60d0e0"/>
                          </linearGradient>
                        </defs>
                        {/* Grid lines */}
                        {ticks.map((t,i)=>(
                          <g key={i}>
                            <line x1={PAD.l} x2={W-PAD.r} y1={py(t)} y2={py(t)}
                              stroke="rgba(255,255,255,0.08)" strokeWidth={1} strokeDasharray="3,4"/>
                            <text x={PAD.l-4} y={py(t)+4} textAnchor="end"
                              fontSize={9} fill="rgba(255,255,255,0.35)" fontFamily="'DM Sans',sans-serif">{t}</text>
                          </g>
                        ))}
                        {/* x-axis */}
                        <line x1={PAD.l} x2={W-PAD.r} y1={H-PAD.b} y2={H-PAD.b}
                          stroke="rgba(255,255,255,0.15)" strokeWidth={1}/>
                        {/* Area fill */}
                        <path d={area} fill="url(#wg)"/>
                        {/* Line */}
                        <path d={path} fill="none" stroke="url(#wl)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
                        {/* Dots + date labels */}
                        {pts.map((p,i)=>{
                          const showLabel = weightEntries.length<=7 || i===0 || i===pts.length-1 || i%Math.ceil(pts.length/5)===0;
                          const mmdd = p.d.slice(5); // MM-DD
                          return (
                            <g key={i}>
                              <circle cx={p.x} cy={p.y} r={3.5} fill="#a1ffce" stroke="rgba(10,40,80,0.7)" strokeWidth={1.5}/>
                              {showLabel && (
                                <text x={p.x} y={H-PAD.b+12} textAnchor="middle"
                                  fontSize={8} fill="rgba(255,255,255,0.4)" fontFamily="'DM Sans',sans-serif">{mmdd}</text>
                              )}
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  </>
                );
              })() : (
                <p style={{ color:"rgba(255,255,255,0.3)",textAlign:"center",fontSize:13 }}>
                  体重を2日以上記録すると推移グラフが見られます
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

            {/* Date selector */}
            <Glass>
              <SecLabel>📅 記録する日付</SecLabel>
              <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                <input type="date" value={selectedDate}
                  max={dk}
                  onChange={e=>{ if(e.target.value) setSelectedDate(e.target.value); }}
                  style={{ flex:1,padding:"11px 14px",borderRadius:14,
                    border:"1px solid rgba(255,255,255,0.22)",
                    background:"rgba(255,255,255,0.09)",backdropFilter:"blur(8px)",
                    color:"#fff",fontSize:15,fontFamily:"'DM Sans',sans-serif",
                    fontWeight:600,outline:"none",colorScheme:"dark" }}/>
                {selectedDate !== dk && (
                  <button onClick={()=>setSelectedDate(dk)} style={{
                    padding:"11px 14px",borderRadius:14,border:"1px solid rgba(255,200,100,0.3)",
                    background:"rgba(255,200,100,0.12)",color:"rgba(255,220,150,0.9)",
                    fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:12,cursor:"pointer",whiteSpace:"nowrap"
                  }}>今日に戻る</button>
                )}
              </div>
              {selectedDate !== dk && (
                <div style={{ marginTop:8,fontSize:11,color:"rgba(255,180,100,0.7)",fontWeight:600,textAlign:"center" }}>
                  ⚠️ 過去の日付を編集中: {selectedDate}
                </div>
              )}
            </Glass>

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
              <label style={lbl}>{selectedDate}の体重 (kg)</label>
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

            {/* Selected date log summary */}
            {(() => {
              const selRec = records[selectedDate]||{};
              const selMeals = selRec.meals||[];
              const selEx = selRec.exercises||[];
              const selMT = sumMeals(selMeals);
              const selEB = sumExercise(selEx);
              if(selMeals.length===0 && selEx.length===0) return null;
              return (
                <Glass>
                  <SecLabel>📋 {selectedDate} の記録まとめ</SecLabel>
                  {selMeals.length>0 && <>
                    <div style={{ fontSize:11,color:"rgba(255,200,120,0.7)",fontWeight:700,marginBottom:6 }}>
                      食事 {selMeals.length}件 · 合計 {Math.round(selMT.kcal)} kcal
                    </div>
                    {selMeals.map(m=><MealRow key={m.id} meal={m} onDelete={()=>deleteMeal(m.id, selectedDate)}/>)}
                  </>}
                  {selEx.length>0 && <>
                    <div style={{ fontSize:11,color:"rgba(100,220,180,0.7)",fontWeight:700,marginBottom:6,marginTop:selMeals.length>0?8:0 }}>
                      運動 {selEx.length}件 · 消費 {Math.round(selEB)} kcal
                    </div>
                    {selEx.map(e=><ExerciseRow key={e.id} ex={e} onDelete={()=>deleteExercise(e.id, selectedDate)}/>)}
                  </>}
                </Glass>
              );
            })()}
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
