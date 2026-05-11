'use strict';

const SK_DATA='pyc_data2',SK_SETTINGS='pyc_settings2',SK_USER='pyc_user2',SK_XP='pyc_xp2',SK_BACKUP='pyc_backup2';
const SK_COINS='pyc_coins',SK_MONTHLY='pyc_monthly_',SK_LOSS_STREAK='pyc_loss_streak',SK_COIN_SKIP='pyc_coin_skip';
const GRACE_MS=5*60*1000;
const STATUSES=['Present','Holiday','Sick Leave','Vacation','Absent'];

const DIFFICULTY = {
  easy:      { hits: 1,  timeout: 2000, label:'1 hit, very slow', mockMsg:'Wow. You actually hit it. 🎉 Here’s your participation medal.' },
  normal:    { hits: 5,  timeout: 800,  label:'5 hits, 0.8s',     mockMsg:null },
  hard:      { hits: 8,  timeout: 500,  label:'8 hits, 0.5s',     mockMsg:null },
  nightmare: { hits: 10, timeout: 350,  label:'10 hits, 0.35s',   mockMsg:null }
};

let appData={},settings={start:'08:00',end:'17:00',lunchMins:60,hourlyRate:0,whackDifficulty:'normal'};
let userName='',currentYM='',graceTimers={},rowGraceIntervals={};
let xpData={xp:0,level:0,totalXP:0};
let coins = 0;

const RANKS=[
  {name:'Rookie',    icon:'🥉',xpReq:0  },
  {name:'Clocker',   icon:'⚙️',xpReq:100},
  {name:'Grinder',   icon:'🔧',xpReq:250},
  {name:'Warrior',   icon:'⚔️',xpReq:500},
  {name:'Champion',  icon:'🏆',xpReq:900},
  {name:'Legend',    icon:'💎',xpReq:1500},
  {name:'Immortal',  icon:'👑',xpReq:2500},
];
function getRank(totalXP){ let r=RANKS[0]; for(const rk of RANKS) if(totalXP>=rk.xpReq)r=rk; return r; }
function getNextRank(totalXP){ for(const rk of RANKS) if(totalXP<rk.xpReq)return rk; return null; }

const ACH=[
  {id:'first_punch',  icon:'👊', label:'First Blood',    desc:'First punch ever',             check:d=>d.totalXP>=10},
  {id:'streak3',      icon:'🔥', label:'On Fire',        desc:'3-day streak',                 check:d=>computeStreak()>=3},
  {id:'streak7',      icon:'🌶️', label:'Week Warrior',   desc:'7-day streak',                 check:d=>computeStreak()>=7},
  {id:'streak21',     icon:'💪', label:'Iron Habit',     desc:'21-day streak',                check:d=>computeStreak()>=21},
  {id:'ot_first',     icon:'⏱️', label:'Overtime Hero',  desc:'First overtime day',           check:d=>d._firstOT},
  {id:'full_month',   icon:'📅', label:'Full House',     desc:'All days punched in a month',  check:d=>d._fullMonth},
  {id:'rank5',        icon:'🏆', label:'Champion!',      desc:'Reach Champion rank',          check:d=>d.totalXP>=900},
  {id:'legend',       icon:'💎', label:'Living Legend',  desc:'Reach Legend rank',            check:d=>d.totalXP>=1500},
  {id:'win5',         icon:'🥊', label:'Brawler',        desc:'Win 5 Whack games',            check:d=>d._winsTotal>=5},
];

function loadAchievements(){try{return JSON.parse(localStorage.getItem('pyc_ach')||'{}')}catch{return {}}}
function saveAchievements(a){localStorage.setItem('pyc_ach',JSON.stringify(a))}

function checkAchievements(){
  const ach=loadAchievements();
  const meta=buildAchMeta();
  let newUnlock=false;
  for(const a of ACH){
    if(!ach[a.id]&&a.check(meta)){
      ach[a.id]=Date.now();
      newUnlock=true;
      toast(`🏅 Achievement: ${a.label}!`);
      gainXP(50,`Achievement: ${a.label}`);
    }
  }
  if(newUnlock)saveAchievements(ach);
  renderAchievements(ach);
}

function buildAchMeta(){
  const m={totalXP:xpData.totalXP,_firstOT:false,_fullMonth:false,_winsTotal:parseInt(localStorage.getItem('pyc_wins')||'0')};
  const[y,mo]=currentYM.split('-').map(Number);
  const working=getWorkingDays(y,mo);
  let allPunched=working.length>0,hasOT=false;
  for(const d of working){
    const day=appData[currentYM]?.[d];
    if(!day||(!day.amArrival&&!day.pmArrival)) allPunched=false;
    if(day){const{netMins}=computeDaily(day);if(overtime(netMins,officialMins(day))>0)hasOT=true;}
  }
  m._fullMonth=allPunched;
  m._firstOT=hasOT;
  return m;
}

function renderAchievements(ach){
  const strip=document.getElementById('achStrip');
  strip.innerHTML=ACH.map(a=>`<span class="ach-chip ${ach[a.id]?'unlocked':''}" title="${a.desc}${ach[a.id]?' ✓':''}">
    <span class="ach-icon">${a.icon}</span>${a.label}
  </span>`).join('');
}

function loadXP(){try{const s=localStorage.getItem(SK_XP);if(s)xpData=JSON.parse(s);}catch{}}
function saveXP(){localStorage.setItem(SK_XP,JSON.stringify(xpData))}
function gainXP(amount,reason){
  xpData.totalXP=(xpData.totalXP||0)+amount;
  saveXP(); updateRankUI();
  showXPPopup(amount);
}

function updateRankUI(){
  const rank=getRank(xpData.totalXP);
  const next=getNextRank(xpData.totalXP);
  document.getElementById('rankIcon').textContent=rank.icon;
  document.getElementById('rankName').textContent=rank.name;
  if(next){
    const prev=RANKS[RANKS.indexOf(next)-1];
    const needed=next.xpReq-prev.xpReq;
    const have=xpData.totalXP-prev.xpReq;
    const pct=Math.min(100,Math.round(have/needed*100));
    document.getElementById('xpFill').style.width=pct+'%';
    document.getElementById('xpVal').textContent=`${xpData.totalXP} / ${next.xpReq}`;
  } else {
    document.getElementById('xpFill').style.width='100%';
    document.getElementById('xpVal').textContent=`${xpData.totalXP} XP MAX`;
  }
}

function showXPPopup(amount){
  const el=document.createElement('div');
  el.className='xp-popup';
  el.textContent=`+${amount} XP`;
  el.style.left=Math.random()*60+20+'vw';
  el.style.top='30vh';
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),1300);
}

function loadCoins(){ coins = parseInt(localStorage.getItem(SK_COINS)||'0',10); }
function saveCoins(){ localStorage.setItem(SK_COINS,coins); updateCoinUI(); }
function addCoin(n=1){ coins += n; saveCoins(); showCoinPopup(n); }
function spendCoin(n=1){ if(coins>=n){ coins -= n; saveCoins(); return true; } return false; }
function updateCoinUI(){ document.getElementById('coinCount').textContent = coins; }

function showCoinPopup(amount){
  const coinBadge = document.getElementById('coinBadge');
  if(!coinBadge) return;
  const badgeRect = coinBadge.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'coin-popup';
  el.innerHTML = `🪙 <span style="font-family:'Bebas Neue',cursive;color:var(--accent);font-size:1.2rem">+${amount}</span>`;
  el.style.left = '50vw';
  el.style.top = '40vh';
  const targetX = badgeRect.left + badgeRect.width/2 - 25;
  const targetY = badgeRect.top + badgeRect.height/2 - 25;
  el.style.setProperty('--dx', `${targetX - window.innerWidth/2}px`);
  el.style.setProperty('--dy', `${targetY - window.innerHeight*0.4}px`);
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),1300);
}

const toMins=t=>{if(!t||!t.includes(':'))return null;const[h,m]=t.split(':').map(Number);return h*60+m};
const fmtHM=m=>{m=Math.max(0,m);return `${Math.floor(m/60)}h ${m%60}m`};
const padT=n=>String(n).padStart(2,'0');
const nowHHMM=()=>{const n=new Date();return `${padT(n.getHours())}:${padT(n.getMinutes())}`};
const getDaysInMonth=(y,m)=>new Date(y,m,0).getDate();
const getWeekday=(y,m,d)=>new Date(y,m-1,d).getDay();
const getWorkingDays=(y,m)=>{const d=[];for(let i=1;i<=getDaysInMonth(y,m);i++){const w=getWeekday(y,m,i);if(w!==0&&w!==6)d.push(i);}return d};
const isUnlocked=day=>day&&day.unlocked&&day.unlockedUntil>Date.now();

function computeDaily(day){
  const aIn=toMins(day.amArrival),aOut=toMins(day.amDepart);
  const pIn=toMins(day.pmArrival),pOut=toMins(day.pmDepart);
  const hasAM=aIn!==null&&aOut!==null&&aOut>aIn;
  const hasPM=pIn!==null&&pOut!==null&&pOut>pIn;
  const raw=(hasAM?aOut-aIn:0)+(hasPM?pOut-pIn:0);
  let ded=0;
  if((hasAM&&!hasPM)||(!hasAM&&hasPM))ded=Math.min(day.customLunchMins??settings.lunchMins,raw);
  return{netMins:Math.max(0,raw-ded)};
}
function officialMins(day){return Math.max(0,toMins(settings.end)-toMins(settings.start)-(day.customLunchMins??settings.lunchMins))}
const overtime=(n,o)=>Math.max(0,n-o);

const saveData=()=>localStorage.setItem(SK_DATA,JSON.stringify(appData));
const saveSettings=()=>localStorage.setItem(SK_SETTINGS,JSON.stringify(settings));
function loadData(){try{const r=localStorage.getItem(SK_DATA);if(r)appData=JSON.parse(r);}catch{}}
function loadSettings(){try{const r=localStorage.getItem(SK_SETTINGS);if(r)settings={...settings,...JSON.parse(r)};}catch{}}
function loadUserName(){
  userName=localStorage.getItem(SK_USER)||'';
  if(!userName){userName=prompt('🥊 Your name, fighter?','Fighter')||'Fighter';localStorage.setItem(SK_USER,userName);}
}

function initMonth(ym){
  if(!appData[ym])appData[ym]={};
  const[y,m]=ym.split('-').map(Number);
  const working=getWorkingDays(y,m);
  for(const d of working){
    if(!appData[ym][d]){
      appData[ym][d]={amArrival:'',amDepart:'',pmArrival:'',pmDepart:'',status:'Present',customLunchMins:null,unlocked:false,unlockedUntil:0,provedFlags:{},notes:''};
    } else {
      const day=appData[ym][d];
      if(day.unlocked===undefined)day.unlocked=false;
      if(day.unlockedUntil===undefined)day.unlockedUntil=0;
      if(!day.provedFlags)day.provedFlags={};
      if(!day.status)day.status='Present';
      if(day.notes===undefined)day.notes='';
    }
  }
  for(const d in appData[ym])if(!working.includes(+d))delete appData[ym][+d];
  saveData();
}

function unlockDay(ym,d){
  const until=Date.now()+GRACE_MS;
  if(!appData[ym])appData[ym]={};
  if(!appData[ym][d])appData[ym][d]={status:'Present',unlocked:false,unlockedUntil:0,provedFlags:{},notes:''};
  appData[ym][d].unlocked=true;
  appData[ym][d].unlockedUntil=until;
  saveData();
  const key=`${ym}|${d}`;
  if(graceTimers[key])clearTimeout(graceTimers[key]);
  graceTimers[key]=setTimeout(()=>{
    if(appData[ym]?.[d]?.unlockedUntil===until){
      appData[ym][d].unlocked=false;appData[ym][d].unlockedUntil=0;
      saveData();renderTable();updateTodayStatus();toast(`🔒 Day ${d} auto-locked`);
    }
  },GRACE_MS);
  renderTable();updateTodayStatus();
}

function computeStreak(){
  let streak=0,limit=0;
  const cursor=new Date();cursor.setHours(0,0,0,0);
  while(limit++<365){
    const wd=cursor.getDay();
    if(wd===0||wd===6){cursor.setDate(cursor.getDate()-1);continue;}
    const ym=`${cursor.getFullYear()}-${padT(cursor.getMonth()+1)}`;
    const day=appData[ym]?.[cursor.getDate()];
    if(!day)break;
    const logged=day.amArrival||day.amDepart||day.pmArrival||day.pmDepart||day.notes||['Sick Leave','Vacation','Holiday','Absent'].includes(day.status);
    if(!logged)break;
    streak++;cursor.setDate(cursor.getDate()-1);
  }
  return streak;
}
function updateStreak(){
  const s=computeStreak();
  document.getElementById('streakNum').textContent=s;
  const badge=document.getElementById('streakBadge');
  badge.classList.toggle('hot',s>=3);
  badge.title=`${s} consecutive working days logged${s>=3?' 🔥 Keep it up!':''}`;
}

function startLiveClock(){
  const el=document.getElementById('liveClock');
  function tick(){const n=new Date();el.innerHTML=`${padT(n.getHours())}:${padT(n.getMinutes())}<span class="sec">:${padT(n.getSeconds())}</span>`;}
  tick();setInterval(tick,1000);
}

function startGraceCountdownUI(){
  setInterval(()=>{
    const now=new Date();
    const ym=`${now.getFullYear()}-${padT(now.getMonth()+1)}`;
    const day=appData[ym]?.[now.getDate()];
    const el=document.getElementById('graceCountdown');
    if(day&&isUnlocked(day)){
      const rem=Math.max(0,day.unlockedUntil-Date.now());
      el.textContent=`🔓 Unlocked · ${Math.floor(rem/60000)}:${padT(Math.floor((rem%60000)/1000))} left`;
    } else el.textContent='';
  },1000);
}

function startRowGraceCountdowns(){
  Object.values(rowGraceIntervals).forEach(clearInterval);
  rowGraceIntervals={};
  document.querySelectorAll('tbody tr[data-day]').forEach(row=>{
    const d=parseInt(row.dataset.day);
    const day=appData[currentYM]?.[d];
    const el=row.querySelector('.row-grace');
    if(!el||!day||!isUnlocked(day)){if(el)el.textContent='';return;}
    const iv=setInterval(()=>{
      if(!isUnlocked(day)){el.textContent='';clearInterval(iv);return;}
      const rem=Math.max(0,day.unlockedUntil-Date.now());
      el.textContent=`⏱ ${Math.floor(rem/60000)}:${padT(Math.floor((rem%60000)/1000))}`;
    },1000);
    rowGraceIntervals[d]=iv;
    const rem0=Math.max(0,day.unlockedUntil-Date.now());
    el.textContent=`⏱ ${Math.floor(rem0/60000)}:${padT(Math.floor((rem0%60000)/1000))}`;
  });
  document.querySelectorAll('.day-card[data-day]').forEach(card=>{
    const d=parseInt(card.dataset.day);
    const day=appData[currentYM]?.[d];
    const el=card.querySelector('.row-grace');
    if(!el||!day||!isUnlocked(day)){if(el)el.textContent='';return;}
    if(rowGraceIntervals[d]) return;
    const iv=setInterval(()=>{
      if(!isUnlocked(day)){el.textContent='';clearInterval(iv);return;}
      const rem=Math.max(0,day.unlockedUntil-Date.now());
      el.textContent=`⏱ ${Math.floor(rem/60000)}:${padT(Math.floor((rem%60000)/1000))}`;
    },1000);
    rowGraceIntervals[d]=iv;
    const rem0=Math.max(0,day.unlockedUntil-Date.now());
    el.textContent=`⏱ ${Math.floor(rem0/60000)}:${padT(Math.floor((rem0%60000)/1000))}`;
  });
}

function checkIncompletePunches(){
  const now=new Date();
  const ym=`${now.getFullYear()}-${padT(now.getMonth()+1)}`;
  const day=appData[ym]?.[now.getDate()];
  const el=document.getElementById('punchAlert');
  if(!day){el.classList.remove('visible');return;}
  const h=now.getHours(),issues=[];
  if(day.amArrival&&!day.amDepart&&h>=12)issues.push('AM IN recorded but no AM OUT');
  if(!day.amArrival&&!day.pmArrival&&h>=9&&day.status==='Present')issues.push('No punch recorded yet');
  if(day.pmArrival&&!day.pmDepart&&h>=17)issues.push('PM IN recorded but no PM OUT');
  if(issues.length){el.innerHTML=`⚠️ <strong>Punch gap:</strong> ${issues.join(' · ')}`;el.classList.add('visible');}
  else el.classList.remove('visible');
}

function getLossStreak(){ return parseInt(localStorage.getItem(SK_LOSS_STREAK)||'0',10); }
function setLossStreak(n){ localStorage.setItem(SK_LOSS_STREAK, n); }

function startWhackGame(onWin, onLose, maxRounds, hitsNeeded, moleTimeout, difficulty='normal'){
  const rounds = maxRounds || 10;
  const hits = hitsNeeded || 5;
  const timeout = moleTimeout || 800;
  const diffConfig = DIFFICULTY[difficulty] || DIFFICULTY.normal;
  let lossStreakBefore = getLossStreak();
  const overlay=document.createElement('div');
  overlay.className='modal-overlay';
  overlay.innerHTML=`<div class="modal-card">
    <h2>⏰ WHACK-A-CLOCK</h2>
    <p>Hit the clock! Need <strong>${hits}</strong> hits in <strong>${rounds}</strong> rounds.</p>
    <div class="game-meta"><span class="score">Hits: <span id="wScore">0</span>/${hits}</span><span class="round">Round: <span id="wRound">0</span>/${rounds}</span></div>
    <div class="progress-bar"><div class="progress-bar-fill" id="wProgress" style="width:0%"></div></div>
    <div class="combo-display" id="comboDisplay"></div>
    <div class="whack-grid">${Array(9).fill('<div class="mole-cell">🕳️</div>').join('')}</div>
    <button class="btn danger" id="wAbort" style="margin-top:.5rem">❌ Give up</button>
  </div>`;
  document.body.appendChild(overlay);
  const cells=overlay.querySelectorAll('.mole-cell');
  const scoreEl=overlay.querySelector('#wScore'),roundEl=overlay.querySelector('#wRound'),progEl=overlay.querySelector('#wProgress'),comboEl=overlay.querySelector('#comboDisplay');
  let round=0,currentHits=0,combo=0,active=true,timeoutHandle=null;
  function end(win){
    if(!active)return;active=false;
    if(timeoutHandle)clearTimeout(timeoutHandle);
    if(win){
      let coinReward = 1;
      if(lossStreakBefore >= 3) { coinReward = 0; }
      setLossStreak(0);
      if(difficulty==='easy' && diffConfig.mockMsg){
        overlay.querySelector('.modal-card').innerHTML = `<h2>😂 EASY MODE</h2><p style="font-size:1.1rem;color:var(--accent);margin-bottom:1.5rem">${diffConfig.mockMsg}</p><button class="btn" id="wMockOk">OK</button>`;
        const mockBtn = overlay.querySelector('#wMockOk');
        mockBtn.addEventListener('click',()=>{
          overlay.remove();
          onWin(coinReward);
        });
        return;
      }
      overlay.remove();
      onWin(coinReward);
    } else {
      setLossStreak(lossStreakBefore+1);
      overlay.remove();
      onLose();
    }
  }
  function showMole(){
    if(!active)return;
    cells.forEach(c=>{c.className='mole-cell';c.textContent='🕳️';});
    const cell=cells[Math.floor(Math.random()*9)];
    cell.classList.add('active');cell.textContent='⏰🧤';
    function onHit(){
      if(!active||!cell.classList.contains('active'))return;
      cell.classList.replace('active','hit');cell.textContent='💥';
      currentHits++;combo++;
      scoreEl.textContent=currentHits;
      progEl.style.width=`${(currentHits/hits)*100}%`;
      comboEl.textContent=combo>=3?`🔥 ${combo}x COMBO!`:'';
      clearTimeout(timeoutHandle);
      if(currentHits>=hits)end(true);
      else setTimeout(nextRound,250);
    }
    cell.addEventListener('click',onHit,{once:true});
    timeoutHandle=setTimeout(()=>{
      if(active&&cell.classList.contains('active')){
        cell.className='mole-cell';cell.textContent='😤';
        combo=0;comboEl.textContent='';
        setTimeout(()=>{if(active){cell.textContent='🕳️';nextRound();}},200);
      }
    },timeout);
  }
  function nextRound(){round++;roundEl.textContent=round;if(round>rounds)end(currentHits>=hits);else showMole();}
  overlay.querySelector('#wAbort').onclick=()=>end(false);
  nextRound();
}

function updateTodayStatus(){
  const now=new Date();
  const ym=`${now.getFullYear()}-${padT(now.getMonth()+1)}`;
  const day=appData[ym]?.[now.getDate()];
  document.getElementById('todayDate').textContent=now.toLocaleDateString(undefined,{weekday:'short',year:'numeric',month:'long',day:'numeric'});
  if(!day){document.getElementById('todayStatus').textContent='📅 Not a working day';return;}
  const labels={amArrival:'AM IN',amDepart:'AM OUT',pmArrival:'PM IN',pmDepart:'PM OUT'};
  const parts=['amArrival','amDepart','pmArrival','pmDepart'].filter(f=>day[f]).map(f=>`${labels[f]}: ${day[f]}`);
  document.getElementById('todayStatus').textContent=(parts.length?parts.join(' · '):'⏳ No punches yet')+(isUnlocked(day)?' 🔓':' 🔒');
  checkIncompletePunches();
}

function showCoinConfirm(dayNum, callback){
  if(localStorage.getItem(SK_COIN_SKIP)==='1'){
    callback(true);
    return;
  }
  const overlay = document.getElementById('coinConfirmOverlay');
  const msgEl = document.getElementById('coinConfirmMsg');
  const balEl = document.getElementById('coinConfirmBalance');
  const skipCheck = document.getElementById('coinConfirmSkip');
  const yesBtn = document.getElementById('coinConfirmYes');
  const noBtn = document.getElementById('coinConfirmNo');
  msgEl.textContent = `Unlock Day ${dayNum} for 1 🪙?`;
  balEl.textContent = coins;
  skipCheck.checked = false;
  overlay.style.display = 'flex';

  const cleanup = ()=>{
    overlay.style.display = 'none';
    yesBtn.removeEventListener('click', onYes);
    noBtn.removeEventListener('click', onNo);
  };
  const onYes = ()=>{
    if(skipCheck.checked) localStorage.setItem(SK_COIN_SKIP, '1');
    cleanup();
    callback(true);
  };
  const onNo = ()=>{
    cleanup();
    callback(false);
  };
  yesBtn.addEventListener('click', onYes);
  noBtn.addEventListener('click', onNo);
}

function punchToday(field){
  const now=new Date();
  const ym=`${now.getFullYear()}-${padT(now.getMonth()+1)}`;
  const d=now.getDate();
  if(!appData[ym])initMonth(ym);
  const day=appData[ym][d];
  if(!day){toast('Today is not a working day');return;}
  const btn=document.querySelector(`.punch-btn[data-punch="${field}"]`);
  if(btn){btn.classList.add('flash');setTimeout(()=>btn.classList.remove('flash'),450);}
  function doRecord(){
    const t=nowHHMM();
    appData[ym][d][field]=t;
    if(!appData[ym][d].provedFlags)appData[ym][d].provedFlags={};
    appData[ym][d].provedFlags[field]=true;
    saveData();
    if(currentYM===ym)renderTable();
    updateTodayStatus();updateStreak();
    const labels={amArrival:'AM IN',amDepart:'AM OUT',pmArrival:'PM IN',pmDepart:'PM OUT'};
    toast(`✅ ${labels[field]||field} punched at ${t}`);
    gainXP(10,`Punch: ${labels[field]}`);
    checkAchievements();
    const dd=appData[ym][d];
    if(dd.amArrival&&dd.amDepart&&dd.pmArrival&&dd.pmDepart){gainXP(20,'Full day complete!');}
  }
  if(isUnlocked(day)){doRecord();return;}
  if(coins > 0){
    showCoinConfirm(d, (confirmed)=>{
      if(confirmed && spendCoin(1)){
        unlockDay(ym,d);
        toast(`🔓 Day ${d} unlocked with Counter Clock`);
        gainXP(5,'Coin unlock');
        doRecord();
      } else {
        startWhackGameForPunch(d, doRecord);
      }
    });
    return;
  }
  startWhackGameForPunch(d, doRecord);
}

function startWhackGameForPunch(d, doRecord){
  const diff = settings.whackDifficulty || 'normal';
  const cfg = DIFFICULTY[diff];
  startWhackGame((coinEarned)=>{
    const[pY,pM]=currentYM.split('-');
    unlockDay(pY+'-'+pM, d);
    gainXP(25,'Won Whack-a-Clock!');
    if(coinEarned>0) addCoin(coinEarned);
    checkAchievements();
    doRecord();
  }, ()=>toast('💀 Lost! Cannot punch.'), 10, cfg.hits, cfg.timeout, diff);
}

function renderTable(){
  const[y,m]=currentYM.split('-').map(Number);
  const today=new Date();
  const todayD=(y===today.getFullYear()&&m===today.getMonth()+1)?today.getDate():-1;
  const working=getWorkingDays(y,m);
  const DAY_NAMES=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  let tableHtml=`<table><thead><tr>
    <th>Day</th><th>AM IN</th><th>AM OUT</th><th>PM IN</th><th>PM OUT</th>
    <th>Total</th><th>OT</th><th>Status</th><th>Lunch</th><th>📝 Notes</th><th>🥊</th>
  </tr></thead><tbody>`;

  let cardsHtml = '';

  for(const d of working){
    const day=appData[currentYM]?.[d]||{amArrival:'',amDepart:'',pmArrival:'',pmDepart:'',status:'Present',customLunchMins:null,unlocked:false,unlockedUntil:0,provedFlags:{},notes:''};
    const unlocked=isUnlocked(day),dis=unlocked?'':'disabled';
    const{netMins}=computeDaily(day);
    const official=officialMins(day);
    const isLeave=['Absent','Sick Leave','Vacation'].includes(day.status);
    const ot=isLeave?0:overtime(netMins,official);
    const isToday=d===todayD;
    const hasAMIn=!!day.amArrival,hasAMOut=!!day.amDepart,hasPMIn=!!day.pmArrival,hasPMOut=!!day.pmDepart;
    const incomplete=day.status==='Present'&&((hasAMIn&&!hasAMOut)||(hasPMIn&&!hasPMOut));
    const rowCls=isToday?'today-row':incomplete?'warn-row':'';
    const dayName=DAY_NAMES[getWeekday(y,m,d)];

    tableHtml+=`<tr class="${rowCls}" data-day="${d}">
      <td><span class="day-num">${d}</span><br><span style="font-size:.58rem;color:var(--muted)">${dayName}</span>${isToday?' <span class="day-star">★</span>':''}</td>
      <td><input type="time" class="time-input${hasAMIn&&!hasAMOut?' incomplete':''}" data-field="amArrival" value="${day.amArrival||''}" ${dis}></td>
      <td><input type="time" class="time-input${!hasAMIn&&hasAMOut?' incomplete':''}" data-field="amDepart"  value="${day.amDepart||''}"  ${dis}></td>
      <td><input type="time" class="time-input${hasPMIn&&!hasPMOut?' incomplete':''}" data-field="pmArrival" value="${day.pmArrival||''}" ${dis}></td>
      <td><input type="time" class="time-input${!hasPMIn&&hasPMOut?' incomplete':''}" data-field="pmDepart"  value="${day.pmDepart||''}"  ${dis}></td>
      <td class="total-cell">${netMins>0?fmtHM(netMins):'—'}</td>
      <td class="ot-cell ${ot>0?'ot-pos':'ot-zero'}">${ot>0?'+'+fmtHM(ot):'—'}</td>
      <td><select class="status-select" ${dis}>${STATUSES.map(s=>`<option${day.status===s?' selected':''}>${s}</option>`).join('')}</select></td>
      <td><input type="number" class="lunch-input" placeholder="auto" value="${day.customLunchMins??''}" ${dis} min="0" step="5"></td>
      <td><input type="text" class="notes-input" placeholder="WFH, mtg…" value="${(day.notes||'').replace(/"/g,'&quot;')}" ${dis} maxlength="60"></td>
      <td>
        <button class="dispute-btn" data-day="${d}">🥊</button>
        ${!unlocked && coins>0 ? `<button class="coin-unlock-btn" data-day="${d}" title="Spend 1 🪙 to unlock">🪙</button>` : ''}
        <span class="lock-icon">${unlocked?'🔓':'🔒'}</span>
        <span class="row-grace"></span>
      </td>
    </tr>`;

    cardsHtml+=`<div class="day-card${isToday?' today-card':''}${incomplete?' warn-card':''}" data-day="${d}">
      <div class="day-card-header">
        <div>
          <span class="day-card-day">Day ${d}</span> <span style="font-size:0.65rem;color:var(--muted)">${dayName}</span>${isToday?' <span style="color:var(--punch);font-size:0.75em">★</span>':''}
        </div>
        <div class="day-card-lock-info">
          <span class="lock-icon">${unlocked?'🔓':'🔒'}</span>
          <span class="row-grace" style="font-size:0.6rem;"></span>
        </div>
      </div>
      <div class="day-card-row"><label>AM IN</label><input type="time" class="time-input${hasAMIn&&!hasAMOut?' incomplete':''}" data-field="amArrival" value="${day.amArrival||''}" ${dis}></div>
      <div class="day-card-row"><label>AM OUT</label><input type="time" class="time-input${!hasAMIn&&hasAMOut?' incomplete':''}" data-field="amDepart"  value="${day.amDepart||''}"  ${dis}></div>
      <div class="day-card-row"><label>PM IN</label><input type="time" class="time-input${hasPMIn&&!hasPMOut?' incomplete':''}" data-field="pmArrival" value="${day.pmArrival||''}" ${dis}></div>
      <div class="day-card-row"><label>PM OUT</label><input type="time" class="time-input${!hasPMIn&&hasPMOut?' incomplete':''}" data-field="pmDepart"  value="${day.pmDepart||''}"  ${dis}></div>
      <div class="day-card-stats">
        <span>Total ${netMins>0?fmtHM(netMins):'—'}</span>
        <span>OT ${ot>0?'+'+fmtHM(ot):'—'}</span>
        <span>Status ${day.status}</span>
      </div>
      <div class="day-card-row"><label>Lunch</label><input type="number" class="lunch-input" placeholder="auto" value="${day.customLunchMins??''}" ${dis} min="0" step="5" style="width:auto"></div>
      <div class="day-card-row"><label>Notes</label><input type="text" class="notes-input" placeholder="WFH, mtg…" value="${(day.notes||'').replace(/"/g,'&quot;')}" ${dis} maxlength="60"></div>
      <div class="day-card-actions">
        <button class="dispute-btn" data-day="${d}">🥊 Fight</button>
        ${!unlocked && coins>0 ? `<button class="coin-unlock-btn" data-day="${d}">🪙 Unlock</button>` : ''}
        <select class="status-select" ${dis} style="margin-left:auto;">${STATUSES.map(s=>`<option${day.status===s?' selected':''}>${s}</option>`).join('')}</select>
      </div>
    </div>`;
  }
  tableHtml+='</tbody></table>';
  document.getElementById('dtrTableContainer').innerHTML = tableHtml;
  document.getElementById('dtrCardsContainer').innerHTML = cardsHtml;
  attachEvents();updateSummary(y,m,working);updateStreak();startRowGraceCountdowns();checkAchievements();
  updateMonthlyChallengeStatus();
}

function attachEvents(){
  document.querySelectorAll('.time-input').forEach(el=>el.addEventListener('change',onTimeChange));
  document.querySelectorAll('.status-select').forEach(el=>el.addEventListener('change',onStatusChange));
  document.querySelectorAll('.lunch-input').forEach(el=>el.addEventListener('change',onLunchChange));
  document.querySelectorAll('.notes-input').forEach(el=>el.addEventListener('change',onNotesChange));
  document.querySelectorAll('.dispute-btn').forEach(el=>el.addEventListener('click',onDispute));
  document.querySelectorAll('.coin-unlock-btn').forEach(el=>el.addEventListener('click',onCoinUnlock));
}

function getDayFromRow(row){const d=parseInt(row.dataset.day);return{d,day:appData[currentYM]?.[d]};}

function onTimeChange(e){
  const el = e.target.closest('[data-day]');
  if(!el) return;
  const d = parseInt(el.dataset.day);
  const day = appData[currentYM]?.[d];
  if(!day)return;
  if(!isUnlocked(day)){toast('🔒 Locked! Win dispute first.');e.target.value=day[e.target.dataset.field]||'';return;}
  day[e.target.dataset.field]=e.target.value;saveData();renderTable();updateTodayStatus();toast('✅ Time updated');
  gainXP(5,'Time edited');
}
function onStatusChange(e){
  const el = e.target.closest('[data-day]');
  if(!el) return;
  const d = parseInt(el.dataset.day);
  const day = appData[currentYM]?.[d];
  if(!day)return;
  if(!isUnlocked(day)){toast('🔒 Unlock first.');e.target.value=day.status;return;}
  day.status=e.target.value;saveData();renderTable();updateTodayStatus();toast(`📌 Status → ${day.status}`);
}
function onLunchChange(e){
  const el = e.target.closest('[data-day]');
  if(!el) return;
  const d = parseInt(el.dataset.day);
  const day = appData[currentYM]?.[d];
  if(!day)return;
  if(!isUnlocked(day)){toast('🔒 Unlock first.');e.target.value=day.customLunchMins??'';return;}
  day.customLunchMins=e.target.value===''?null:parseInt(e.target.value);
  saveData();renderTable();updateTodayStatus();
  toast(day.customLunchMins!==null?`🍱 Lunch → ${day.customLunchMins} min`:'🍱 Lunch reset');
}
function onNotesChange(e){
  const el = e.target.closest('[data-day]');
  if(!el) return;
  const d = parseInt(el.dataset.day);
  const day = appData[currentYM]?.[d];
  if(!day)return;
  if(!isUnlocked(day)){toast('🔒 Unlock first to add notes.');e.target.value=day.notes||'';return;}
  day.notes=e.target.value.trim();saveData();updateStreak();toast('📝 Note saved');gainXP(2,'Note added');
}

function onDispute(e){
  const d=parseInt(e.currentTarget.dataset.day);
  const day=appData[currentYM]?.[d];
  if(!day)return;
  if(isUnlocked(day)){toast(`Day ${d} already unlocked 🔓`);return;}
  if(coins > 0){
    showCoinConfirm(d, (confirmed)=>{
      if(confirmed && spendCoin(1)){
        unlockDay(currentYM,d);
        toast(`🔓 Day ${d} unlocked with Counter Clock`);
        gainXP(5,'Coin unlock');
      } else {
        startWhackGameForDispute(d);
      }
    });
    return;
  }
  startWhackGameForDispute(d);
}

function startWhackGameForDispute(d){
  const diff = settings.whackDifficulty || 'normal';
  const cfg = DIFFICULTY[diff];
  startWhackGame((coinEarned)=>{
    unlockDay(currentYM,d);
    gainXP(25,'Won Whack-a-Clock!');
    if(coinEarned>0) addCoin(coinEarned);
    checkAchievements();
    toast(`🥊 Victory! Day ${d} unlocked`);
  }, ()=>toast(`💀 Lost! Day ${d} stays locked.`), 10, cfg.hits, cfg.timeout, diff);
}

function onCoinUnlock(e){
  const d = parseInt(e.currentTarget.dataset.day);
  const day = appData[currentYM]?.[d];
  if(!day) return;
  if(isUnlocked(day)){ toast(`Day ${d} already unlocked`); return; }
  showCoinConfirm(d, (confirmed)=>{
    if(confirmed && spendCoin(1)){
      unlockDay(currentYM,d);
      toast(`🔓 Day ${d} unlocked with Counter Clock`);
      gainXP(5,'Coin unlock');
    }
  });
}

function updateMonthlyChallengeStatus(){
  const btn = document.getElementById('monthlyChallengeBtn');
  const done = localStorage.getItem(SK_MONTHLY + currentYM) === 'done';
  btn.disabled = done;
  btn.textContent = done ? '🏆 Completed' : '🏆 Monthly Challenge';
  btn.title = done ? `Already completed for ${currentYM}` : 'Win 20-round game → 35 Counter Clocks (once per month)';
}

function startMonthlyChallenge(){
  if(localStorage.getItem(SK_MONTHLY + currentYM)){ toast('Already completed this month.'); return; }
  const diff = settings.whackDifficulty || 'normal';
  const cfg = DIFFICULTY[diff];
  startWhackGame((coinEarned)=>{
    addCoin(35);
    localStorage.setItem(SK_MONTHLY + currentYM, 'done');
    toast('🎉 Monthly Challenge completed! +35 Counter Clocks');
    gainXP(150,'Monthly Challenge');
    updateMonthlyChallengeStatus();
    checkAchievements();
  }, ()=>toast('💀 Monthly Challenge lost. Try again.'), 20, 15, cfg.timeout, diff);
}

function updateSummary(y,m,working){
  let regOT=0,holOT=0,totalWorked=0,daysPresent=0,daysAbsent=0,daysLeave=0,daysPunched=0;
  for(const d of working){
    const day=appData[currentYM]?.[d];if(!day)continue;
    if(['Sick Leave','Vacation'].includes(day.status)){daysLeave++;continue;}
    if(day.status==='Absent'){daysAbsent++;continue;}
    const{netMins}=computeDaily(day);const official=officialMins(day);const ot=overtime(netMins,official);
    totalWorked+=netMins;
    if(day.status==='Present'){daysPresent++;regOT+=ot;if(day.amArrival||day.pmArrival)daysPunched++;}
    if(day.status==='Holiday'){holOT+=ot;daysPresent++;if(day.amArrival||day.pmArrival)daysPunched++;}
  }
  document.getElementById('regularOT').textContent=fmtHM(regOT);
  document.getElementById('holidayOT').textContent=fmtHM(holOT);
  document.getElementById('totalOT').textContent=fmtHM(regOT+holOT);
  document.getElementById('daysWorked').textContent=daysPresent;
  document.getElementById('totalHours').textContent=fmtHM(totalWorked);
  document.getElementById('daysAbsent').textContent=daysAbsent;
  document.getElementById('daysLeave').textContent=daysLeave;
  const workingTotal=working.length-(daysAbsent+daysLeave);
  const pct=workingTotal>0?Math.round(daysPunched/workingTotal*100):0;
  document.getElementById('completionRate').textContent=`${pct}%`;
  const rate=settings.hourlyRate||0;
  const payCard=document.getElementById('otPayCard');
  if(rate>0){
    const pay=((regOT+holOT)/60*rate*1.25).toFixed(2);
    document.getElementById('otPay').textContent=`₱${Number(pay).toLocaleString()}`;
    payCard.style.display='';
  } else payCard.style.display='none';
}

function applySettings(){
  settings.start=document.getElementById('officialStart').value;
  settings.end=document.getElementById('officialEnd').value;
  settings.lunchMins=parseInt(document.getElementById('lunchMinutes').value)||0;
  settings.hourlyRate=parseFloat(document.getElementById('hourlyRate').value)||0;
  settings.whackDifficulty=document.getElementById('whackDifficulty').value;
  saveSettings();renderTable();toast('⚙️ Settings applied');
  updateDiffSummary();
}
function loadSettingsIntoUI(){
  document.getElementById('officialStart').value=settings.start;
  document.getElementById('officialEnd').value=settings.end;
  document.getElementById('lunchMinutes').value=settings.lunchMins;
  document.getElementById('hourlyRate').value=settings.hourlyRate||0;
  document.getElementById('whackDifficulty').value=settings.whackDifficulty || 'normal';
  updateDiffSummary();
}

function updateDiffSummary(){
  const sel = document.getElementById('whackDifficulty');
  const diff = sel.value;
  const cfg = DIFFICULTY[diff] || DIFFICULTY.normal;
  document.getElementById('diffSummary').textContent = cfg.label;
}
document.getElementById('whackDifficulty').addEventListener('change', updateDiffSummary);

function exportData(){
  const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([JSON.stringify(appData,null,2)],{type:'application/json'})),download:`punch_${currentYM}.punch`});
  a.click();URL.revokeObjectURL(a.href);toast('💾 Exported');
}
function exportCSV(){
  const[y,m]=currentYM.split('-').map(Number);
  const rows=[['Day','AM IN','AM OUT','PM IN','PM OUT','Total','OT','Status','Lunch','Notes']];
  for(const d of getWorkingDays(y,m)){
    const day=appData[currentYM]?.[d];if(!day)continue;
    const{netMins}=computeDaily(day);const ot=overtime(netMins,officialMins(day));
    rows.push([d,day.amArrival||'',day.amDepart||'',day.pmArrival||'',day.pmDepart||'',netMins>0?fmtHM(netMins):'',ot>0?fmtHM(ot):'',day.status,day.customLunchMins??'',`"${(day.notes||'').replace(/"/g,'""')}"`]);
  }
  const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'})),download:`punch_${currentYM}.csv`});
  a.click();URL.revokeObjectURL(a.href);toast('📊 CSV exported');
}
function importData(file){
  const r=new FileReader();
  r.onload=e=>{try{appData=JSON.parse(e.target.result);saveData();initMonth(currentYM);renderTable();toast('📂 Imported');}catch{toast('❌ Invalid file');}};
  r.readAsText(file);
}
function resetMonth(){
  if(!confirm(`Reset all data for ${currentYM}?`))return;
  localStorage.setItem(SK_BACKUP,JSON.stringify(appData[currentYM]));
  delete appData[currentYM];initMonth(currentYM);saveData();renderTable();toast(`🧨 ${currentYM} reset. Undo available.`);
}
function undoReset(){
  const b=localStorage.getItem(SK_BACKUP);
  if(!b){toast('No backup found.');return;}
  appData[currentYM]=JSON.parse(b);saveData();renderTable();toast(`↩️ Undo done for ${currentYM}`);
}

function toast(msg){
  const el=document.createElement('div');el.className='toast';el.textContent=msg;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(()=>el.remove(),3100);
}

function initKeyboardShortcuts(){
  const map={'1':'amArrival','2':'amDepart','3':'pmArrival','4':'pmDepart'};
  document.addEventListener('keydown',e=>{
    if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
    if(map[e.key]){e.preventDefault();punchToday(map[e.key]);}
  });
}

function init(){
  loadData();loadSettings();loadUserName();loadXP();loadCoins();
  updateCoinUI();
  const now=new Date();
  currentYM=`${now.getFullYear()}-${padT(now.getMonth()+1)}`;
  document.getElementById('nameTag').textContent=`👤 ${userName}`;
  document.getElementById('tagline').innerHTML=`You think you clocked in, <strong>${userName}</strong>? We know you didn't. Let's fight about it.`;
  document.getElementById('monthPicker').value=currentYM;

  document.getElementById('nameTag').addEventListener('click',()=>{
    const n=prompt('Change your name:',userName);
    if(n&&n.trim()){
      userName=n.trim();localStorage.setItem(SK_USER,userName);
      document.getElementById('nameTag').textContent=`👤 ${userName}`;
      document.getElementById('tagline').innerHTML=`You think you clocked in, <strong>${userName}</strong>? We know you didn't. Let's fight about it.`;
    }
  });

  updateRankUI();
  loadSettingsIntoUI();
  initMonth(currentYM);
  renderTable();
  updateTodayStatus();
  startLiveClock();
  startGraceCountdownUI();
  initKeyboardShortcuts();
  checkAchievements();

  setInterval(()=>{updateTodayStatus();checkIncompletePunches();},60000);

  document.getElementById('monthPicker').addEventListener('change',e=>{currentYM=e.target.value;initMonth(currentYM);renderTable();});
  document.getElementById('applySettingsBtn').addEventListener('click',applySettings);
  document.getElementById('exportBtn').addEventListener('click',exportData);
  document.getElementById('exportCsvBtn').addEventListener('click',exportCSV);
  document.getElementById('importBtn').addEventListener('click',()=>{
    const inp=Object.assign(document.createElement('input'),{type:'file',accept:'.punch,.json'});
    inp.onchange=e=>{if(e.target.files[0])importData(e.target.files[0]);};inp.click();
  });
  document.getElementById('printBtn').addEventListener('click',()=>window.print());
  document.getElementById('resetMonthBtn').addEventListener('click',resetMonth);
  document.getElementById('undoResetBtn').addEventListener('click',undoReset);
  document.getElementById('monthlyChallengeBtn').addEventListener('click',startMonthlyChallenge);
  document.querySelectorAll('.punch-btn').forEach(btn=>btn.addEventListener('click',()=>punchToday(btn.dataset.punch)));
  updateMonthlyChallengeStatus();
}

init();

if('serviceWorker' in navigator){
  navigator.serviceWorker.register('./sw.js').catch(()=>{});
}

let deferredPrompt=null;
const installBanner=document.getElementById('installBanner');
const installBtn=document.getElementById('installBtn');
const installDismiss=document.getElementById('installDismiss');

window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();
  deferredPrompt=e;
  if(!localStorage.getItem('pyc_pwa_dismissed')){
    installBanner.classList.add('show');
  }
});

installBtn.addEventListener('click',async()=>{
  if(!deferredPrompt)return;
  deferredPrompt.prompt();
  const{outcome}=await deferredPrompt.userChoice;
  if(outcome==='accepted'){
    toast('🎉 App installed! Find it on your home screen.');
    installBanner.classList.remove('show');
  }
  deferredPrompt=null;
});

installDismiss.addEventListener('click',()=>{
  installBanner.classList.remove('show');
  localStorage.setItem('pyc_pwa_dismissed','1');
});

window.addEventListener('appinstalled',()=>{
  installBanner.classList.remove('show');
  deferredPrompt=null;
  toast('✅ Punch Your Clock is installed!');
});