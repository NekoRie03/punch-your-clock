// ─── Constants ───────────────────────────────────────────────────────────────
const SK = {
  data:      'pyc_data2',
  settings:  'pyc_settings2',
  user:      'pyc_user2',
  xp:        'pyc_xp2',
  backup:    'pyc_backup2',
  coins:     'pyc_coins',
  monthly:   'pyc_monthly_',
  lossStreak:'pyc_loss_streak',
  coinSkip:  'pyc_coin_skip',
  ach:       'pyc_ach',
  wins:      'pyc_wins',
  pwaDismiss:'pyc_pwa_dismissed',
};

const GRACE_MS = 5 * 60 * 1000;
const STATUSES = ['Present','Holiday','Sick Leave','Vacation','Absent'];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const DIFFICULTY = {
  easy:      { hits:1,  timeout:2000, label:'1 hit, very slow', mockMsg:'Wow. You actually hit it. 🎉 Here\'s your participation medal.' },
  normal:    { hits:5,  timeout:800,  label:'5 hits, 0.8s',     mockMsg:null },
  hard:      { hits:8,  timeout:500,  label:'8 hits, 0.5s',     mockMsg:null },
  nightmare: { hits:10, timeout:350,  label:'10 hits, 0.35s',   mockMsg:null },
};

const RANKS = [
  { name:'Rookie',   icon:'🥉', xpReq:0    },
  { name:'Clocker',  icon:'⚙️', xpReq:100  },
  { name:'Grinder',  icon:'🔧', xpReq:250  },
  { name:'Warrior',  icon:'⚔️', xpReq:500  },
  { name:'Champion', icon:'🏆', xpReq:900  },
  { name:'Legend',   icon:'💎', xpReq:1500 },
  { name:'Immortal', icon:'👑', xpReq:2500 },
];

const ACH_DEFS = [
  { id:'first_punch', icon:'👊', label:'First Blood',   desc:'First punch ever',            check:(m)=>m.totalXP>=10 },
  { id:'streak3',     icon:'🔥', label:'On Fire',       desc:'3-day streak',                check:(m)=>m.streak>=3 },
  { id:'streak7',     icon:'🌶️', label:'Week Warrior',  desc:'7-day streak',                check:(m)=>m.streak>=7 },
  { id:'streak21',    icon:'💪', label:'Iron Habit',    desc:'21-day streak',               check:(m)=>m.streak>=21 },
  { id:'ot_first',    icon:'⏱️', label:'Overtime Hero', desc:'First overtime day',          check:(m)=>m.hasOT },
  { id:'full_month',  icon:'📅', label:'Full House',    desc:'All days punched in a month', check:(m)=>m.fullMonth },
  { id:'rank5',       icon:'🏆', label:'Champion!',     desc:'Reach Champion rank',         check:(m)=>m.totalXP>=900 },
  { id:'legend',      icon:'💎', label:'Living Legend', desc:'Reach Legend rank',           check:(m)=>m.totalXP>=1500 },
  { id:'win5',        icon:'🥊', label:'Brawler',       desc:'Win 5 Whack games',           check:(m)=>m.winsTotal>=5 },
];

// ─── Utilities ────────────────────────────────────────────────────────────────
const ls = {
  get:    (k, fallback=null) => { try { const v=localStorage.getItem(k); return v!==null?JSON.parse(v):fallback; } catch { return fallback; } },
  set:    (k, v)             => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  raw:    (k, fallback='')   => localStorage.getItem(k) ?? fallback,
  setRaw: (k, v)             => localStorage.setItem(k, v),
};

const padT      = n => String(n).padStart(2,'0');
const nowYM     = () => { const n=new Date(); return `${n.getFullYear()}-${padT(n.getMonth()+1)}`; };
const nowHHMM   = () => { const n=new Date(); return `${padT(n.getHours())}:${padT(n.getMinutes())}`; };
const toMins    = t => { if(!t||!t.includes(':'))return null; const[h,m]=t.split(':').map(Number); return h*60+m; };
const fmtHM     = m => { m=Math.max(0,m); return `${Math.floor(m/60)}h ${m%60}m`; };
const daysInMonth  = (y,m) => new Date(y,m,0).getDate();
const weekday      = (y,m,d) => new Date(y,m-1,d).getDay();
const workingDays  = (y,m) => { const r=[]; for(let i=1;i<=daysInMonth(y,m);i++){ const w=weekday(y,m,i); if(w!==0&&w!==6)r.push(i); } return r; };
const isUnlocked   = day => day?.unlocked && day.unlockedUntil > Date.now();

const getRank    = xp => { let r=RANKS[0]; for(const rk of RANKS) if(xp>=rk.xpReq)r=rk; return r; };
const getNextRank= xp => { for(const rk of RANKS) if(xp<rk.xpReq)return rk; return null; };

const computeDaily = (day, lunchMins) => {
  const aIn=toMins(day.amArrival), aOut=toMins(day.amDepart);
  const pIn=toMins(day.pmArrival), pOut=toMins(day.pmDepart);
  const hasAM = aIn!==null&&aOut!==null&&aOut>aIn;
  const hasPM = pIn!==null&&pOut!==null&&pOut>pIn;
  const raw = (hasAM?aOut-aIn:0)+(hasPM?pOut-pIn:0);
  let ded = 0;
  if((hasAM&&!hasPM)||(!hasAM&&hasPM)) ded=Math.min(day.customLunchMins??lunchMins, raw);
  return { netMins: Math.max(0,raw-ded) };
};
const officialMins = (day, settings) =>
  Math.max(0, toMins(settings.end)-toMins(settings.start)-(day.customLunchMins??settings.lunchMins));
const overtime = (n,o) => Math.max(0,n-o);

const blankDay = () => ({
  amArrival:'', amDepart:'', pmArrival:'', pmDepart:'',
  status:'Present', customLunchMins:null,
  unlocked:false, unlockedUntil:0, provedFlags:{}, notes:'',
});

function computeStreak(appData) {
  let streak=0, limit=0;
  const cursor=new Date(); cursor.setHours(0,0,0,0);
  while(limit++<365) {
    const wd=cursor.getDay();
    if(wd===0||wd===6){ cursor.setDate(cursor.getDate()-1); continue; }
    const ym=`${cursor.getFullYear()}-${padT(cursor.getMonth()+1)}`;
    const day=appData[ym]?.[cursor.getDate()];
    if(!day)break;
    const logged=day.amArrival||day.amDepart||day.pmArrival||day.pmDepart||day.notes||
      ['Sick Leave','Vacation','Holiday','Absent'].includes(day.status);
    if(!logged)break;
    streak++; cursor.setDate(cursor.getDate()-1);
  }
  return streak;
}

function initMonthData(appData, ym) {
  const data = { ...appData };
  if(!data[ym]) data[ym]={};
  const [y,m] = ym.split('-').map(Number);
  const working = workingDays(y,m);
  for(const d of working) {
    if(!data[ym][d]) {
      data[ym][d] = blankDay();
    } else {
      const day=data[ym][d];
      if(day.unlocked===undefined)     day.unlocked=false;
      if(day.unlockedUntil===undefined)day.unlockedUntil=0;
      if(!day.provedFlags)             day.provedFlags={};
      if(!day.status)                  day.status='Present';
      if(day.notes===undefined)        day.notes='';
    }
  }
  for(const d in data[ym]) if(!working.includes(+d)) delete data[ym][+d];
  return data;
}

// ─── Context ─────────────────────────────────────────────────────────────────
const { createContext, useContext, useState, useEffect, useRef, useCallback, useReducer } = React;

const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

// ─── State reducer ────────────────────────────────────────────────────────────
function appReducer(state, action) {
  switch(action.type) {
    case 'SET_DATA':    return { ...state, appData: action.data };
    case 'SET_COINS':   return { ...state, coins: action.coins };
    case 'SET_XP':      return { ...state, xpData: action.xpData };
    case 'SET_ACH':     return { ...state, achievements: action.achievements };
    case 'SET_YM':      return { ...state, currentYM: action.ym };
    case 'SET_USER':    return { ...state, userName: action.name };
    case 'SET_SETTINGS':return { ...state, settings: action.settings };
    case 'ADD_TOAST':   return { ...state, toasts: [...state.toasts, { id:action.id, msg:action.msg }] };
    case 'DEL_TOAST':   return { ...state, toasts: state.toasts.filter(t=>t.id!==action.id) };
    case 'SET_WHACK':   return { ...state, whackGame: action.game };
    case 'SET_COIN_CONFIRM': return { ...state, coinConfirm: action.payload };
    case 'SET_PWA_BANNER':   return { ...state, showPWA: action.show };
    default: return state;
  }
}

const defaultSettings = { start:'08:00', end:'17:00', lunchMins:60, hourlyRate:0, whackDifficulty:'normal' };

// ─── Provider ─────────────────────────────────────────────────────────────────
function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, {
    appData: {},
    coins: 0,
    xpData: { xp:0, level:0, totalXP:0 },
    achievements: {},
    currentYM: nowYM(),
    userName: 'Fighter',
    settings: defaultSettings,
    toasts: [],
    whackGame: null,
    coinConfirm: null,
    showPWA: false,
  });

  const graceTimers = useRef({});
  const toastIdRef  = useRef(0);

  // ── persistence helpers ──
  const saveData     = useCallback(d   => ls.set(SK.data, d),     []);
  const saveSettings = useCallback(s   => ls.set(SK.settings, s), []);
  const saveXP       = useCallback(xp  => ls.set(SK.xp, xp),      []);
  const saveAch      = useCallback(a   => ls.set(SK.ach, a),       []);

  // ── toast ──
  const toast = useCallback(msg => {
    const id = ++toastIdRef.current;
    dispatch({ type:'ADD_TOAST', id, msg });
    setTimeout(()=>dispatch({ type:'DEL_TOAST', id }), 3100);
  }, []);

  // ── XP popup ──
  const showXPPopup = useCallback(amount => {
    const el=document.createElement('div');
    el.className='xp-popup'; el.textContent=`+${amount} XP`;
    el.style.left=Math.random()*60+20+'vw'; el.style.top='30vh';
    document.body.appendChild(el);
    setTimeout(()=>el.remove(), 1300);
  }, []);

  // ── Coin popup ──
  const showCoinPopup = useCallback(amount => {
    const badge=document.getElementById('coinBadge');
    if(!badge)return;
    const rect=badge.getBoundingClientRect();
    const el=document.createElement('div');
    el.className='coin-popup';
    el.innerHTML=`🪙 <span style="font-family:'Bebas Neue',cursive;color:var(--accent);font-size:1.2rem">+${amount}</span>`;
    el.style.left='50vw'; el.style.top='40vh';
    el.style.setProperty('--dx', `${rect.left+rect.width/2-25-window.innerWidth/2}px`);
    el.style.setProperty('--dy', `${rect.top+rect.height/2-25-window.innerHeight*0.4}px`);
    document.body.appendChild(el);
    setTimeout(()=>el.remove(), 1300);
  }, []);

  // ── gainXP ──
  const gainXP = useCallback((amount) => {
    dispatch({ type:'SET_XP', xpData: (prev => {
      const next = { ...prev, totalXP:(prev.totalXP||0)+amount };
      saveXP(next); return next;
      // Can't call setState inside callback; use functional update pattern via ref
    })});
    // Workaround: use a ref to always have latest xpData
    showXPPopup(amount);
  }, [saveXP, showXPPopup]);

  // ── coins ──
  const addCoin = useCallback((n=1, newCoins) => {
    dispatch({ type:'SET_COINS', coins: newCoins });
    ls.set(SK.coins, newCoins);
    showCoinPopup(n);
  }, [showCoinPopup]);

  const spendCoin = useCallback((currentCoins) => {
    if(currentCoins<1)return false;
    const next=currentCoins-1;
    dispatch({ type:'SET_COINS', coins:next });
    ls.set(SK.coins, next);
    return true;
  }, []);

  // ── unlockDay ──
  const unlockDay = useCallback((ym, d, currentData, onDone) => {
    const until = Date.now()+GRACE_MS;
    const data = JSON.parse(JSON.stringify(currentData));
    if(!data[ym])data[ym]={};
    if(!data[ym][d])data[ym][d]={...blankDay()};
    data[ym][d].unlocked=true;
    data[ym][d].unlockedUntil=until;
    saveData(data);
    dispatch({ type:'SET_DATA', data });
    const key=`${ym}|${d}`;
    if(graceTimers.current[key])clearTimeout(graceTimers.current[key]);
    graceTimers.current[key]=setTimeout(()=>{
      dispatch({ type:'SET_DATA', data: (prev => {
        // handled via functional update in effect
        return prev;
      })});
      // Use a simple approach: re-read from LS and lock
      const fresh=ls.get(SK.data,{});
      if(fresh[ym]?.[d]?.unlockedUntil===until){
        fresh[ym][d].unlocked=false; fresh[ym][d].unlockedUntil=0;
        saveData(fresh);
        dispatch({ type:'SET_DATA', data:fresh });
        toast(`🔒 Day ${d} auto-locked`);
      }
    }, GRACE_MS);
    if(onDone)onDone(data);
  }, [saveData, toast]);

  // ── init ──
  useEffect(()=>{
    const rawData = ls.get(SK.data, {});
    const rawSettings = ls.get(SK.settings, {});
    const rawXP = ls.get(SK.xp, { xp:0,level:0,totalXP:0 });
    const rawCoins = parseInt(ls.raw(SK.coins,'0'),10);
    const rawAch = ls.get(SK.ach, {});
    let rawUser = localStorage.getItem(SK.user)||'';
    if(!rawUser){
      rawUser=prompt('🥊 Your name, fighter?','Fighter')||'Fighter';
      localStorage.setItem(SK.user, rawUser);
    }
    const ym=nowYM();
    const data=initMonthData(rawData, ym);
    saveData(data);
    dispatch({ type:'SET_DATA',     data });
    dispatch({ type:'SET_SETTINGS', settings:{...defaultSettings,...rawSettings} });
    dispatch({ type:'SET_XP',       xpData:rawXP });
    dispatch({ type:'SET_COINS',    coins:rawCoins });
    dispatch({ type:'SET_ACH',      achievements:rawAch });
    dispatch({ type:'SET_USER',     name:rawUser });
    dispatch({ type:'SET_YM',       ym });

    // PWA banner
    window.addEventListener('beforeinstallprompt', e=>{
      e.preventDefault();
      window._deferredInstall=e;
      if(!localStorage.getItem(SK.pwaDismiss)){
        dispatch({ type:'SET_PWA_BANNER', show:true });
      }
    });
    window.addEventListener('appinstalled', ()=>{
      dispatch({ type:'SET_PWA_BANNER', show:false });
      window._deferredInstall=null;
    });
  }, []); // eslint-disable-line

  // ── achievements ──
  const checkAchievements = useCallback((xpData, appData, currentYM) => {
    const ach = ls.get(SK.ach, {});
    const [y,m] = currentYM.split('-').map(Number);
    const working = workingDays(y,m);
    let allPunched=working.length>0, hasOT=false;
    const settings = ls.get(SK.settings, defaultSettings);
    for(const d of working){
      const day=appData[currentYM]?.[d];
      if(!day||(!day.amArrival&&!day.pmArrival))allPunched=false;
      if(day){ const{netMins}=computeDaily(day,settings.lunchMins); if(overtime(netMins,officialMins(day,settings))>0)hasOT=true; }
    }
    const meta={
      totalXP: xpData.totalXP,
      streak:  computeStreak(appData),
      hasOT, fullMonth:allPunched,
      winsTotal: parseInt(ls.raw(SK.wins,'0'),10),
    };
    let changed=false;
    for(const a of ACH_DEFS){
      if(!ach[a.id]&&a.check(meta)){
        ach[a.id]=Date.now(); changed=true;
        toast(`🏅 Achievement: ${a.label}!`);
        // gainXP inside ach check — use direct LS approach
        const xp=ls.get(SK.xp,{totalXP:0});
        xp.totalXP=(xp.totalXP||0)+50;
        ls.set(SK.xp,xp);
        dispatch({ type:'SET_XP', xpData:xp });
        showXPPopup(50);
      }
    }
    if(changed){ ls.set(SK.ach,ach); }
    dispatch({ type:'SET_ACH', achievements:ach });
  }, [toast, showXPPopup]);

  const value = { state, dispatch, toast, gainXP, addCoin, spendCoin, unlockDay,
                  checkAchievements, saveData, saveSettings, saveXP, saveAch, showCoinPopup };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useLiveClock() {
  const [time, setTime] = useState('');
  useEffect(()=>{
    const tick=()=>{
      const n=new Date();
      setTime({ h:padT(n.getHours()), m:padT(n.getMinutes()), s:padT(n.getSeconds()) });
    };
    tick(); const iv=setInterval(tick,1000); return ()=>clearInterval(iv);
  },[]);
  return time;
}

function useGraceCountdown(day) {
  const [rem, setRem] = useState('');
  useEffect(()=>{
    if(!day||!isUnlocked(day)){ setRem(''); return; }
    const iv=setInterval(()=>{
      if(!isUnlocked(day)){ setRem(''); clearInterval(iv); return; }
      const ms=Math.max(0,day.unlockedUntil-Date.now());
      setRem(`🔓 Unlocked · ${Math.floor(ms/60000)}:${padT(Math.floor((ms%60000)/1000))} left`);
    },1000);
    return ()=>clearInterval(iv);
  },[day]);
  return rem;
}

function useRowGrace(day) {
  const [rem, setRem] = useState('');
  useEffect(()=>{
    if(!day||!isUnlocked(day)){ setRem(''); return; }
    const iv=setInterval(()=>{
      if(!isUnlocked(day)){ setRem(''); clearInterval(iv); return; }
      const ms=Math.max(0,day.unlockedUntil-Date.now());
      setRem(`⏱ ${Math.floor(ms/60000)}:${padT(Math.floor((ms%60000)/1000))}`);
    },1000);
    const ms0=Math.max(0,day.unlockedUntil-Date.now());
    setRem(`⏱ ${Math.floor(ms0/60000)}:${padT(Math.floor((ms0%60000)/1000))}`);
    return ()=>clearInterval(iv);
  },[day]);
  return rem;
}

// ─── XP Helpers (using LS to avoid stale closure) ────────────────────────────
function gainXPDirect(amount, dispatch, showXPPopup) {
  const xp = ls.get(SK.xp, { totalXP:0 });
  xp.totalXP = (xp.totalXP||0)+amount;
  ls.set(SK.xp, xp);
  dispatch({ type:'SET_XP', xpData:xp });
  showXPPopup(amount);
}

// ─── Whack-a-Clock Game ──────────────────────────────────────────────────────
function WhackGame({ game, onClose }) {
  const { rounds, hits, timeout, diff, onWin, onLose } = game;
  const [round,     setRound]     = useState(0);
  const [score,     setScore]     = useState(0);
  const [combo,     setCombo]     = useState(0);
  const [active,    setActive]    = useState(Array(9).fill(false));
  const [hit,       setHit]       = useState(Array(9).fill(false));
  const [done,      setDone]      = useState(false);
  const [mockMode,  setMockMode]  = useState(false);
  const [coinReward,setCoinReward]= useState(1);
  const stateRef = useRef({ round:0, score:0, combo:0, alive:true, th:null });
  const s = stateRef.current;

  const cfg = DIFFICULTY[diff]||DIFFICULTY.normal;

  const end = useCallback((win)=>{
    if(!s.alive)return;
    s.alive=false;
    if(s.th)clearTimeout(s.th);
    setDone(true);
    const lsBefore=parseInt(ls.raw(SK.lossStreak,'0'),10);
    if(win){
      const reward=lsBefore>=3?0:1;
      setCoinReward(reward);
      ls.setRaw(SK.lossStreak,'0');
      if(diff==='easy'&&cfg.mockMsg){ setMockMode(true); return; }
      const wins=parseInt(ls.raw(SK.wins,'0'),10)+1;
      ls.setRaw(SK.wins,String(wins));
      onWin(reward);
      onClose();
    } else {
      ls.setRaw(SK.lossStreak,String(lsBefore+1));
      onLose();
      onClose();
    }
  },[s, diff, cfg.mockMsg, onWin, onLose, onClose]);

  const showMole = useCallback(()=>{
    if(!s.alive)return;
    setActive(Array(9).fill(false));
    setHit(Array(9).fill(false));
    const idx=Math.floor(Math.random()*9);
    setActive(a=>{const n=[...a];n[idx]=true;return n;});
    s.th=setTimeout(()=>{
      if(s.alive){
        setActive(Array(9).fill(false));
        s.combo=0; setCombo(0);
        setTimeout(()=>{ if(s.alive)nextRound(); }, 200);
      }
    }, timeout);
    return idx;
  },[s, timeout]);

  const nextRound = useCallback(()=>{
    s.round++;
    setRound(s.round);
    if(s.round>rounds) end(s.score>=hits);
    else showMole();
  },[s, rounds, hits, end, showMole]);

  useEffect(()=>{ nextRound(); return ()=>{ s.alive=false; if(s.th)clearTimeout(s.th); }; },[]); // eslint-disable-line

  const handleHit = useCallback((idx)=>{
    if(!s.alive||!stateRef.current)return;
    const a=stateRef.current;
    if(a.th)clearTimeout(a.th);
    setHit(h=>{const n=[...h];n[idx]=true;return n;});
    setActive(Array(9).fill(false));
    a.score++; a.combo++; s.score++; s.combo++;
    setScore(a.score); setCombo(a.combo);
    if(a.score>=hits) end(true);
    else setTimeout(()=>{ if(s.alive)nextRound(); },250);
  },[s, hits, end, nextRound]);

  if(mockMode){
    return (
      <div className="modal-overlay">
        <div className="modal-card">
          <h2>😂 EASY MODE</h2>
          <p style={{fontSize:'1.1rem',color:'var(--accent)',marginBottom:'1.5rem'}}>{cfg.mockMsg}</p>
          <button className="btn" onClick={()=>{ const wins=parseInt(ls.raw(SK.wins,'0'),10)+1; ls.setRaw(SK.wins,String(wins)); onWin(coinReward); onClose(); }}>OK</button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h2>⏰ WHACK-A-CLOCK</h2>
        <p>Hit the clock! Need <strong>{hits}</strong> hits in <strong>{rounds}</strong> rounds.</p>
        <div className="game-meta">
          <span className="score">Hits: {score}/{hits}</span>
          <span className="round">Round: {round}/{rounds}</span>
        </div>
        <div className="progress-bar"><div className="progress-bar-fill" style={{width:`${(score/hits)*100}%`}}></div></div>
        <div className="combo-display">{combo>=3?`🔥 ${combo}x COMBO!`:''}</div>
        <div className="whack-grid">
          {Array(9).fill(0).map((_,i)=>(
            <div key={i}
              className={`mole-cell${active[i]?' active':''}${hit[i]?' hit':''}`}
              onClick={()=>active[i]&&handleHit(i)}>
              {hit[i]?'💥':active[i]?'⏰🧤':'🕳️'}
            </div>
          ))}
        </div>
        <button className="btn danger" onClick={()=>end(false)}>❌ Give up</button>
      </div>
    </div>
  );
}

// ─── Coin Confirm Modal ───────────────────────────────────────────────────────
function CoinConfirmModal({ dayNum, coins, onResult }) {
  const [skip, setSkip] = useState(false);
  if(ls.raw(SK.coinSkip)==='1'){ onResult(true); return null; }
  return (
    <div className="modal-overlay" style={{display:'flex'}}>
      <div className="coin-confirm-card">
        <h3>💳 Spend Counter Clock?</h3>
        <p>Unlock Day {dayNum} for 1 🪙?</p>
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'.5rem',marginBottom:'1rem'}}>
          <span style={{fontSize:'1.5rem'}}>🪙</span>
          <span style={{fontFamily:"'Bebas Neue',cursive",fontSize:'1.4rem',color:'var(--accent)'}}>{coins}</span>
          <span style={{fontSize:'.7rem',color:'var(--muted)'}}>available</span>
        </div>
        <label className="checkbox-label">
          <input type="checkbox" checked={skip} onChange={e=>setSkip(e.target.checked)} />
          Don't ask again (auto‑spend)
        </label>
        <div className="coin-confirm-btns">
          <button className="btn" onClick={()=>{ if(skip)ls.setRaw(SK.coinSkip,'1'); onResult(true); }}>🪙 Spend</button>
          <button className="btn danger" onClick={()=>onResult(false)}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── PWA Banner ───────────────────────────────────────────────────────────────
function PWABanner({ onDismiss }) {
  const install = async () => {
    if(!window._deferredInstall)return;
    window._deferredInstall.prompt();
    const { outcome } = await window._deferredInstall.userChoice;
    if(outcome==='accepted'){ alert('🎉 App installed!'); }
    window._deferredInstall=null;
    onDismiss();
  };
  return (
    <div className="install-banner show">
      <span style={{fontSize:'1.4rem'}}>📲</span>
      <div className="install-banner-text">
        <strong>Add to Home Screen</strong>
        Install this app on your phone for offline access &amp; fullscreen mode.
      </div>
      <button className="install-btn" onClick={install}>Install</button>
      <button className="install-dismiss" onClick={onDismiss}>✕</button>
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
function Header() {
  const { state, dispatch } = useApp();
  const { userName } = state;
  const rename = () => {
    const n=prompt('Change your name:',userName);
    if(n&&n.trim()){ ls.setRaw(SK.user,n.trim()); dispatch({type:'SET_USER',name:n.trim()}); }
  };
  return (
    <div className="header">
      <h1>🥊 PUNCH YOUR CLOCK</h1>
      <span className="name-tag" id="nameTag" title="Click to rename" onClick={rename}>👤 {userName}</span>
    </div>
  );
}

// ─── Tagline ──────────────────────────────────────────────────────────────────
function Tagline() {
  const { state } = useApp();
  return (
    <div className="tagline">
      You think you clocked in, <strong>{state.userName}</strong>? We know you didn't. Let's fight about it.
    </div>
  );
}

// ─── Rank Panel ───────────────────────────────────────────────────────────────
function RankPanel() {
  const { state } = useApp();
  const { xpData, appData } = state;
  const rank = getRank(xpData.totalXP);
  const next = getNextRank(xpData.totalXP);
  const streak = computeStreak(appData);

  let pct=100, xpLabel=`${xpData.totalXP} XP MAX`;
  if(next){
    const prev=RANKS[RANKS.indexOf(next)-1];
    const needed=next.xpReq-prev.xpReq;
    const have=xpData.totalXP-prev.xpReq;
    pct=Math.min(100,Math.round(have/needed*100));
    xpLabel=`${xpData.totalXP} / ${next.xpReq}`;
  }

  return (
    <div className="rank-panel">
      <div className="rank-badge">
        <span className="rank-icon">{rank.icon}</span>
        <div>
          <div className="rank-label">Rank</div>
          <div className="rank-name" id="rankName">{rank.name}</div>
        </div>
      </div>
      <div className="xp-wrap">
        <div className="xp-label"><span>XP</span><span id="xpVal">{xpLabel}</span></div>
        <div className="xp-track"><div className="xp-fill" id="xpFill" style={{width:`${pct}%`}}></div></div>
      </div>
      <span className={`streak-badge${streak>=3?' hot':''}`} id="streakBadge"
            title={`${streak} consecutive working days logged${streak>=3?' 🔥 Keep it up!':''}`}>
        🔥 <span className="streak-num">{streak}</span> day streak
      </span>
      <span className="streak-badge" id="coinBadge"
            style={{borderColor:'#f5c84240',color:'var(--accent)'}}
            title="Counter Clocks – spend 1 to unlock any day without fighting">
        🪙 <span id="coinCount">{state.coins}</span>
      </span>
    </div>
  );
}

// ─── Achievements ─────────────────────────────────────────────────────────────
function AchievementsStrip() {
  const { state } = useApp();
  const { achievements } = state;
  return (
    <div className="achievements-strip">
      {ACH_DEFS.map(a=>(
        <span key={a.id} className={`ach-chip${achievements[a.id]?' unlocked':''}`}
              title={`${a.desc}${achievements[a.id]?' ✓':''}`}>
          <span className="ach-icon">{a.icon}</span>{a.label}
        </span>
      ))}
    </div>
  );
}

// ─── Punch Alert ─────────────────────────────────────────────────────────────
function PunchAlert() {
  const { state } = useApp();
  const { appData } = state;
  const now = new Date();
  const ym = `${now.getFullYear()}-${padT(now.getMonth()+1)}`;
  const day = appData[ym]?.[now.getDate()];
  const h = now.getHours();
  const issues = [];
  if(day){
    if(day.amArrival&&!day.amDepart&&h>=12)            issues.push('AM IN recorded but no AM OUT');
    if(!day.amArrival&&!day.pmArrival&&h>=9&&day.status==='Present') issues.push('No punch recorded yet');
    if(day.pmArrival&&!day.pmDepart&&h>=17)            issues.push('PM IN recorded but no PM OUT');
  }
  if(!issues.length)return null;
  return (
    <div className="punch-alert visible">
      ⚠️ <strong>Punch gap:</strong> {issues.join(' · ')}
    </div>
  );
}

// ─── Punch Card ───────────────────────────────────────────────────────────────
function PunchCard() {
  const { state, dispatch, toast, checkAchievements, saveData, showCoinPopup } = useApp();
  const { appData, currentYM, settings, coins } = state;
  const clock = useLiveClock();
  const now = new Date();
  const ym = `${now.getFullYear()}-${padT(now.getMonth()+1)}`;
  const todayDay = appData[ym]?.[now.getDate()];
  const graceText = useGraceCountdown(todayDay);

  const { unlockDay } = useApp();

  const todayDate = now.toLocaleDateString(undefined,{weekday:'short',year:'numeric',month:'long',day:'numeric'});
  const labels = { amArrival:'AM IN',amDepart:'AM OUT',pmArrival:'PM IN',pmDepart:'PM OUT' };
  const parts = ['amArrival','amDepart','pmArrival','pmDepart'].filter(f=>todayDay?.[f]).map(f=>`${labels[f]}: ${todayDay[f]}`);
  const todayStatus = !todayDay ? '📅 Not a working day'
    : (parts.length?parts.join(' · '):'⏳ No punches yet')+(isUnlocked(todayDay)?' 🔓':' 🔒');

  const doRecord = useCallback((field) => {
    const d = now.getDate();
    let data = JSON.parse(JSON.stringify(appData));
    if(!data[ym])data[ym]={};
    const t = nowHHMM();
    data[ym][d][field]=t;
    if(!data[ym][d].provedFlags)data[ym][d].provedFlags={};
    data[ym][d].provedFlags[field]=true;
    saveData(data);
    dispatch({ type:'SET_DATA', data });

    const xp=ls.get(SK.xp,{totalXP:0});
    xp.totalXP=(xp.totalXP||0)+10;
    ls.set(SK.xp,xp);
    dispatch({type:'SET_XP',xpData:xp});
    const el=document.createElement('div');el.className='xp-popup';el.textContent='+10 XP';
    el.style.left=Math.random()*60+20+'vw';el.style.top='30vh';
    document.body.appendChild(el); setTimeout(()=>el.remove(),1300);

    toast(`✅ ${labels[field]||field} punched at ${t}`);

    const dd=data[ym][d];
    if(dd.amArrival&&dd.amDepart&&dd.pmArrival&&dd.pmDepart){
      const xp2=ls.get(SK.xp,{totalXP:0}); xp2.totalXP=(xp2.totalXP||0)+20; ls.set(SK.xp,xp2);
      dispatch({type:'SET_XP',xpData:xp2});
    }
    checkAchievements(ls.get(SK.xp,{totalXP:0}), data, currentYM);
  }, [appData, ym, now, saveData, dispatch, toast, currentYM, checkAchievements]);

  const handleStartWhack = useCallback((field, afterUnlock) => {
    const diff=settings.whackDifficulty||'normal';
    const cfg=DIFFICULTY[diff];
    dispatch({ type:'SET_WHACK', game:{
      rounds:10, hits:cfg.hits, timeout:cfg.timeout, diff,
      onWin:(coinEarned)=>{
        const d=now.getDate();
        unlockDay(ym,d,appData,(data)=>{ dispatch({type:'SET_DATA',data}); });
        const xp=ls.get(SK.xp,{totalXP:0}); xp.totalXP=(xp.totalXP||0)+25; ls.set(SK.xp,xp);
        dispatch({type:'SET_XP',xpData:xp});
        if(coinEarned>0){
          const newCoins=ls.get(SK.coins,0)+coinEarned;
          ls.set(SK.coins,newCoins); dispatch({type:'SET_COINS',coins:newCoins});
          // coin popup
          const badge=document.getElementById('coinBadge');
          if(badge){
            const rect=badge.getBoundingClientRect();
            const el=document.createElement('div');el.className='coin-popup';
            el.innerHTML=`🪙 <span style="font-family:'Bebas Neue',cursive;color:var(--accent);font-size:1.2rem">+${coinEarned}</span>`;
            el.style.left='50vw';el.style.top='40vh';
            el.style.setProperty('--dx',`${rect.left+rect.width/2-25-window.innerWidth/2}px`);
            el.style.setProperty('--dy',`${rect.top+rect.height/2-25-window.innerHeight*0.4}px`);
            document.body.appendChild(el);setTimeout(()=>el.remove(),1300);
          }
        }
        checkAchievements(ls.get(SK.xp,{totalXP:0}),appData,currentYM);
        if(afterUnlock) afterUnlock();
        else doRecord(field);
      },
      onLose:()=>toast('💀 Lost! Cannot punch.'),
    }});
  },[settings, dispatch, ym, now, appData, unlockDay, checkAchievements, currentYM, doRecord, toast]);

  const punchToday = useCallback((field) => {
    const d=now.getDate();
    if(!appData[ym]){ const data2=initMonthData(JSON.parse(JSON.stringify(appData)),ym); saveData(data2); dispatch({type:'SET_DATA',data:data2}); }
    const day=appData[ym]?.[d];
    if(!day){toast('Today is not a working day');return;}
    // flash btn
    const btn=document.querySelector(`.punch-btn[data-punch="${field}"]`);
    if(btn){btn.classList.add('flash');setTimeout(()=>btn.classList.remove('flash'),450);}

    if(isUnlocked(day)){ doRecord(field); return; }
    if(coins>0){
      dispatch({ type:'SET_COIN_CONFIRM', payload:{ dayNum:d, onResult:(confirmed)=>{
        dispatch({type:'SET_COIN_CONFIRM',payload:null});
        if(confirmed){
          const newCoins=coins-1; ls.set(SK.coins,newCoins); dispatch({type:'SET_COINS',coins:newCoins});
          unlockDay(ym,d,appData,(data)=>{ dispatch({type:'SET_DATA',data}); toast(`🔓 Day ${d} unlocked with Counter Clock`); doRecord(field); });
        } else { handleStartWhack(field, null); }
      }}});
      return;
    }
    handleStartWhack(field, null);
  },[now, appData, ym, coins, dispatch, saveData, toast, doRecord, unlockDay, handleStartWhack]);

  useEffect(()=>{
    const map={'1':'amArrival','2':'amDepart','3':'pmArrival','4':'pmDepart'};
    const handler=e=>{
      if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
      if(map[e.key]){e.preventDefault();punchToday(map[e.key]);}
    };
    document.addEventListener('keydown',handler);
    return ()=>document.removeEventListener('keydown',handler);
  },[punchToday]);

  return (
    <div className="punch-card">
      <div className="punch-card-left">
        <div className="date-clock-row">
          <div className="today-date">{todayDate}</div>
          {clock && <div className="live-clock">{clock.h}:{clock.m}<span className="sec">:{clock.s}</span></div>}
        </div>
        <div className="today-status">{todayStatus}</div>
        <div className="grace-countdown">{graceText}</div>
        <div className="kb-hints">
          <span className="kb-hint"><kbd>1</kbd> AM IN</span>
          <span className="kb-hint"><kbd>2</kbd> AM OUT</span>
          <span className="kb-hint"><kbd>3</kbd> PM IN</span>
          <span className="kb-hint"><kbd>4</kbd> PM OUT</span>
        </div>
      </div>
      <div className="punch-btns">
        {[['amArrival','in','⏰ AM IN'],['amDepart','out','🚪 AM OUT'],['pmArrival','in','🍽️ PM IN'],['pmDepart','out','🏁 PM OUT']].map(([field,cls,label])=>(
          <button key={field} className={`punch-btn ${cls}`} data-punch={field} onClick={()=>punchToday(field)}>{label}</button>
        ))}
      </div>
    </div>
  );
}

// ─── Settings Bar ─────────────────────────────────────────────────────────────
function SettingsBar() {
  const { state, dispatch, toast, saveSettings } = useApp();
  const { settings } = state;
  const [local, setLocal] = useState(settings);
  useEffect(()=>setLocal(settings),[settings]);

  const apply = () => {
    saveSettings(local);
    dispatch({ type:'SET_SETTINGS', settings:local });
    toast('⚙️ Settings applied');
  };
  const cfg = DIFFICULTY[local.whackDifficulty]||DIFFICULTY.normal;

  return (
    <div className="settings-bar">
      <div className="setting-group">
        <label>Start</label>
        <input type="time" value={local.start} onChange={e=>setLocal({...local,start:e.target.value})} />
      </div>
      <div className="setting-group">
        <label>End</label>
        <input type="time" value={local.end} onChange={e=>setLocal({...local,end:e.target.value})} />
      </div>
      <div className="setting-group">
        <label>Lunch (min)</label>
        <input type="number" value={local.lunchMins} step="10" min="0" style={{width:'76px'}}
               onChange={e=>setLocal({...local,lunchMins:parseInt(e.target.value)||0})} />
      </div>
      <div className="setting-group">
        <label>Hourly Rate (₱)</label>
        <input type="number" value={local.hourlyRate||0} step="10" min="0" style={{width:'88px'}} placeholder="0"
               onChange={e=>setLocal({...local,hourlyRate:parseFloat(e.target.value)||0})} />
      </div>
      <div className="setting-group">
        <label>🥊 Whack Difficulty</label>
        <div style={{display:'flex',alignItems:'center',gap:'.4rem'}}>
          <select value={local.whackDifficulty} onChange={e=>setLocal({...local,whackDifficulty:e.target.value})}>
            <option value="easy">Easy (mock)</option>
            <option value="normal">Normal</option>
            <option value="hard">Hard</option>
            <option value="nightmare">Nightmare</option>
          </select>
          <span style={{fontSize:'.65rem',color:'var(--muted)'}}>{cfg.label}</span>
        </div>
      </div>
      <button className="btn" onClick={apply}>✅ Apply</button>
    </div>
  );
}

// ─── Toolbar ─────────────────────────────────────────────────────────────────
function Toolbar() {
  const { state, dispatch, toast, saveData, checkAchievements } = useApp();
  const { currentYM, appData, settings, coins, xpData } = state;

  const changeMonth = (ym) => {
    const data = initMonthData(JSON.parse(JSON.stringify(appData)), ym);
    saveData(data);
    dispatch({ type:'SET_DATA', data });
    dispatch({ type:'SET_YM', ym });
  };

  const exportJSON = () => {
    const a=Object.assign(document.createElement('a'),{
      href:URL.createObjectURL(new Blob([JSON.stringify(appData,null,2)],{type:'application/json'})),
      download:`punch_${currentYM}.punch`
    });
    a.click(); URL.revokeObjectURL(a.href); toast('💾 Exported');
  };

  const exportCSV = () => {
    const [y,m]=currentYM.split('-').map(Number);
    const rows=[['Day','AM IN','AM OUT','PM IN','PM OUT','Total','OT','Status','Lunch','Notes']];
    for(const d of workingDays(y,m)){
      const day=appData[currentYM]?.[d]; if(!day)continue;
      const {netMins}=computeDaily(day,settings.lunchMins);
      const ot=overtime(netMins,officialMins(day,settings));
      rows.push([d,day.amArrival||'',day.amDepart||'',day.pmArrival||'',day.pmDepart||'',
        netMins>0?fmtHM(netMins):'',ot>0?fmtHM(ot):'',day.status,day.customLunchMins??'',
        `"${(day.notes||'').replace(/"/g,'""')}"`]);
    }
    const a=Object.assign(document.createElement('a'),{
      href:URL.createObjectURL(new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'})),
      download:`punch_${currentYM}.csv`
    });
    a.click(); URL.revokeObjectURL(a.href); toast('📊 CSV exported');
  };

  const importFile = () => {
    const inp=Object.assign(document.createElement('input'),{type:'file',accept:'.punch,.json'});
    inp.onchange=e=>{
      if(!e.target.files[0])return;
      const r=new FileReader();
      r.onload=ev=>{
        try{
          const d=JSON.parse(ev.target.result);
          saveData(d); dispatch({type:'SET_DATA',data:d}); toast('📂 Imported');
        }catch{ toast('❌ Invalid file'); }
      };
      r.readAsText(e.target.files[0]);
    };
    inp.click();
  };

  const resetMonth = () => {
    if(!confirm(`Reset all data for ${currentYM}?`))return;
    ls.set(SK.backup, appData[currentYM]);
    const data=JSON.parse(JSON.stringify(appData));
    delete data[currentYM];
    const data2=initMonthData(data,currentYM);
    saveData(data2); dispatch({type:'SET_DATA',data:data2});
    toast(`🧨 ${currentYM} reset. Undo available.`);
  };

  const undoReset = () => {
    const b=ls.get(SK.backup,null);
    if(!b){toast('No backup found.');return;}
    const data=JSON.parse(JSON.stringify(appData));
    data[currentYM]=b; saveData(data); dispatch({type:'SET_DATA',data});
    toast(`↩️ Undo done for ${currentYM}`);
  };

  const monthlyChallenge = () => {
    if(ls.raw(SK.monthly+currentYM)){toast('Already completed this month.');return;}
    const diff=settings.whackDifficulty||'normal';
    const cfg=DIFFICULTY[diff];
    dispatch({ type:'SET_WHACK', game:{
      rounds:20, hits:15, timeout:cfg.timeout, diff,
      onWin:()=>{
        const newCoins=coins+35; ls.set(SK.coins,newCoins); dispatch({type:'SET_COINS',coins:newCoins});
        ls.setRaw(SK.monthly+currentYM,'done');
        toast('🎉 Monthly Challenge completed! +35 Counter Clocks');
        const xp=ls.get(SK.xp,{totalXP:0}); xp.totalXP=(xp.totalXP||0)+150; ls.set(SK.xp,xp);
        dispatch({type:'SET_XP',xpData:xp});
        checkAchievements(xp,appData,currentYM);
      },
      onLose:()=>toast('💀 Monthly Challenge lost. Try again.'),
    }});
  };

  const monthlyDone = ls.raw(SK.monthly+currentYM)==='done';

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <div className="month-picker-wrap">
  <label>MONTH</label>
  <select className="month-year-select" value={currentYM.slice(0,4)} onChange={e => changeMonth(`${e.target.value}-${currentYM.slice(5)}`)}>
    {(() => {
      const currentYear = new Date().getFullYear();
      const years = [];
      for (let i = currentYear - 3; i <= currentYear + 3; i++) years.push(i);
      return years.map(y => <option key={y} value={y}>{y}</option>);
    })()}
  </select>
  <select className="month-year-select" value={currentYM.slice(5)} onChange={e => changeMonth(`${currentYM.slice(0,4)}-${e.target.value}`)}>
    {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((name, i) => {
      const mm = String(i+1).padStart(2,'0');
      return <option key={mm} value={mm}>{name}</option>;
    })}
  </select>
</div>
        <button className="btn special" onClick={monthlyChallenge} disabled={monthlyDone}
                title="Win 20-round game → 35 Counter Clocks (once per month)">
          {monthlyDone?'🏆 Completed':'🏆 Monthly Challenge'}
        </button>
      </div>
      <div className="action-btns">
        <button className="btn" onClick={exportJSON}>💾 Export</button>
        <button className="btn" onClick={exportCSV}>📊 CSV</button>
        <button className="btn" onClick={importFile}>📂 Import</button>
        <button className="btn" onClick={()=>window.print()}>🖨️ Print</button>
        <button className="btn danger" onClick={resetMonth}>🗑️ Reset</button>
        <button className="btn" onClick={undoReset}>↩️ Undo</button>
      </div>
    </div>
  );
}

// ─── Day Row (table) ──────────────────────────────────────────────────────────
function DayRow({ d, day, todayD, y, m, onDispute, onCoinUnlock }) {
  const { state, dispatch, toast, saveData, checkAchievements } = useApp();
  const { settings, currentYM, appData, coins } = state;
  const unlocked = isUnlocked(day);
  const dis = !unlocked;
  const { netMins } = computeDaily(day, settings.lunchMins);
  const official = officialMins(day, settings);
  const isLeave = ['Absent','Sick Leave','Vacation'].includes(day.status);
  const ot = isLeave?0:overtime(netMins,official);
  const isToday = d===todayD;
  const hasAMIn=!!day.amArrival, hasAMOut=!!day.amDepart, hasPMIn=!!day.pmArrival, hasPMOut=!!day.pmDepart;
  const incomplete = day.status==='Present'&&((hasAMIn&&!hasAMOut)||(hasPMIn&&!hasPMOut));
  const rowCls = isToday?'today-row':incomplete?'warn-row':'';
  const dayName = DAY_NAMES[weekday(y,m,d)];
  const grace = useRowGrace(day);

  const update = (field, value) => {
    if(!isUnlocked(day)){toast('🔒 Locked! Win dispute first.');return false;}
    const data=JSON.parse(JSON.stringify(appData));
    data[currentYM][d][field]=value;
    saveData(data); dispatch({type:'SET_DATA',data});
    return true;
  };

  return (
    <tr className={rowCls} data-day={d}>
      <td>
        <span className="day-num">{d}</span><br/>
        <span style={{fontSize:'.58rem',color:'var(--muted)'}}>{dayName}</span>
        {isToday&&<span className="day-star"> ★</span>}
      </td>
      {[['amArrival',hasAMIn&&!hasAMOut],['amDepart',!hasAMIn&&hasAMOut],
        ['pmArrival',hasPMIn&&!hasPMOut],['pmDepart',!hasPMIn&&hasPMOut]].map(([field,inc])=>(
        <td key={field}>
          <input type="time" className={`time-input${inc?' incomplete':''}`}
            data-field={field} value={day[field]||''} disabled={dis}
            onChange={e=>{ if(update(field,e.target.value)){toast('✅ Time updated');} }} />
        </td>
      ))}
      <td className="total-cell">{netMins>0?fmtHM(netMins):'—'}</td>
      <td className={`ot-cell ${ot>0?'ot-pos':'ot-zero'}`}>{ot>0?'+'+fmtHM(ot):'—'}</td>
      <td>
        <select className="status-select" disabled={dis}
          value={day.status} onChange={e=>{ if(update('status',e.target.value))toast(`📌 Status → ${e.target.value}`); }}>
          {STATUSES.map(s=><option key={s}>{s}</option>)}
        </select>
      </td>
      <td>
        <input type="number" className="lunch-input" placeholder="auto" min="0" step="5" disabled={dis}
          value={day.customLunchMins??''} onChange={e=>{
            const v=e.target.value===''?null:parseInt(e.target.value);
            if(update('customLunchMins',v))toast(v!==null?`🍱 Lunch → ${v} min`:'🍱 Lunch reset');
          }} />
      </td>
      <td>
        <input type="text" className="notes-input" placeholder="WFH, mtg…" maxLength={60} disabled={dis}
          value={day.notes||''} onChange={e=>{ if(update('notes',e.target.value.trim())){toast('📝 Note saved');} }} />
      </td>
      <td>
        <button className="dispute-btn" data-day={d} onClick={()=>onDispute(d)}>🥊</button>
        {!unlocked&&coins>0&&<button className="coin-unlock-btn" data-day={d} title="Spend 1 🪙 to unlock" onClick={()=>onCoinUnlock(d)}>🪙</button>}
        <span className="lock-icon">{unlocked?'🔓':'🔒'}</span>
        <span className="row-grace">{grace}</span>
      </td>
    </tr>
  );
}

// ─── Day Card (mobile) ────────────────────────────────────────────────────────
function DayCard({ d, day, todayD, y, m, onDispute, onCoinUnlock }) {
  const { state, dispatch, toast, saveData } = useApp();
  const { settings, currentYM, appData, coins } = state;
  const unlocked = isUnlocked(day);
  const dis = !unlocked;
  const { netMins } = computeDaily(day, settings.lunchMins);
  const official = officialMins(day, settings);
  const isLeave = ['Absent','Sick Leave','Vacation'].includes(day.status);
  const ot = isLeave?0:overtime(netMins,official);
  const isToday = d===todayD;
  const hasAMIn=!!day.amArrival, hasAMOut=!!day.amDepart, hasPMIn=!!day.pmArrival, hasPMOut=!!day.pmDepart;
  const incomplete = day.status==='Present'&&((hasAMIn&&!hasAMOut)||(hasPMIn&&!hasPMOut));
  const dayName = DAY_NAMES[weekday(y,m,d)];
  const grace = useRowGrace(day);

  const update = (field, value) => {
    if(!isUnlocked(day)){toast('🔒 Locked! Win dispute first.');return false;}
    const data=JSON.parse(JSON.stringify(appData));
    data[currentYM][d][field]=value;
    saveData(data); dispatch({type:'SET_DATA',data});
    return true;
  };

  return (
    <div className={`day-card${isToday?' today-card':''}${incomplete?' warn-card':''}`} data-day={d}>
      <div className="day-card-header">
        <div>
          <span className="day-card-day">Day {d}</span>{' '}
          <span style={{fontSize:'0.65rem',color:'var(--muted)'}}>{dayName}</span>
          {isToday&&<span style={{color:'var(--punch)',fontSize:'0.75em'}}> ★</span>}
        </div>
        <div className="day-card-lock-info">
          <span className="lock-icon">{unlocked?'🔓':'🔒'}</span>
          <span className="row-grace" style={{fontSize:'0.6rem'}}>{grace}</span>
        </div>
      </div>
      {[['AM IN','amArrival',hasAMIn&&!hasAMOut],['AM OUT','amDepart',!hasAMIn&&hasAMOut],
        ['PM IN','pmArrival',hasPMIn&&!hasPMOut],['PM OUT','pmDepart',!hasPMIn&&hasPMOut]].map(([label,field,inc])=>(
        <div key={field} className="day-card-row">
          <label>{label}</label>
          <input type="time" className={`time-input${inc?' incomplete':''}`}
            data-field={field} value={day[field]||''} disabled={dis}
            onChange={e=>{ if(update(field,e.target.value))toast('✅ Time updated'); }} />
        </div>
      ))}
      <div className="day-card-stats">
        <span>Total {netMins>0?fmtHM(netMins):'—'}</span>
        <span>OT {ot>0?'+'+fmtHM(ot):'—'}</span>
        <span>Status {day.status}</span>
      </div>
      <div className="day-card-row">
        <label>Lunch</label>
        <input type="number" className="lunch-input" placeholder="auto" min="0" step="5" disabled={dis} style={{width:'auto'}}
          value={day.customLunchMins??''} onChange={e=>{
            const v=e.target.value===''?null:parseInt(e.target.value);
            if(update('customLunchMins',v))toast(v!==null?`🍱 Lunch → ${v} min`:'🍱 Lunch reset');
          }} />
      </div>
      <div className="day-card-row">
        <label>Notes</label>
        <input type="text" className="notes-input" placeholder="WFH, mtg…" maxLength={60} disabled={dis}
          value={day.notes||''} onChange={e=>{ if(update('notes',e.target.value.trim()))toast('📝 Note saved'); }} />
      </div>
      <div className="day-card-actions">
        <button className="dispute-btn" data-day={d} onClick={()=>onDispute(d)}>🥊 Fight</button>
        {!unlocked&&coins>0&&<button className="coin-unlock-btn" data-day={d} onClick={()=>onCoinUnlock(d)}>🪙 Unlock</button>}
        <select className="status-select" disabled={dis} style={{marginLeft:'auto'}}
          value={day.status} onChange={e=>{ if(update('status',e.target.value))toast(`📌 Status → ${e.target.value}`); }}>
          {STATUSES.map(s=><option key={s}>{s}</option>)}
        </select>
      </div>
    </div>
  );
}

// ─── DTR Table + Cards ────────────────────────────────────────────────────────
function DTRTable() {
  const { state, dispatch, toast, saveData, checkAchievements } = useApp();
  const { currentYM, appData, settings, coins, xpData } = state;
  const { unlockDay } = useApp();
  const [y,m] = currentYM.split('-').map(Number);
  const now = new Date();
  const todayD = (y===now.getFullYear()&&m===now.getMonth()+1)?now.getDate():-1;
  const working = workingDays(y,m);

  const startDisputeWhack = useCallback((d) => {
    const diff=settings.whackDifficulty||'normal';
    const cfg=DIFFICULTY[diff];
    dispatch({ type:'SET_WHACK', game:{
      rounds:10, hits:cfg.hits, timeout:cfg.timeout, diff,
      onWin:(coinEarned)=>{
        unlockDay(currentYM,d,appData,(data)=>{dispatch({type:'SET_DATA',data});});
        const xp=ls.get(SK.xp,{totalXP:0}); xp.totalXP=(xp.totalXP||0)+25; ls.set(SK.xp,xp);
        dispatch({type:'SET_XP',xpData:xp});
        if(coinEarned>0){
          const newCoins=ls.get(SK.coins,0)+coinEarned;
          ls.set(SK.coins,newCoins); dispatch({type:'SET_COINS',coins:newCoins});
        }
        checkAchievements(ls.get(SK.xp,{totalXP:0}),appData,currentYM);
        toast(`🥊 Victory! Day ${d} unlocked`);
      },
      onLose:()=>toast(`💀 Lost! Day ${d} stays locked.`),
    }});
  },[settings, dispatch, currentYM, appData, unlockDay, checkAchievements, toast]);

  const onDispute = useCallback((d)=>{
    const day=appData[currentYM]?.[d];
    if(!day)return;
    if(isUnlocked(day)){toast(`Day ${d} already unlocked 🔓`);return;}
    if(coins>0){
      dispatch({ type:'SET_COIN_CONFIRM', payload:{ dayNum:d, onResult:(confirmed)=>{
        dispatch({type:'SET_COIN_CONFIRM',payload:null});
        if(confirmed){
          const newCoins=coins-1; ls.set(SK.coins,newCoins); dispatch({type:'SET_COINS',coins:newCoins});
          unlockDay(currentYM,d,appData,(data)=>{dispatch({type:'SET_DATA',data});toast(`🔓 Day ${d} unlocked with Counter Clock`);});
        } else { startDisputeWhack(d); }
      }}});
      return;
    }
    startDisputeWhack(d);
  },[coins, appData, currentYM, dispatch, unlockDay, toast, startDisputeWhack]);

  const onCoinUnlock = useCallback((d)=>{
    const day=appData[currentYM]?.[d];
    if(!day)return;
    if(isUnlocked(day)){toast(`Day ${d} already unlocked`);return;}
    dispatch({ type:'SET_COIN_CONFIRM', payload:{ dayNum:d, onResult:(confirmed)=>{
      dispatch({type:'SET_COIN_CONFIRM',payload:null});
      if(confirmed){
        const newCoins=coins-1; ls.set(SK.coins,newCoins); dispatch({type:'SET_COINS',coins:newCoins});
        unlockDay(currentYM,d,appData,(data)=>{dispatch({type:'SET_DATA',data});toast(`🔓 Day ${d} unlocked`);});
      }
    }}});
  },[coins, appData, currentYM, dispatch, unlockDay, toast]);

  // Summary
  let regOT=0,holOT=0,totalWorked=0,daysPresent=0,daysAbsent=0,daysLeave=0,daysPunched=0;
  for(const d of working){
    const day=appData[currentYM]?.[d]; if(!day)continue;
    if(['Sick Leave','Vacation'].includes(day.status)){daysLeave++;continue;}
    if(day.status==='Absent'){daysAbsent++;continue;}
    const {netMins}=computeDaily(day,settings.lunchMins);
    const official=officialMins(day,settings); const ot=overtime(netMins,official);
    totalWorked+=netMins;
    if(day.status==='Present'){daysPresent++;regOT+=ot;if(day.amArrival||day.pmArrival)daysPunched++;}
    if(day.status==='Holiday'){holOT+=ot;daysPresent++;if(day.amArrival||day.pmArrival)daysPunched++;}
  }
  const workingTotal=working.length-(daysAbsent+daysLeave);
  const pct=workingTotal>0?Math.round(daysPunched/workingTotal*100):0;
  const rate=settings.hourlyRate||0;
  const otPay=rate>0?((regOT+holOT)/60*rate*1.25).toFixed(2):null;

  return (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Day</th><th>AM IN</th><th>AM OUT</th><th>PM IN</th><th>PM OUT</th>
              <th>Total</th><th>OT</th><th>Status</th><th>Lunch</th><th>📝 Notes</th><th>🥊</th>
            </tr>
          </thead>
          <tbody>
            {working.map(d=>{
              const day=appData[currentYM]?.[d]||blankDay();
              return <DayRow key={d} d={d} day={day} todayD={todayD} y={y} m={m}
                             onDispute={onDispute} onCoinUnlock={onCoinUnlock} />;
            })}
          </tbody>
        </table>
      </div>
      <div className="cards-view">
        {working.map(d=>{
          const day=appData[currentYM]?.[d]||blankDay();
          return <DayCard key={d} d={d} day={day} todayD={todayD} y={y} m={m}
                          onDispute={onDispute} onCoinUnlock={onCoinUnlock} />;
        })}
      </div>

      <div className="ot-summary">
        <div className="ot-card"><h3>Regular OT</h3><div className="val">{fmtHM(regOT)}</div></div>
        <div className="ot-card"><h3>Holiday OT</h3><div className="val">{fmtHM(holOT)}</div></div>
        <div className="ot-card"><h3>Total OT</h3><div className="val">{fmtHM(regOT+holOT)}</div></div>
        {otPay&&<div className="ot-card"><h3>Est. OT Pay</h3><div className="val">₱{Number(otPay).toLocaleString()}</div></div>}
      </div>

      <div className="month-summary">
        <div><span>Days worked:</span><strong>{daysPresent}</strong></div>
        <div><span>Total hours:</span><strong>{fmtHM(totalWorked)}</strong></div>
        <div><span>Absent:</span><strong>{daysAbsent}</strong></div>
        <div><span>On leave:</span><strong>{daysLeave}</strong></div>
        <div><span>Completion:</span><strong>{pct}%</strong></div>
      </div>
    </>
  );
}

// ─── Toast Container ──────────────────────────────────────────────────────────
function ToastContainer() {
  const { state } = useApp();
  return (
    <div className="toast-container">
      {state.toasts.map(t=><div key={t.id} className="toast">{t.msg}</div>)}
    </div>
  );
}

// ─── App Shell ────────────────────────────────────────────────────────────────
function AppShell() {
  const { state, dispatch } = useApp();
  const { whackGame, coinConfirm, showPWA } = state;

  return (
    <div className="container">
      {showPWA&&<PWABanner onDismiss={()=>{ dispatch({type:'SET_PWA_BANNER',show:false}); ls.setRaw(SK.pwaDismiss,'1'); }} />}
      <Header />
      <Tagline />
      <RankPanel />
      <AchievementsStrip />
      <PunchAlert />
      <PunchCard />
      <SettingsBar />
      <Toolbar />
      <DTRTable />
      <div className="footer-note">
        🔒 Days locked by default · Win Whack-a-Clock to unlock (5-min grace) · ⌨️ Keys 1–4 to punch<br/>
        ⚠️ Red cells = incomplete pair · ⏱️ Grace timer per row · 🏆 Earn XP &amp; achievements!<br/>
        🪙 Counter Clocks: spend 1 to unlock any day without fighting | 🏆 Monthly Challenge = 35 coins<br/>
        💡 Easy mode = mocking easy · Hard/Nightmare = fewer coins after 3 straight losses<br/>
        <span style={{marginTop:'0.4rem',display:'block'}}>
          Extended by <a href="https://github.com/NekoRie03" target="_blank" rel="noopener" style={{color:'var(--accent)'}}>NekoRie03</a>
        </span>
      </div>
      <ToastContainer />
      {coinConfirm&&(
        <CoinConfirmModal
          dayNum={coinConfirm.dayNum}
          coins={state.coins}
          onResult={coinConfirm.onResult}
        />
      )}
      {whackGame&&(
        <WhackGame
          game={whackGame}
          onClose={()=>dispatch({type:'SET_WHACK',game:null})}
        />
      )}
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

// Service Worker
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('./sw.js').catch(()=>{});
}