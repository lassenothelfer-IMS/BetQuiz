# BetQuiz — The quiz with live betting odds

A real-time multiplayer quiz where players don't just answer — they **bet points**
on their answer against **dynamic live odds** that shift based on how everyone
else is betting. Bet against the crowd and be right → win the most.

No accounts, no database: create a room, share the 4-letter code, and play.

## Tech stack

- **Next.js 16** (App Router, JavaScript) — UI for lobby, game and leaderboard
- **Custom Node server** (`server.js`) hosting **Socket.io** in the same process — real-time game traffic
- **Tailwind CSS v4** — styling
- **In-memory state** — all game data lives in server memory for the session only

## Getting started

```bash
npm install
npm run dev          # custom server on http://localhost:3000
```

Open the app in several tabs to play: one **host** + any number of **players**.

```bash
npm run build        # production build
npm start            # run the production server (NODE_ENV=production)
```

> If you see "Another next dev server is already running", a previous server is
> still on port 3000. Stop it (PowerShell):
> `Get-NetTCPConnection -LocalPort 3000 -State Listen | %{ Stop-Process -Id $_.OwningProcess -Force }`

## Deploying

BetQuiz needs a **single long-running Node process** (the custom Socket.io server
holds all game state in memory). This means **Vercel/Netlify won't work** — their
serverless model doesn't run custom servers or keep persistent WebSocket state.
Deploy to a host that runs a normal Node server instead.

### Render (one click via the included blueprint)

1. Push this repo to GitHub.
2. In Render: **New → Blueprint**, select the repo. It reads [`render.yaml`](render.yaml):
   - Build: `npm install --include=dev && npm run build`
   - Start: `npm start`
3. Deploy. Render injects `PORT`, supports WebSockets out of the box, and the
   app serves on the assigned URL. (Free tier sleeps when idle — first load after
   a nap takes ~30–50 s.)

### Railway / Fly.io / any VPS

Same idea — no blueprint needed:

- **Build command:** `npm install --include=dev && npm run build`
- **Start command:** `npm start`
- Make sure the platform installs **devDependencies** for the build (Tailwind
  lives there) — that's what `--include=dev` guarantees.

The client connects with same-origin `io()`, so when the whole app is served from
one host there's nothing else to configure.

## How to play

1. **Host** creates a room and shares the code; **players** join by code + name.
2. Host **builds the whole quiz up front** (Kahoot-style): pick ready-made
   questions from the pool and/or write custom ones, then start the game.
3. For each question, players pick an answer and a stake (100 / 200 / 300 or a
   custom amount). Odds are **locked at the moment you bet** and move live as
   others join in.
4. Host reveals the answer:
   - correct → `+ round(stake × oddsAtBet)`
   - wrong → `− stake`
5. **Between every question there's a 20-second slot break** 🎰 — players get 3
   spins on a slot machine, wagering points of their choice for a shot at a
   jackpot (all just for fun — no real money).
6. The live leaderboard updates after every question and slot break. After the
   last question, the final standings are shown.

The **host moderates** — they build the quiz and drive the game but don't bet,
don't spin, and aren't ranked.

### The slot machine

Three reels, classic fruit-machine paytable (`server/slots.js`): three-of-a-kind
pays 3×–20× (jackpot on 7️⃣7️⃣7️⃣), any pair pays 1.5×, no match loses the wager.
Outcomes are computed server-side, so no client can fake a win.

### Question pool

Curated trivia lives in `src/data/questionPool.json` (shared by server and the
builder), grouped into categories. Add your own questions to that file to grow
the pool.

## How the odds work

Parimutuel-style with smoothing (`server/odds.js`):

```
odds_A = (totalStaked + N·k) / (stakedOn_A + k)      // N = answer count, k = smoothing
```

- No bets → every answer sits at the baseline `N` (a fair 1-in-N payout)
- Money piling on an answer pushes its odds **down**; the answer nobody backs
  rises **up** (capped to `[1.1, 10]×`)

## Project layout

```
server.js                 # custom server: Next.js handler + Socket.io
server/
  state.js                # in-memory rooms + game-flow helpers
  odds.js                 # dynamic odds   (pure, unit-tested)
  scoring.js              # point scoring  (pure, unit-tested)
  socketHandlers.js       # Socket.io event wiring
src/
  app/page.js             # home: create / join
  app/room/[code]/page.js # the room (lobby → betting → reveal → ended)
  components/             # Lobby, QuestionForm, BettingPanel, OddsBoard,
                          # QuestionView, Leaderboard, Standings
  lib/socket.js           # client Socket.io singleton
scripts/                  # smoke / logic tests (see below)
```

The game state machine: `lobby → setup → betting → reveal → (setup | ended)`.
Clients render from a single `room:update` broadcast; the correct answer and the
scored results are only ever sent once a question is revealed.

## Tests

Plain Node scripts — no test framework. Start the dev server first for the smoke
tests (they connect over Socket.io); the logic test runs standalone.

```bash
node scripts/test-logic.js   # pure odds + scoring (no server needed)
node scripts/test-slots.js   # pure slot paytable (no server needed)
node scripts/smoke.js        # create + join + live roster
node scripts/smoke-m2.js     # quiz build + question flow + answer-hiding + host guards
node scripts/smoke-m3.js     # betting, live odds, locked odds, scoring
node scripts/smoke-slots.js  # slot break: spins, 3-spin cap, host skip/advance
```
