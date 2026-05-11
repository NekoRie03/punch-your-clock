# 🥊 Punch Your Clock

> *"You think you clocked in? We know you didn't. Let's fight about it."*

**Punch Your Clock** is the only time tracker that makes you literally fight for every second you claim. It's part DTR, part whack-a-mole arena, part RPG progression, and all brutal honesty about your attendance.

---

## 🚀 Why This Exists

Because normal timesheets are boring. And because if you really want to edit that time log from last Tuesday, you should have to prove your reflexes first. This app turns the dull chore of daily time recording into a street fight where the clock hits back.

---

## 🧠 Core Philosophy

1. **Every edit must hurt a little.** If you forgot to punch out yesterday, you don't get to just type "17:00" and move on. You earn that edit by smashing a digital clock in a 3x3 grid.
2. **You are what you punch.** Show up consistently and you'll climb the ranks from Rookie to Immortal. Slack off and the UI will mock you with a "🔥 0 day streak" badge.
3. **Coins are life.** Counter Clocks are the currency of convenience. Spend them to skip the fight. But earning them? That's the real fight.

---

## 🎮 Features That Shouldn't Exist

### 🕹️ Whack‑a‑Clock Mini‑Game
- A reflex‑testing mini‑game you must win to unlock any day's edit rights.
- Difficulty slider from **Easy (mockingly slow)** to **Nightmare (don't touch if you value your sanity)**.
- Win and you get a 5‑minute grace window to fix your logs. Lose and… well, try again, loser.

### 🪙 Counter Clock Currency
- Earn coins by winning disputes (or the monthly challenge).
- Spend **1 coin = 1 free edit, no game required**.
- Anti‑abuse: lose 3 times in a row and your next win gives **0 coins**. Stop farming.

### 🏅 Achievements & Rank System
- 9 achievements (First Blood, On Fire, Living Legend, etc.)
- XP system with 7 ranks from Rookie to Immortal.
- Animated XP and coin pop‑ups because dopamine matters.

### 📱 Mobile Card View
- On phones, the sprawling DTR table transforms into neat vertical cards.
- All the same inputs and buttons, zero horizontal scroll pain.

### 📊 Data Management
- Export to JSON (`*.punch`) or CSV.
- Import data from backup files.
- Print a clean table (without the game junk).
- Reset a month with an Undo safety net.

### 🥷 Keyboard Shortcuts
- Keys **1‑4** punch today's AM IN, AM OUT, PM IN, PM OUT instantly. (No game unless locked.)

### 🏆 Monthly Challenge
- 20‑round endurance test.
- Reward: **35 Counter Clocks** — enough to unlock every working day in a month.
- Only redeemable once per month, so choose your month wisely.

### 🔔 Live Clock & Punch Alerts
- Big, obnoxious live clock ticking at the top.
- Automatic warnings if you forgot to punch out and it's already late.

### 📲 Progressive Web App
- Install it on your phone home screen for full‑screen offline usage.
- Service worker ensures it loads even when your office Wi‑Fi dies.

---

## 🏗️ Tech Stack (aka the punching bag)

- **Vanilla HTML, CSS, JavaScript** — no frameworks, no dependencies, just raw code.
- **localStorage** for all data persistence (your data lives in your browser, so guard your phone with your life).
- **CSS animations** for XP/coin pop‑ups and the mole whack effects.
- **Google Fonts** (Bebas Neue & DM Mono) for that gritty, retro arcade look.

---

## 📂 File Structure

punch-your-clock/
├── index.html # The ring
├── style.css # The rope and canvas
├── script.js # The referee & fighters
├── manifest.json # PWA credentials
├── sw.js # Service worker (offline punch)
└── icon-192.png # The face of the gloves to punch your clock

---

## 🛠️ How to Use (Step‑by‑Step Survival Guide)

1. **Open `index.html`** in any modern browser. (Yes, it works offline after first load.)
2. **Set your name** when prompted. Yes, even "Fighter" is acceptable.
3. **Configure work hours, lunch, hourly rate** in the settings bar.
4. **Punch the day** using the big buttons or keyword shortcuts. If locked, you'll fight.
5. **To edit a past day**, click the 🥊 button (or 🪙 if you have coins). Win the game, get 5 minutes to fix your mistakes.
6. **Keep your streak alive** if you want that sweet, sweet XP.
7. **Beat the Monthly Challenge** to become the office clock‑warrior.

---

## 🎛️ Configuration Options

| Setting | Default | Description |
|--------|---------|-------------|
| Start / End time | 08:00–17:00 | Your official work hours. |
| Lunch (min) | 60 | Minutes deducted from total hours. |
| Hourly Rate (₱) | 0 | If set, OT pay estimate appears. |
| Whack Difficulty | Normal | Easy (mocking), Normal, Hard, Nightmare. |

---

## 🏆 Achievement List (Unlock All 9, We Dare You)

1. 👊 **First Blood** — Land your first punch ever.
2. 🔥 **On Fire** — 3‑day streak.
3. 🌶️ **Week Warrior** — 7‑day streak.
4. 💪 **Iron Habit** — 21‑day streak.
5. ⏱️ **Overtime Hero** — First overtime recorded.
6. 📅 **Full House** — Every working day punched in a month.
7. 🏆 **Champion!** — Reach Champion rank (900 XP).
8. 💎 **Living Legend** — Reach Legend rank (1500 XP).
9. 🥊 **Brawler** — Win 5 whack‑a‑clock games.

---

## 🤣 Known "Features" (Definitely Not Bugs)

- If you switch to Easy mode, the game mocks you after you win. This is intentional.
- The coin confirmation popup can be skipped permanently. We call that "trust".
- Losing 3 times in a row punishes you with 0 coin rewards. That's the game telling you to get good.
- The live clock shows seconds. It's meant to induce mild anxiety.

---

## 🧑‍💻 Credits

- Original concept, development, and flavor text by [NekoRie03](https://github.com/NekoRie03).
- Extended and maintained with laughter and occasional frustration.
- Built while questioning why HR doesn't just trust us.

---

## 📜 License

MIT License – because even brawls need rules.

Copyright (c) 2025 [NekoRie03] (https://github.com/NekoRie03)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
---

## 🙏 Final Words

**Punch Your Clock** was made because timesheets are dull and we all deserve a little chaos in our 9‑to‑5. It's not just a tool — it's a tiny rebellion with a leaderboard. So go forth, earn your Counter Clocks, and may your streak never break.

*And remember: the only thing harder than the clock… is you.*
