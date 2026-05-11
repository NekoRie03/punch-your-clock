# 🥊 Punch Your Clock
 
> *A time tracker for people who definitely punch in on time. Every day. Always. (They don't.)*
 
---
 
I built this because I kept lying to myself about what time I "arrived" at work. Now I have a whole app to lie to instead. At least it saves the lies to `localStorage`.
 
This is a **personal-use, single-file HTML time tracker** — no backend, no accounts, no cloud, no ₱499/month CEO tax. Just you, your browser, and your dignity (optional). **Add it to your phone's home screen** — it works offline and saves everything to browser storage. No internet? No problem.---
 
## ✨ Features
 
### ⏱️ Time Punching
- **4-punch system** — AM In, AM Out, PM In, PM Out (because half-days are a human right)
- **One-click punch buttons** on the main card for today
- **Keyboard shortcuts** — press `1` `2` `3` `4` to punch the current time instantly without touching the mouse like a civilized person
- **Live clock** ticking in real-time so you can watch the seconds drain from your life

### 🔒 Lock & Dispute System
- **All past days are locked by default** — you cannot go back and gaslight your own records without earning it
- **Whack-a-Clock mini-game** — to edit a locked day, you must win a game of Whack-a-Mole against little clock emoji. Lose and the day stays locked. Skill issue.
- **5-minute grace window** after winning — the day unlocks for 5 minutes before auto-locking again
- **Per-row grace countdown** — watch the timer tick down in the table while you frantically fix your typo

### 🎮 Gamification (Because Adulting Needs XP)
- **XP system** — earn XP for every punch (+10), full day completion (+20), winning Whack-a-Clock (+25), editing times (+5), and adding notes (+2)
- **7-tier rank ladder** — Rookie → Clocker → Grinder → Warrior → Champion → Legend → Immortal. Yes, you can become immortal by clocking in enough times.
- **XP progress bar** — shows exactly how far you are from your next rank, which is more than your HR system has ever told you
- **Floating XP popups** — little "+25 XP" numbers fly up the screen every time you do something good. Extremely mature.
- **Combo system in Whack-a-Clock** — chain hits without missing to trigger a 🔥 COMBO! multiplier display. Miss and it resets. Just like real life.
- **9 unlockable achievements:**
| Achievement | How to unlock |
|---|---|
| 👊 First Blood | Make your very first punch |
| 🔥 On Fire | 3-day punch streak |
| 🌶️ Week Warrior | 7-day streak |
| 💪 Iron Habit | 21-day streak (touch grass after) |
| ⏱️ Overtime Hero | Log your first overtime day |
| 📅 Full House | Punch every single working day in a month |
| 🏆 Champion! | Reach Champion rank |
| 💎 Living Legend | Reach Legend rank |
| 🥊 Brawler | Win 5 Whack-a-Clock games |

### 📱 Progressive Web App (PWA)
- **Install on your phone** — works just like a native app. Tap "Add to Home Screen" or "Install App" from your browser (Chrome, Edge, Safari, etc.)
- **Offline-ready** — once installed, the app loads and works even without an internet connection. All data stays on your device.
- **Standalone mode** — opens in its own window without browser tabs or address bar, so it feels like a real timekeeping tool.
- **Auto-updates** — when you're online, the latest version loads automatically next time you open the app.

### 📅 Daily Time Record (DTR) Table
- Full monthly grid of all working days (weekends automatically excluded because you deserve rest)
- **Day-of-week labels** — so you know it's a Tuesday without opening a calendar like an animal
- **Today's row highlighted** with a gold left border and a ★ because you showed up
- **Red warning rows** for incomplete punch pairs — if you clocked in but didn't clock out, the app will shame you visually
- **Inline time editing** for each field (AM In/Out, PM In/Out) once a day is unlocked
- **Per-day status** — Present, Holiday, Sick Leave, Vacation, Absent
- **Custom lunch minutes** per day (override the global default if you had a sad desk lunch that was shorter)
- **Notes field** — WFH, meeting, "accidentally fell asleep at 2pm", whatever you need

### 📊 Summary & Overtime Tracking
- **Regular OT** — overtime on normal working days
- **Holiday OT** — overtime on holidays (double pain, presumably double pay)
- **Total OT** combined
- **Estimated OT Pay** — enter your hourly rate and it calculates `total OT hours × rate × 1.25` (Philippine labor law multiplier)
- **Days worked, total hours, absences, leaves** — all summarized at the bottom
- **Completion rate** — percentage of working days you actually punched, rendered in cold hard % with no caveats

### 🔥 Streak Tracker
- Counts consecutive working days where you logged *something* — a punch, a status, or even a note
- Streak badge glows red and pulses when you're at 3+ days
- Silently judges you when you're at 0

### ⚙️ Settings
- **Official start/end time** — used to calculate how much overtime you suffered
- **Default lunch duration** in minutes
- **Hourly rate in ₱** — for OT pay estimation

### 💾 Data Management
- **Export `.punch`** — save your full data as a JSON file
- **Export CSV** — open in Excel, Google Sheets, or send to payroll without anyone knowing you built this yourself
- **Import `.punch` / `.json`** — restore from a backup file
- **Print view** — clean print stylesheet hides all the buttons and game UI so your DTR looks professional
- **Reset month** — nuke a month's data (with confirmation, unlike some people who just delete things)
- **Undo reset** — one-step undo in case you immediately regretted it (you will)
- **Works offline** — because the PWA caches everything, you can punch time even when you're off the grid

### 🍞 Toast Notifications
- Every action gives a little toast popup at the bottom right corner confirming what you did, because we all need validation sometimes

---

## 🚀 Usage

1. Open **https://nekorie03.github.io/punch-your-clock** in any browser — desktop or phone
2. Enter your name when prompted (or lie, it doesn't matter)
3. Set your official work hours in Settings → Apply
4. Click the punch buttons or press `1`–`4` to log today's times
5. Click 🥊 on a past row to dispute/unlock it (then win the game)
6. Export your data at the end of the month

**📱 On your phone:** After opening the URL, tap your browser's "Install App" / "Add to Home Screen" option. The clock follows you everywhere — offline, no internet needed, lives on your home screen like a real app.

No build tools. No package managers. No feelings.

---

## 🗄️ Data Storage
 
Everything is saved in **`localStorage`** in your browser. This means:
 
- ✅ Works offline
- ✅ Completely private
- ✅ No server, no account, no tracking
- ⚠️ Clearing your browser data will wipe everything — use Export regularly
- ⚠️ Data does not sync across devices — it's a one-device situation

--- 

## 🖨️ Print / DTR Submission
 
Hit the **🖨️ Print** button. The print stylesheet automatically hides the game UI, punch buttons, settings, and footer. What remains is a clean time record table you can screenshot or print to PDF.
 
---

## 🧱 Tech Stack
 
| What | Why |
|---|---|
| Plain HTML | No build step, no node_modules folder eating your SSD |
| Vanilla JS | Because jQuery is not coming back and that's okay |
| CSS Variables | Theming without a framework |
| `localStorage` | Free database with zero devops |
| Google Fonts (Bebas Neue + DM Mono) | Looks cool |
| **PWA manifest + Service Worker** | Turns the page into an installable, offline-capable app |

---

## ⚠️ Disclaimer
 
This app is for **personal record-keeping only**. It does not replace your company's official timekeeping system. Do not submit these records as official documents unless your HR is very, very chill.
 
The developer (me) accepts no liability for tardiness, absences, overtime disputes, or the psychological damage caused by the Whack-a-Clock game.
 
--- 

*Made with spite, caffeine, and a deep personal grudge against biometric machines.*
