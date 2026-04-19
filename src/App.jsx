import { useState, useEffect, useRef } from "react";

const HEIGHT_M = 1.598;
const BMR = 1280;
const SK = "okidiet_v6";

const CHECKLIST_ITEMS = [
  { id:"c1", label:"カロリー 1,400 kcal以内", emoji:"🍱" },
  { id:"c2", label:"タンパク質 120g", emoji:"🥩" },
  { id:"c3", label:"脂質 40g以内", emoji:"🫒" },
  { id:"c4", label:"炭水化物 130〜150g", emoji:"🍙" },
  { id:"c5", label:"歩数 7,000歩", emoji:"👟" },
  { id:"c6", label:"ジム有酸素 45分", emoji:"🏃‍♀️" },
  { id:"c7", label:"散歩 20分", emoji:"🚶‍♀️" },
];

function getDaysLeft() {
  const now = new Date();
  const todayMs = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const goalMs  = Date.UTC(2026, 5, 9); // 2026/6/9
  return Math.max(0, Math.ceil((goalMs - todayMs) / 86400000));
}

function getMotivation(days) {
  if (days > 40) return "まずは習慣化から。焦らず泳ぎ出そう 🌊";
  if (days > 20) return "折り返し地点が見えてきた！海の青さを思い出して 🏝️";
  if (days > 7)  return "ラストスパート！最高の自分まであと少し ☀️";
  return "いよいよ沖縄！仕上げの時期だよ ✈️";
}

function todayKey() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`;
}
function load()     { try { return JSON.parse(localStorage.getItem(SK)) || {}; } catch { return {}; } }
function persist(d) { localStorage.setItem(SK, JSON.stringify(d)); }
function sumMeals(meals=[]) {
  return meals.reduce((a,m)=>({ kcal:a.kcal+(parseFloat(m.kcal)||0), protein:a.protein+(parseFloat(m.protein)||0), fat:a.fat+(parseFloat(m.fat)||0), carb:a.carb+(parseFloat(m.carb)||0) }),{kcal:0,protein:0,fat:0,carb:0});
}
function sumExercise(ex=[]) { return ex.reduce((a,e)=>a+(parseFloat(e.kcal)||0),0); }
function calcBMI(w) { return parseFloat((w/(HEIGHT_M*HEIGHT_M)).toFixed(1)); }
function bmiLabel(b) {
  if(b<18.5) return {text:"低体重",color:"rgba(160,220,255,0.9)"};
  if(b<25)   return {text:"普通体重",color:"rgba(100,220,180,0.9)"};
  if(b<30)   return {text:"肥満(1度)",color:"rgba(255,200,100,0.9)"};
  return           {text:"肥満(2度以上)",color:"rgba(255,130,100,0.9)"};
}

// ── Cute chibi sea creatures ─────────────────────────
function ChibiWhale() {
  return (
    <svg width="110" height="72" viewBox="0 0 110 72">
      <ellipse cx="50" cy="40" rx="40" ry="26" fill="#7ec8e8" stroke="#4a9cb8" strokeWidth="2.5"/>
      <ellipse cx="50" cy="50" rx="28" ry="14" fill="#c8eaf8" opacity="0.7"/>
      <path d="M86,36 Q100,22 106,16 Q100,30 106,40 Q100,50 106,58 Q100,52 86,44Z" fill="#7ec8e8" stroke="#4a9cb8" strokeWidth="2.5"/>
      <path d="M44,58 Q36,68 26,68 Q30,62 42,60Z" fill="#6ab8d8" stroke="#4a9cb8" strokeWidth="2"/>
      <path d="M58,16 Q64,6 68,4 Q66,12 70,18Z" fill="#6ab8d8" stroke="#4a9cb8" strokeWidth="2"/>
      <circle cx="22" cy="36" r="5" fill="#222"/>
      <circle cx="23.5" cy="34.5" r="1.5" fill="white"/>
      <path d="M16,44 Q24,50 32,44" fill="none" stroke="#4a9cb8" strokeWidth="2" strokeLinecap="round"/>
      <path d="M50,14 Q48,6 46,2" stroke="#aaddf8" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

function ChibiDolphin() {
  return (
    <svg width="80" height="56" viewBox="0 0 80 56">
      <path d="M14,28 Q22,10 50,14 Q72,16 78,28 Q72,42 50,44 Q22,46 14,28Z" fill="#88d4e4" stroke="#4ab4c8" strokeWidth="2.5"/>
      <path d="M22,34 Q46,44 68,36 Q56,48 34,46Z" fill="#cceef8" opacity="0.7"/>
      <path d="M10,24 Q2,20 0,28 Q2,36 10,32Z" fill="#88d4e4" stroke="#4ab4c8" strokeWidth="2"/>
      <path d="M50,14 Q56,2 60,0 Q58,10 62,16Z" fill="#72c4d8" stroke="#4ab4c8" strokeWidth="2"/>
      <path d="M76,22 Q90,12 92,6 Q86,18 92,28 Q86,38 90,46 Q88,52 76,34Z" fill="#88d4e4" stroke="#4ab4c8" strokeWidth="2"/>
      <path d="M38,42 Q30,52 22,52 Q24,46 36,44Z" fill="#72c4d8" stroke="#4ab4c8" strokeWidth="2"/>
      <circle cx="17" cy="24" r="5" fill="#222"/>
      <circle cx="18.5" cy="22.5" r="1.5" fill="white"/>
      <path d="M6,32 Q14,38 20,32" fill="none" stroke="#4ab4c8" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

function ChibiShark() {
  return (
    <svg width="90" height="58" viewBox="0 0 90 58">
      <path d="M10,30 Q20,12 55,16 Q80,18 86,30 Q80,44 55,46 Q20,48 10,30Z" fill="#b0c8d8" stroke="#7898a8" strokeWidth="2.5"/>
      <path d="M25,36 Q52,48 76,38 Q62,52 38,50Z" fill="#deeaf0" opacity="0.7"/>
      <path d="M48,16 Q54,2 58,0 Q56,8 60,16Z" fill="#98b8c8" stroke="#7898a8" strokeWidth="2"/>
      <path d="M84,26 Q98,14 100,6 Q94,20 100,30 Q94,40 98,50 Q96,54 84,34Z" fill="#b0c8d8" stroke="#7898a8" strokeWidth="2"/>
      <path d="M42,44 Q32,56 22,58 Q24,50 40,46Z" fill="#98b8c8" stroke="#7898a8" strokeWidth="2"/>
      <circle cx="17" cy="26" r="5" fill="#222"/>
      <circle cx="18.5" cy="24.5" r="1.5" fill="white"/>
    </svg>
  );
}

function ChibiTurtle() {
  return (
    <svg width="72" height="68" viewBox="0 0 72 68">
      <ellipse cx="36" cy="38" rx="22" ry="19" fill="#8bbf7a" stroke="#5a9050" strokeWidth="2.5"/>
      <ellipse cx="36" cy="38" rx="15" ry="12" fill="#a8d490" opacity="0.6"/>
      <path d="M24,30 L48,30 M24,46 L48,46 M36,22 L36,54" stroke="#5a9050" strokeWidth="1" opacity="0.4"/>
      <ellipse cx="36" cy="20" rx="11" ry="9" fill="#8bbf7a" stroke="#5a9050" strokeWidth="2.5"/>
      <circle cx="31" cy="18" r="3.5" fill="#222"/>
      <circle cx="32" cy="16.8" r="1" fill="white"/>
      <circle cx="41" cy="18" r="3.5" fill="#222"/>
      <circle cx="42" cy="16.8" r="1" fill="white"/>
      <ellipse cx="16" cy="34" rx="10" ry="6" fill="#78b068" stroke="#5a9050" strokeWidth="2" transform="rotate(-20,16,34)"/>
      <ellipse cx="56" cy="34" rx="10" ry="6" fill="#78b068" stroke="#5a9050" strokeWidth="2" transform="rotate(20,56,34)"/>
      <ellipse cx="18" cy="52" rx="8" ry="5" fill="#78b068" stroke="#5a9050" strokeWidth="2" transform="rotate(20,18,52)"/>
      <ellipse cx="54" cy="52" rx="8" ry="5" fill="#78b068" stroke="#5a9050" strokeWidth="2" transform="rotate(-20,54,52)"/>
    </svg>
  );
}

function ChibiJellyfish() {
  return (
    <svg width="52" height="74" viewBox="0 0 52 74">
      <path d="M4,22 Q4,2 26,2 Q48,2 48,22 Q48,34 26,36 Q4,34 4,22Z" fill="#d4a0e8" stroke="#b070cc" strokeWidth="2.5"/>
      <path d="M8,24 Q8,12 26,12 Q44,12 44,24 Q36,28 26,28 Q16,28 8,24Z" fill="#ebb8f4" opacity="0.6"/>
      <circle cx="19" cy="19" r="4" fill="#222"/>
      <circle cx="20" cy="17.8" r="1.2" fill="white"/>
      <circle cx="33" cy="19" r="4" fill="#222"/>
      <circle cx="34" cy="17.8" r="1.2" fill="white"/>
      <path d="M20,25 Q26,29 32,25" fill="none" stroke="#b070cc" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M10,34 Q6,44 10,52 Q6,60 8,70" fill="none" stroke="#cc88e0" strokeWidth="2" strokeLinecap="round"/>
      <path d="M18,36 Q14,46 18,54 Q15,62 16,70" fill="none" stroke="#cc88e0" strokeWidth="2" strokeLinecap="round"/>
      <path d="M26,37 Q26,48 26,56 Q26,64 26,70" fill="none" stroke="#cc88e0" strokeWidth="2" strokeLinecap="round"/>
      <path d="M34,36 Q38,46 34,54 Q37,62 36,70" fill="none" stroke="#cc88e0" strokeWidth="2" strokeLinecap="round"/>
      <path d="M42,34 Q46,44 42,52 Q46,60 44,70" fill="none" stroke="#cc88e0" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function ChibiPufferfish() {
  return (
    <svg width="70" height="70" viewBox="0 0 70 70">
      <circle cx="35" cy="36" r="26" fill="#f0d870" stroke="#c8a828" strokeWidth="2.5"/>
      <ellipse cx="35" cy="46" rx="18" ry="12" fill="#fffacc" opacity="0.6"/>
      {[[35,8,35,1],[50,13,56,7],[61,26,68,22],[64,40,72,40],[60,53,66,59],[48,62,54,68],[35,66,35,72],[22,62,16,68],[10,53,4,59],[6,40,-2,40],[10,26,3,22],[20,13,14,7]].map(([x1,y1,x2,y2],i)=>(
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#c8a828" strokeWidth="2" strokeLinecap="round"/>
      ))}
      <circle cx="24" cy="32" r="6.5" fill="#222"/>
      <circle cx="25.5" cy="30.5" r="2" fill="white"/>
      <path d="M28,44 Q35,48 42,44" fill="none" stroke="#c8a828" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="17" cy="40" r="4" fill="#f8a0a0" opacity="0.4"/>
      <circle cx="53" cy="40" r="4" fill="#f8a0a0" opacity="0.4"/>
    </svg>
  );
}

function ChibiClownfish() {
  return (
    <svg width="60" height="50" viewBox="0 0 60 50">
      <ellipse cx="30" cy="25" rx="22" ry="17" fill="#f07030" stroke="#c05010" strokeWidth="2.5"/>
      <path d="M6,15 Q-2,8 -4,3 Q0,12 -4,22 Q-2,30 6,23Z" fill="#f07030" stroke="#c05010" strokeWidth="2"/>
      <path d="M18,8 Q16,25 18,42" stroke="white" strokeWidth="5.5" strokeLinecap="round" opacity="0.92"/>
      <path d="M32,7 Q30,25 32,43" stroke="white" strokeWidth="4.5" strokeLinecap="round" opacity="0.75"/>
      <path d="M20,9 Q26,-1 36,8" fill="#e86020" stroke="#c05010" strokeWidth="2"/>
      <circle cx="42" cy="21" r="6" fill="#222"/>
      <circle cx="43.5" cy="19.5" r="2" fill="white"/>
      <circle cx="36" cy="28" r="4" fill="#f8a0a0" opacity="0.4"/>
    </svg>
  );
}

function ChibiOctopus() {
  return (
    <svg width="74" height="90" viewBox="0 0 74 90">
      <ellipse cx="37" cy="30" rx="28" ry="26" fill="#e07898" stroke="#c05878" strokeWidth="2.5"/>
      <ellipse cx="28" cy="20" rx="12" ry="8" fill="#f4a8c0" opacity="0.45"/>
      <circle cx="26" cy="26" r="7" fill="#222"/>
      <circle cx="27.5" cy="24.5" r="2.2" fill="white"/>
      <circle cx="48" cy="26" r="7" fill="#222"/>
      <circle cx="49.5" cy="24.5" r="2.2" fill="white"/>
      <circle cx="17" cy="34" r="5" fill="#f890b0" opacity="0.4"/>
      <circle cx="57" cy="34" r="5" fill="#f890b0" opacity="0.4"/>
      <path d="M28,38 Q37,44 46,38" fill="none" stroke="#c05878" strokeWidth="2" strokeLinecap="round"/>
      <path d="M12,52 Q8,62 12,72 Q8,80 10,88" fill="none" stroke="#c05878" strokeWidth="4" strokeLinecap="round"/>
      <path d="M20,56 Q16,66 20,76 Q17,84 18,88" fill="none" stroke="#c05878" strokeWidth="4" strokeLinecap="round"/>
      <path d="M29,58 Q26,70 29,80 Q27,86 28,88" fill="none" stroke="#c05878" strokeWidth="4" strokeLinecap="round"/>
      <path d="M37,60 Q37,72 37,82 Q37,86 37,88" fill="none" stroke="#c05878" strokeWidth="4" strokeLinecap="round"/>
      <path d="M45,58 Q48,70 45,80 Q47,86 46,88" fill="none" stroke="#c05878" strokeWidth="4" strokeLinecap="round"/>
      <path d="M54,56 Q58,66 54,76 Q57,84 56,88" fill="none" stroke="#c05878" strokeWidth="4" strokeLinecap="round"/>
      <path d="M62,52 Q66,62 62,72 Q66,80 64,88" fill="none" stroke="#c05878" strokeWidth="4" strokeLinecap="round"/>
    </svg>
  );
}

function ChibiCrab() {
  return (
    <svg width="70" height="60" viewBox="0 0 70 60">
      <ellipse cx="35" cy="34" rx="20" ry="16" fill="#e05838" stroke="#b83818" strokeWidth="2.5"/>
      <ellipse cx="35" cy="32" rx="14" ry="10" fill="#f07858" opacity="0.55"/>
      <line x1="26" y1="20" x2="21" y2="13" stroke="#b83818" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="21" cy="11" r="6" fill="#222"/>
      <circle cx="22.5" cy="9.5" r="1.8" fill="white"/>
      <line x1="44" y1="20" x2="49" y2="13" stroke="#b83818" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="49" cy="11" r="6" fill="#222"/>
      <circle cx="50.5" cy="9.5" r="1.8" fill="white"/>
      <path d="M28,38 Q35,44 42,38" fill="none" stroke="#b83818" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="22" cy="36" r="4" fill="#f8a0a0" opacity="0.4"/>
      <circle cx="48" cy="36" r="4" fill="#f8a0a0" opacity="0.4"/>
      <path d="M16,28 Q4,18 0,12 Q4,20 2,28 Q4,36 16,32" fill="#e05838" stroke="#b83818" strokeWidth="2.5"/>
      <path d="M54,28 Q66,18 70,12 Q66,20 68,28 Q66,36 54,32" fill="#e05838" stroke="#b83818" strokeWidth="2.5"/>
      <path d="M18,34 Q10,30 6,24" stroke="#b83818" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <path d="M18,40 Q8,40 4,36" stroke="#b83818" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <path d="M52,34 Q60,30 64,24" stroke="#b83818" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <path d="M52,40 Q62,40 66,36" stroke="#b83818" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

function ChibiRay() {
  return (
    <svg width="100" height="64" viewBox="0 0 100 64">
      <path d="M50,32 Q8,4 2,32 Q8,60 50,40 Q92,60 98,32 Q92,4 50,24Z" fill="#7090c0" stroke="#5070a8" strokeWidth="2.5"/>
      <ellipse cx="50" cy="32" rx="13" ry="9" fill="#8aa8d0" opacity="0.7"/>
      <path d="M40,26 Q32,16 28,10" fill="none" stroke="#5070a8" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M60,26 Q68,16 72,10" fill="none" stroke="#5070a8" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="42" cy="28" r="4.5" fill="#222"/>
      <circle cx="43.2" cy="26.8" r="1.3" fill="white"/>
      <circle cx="58" cy="28" r="4.5" fill="#222"/>
      <circle cx="59.2" cy="26.8" r="1.3" fill="white"/>
      <path d="M44,36 Q50,40 56,36" fill="none" stroke="#5070a8" strokeWidth="2" strokeLinecap="round"/>
      <path d="M50,42 Q48,54 46,62" fill="none" stroke="#5070a8" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}

function ChibiSeahorse() {
  return (
    <svg width="46" height="80" viewBox="0 0 46 80">
      <ellipse cx="26" cy="20" rx="14" ry="13" fill="#e8a860" stroke="#c07840" strokeWidth="2.5"/>
      <circle cx="18" cy="9" r="4" fill="#e8a860" stroke="#c07840" strokeWidth="2"/>
      <circle cx="26" cy="7" r="4" fill="#e8a860" stroke="#c07840" strokeWidth="2"/>
      <circle cx="34" cy="9" r="4" fill="#e8a860" stroke="#c07840" strokeWidth="2"/>
      <path d="M14,22 Q4,22 2,28 Q4,34 14,30" fill="#e8a860" stroke="#c07840" strokeWidth="2" strokeLinejoin="round"/>
      <circle cx="19" cy="18" r="5.5" fill="#222"/>
      <circle cx="20.5" cy="16.5" r="1.6" fill="white"/>
      <path d="M18,32 Q12,44 14,56 Q18,66 26,70 Q30,74 28,78" fill="none" stroke="#c07840" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M18,32 Q12,44 14,56 Q18,66 26,70 Q30,74 28,78" fill="none" stroke="#e8a860" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M30,30 Q40,24 42,18 Q38,26 40,34Z" fill="#d09050" stroke="#c07840" strokeWidth="2"/>
      <circle cx="32" cy="24" r="4" fill="#f8a060" opacity="0.4"/>
    </svg>
  );
}

function ChibiStarfish() {
  return (
    <svg width="54" height="54" viewBox="0 0 54 54">
      <path d="M27,3 L30,20 L46,10 L33,22 L50,27 L33,32 L46,44 L30,34 L27,51 L24,34 L8,44 L21,32 L4,27 L21,22 L8,10 L24,20 Z" fill="#f8a830" stroke="#d08010" strokeWidth="2.5"/>
      <circle cx="27" cy="27" r="8" fill="#ffc848" stroke="#d08010" strokeWidth="2"/>
      <circle cx="24" cy="25" r="2.5" fill="#222"/>
      <circle cx="30" cy="25" r="2.5" fill="#222"/>
      <circle cx="24.8" cy="24.2" r="0.8" fill="white"/>
      <circle cx="30.8" cy="24.2" r="0.8" fill="white"/>
      <path d="M23,30 Q27,34 31,30" fill="none" stroke="#d08010" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function ChibiFishSchool() {
  const cols = ["#60c8e8","#80d8c0","#88ddc8","#58c0e0","#78d4bc","#a0e0d0"];
  const strk = ["#40a8c8","#60b8a0","#68c0a8","#38a0c8","#58b49c","#78c8b8"];
  return (
    <svg width="110" height="50" viewBox="0 0 110 50">
      {[[0,20],[20,8],[42,26],[12,36],[36,14],[62,30],[80,10],[90,36]].map(([x,y],i)=>{
        const c = cols[i%cols.length], s = strk[i%strk.length];
        return (
          <g key={i} transform={`translate(${x},${y}) scale(${0.85+i*0.04})`}>
            <ellipse cx="10" cy="7" rx="9" ry="6.5" fill={c} stroke={s} strokeWidth="1.8"/>
            <path d="M0,3 Q-6,-1 -6,7 Q-6,15 0,11Z" fill={c} stroke={s} strokeWidth="1.5"/>
            <circle cx="16" cy="5" r="3" fill="#222"/>
            <circle cx="16.8" cy="4.2" r="0.9" fill="white"/>
          </g>
        );
      })}
    </svg>
  );
}

// ── Sea creatures layer ─────────────────────────────────────────────
function SeaCreatures() {
  return (
    <>
      <div style={{position:"fixed",top:"13%",pointerEvents:"none",zIndex:0,animation:"crossLR 28s linear 0s infinite"}}><ChibiWhale/></div>
      <div style={{position:"fixed",top:"24%",pointerEvents:"none",zIndex:0,animation:"waveRL 19s linear 4s infinite"}}><ChibiDolphin/></div>
      <div style={{position:"fixed",top:"7%",right:"14%",pointerEvents:"none",zIndex:0,animation:"jellyPulse 5s ease-in-out 0s infinite"}}><ChibiJellyfish/></div>
      <div style={{position:"fixed",top:"35%",pointerEvents:"none",zIndex:0,animation:"driftDiag 30s linear 2s infinite"}}><ChibiTurtle/></div>
      <div style={{position:"fixed",top:"43%",right:"5%",pointerEvents:"none",zIndex:0,animation:"floatUD 5.5s ease-in-out 1s infinite"}}><ChibiPufferfish/></div>
      <div style={{position:"fixed",top:"59%",pointerEvents:"none",zIndex:0,animation:"waveLR 14s ease-in-out 6s infinite"}}><ChibiClownfish/></div>
      <div style={{position:"fixed",bottom:"13%",left:"6%",pointerEvents:"none",zIndex:1,animation:"wiggle 3s ease-in-out 0s infinite"}}><ChibiOctopus/></div>
      <div style={{position:"fixed",bottom:"7%",right:"10%",pointerEvents:"none",zIndex:1,animation:"wiggle 2.5s ease-in-out 0.5s infinite"}}><ChibiCrab/></div>
      <div style={{position:"fixed",top:"50%",pointerEvents:"none",zIndex:0,animation:"crossRL 24s linear 9s infinite"}}><ChibiShark/></div>
      <div style={{position:"fixed",top:"17%",pointerEvents:"none",zIndex:0,animation:"crossRL 32s linear 14s infinite"}}><ChibiRay/></div>
      <div style={{position:"fixed",top:"30%",right:"7%",pointerEvents:"none",zIndex:0,animation:"seahorseBob 7s ease-in-out 2s infinite"}}><ChibiSeahorse/></div>
      <div style={{position:"fixed",bottom:"5%",left:"40%",pointerEvents:"none",zIndex:1,animation:"spinSlow 16s linear 0s infinite"}}><ChibiStarfish/></div>
      <div style={{position:"fixed",top:"68%",pointerEvents:"none",zIndex:0,animation:"crossLR 11s linear 3s infinite"}}><ChibiFishSchool/></div>
    </>
  );
}

// ── UI atoms ──────────────────────────────────────────────────────────────────
function Glass({ children, style={} }) {
  return (
    <div style={{
      background:"rgba(255,255,255,0.10)",backdropFilter:"blur(20px)",
      WebkitBackdropFilter:"blur(20px)",borderRadius:24,
      border:"1px solid rgba(255,255,255,0.22)",padding:"18px 16px",marginBottom:14,
      boxShadow:"0 8px 32px rgba(0,30,80,0.18),inset 0 1px 0 rgba(255,255,255,0.15)",
      ...style
    }}>{children}</div>
  );
}
function SecLabel({children}) {
  return <div style={{fontSize:10,fontWeight:700,letterSpacing:2.5,textTransform:"uppercase",color:"rgba(255,255,255,0.5)",marginBottom:12,fontFamily:"'DM Sans',sans-serif"}}>{children}</div>;
}
function Ring({pct,c1,c2,size=64,stroke=6,children}) {
  const uid = useRef(`r${Math.random().toString(36).slice(2,6)}`).current;
  const r=(size-stroke)/2,circ=2*Math.PI*r,dash=Math.min(pct/100,1)*circ;
  return (
    <div style={{position:"relative",width:size,height:size,flexShrink:0}}>
      <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
        <defs><linearGradient id={uid} x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor={c1}/><stop offset="100%" stopColor={c2}/></linearGradient></defs>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`url(#${uid})`} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={circ-dash} strokeLinecap="round"
          style={{transition:"stroke-dashoffset 0.7s cubic-bezier(.4,0,.2,1)"}}/>
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:"#fff",fontFamily:"'DM Sans',sans-serif"}}>{children}</div>
    </div>
  );
}
function Bar({label,value,target,c,unit}) {
  const pct=Math.min((value||0)/target*100,100),over=(value||0)>target;
  return (
    <div style={{marginBottom:11}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.85)",marginBottom:4}>
        <span>{label}</span>
        <span style={{color:over?"#ffb3b3":"rgba(255,255,255,0.5)"}}>{Math.round(value??0)}{unit}/{target}{unit}</span>
      </div>
      <div style={{height:5,background:"rgba(255,255,255,0.1)",borderRadius:99,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${pct}%`,background:over?"#ffb3b3":c,borderRadius:99,transition:"width 0.6s"}}/>
      </div>
    </div>
  );
}
function MealRow({meal,onDelete}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:6,padding:"7px 10px",borderRadius:12,marginBottom:5,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.08)"}}>
      <div style={{flex:1}}>
        <div style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.85)"}}>{meal.name||"食事"}</div>
        <div style={{display:"flex",gap:6,marginTop:2,flexWrap:"wrap"}}>
          {[{l:"kcal",v:meal.kcal,c:"rgba(255,190,90,0.8)"},meal.protein&&{l:"P",v:meal.protein+"g",c:"rgba(255,160,180,0.8)"},meal.fat&&{l:"F",v:meal.fat+"g",c:"rgba(255,200,120,0.8)"},meal.carb&&{l:"C",v:meal.carb+"g",c:"rgba(160,220,255,0.8)"}].filter(Boolean).map(x=>(
            <span key={x.l} style={{fontSize:10,fontWeight:700,color:x.c}}>{x.l} {x.v}</span>
          ))}
        </div>
      </div>
      <button onClick={onDelete} style={{background:"rgba(255,80,80,0.15)",border:"1px solid rgba(255,80,80,0.25)",color:"rgba(255,160,160,0.8)",borderRadius:8,padding:"4px 8px",cursor:"pointer",fontSize:12}}>✕</button>
    </div>
  );
}
function ExerciseRow({ex,onDelete}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:6,padding:"7px 10px",borderRadius:12,marginBottom:5,background:"rgba(100,220,180,0.06)",border:"1px solid rgba(100,220,180,0.12)"}}>
      <div style={{flex:1}}>
        <div style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.85)"}}>{ex.name||"運動"}</div>
        <div style={{display:"flex",gap:6,marginTop:2}}>
          {ex.kcal&&<span style={{fontSize:10,fontWeight:700,color:"rgba(100,220,180,0.85)"}}>🔥 {ex.kcal} kcal</span>}
          {ex.duration&&<span style={{fontSize:10,fontWeight:700,color:"rgba(160,220,255,0.7)"}}>⏱ {ex.duration}分</span>}
        </div>
      </div>
      <button onClick={onDelete} style={{background:"rgba(255,80,80,0.15)",border:"1px solid rgba(255,80,80,0.25)",color:"rgba(255,160,160,0.8)",borderRadius:8,padding:"4px 8px",cursor:"pointer",fontSize:12}}>✕</button>
    </div>
  );
}
function EditableRecord({dateKey,record,onDelete}) {
  const [open,setOpen]=useState(false);
  const meals=record.meals||[],exercises=record.exercises||[];
  const totals=sumMeals(meals),burnEx=sumExercise(exercises),totalBurn=BMR+burnEx;
  const ck=Object.values(record.checks||{}).filter(Boolean).length;
  return (
    <Glass style={{marginBottom:10,padding:"14px 14px"}}>
      <div onClick={()=>setOpen(o=>!o)} style={{cursor:"pointer"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.9)",letterSpacing:0.5}}>📅 {dateKey}</span>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <span style={{fontSize:10,fontWeight:700,background:"rgba(100,220,180,0.15)",color:"rgba(150,255,220,0.8)",border:"1px solid rgba(100,220,180,0.25)",borderRadius:99,padding:"2px 8px"}}>✓ {ck}/{CHECKLIST_ITEMS.length}</span>
            <span style={{fontSize:16,color:"rgba(255,255,255,0.4)",display:"inline-block",transform:open?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.25s"}}>⌄</span>
          </div>
        </div>
        <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:8}}>
          {[{l:"摂取",v:Math.round(totals.kcal),u:"kcal",c:"rgba(255,180,80,0.8)"},{l:"消費計",v:Math.round(totalBurn),u:"kcal",c:"rgba(100,220,180,0.8)"},{l:"P",v:Math.round(totals.protein),u:"g",c:"rgba(255,160,180,0.8)"},record.weight!=null&&{l:"体重",v:record.weight,u:"kg",c:"rgba(200,160,255,0.9)"}].filter(Boolean).map(x=>(
            <span key={x.l} style={{fontSize:11,fontWeight:700,background:"rgba(255,255,255,0.07)",color:x.c,borderRadius:99,padding:"2px 8px",border:"1px solid rgba(255,255,255,0.08)"}}>{x.l} {x.v}{x.u}</span>
          ))}
        </div>
      </div>
      {open&&(
        <div style={{marginTop:14,borderTop:"1px solid rgba(255,255,255,0.1)",paddingTop:14}}>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.45)",marginBottom:8}}>食事 {meals.length}件 / 運動 {exercises.length}件{record.weight!=null&&` / 体重 ${record.weight}kg`}</div>
          <button onClick={()=>{if(window.confirm("この記録を削除しますか？"))onDelete(dateKey);}} style={{width:"100%",padding:"10px",borderRadius:14,border:"1px solid rgba(255,120,120,0.3)",background:"rgba(255,100,100,0.12)",color:"rgba(255,180,180,0.9)",fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:13,cursor:"pointer"}}>この日の記録を削除</button>
        </div>
      )}
    </Glass>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [records,setRecords]=useState(load);
  const [tab,setTab]=useState("today");
  const [checks,setChecks]=useState({});
  const [selectedDate,setSelectedDate]=useState(todayKey());
  const [mealF,setMealF]=useState({name:"",kcal:"",protein:"",fat:"",carb:""});
  const [exF,setExF]=useState({name:"",kcal:"",duration:""});
  const [weightF,setWeightF]=useState("");
  const [flashMeal,setFlashMeal]=useState(false);
  const [flashEx,setFlashEx]=useState(false);
  const [flashW,setFlashW]=useState(false);

  const dk=todayKey(),daysLeft=getDaysLeft();

  useEffect(()=>{const r=records[dk]||{};setChecks(r.checks||{});setWeightF(r.weight!=null?r.weight:"");},[]);
  useEffect(()=>{const r=records[selectedDate]||{};setWeightF(r.weight!=null?r.weight:"");},[selectedDate]);
  useEffect(()=>{persist(records);},[records]);

  function getRecord(d){return records[d]||{meals:[],exercises:[],checks:{}};}
  function getToday(){return getRecord(dk);}
  function toggleCheck(id){const next={...checks,[id]:!checks[id]};setChecks(next);setRecords(p=>({...p,[dk]:{...getToday(),...(p[dk]||{}),checks:next}}));}
  function addMeal(){
    if(!mealF.kcal)return;
    const meal={id:Date.now(),name:mealF.name||"食事",kcal:parseFloat(mealF.kcal)||0,protein:parseFloat(mealF.protein)||0,fat:parseFloat(mealF.fat)||0,carb:parseFloat(mealF.carb)||0};
    const rec={...getRecord(selectedDate),...(records[selectedDate]||{})};
    setRecords(p=>({...p,[selectedDate]:{...rec,meals:[...(rec.meals||[]),meal]}}));
    setMealF({name:"",kcal:"",protein:"",fat:"",carb:""});setFlashMeal(true);setTimeout(()=>setFlashMeal(false),1500);
  }
  function deleteMeal(id,dateKey){const rec={...getRecord(dateKey),...(records[dateKey]||{})};setRecords(p=>({...p,[dateKey]:{...rec,meals:(rec.meals||[]).filter(m=>m.id!==id)}}));}
  function addExercise(){
    if(!exF.kcal&&!exF.duration)return;
    const ex={id:Date.now(),name:exF.name||"運動",kcal:parseFloat(exF.kcal)||0,duration:parseFloat(exF.duration)||0};
    const rec={...getRecord(selectedDate),...(records[selectedDate]||{})};
    setRecords(p=>({...p,[selectedDate]:{...rec,exercises:[...(rec.exercises||[]),ex]}}));
    setExF({name:"",kcal:"",duration:""});setFlashEx(true);setTimeout(()=>setFlashEx(false),1500);
  }
  function deleteExercise(id,dateKey){const rec={...getRecord(dateKey),...(records[dateKey]||{})};setRecords(p=>({...p,[dateKey]:{...rec,exercises:(rec.exercises||[]).filter(e=>e.id!==id)}}));}
  function saveWeight(){
    if(weightF==="") return;
    const rec={...getRecord(selectedDate),...(records[selectedDate]||{})};
    setRecords(p=>({...p,[selectedDate]:{...rec,weight:parseFloat(weightF)}}));
    setFlashW(true);setTimeout(()=>setFlashW(false),1500);
  }
  function deleteRecord(dateKey){setRecords(p=>{const next={...p};delete next[dateKey];return next;});}

  const todayRec=records[dk]||{meals:[],exercises:[],checks:{}};
  const todayMeals=todayRec.meals||[],todayEx=todayRec.exercises||[];
  const mTotals=sumMeals(todayMeals),exBurn=sumExercise(todayEx);
  const totalBurn=BMR+exBurn,balance=Math.round(mTotals.kcal-totalBurn),wChange=parseFloat((balance/7200).toFixed(3));
  const checkDone=Object.values(checks).filter(Boolean).length;
  const todayWeight=todayRec.weight??null,bmi=todayWeight?calcBMI(todayWeight):null,bmiInfo=bmi?bmiLabel(bmi):null;

  const sortedDates=Object.keys(records).sort();
  const weightEntries=sortedDates.filter(d=>records[d]?.weight!=null).map(d=>({d,w:records[d].weight}));
  const firstW=weightEntries[0]?.w??null,lastW=weightEntries[weightEntries.length-1]?.w??null;

  const allTotals=sortedDates.reduce((acc,d)=>{
    const r=records[d]||{},mt=sumMeals(r.meals||[]),eb=sumExercise(r.exercises||[]),tb=BMR+eb;
    acc.days++;acc.kcal+=mt.kcal;acc.protein+=mt.protein;acc.fat+=mt.fat;acc.carb+=mt.carb;
    acc.burn+=tb;acc.exBurn+=eb;acc.balance+=mt.kcal-tb;
    acc.checkDone+=Object.values(r.checks||{}).filter(Boolean).length;acc.checkTotal+=CHECKLIST_ITEMS.length;
    return acc;
  },{days:0,kcal:0,protein:0,fat:0,carb:0,burn:0,exBurn:0,balance:0,checkDone:0,checkTotal:0});

  const avgKcal=allTotals.days?Math.round(allTotals.kcal/allTotals.days):null;
  const avgBurn=allTotals.days?Math.round(allTotals.burn/allTotals.days):null;
  const avgP=allTotals.days?Math.round(allTotals.protein/allTotals.days):null;
  const avgF=allTotals.days?Math.round(allTotals.fat/allTotals.days):null;
  const avgC=allTotals.days?Math.round(allTotals.carb/allTotals.days):null;

  const inp={width:"100%",padding:"11px 14px",borderRadius:14,border:"1px solid rgba(255,255,255,0.22)",background:"rgba(255,255,255,0.09)",backdropFilter:"blur(8px)",color:"#fff",fontSize:15,fontFamily:"'DM Sans',sans-serif",fontWeight:600,outline:"none",boxSizing:"border-box"};
  const inpSm={...inp,padding:"9px 11px",fontSize:14,borderRadius:12};
  const lbl={fontSize:10,letterSpacing:1.8,textTransform:"uppercase",color:"rgba(255,255,255,0.5)",display:"block",marginBottom:5,fontFamily:"'DM Sans',sans-serif",fontWeight:700};

  const TABS=[{id:"today",icon:"🌊",label:"今日"},{id:"total",icon:"📊",label:"これまで"},{id:"record",icon:"✏️",label:"記録"},{id:"edit",icon:"🔧",label:"修正"}];

  function AddBtn({flash,label,onClick,bg="linear-gradient(135deg,rgba(255,200,100,0.2),rgba(255,140,80,0.15))"}) {
    return <button onClick={onClick} style={{width:"100%",padding:"12px",borderRadius:16,background:flash?"linear-gradient(135deg,rgba(100,220,180,0.35),rgba(96,210,224,0.35))":bg,backdropFilter:"blur(12px)",color:"#fff",fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:14,cursor:"pointer",border:"1px solid rgba(255,200,100,0.3)",boxShadow:"0 4px 16px rgba(0,30,80,0.2)",transition:"all 0.3s",marginTop:8}}>{flash?"✓ 追加しました！":label}</button>;
  }

  return (
    <div style={{minHeight:"100vh",position:"relative",overflowX:"hidden",background:"linear-gradient(180deg,#0f1f4a 0%,#1a3a6b 12%,#1b6ca8 28%,#2196c4 42%,#5bc4c4 56%,#e8905a 72%,#f0b87a 84%,#f7d4a0 95%,#fcebd4 100%)",fontFamily:"'DM Sans',sans-serif"}}>
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
        @keyframes crossLR{0%{transform:translateX(-180px)}100%{transform:translateX(120vw)}}
        @keyframes crossRL{0%{transform:translateX(120vw) scaleX(-1)}100%{transform:translateX(-180px) scaleX(-1)}}
        @keyframes waveLR{0%{transform:translateX(-180px) translateY(0)}20%{transform:translateX(20vw) translateY(-18px)}40%{transform:translateX(40vw) translateY(10px)}60%{transform:translateX(60vw) translateY(-14px)}80%{transform:translateX(80vw) translateY(8px)}100%{transform:translateX(120vw) translateY(0)}}
        @keyframes waveRL{0%{transform:translateX(120vw) translateY(0) scaleX(-1)}20%{transform:translateX(80vw) translateY(-16px) scaleX(-1)}40%{transform:translateX(60vw) translateY(10px) scaleX(-1)}60%{transform:translateX(40vw) translateY(-10px) scaleX(-1)}80%{transform:translateX(20vw) translateY(6px) scaleX(-1)}100%{transform:translateX(-180px) translateY(0) scaleX(-1)}}
        @keyframes floatUD{0%{transform:translateY(0)}50%{transform:translateY(-22px)}100%{transform:translateY(0)}}
        @keyframes jellyPulse{0%{transform:translateY(0) scaleY(1)}40%{transform:translateY(-18px) scaleY(0.85)}70%{transform:translateY(-6px) scaleY(1.08)}100%{transform:translateY(0) scaleY(1)}}
        @keyframes wiggle{0%{transform:rotate(-10deg)}25%{transform:rotate(8deg)}50%{transform:rotate(-6deg)}75%{transform:rotate(10deg)}100%{transform:rotate(-10deg)}}
        @keyframes spinSlow{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
        @keyframes seahorseBob{0%{transform:translateY(0) rotate(-8deg)}33%{transform:translateY(-18px) rotate(5deg)}66%{transform:translateY(6px) rotate(-4deg)}100%{transform:translateY(0) rotate(-8deg)}}
        @keyframes driftDiag{0%{transform:translate(-120px,50px)}100%{transform:translate(120vw,-30px)}}
      `}</style>

      {/* BG Effects */}
      <div style={{position:"fixed",top:"58%",left:0,right:0,height:120,pointerEvents:"none",zIndex:0,background:"linear-gradient(180deg,transparent,rgba(232,144,90,0.25),rgba(240,184,122,0.15),transparent)",animation:"sunpulse 4s ease-in-out infinite"}}/>
      <div style={{position:"fixed",top:0,left:0,right:0,height:"55%",pointerEvents:"none",zIndex:0,background:"radial-gradient(ellipse 60% 40% at 50% 10%,rgba(255,220,100,0.1) 0%,transparent 70%)"}}/>
      {[8,22,38,55,68,82,14,47,76].map((l,i)=>(
        <div key={i} style={{position:"fixed",left:`${l}%`,bottom:`${[8,20,5,35,12,28,52,18,42][i]}%`,width:[7,4,9,5,4,8,6,4,5][i],height:[7,4,9,5,4,8,6,4,5][i],borderRadius:"50%",border:"1px solid rgba(255,255,255,0.35)",background:"rgba(255,255,255,0.06)",animation:`bubble ${[4.5,6,5,7,3.5,5.5,4,6.5,5][i]}s ease-in-out ${[0,1,2,0.5,1.5,0.3,0.8,2,1.2][i]}s infinite`,pointerEvents:"none",zIndex:0}}/>
      ))}

      <SeaCreatures/>

      {/* HERO SECTION */}
      <div style={{position:"relative",zIndex:1,textAlign:"center",padding:"40px 24px 24px",color:"#fff"}}>
        <div style={{fontSize:10,letterSpacing:4,fontWeight:700,color:"rgba(255,255,255,0.55)",marginBottom:8}}>OKINAWA JOURNEY</div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontStyle:"italic",color:"#fff",textShadow:"0 2px 20px rgba(0,60,120,0.5)",marginBottom:4}}>Dive into your best self</div>
        <div style={{fontSize:11,color:"rgba(255,220,160,0.75)",letterSpacing:0.5,marginBottom:22}}>{getMotivation(daysLeft)}</div>
        <div style={{position:"relative",display:"inline-block"}}>
          <svg width={220} height={110} style={{position:"absolute",top:-14,left:"50%",transform:"translateX(-50%)",opacity:0.45}}>
            <defs><linearGradient id="hg" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="transparent"/><stop offset="30%" stopColor="#ffd080"/><stop offset="70%" stopColor="#ff9060"/><stop offset="100%" stopColor="transparent"/></linearGradient></defs>
            <path d="M15,95 A95,95 0 0,1 205,95" fill="none" stroke="url(#hg)" strokeWidth={1.5}/>
          </svg>
          <div style={{background:"rgba(255,255,255,0.09)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.25)",borderRadius:28,padding:"18px 52px",boxShadow:"0 16px 48px rgba(0,20,60,0.3),inset 0 1px 0 rgba(255,255,255,0.18)"}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:60,color:"#fff",lineHeight:1,fontWeight:400,textShadow:"0 4px 20px rgba(0,80,160,0.4)"}}>{daysLeft}</div>
            <div style={{fontSize:9,letterSpacing:3,color:"rgba(255,220,160,0.8)",fontWeight:700,marginTop:6}}>DAYS TO GO ✈️</div>
          </div>
        </div>
      </div>

      <svg viewBox="0 0 1440 48" style={{display:"block",position:"relative",zIndex:1,marginBottom:-1}}>
        <path d="M0,24 C320,48 560,0 720,24 C880,48 1120,0 1440,24 L1440,48 L0,48 Z" fill="rgba(255,255,255,0.06)"/>
      </svg>

      {/* NAVIGATION TABS */}
      <div style={{position:"sticky",top:0,zIndex:20,padding:"8px 12px",backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",background:"rgba(10,30,70,0.35)",borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
        <div style={{display:"flex",gap:6}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"9px 2px",borderRadius:13,border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:11,transition:"all 0.25s",letterSpacing:0.3,background:tab===t.id?"linear-gradient(135deg,rgba(255,200,100,0.25),rgba(255,130,80,0.2))":"transparent",color:tab===t.id?"rgba(255,220,150,0.95)":"rgba(255,255,255,0.38)",boxShadow:tab===t.id?"0 2px 12px rgba(0,0,0,0.2),inset 0 1px 0 rgba(255,255,255,0.1)":"none",borderColor:tab===t.id?"rgba(255,180,80,0.3)":"transparent",borderStyle:"solid",borderWidth:1}}>
              {t.icon}<br/>{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT AREA */}
      <div style={{padding:"14px 13px 80px",position:"relative",zIndex:1}}>

        {/* ── TODAY TAB ── */}
        {tab==="today"&&(
          <div className="rise">
            <div style={{textAlign:"center",marginBottom:4,marginTop:-4}}>
              <span style={{fontSize:11,fontWeight:700,letterSpacing:1.5,color:"rgba(255,220,160,0.6)"}}>
                {new Date().toLocaleDateString("ja-JP",{year:"numeric",month:"long",day:"numeric",weekday:"short"})}
              </span>
            </div>

            <Glass>
              <SecLabel>⚡️ 今日のカロリー収支</SecLabel>
              <div style={{display:"flex",justifyContent:"space-around",marginBottom:14}}>
                {[{label:"摂取",val:Math.round(mTotals.kcal),unit:"kcal",c:"rgba(255,190,90,0.9)"},{label:"消費計",val:Math.round(totalBurn),unit:"kcal",c:"rgba(100,220,200,0.9)"}].map(s=>(
                  <div key={s.label} style={{textAlign:"center"}}>
                    <div style={{fontSize:30,fontWeight:900,color:"#fff",lineHeight:1}}>{s.val}</div>
                    <div style={{fontSize:10,color:s.c,fontWeight:700,letterSpacing:1,marginTop:3}}>{s.label} {s.unit}</div>
                  </div>
                ))}
              </div>
              <div style={{textAlign:"center",fontSize:11,color:"rgba(255,255,255,0.38)",marginBottom:10}}>消費 = 基礎代謝 {BMR} + 運動 {Math.round(exBurn)} kcal</div>
              <div style={{textAlign:"center"}}>
                <div style={{display:"inline-block",padding:"7px 22px",borderRadius:99,background:balance<=0?"rgba(100,220,180,0.15)":"rgba(255,120,80,0.15)",border:`1px solid ${balance<=0?"rgba(100,220,180,0.4)":"rgba(255,120,80,0.3)"}`}}>
                  <span style={{fontSize:15,fontWeight:800,color:balance<=0?"#80ffcc":"#ffb3a0"}}>{balance>0?"+":""}{balance} kcal</span>
                  <span style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginLeft:8}}>{wChange>0?"▲":"▼"} {Math.abs(wChange)}kg</span>
                </div>
              </div>
            </Glass>

            <Glass>
              <SecLabel>💪 PFCバランス</SecLabel>
              <div style={{display:"flex",justifyContent:"space-around"}}>
                {[{key:"protein",label:"P",goal:120,val:mTotals.protein,c1:"#ff9a9e",c2:"#fecfef"},{key:"fat",label:"F",goal:40,val:mTotals.fat,c1:"#ffecd2",c2:"#fcb69f"},{key:"carb",label:"C",goal:150,val:mTotals.carb,c1:"#a1ffce",c2:"#60e0e0"}].map(p=>(
                  <div key={p.key} style={{textAlign:"center"}}>
                    <Ring pct={p.val/p.goal*100} c1={p.c1} c2={p.c2} size={66} stroke={7}>{Math.round(p.val/p.goal*100)}%</Ring>
                    <div style={{fontSize:14,fontWeight:900,color:"#fff",marginTop:5}}>{Math.round(p.val)}<span style={{fontSize:10}}>g</span></div>
                    <div style={{fontSize:9,color:"rgba(255,255,255,0.45)",fontWeight:700,letterSpacing:1}}>{p.label} / {p.goal}g</div>
                  </div>
                ))}
              </div>
            </Glass>

            {todayWeight!=null&&(
              <Glass>
                <SecLabel>⚖️ 体重 & BMI</SecLabel>
                <div style={{display:"flex",gap:12}}>
                  <div style={{flex:1,textAlign:"center",padding:"12px 0",background:"rgba(255,255,255,0.05)",borderRadius:16,border:"1px solid rgba(255,255,255,0.1)"}}>
                    <div style={{fontSize:10,letterSpacing:1.5,color:"rgba(255,255,255,0.45)",fontWeight:700,marginBottom:4}}>体重</div>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:40,color:"rgba(255,190,90,0.95)",lineHeight:1}}>{todayWeight}</div>
                    <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginTop:2}}>kg</div>
                  </div>
                  <div style={{flex:1,textAlign:"center",padding:"12px 0",background:"rgba(255,255,255,0.05)",borderRadius:16,border:"1px solid rgba(255,255,255,0.1)"}}>
                    <div style={{fontSize:10,letterSpacing:1.5,color:"rgba(255,255,255,0.45)",fontWeight:700,marginBottom:4}}>BMI</div>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:40,color:bmiInfo.color,lineHeight:1}}>{bmi}</div>
                    <div style={{fontSize:10,fontWeight:700,color:bmiInfo.color,marginTop:4}}>{bmiInfo.text}</div>
                  </div>
                </div>
              </Glass>
            )}

            <Glass>
              <SecLabel>✅ 今日のミッション {checkDone}/{CHECKLIST_ITEMS.length}</SecLabel>
              {CHECKLIST_ITEMS.map(item=>(
                <div key={item.id} onClick={()=>toggleCheck(item.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:12,marginBottom:5,cursor:"pointer",background:checks[item.id]?"rgba(100,220,180,0.12)":"rgba(255,255,255,0.04)",border:`1px solid ${checks[item.id]?"rgba(100,220,180,0.35)":"rgba(255,255,255,0.07)"}`,transition:"all 0.2s"}}>
                  <div style={{width:20,height:20,borderRadius:7,flexShrink:0,background:checks[item.id]?"linear-gradient(135deg,#4cd9b0,#5ec8f2)":"rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center",border:`1px solid ${checks[item.id]?"transparent":"rgba(255,255,255,0.15)"}`}}>
                    {checks[item.id]&&<span style={{color:"#fff",fontSize:11}}>✓</span>}
                  </div>
                  <span style={{fontSize:13}}>{item.emoji}</span>
                  <span style={{fontSize:12,fontWeight:600,color:checks[item.id]?"rgba(160,255,220,0.9)":"rgba(255,255,255,0.7)",textDecoration:checks[item.id]?"line-through":"none"}}>{item.label}</span>
                </div>
              ))}
            </Glass>
          </div>
        )}

        {/* ── TOTAL TAB ── */}
        {tab==="total"&&(
          <div className="rise">
            <Glass style={{textAlign:"center"}}>
              <SecLabel>📅 記録期間</SecLabel>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:48,color:"#fff",lineHeight:1}}>{allTotals.days}</div>
              <div style={{fontSize:10,letterSpacing:2,color:"rgba(255,200,120,0.8)",fontWeight:700,marginTop:4}}>DAYS RECORDED</div>
            </Glass>
            <Glass>
              <SecLabel>⚖️ 体重の推移</SecLabel>
              {weightEntries.length>=2?(()=>{
                const W=300,H=130,PAD={t:14,b:28,l:36,r:12};
                const ws=weightEntries.map(e=>e.w),minW=Math.min(...ws),maxW=Math.max(...ws),rng=maxW-minW||0.5;
                const gW=W-PAD.l-PAD.r,gH=H-PAD.t-PAD.b;
                const px=i=>PAD.l+(i/(weightEntries.length-1))*gW,py=w=>PAD.t+(1-(w-minW)/rng)*gH;
                const pts=weightEntries.map((e,i)=>({x:px(i),y:py(e.w),w:e.w,d:e.d}));
                const path=pts.map((p,i)=>i===0?`M${p.x},${p.y}`:`L${p.x},${p.y}`).join(" ");
                const diff=parseFloat((lastW-firstW).toFixed(2));
                return (
                  <>
                    <div style={{display:"flex",justifyContent:"space-around",marginBottom:14}}>
                      {[{label:"スタート",val:firstW,c:"rgba(255,190,90,0.9)"},{label:"最新",val:lastW,c:"rgba(100,220,200,0.9)"},{label:"変化",val:(diff>0?"+":"")+diff,c:diff<=0?"#80ffcc":"#ffb3a0"}].map(w=>(
                        <div key={w.label} style={{textAlign:"center"}}>
                          <div style={{fontSize:9,letterSpacing:1.5,color:"rgba(255,255,255,0.4)",fontWeight:700,marginBottom:3}}>{w.label}</div>
                          <div style={{fontFamily:"'Playfair Display',serif",fontSize:26,color:w.c,lineHeight:1}}>{w.val}</div>
                          <div style={{fontSize:9,color:"rgba(255,255,255,0.3)"}}>kg</div>
                        </div>
                      ))}
                    </div>
                    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
                      <defs>
                        <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#60e0e0" stopOpacity="0.35"/><stop offset="100%" stopColor="#60e0e0" stopOpacity="0.02"/></linearGradient>
                      </defs>
                      <path d={path} fill="none" stroke="#60e0e0" strokeWidth={2.5}/>
                      {pts.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r={3} fill="#fff"/>)}
                    </svg>
                  </>
                );
              })():<p style={{color:"rgba(255,255,255,0.3)",textAlign:"center",fontSize:13}}>体重を2日以上記録するとグラフが表示されます</p>}
            </Glass>
          </div>
        )}

        {/* ── RECORD TAB ── */}
        {tab==="record"&&(
          <div className="rise">
            <Glass>
              <SecLabel>📅 記録する日付</SecLabel>
              <input type="date" value={selectedDate} max={dk} onChange={e=>setSelectedDate(e.target.value)} style={{...inp, colorScheme:"dark"}}/>
            </Glass>
            <Glass>
              <SecLabel>🍱 食事を追加</SecLabel>
              <div style={{marginBottom:10}}><label style={lbl}>食事名</label><input style={inpSm} type="text" placeholder="ランチ" value={mealF.name} onChange={e=>setMealF(p=>({...p,name:e.target.value}))}/></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div><label style={lbl}>kcal</label><input style={inpSm} type="number" placeholder="500" value={mealF.kcal} onChange={e=>setMealF(p=>({...p,kcal:e.target.value}))}/></div>
                <div><label style={lbl}>P(g)</label><input style={inpSm} type="number" placeholder="30" value={mealF.protein} onChange={e=>setMealF(p=>({...p,protein:e.target.value}))}/></div>
              </div>
              <AddBtn flash={flashMeal} label="食事を追加 🍽" onClick={addMeal}/>
            </Glass>
            <Glass>
              <SecLabel>⚖️ 体重を記録</SecLabel>
              <input style={inp} type="number" placeholder="57.5" step="0.1" value={weightF} onChange={e=>setWeightF(e.target.value)}/>
              <button onClick={saveWeight} style={{width:"100%",padding:"12px",borderRadius:16,marginTop:8,background:flashW?"linear-gradient(135deg,#4cd9b0,#5ec8f2)":"rgba(255,255,255,0.1)",color:"#fff",fontWeight:700,border:"1px solid rgba(255,255,255,0.2)"}}>
                {flashW?"✓ 保存完了":"体重を保存 ⚖️"}
              </button>
            </Glass>
          </div>
        )}

        {/* ── EDIT TAB ── */}
        {tab==="edit"&&(
          <div className="rise">
            {sortedDates.length===0 ? (
              <div style={{textAlign:"center",padding:"40px 0",color:"rgba(255,255,255,0.3)"}}>記録がありません 🌊</div>
            ) : [...sortedDates].reverse().map(d=><EditableRecord key={d} dateKey={d} record={records[d]} onDelete={deleteRecord}/>)}
          </div>
        )}
      </div>
    </div>
  );
}
