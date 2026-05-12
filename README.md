# 🥊 Punch Your Clock

### A personal DTR that doesn’t trust you. A time tracker that fights back.

[![Deploy](https://img.shields.io/badge/live-demo-brightgreen?logo=github)](https://nekorie03.github.io/punch-your-clock/)
[![Made with React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![PWA Ready](https://img.shields.io/badge/PWA-ready-blueviolet?logo=pwa)](https://nekorie03.github.io/punch-the-clock)
[![License: WTFPL](https://img.shields.io/badge/license-WTFPL-brightgreen)](http://www.wtfpl.net/)

---

## 📖 What Is This?

Punch Your Clock is a fully client‑side, gamified **Daily Time Record** built for exactly one person: me.  
It’s my daily attendance sheet turned into a dark‑mode RPG where every punch earns XP, unlocking statuses from **Rookie** to **Immortal**, and editing a past entry requires winning a mini‑game or spending hard‑earned coins.

> *“You think you clocked in, Fighter? We know you didn't. Let's fight about it.”*

No databases. No servers. No HR department. Just a browser, localStorage, and a deeply unnecessary amount of competitive spirit.

---

## 🎮 Features

### ⏱ Core Time Tracking
- **Four punch buttons** – AM IN, AM OUT, PM IN, PM OUT – all with keyboard shortcuts (`1`‑`4`).
- **Full month view** – shows every working day with totals, overtime, and status.
- **Overtime calculation** – set your official hours and an hourly rate for estimated pay.
- **Custom lunch times** and notes per day.
- **Leave & holiday handling** – mark days as Sick Leave, Vacation, Holiday, or Absent.

### 🔐 Trust Issues System
- **Every day starts locked.** You must prove you deserve to record your time.
- **Whack‑a‑Clock** – a 3×3 grid mini‑game where you hit a clock mole enough times to unlock the day for 5 minutes.
- **Counter Clock Coins** – win coins by beating the game. Spend one to unlock any day without fighting.
- **Grace period** – unlocked days automatically re‑lock after 5 minutes. No slack.

### 📈 Gamification & Progression
- **XP system** – punch, complete a full day, win disputes, and unlock achievements to earn XP.
- **7 ranks** – from Rookie (0 XP) to Immortal (2500+ XP), each with an emoji badge.
- **9 achievements** – “First Blood”, “Week Warrior” (7‑day streak), “Iron Habit” (21‑day streak), “Full House” (all days punched in a month), etc.
- **🔥 Streak counter** – consecutive working days logged. Glows red after 3 days like a warning flare.

### 🪙 Counter Clock Economy
- Earn coins by winning Whack‑a‑Clock disputes.
- Spend coins to instantly unlock any day, no fight required.
- **Monthly Challenge** – survive 20 rounds of Whack‑a‑Clock for a huge coin + XP reward (once per month).
- After 3 straight losses, coins stop dropping until you win again.

### 📱 Progressive Web App
- Install it on your phone or desktop for a native‑like experience.
- Fully offline capable (service worker caches the app shell).
- Responsive layout – table view on larger screens, card view on mobile.

### 📂 Data Portability
- All data stored in `localStorage` – never leaves your device.
- Export your month as **JSON** or **CSV**.
- Import previously exported files.
- Undo accidental resets via backup snapshots.

---

## 🕹 How It Works (My Daily Ritual)

1. Open the site (or tap the PWA icon on my phone).  
2. The app greets me by name – I set it to `"Fighter"` because yes, I’m that person.  
3. Hit **AM IN** (or press `1`). If the day is locked → **Whack‑a‑Clock** appears.  
4. Smack the clock mole *n* times before the rounds run out (difficulty adjustable).  
5. Victory → day unlocks for 5 minutes → punch recorded. I get XP and maybe a coin.  
6. Defeat → no punch, no coin, just a shame‑inducing toast message.  
7. Repeat for AM OUT, PM IN, PM OUT. Completing all four grants bonus XP.  
8. At the end of the month, stare at the DTR table, admire my streak, and export a backup because paranoia is a virtue.

---

## 🧰 Tech Stack

| Layer          | Technology |
|----------------|------------|
| Frontend       | React 18 (loaded via UMD + Babel standalone – no build step) |
| Styling        | CSS custom properties, dark theme, `DM Mono` & `Bebas Neue` fonts |
| State          | React hooks + `useReducer` + localStorage |
| Offline / PWA  | Service worker, web manifest, `beforeinstallprompt` event |
| Hosting        | GitHub Pages |
| Dependencies   | None beyond React and Babel CDN links (zero `node_modules`) |

---

🙏 Credits
Built by NekoRie03 because my attendance record needed a final boss.
Special thanks to the mole emoji 🕳️ who carried the entire mini‑game.

📄 License
WTFPL – Do What the F*ck You Want to Public License.
See http://www.wtfpl.net/.

Now, if you’ll excuse me, I have a streak to maintain. 🥊🔥
