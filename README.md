<div align="center">

# 🎴 UNO: Show 'Em No Mercy™ — 3D Billiards Edition

**An ultra-sleek, WebRTC multiplayer & AI-powered UNO Show 'Em No Mercy card game set on an atmospheric 3D emerald billiards table.**

[![Live Demo](https://img.shields.io/badge/🎮_PLAY_LIVE_NOW-GitHub_Pages-10b981?style=for-the-badge&logo=github)](https://jithin0306.github.io/UNO-/)
[![React 18](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite_5-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![PeerJS WebRTC](https://img.shields.io/badge/PeerJS_WebRTC-Multiplayer-f43f5e?style=for-the-badge)](https://peerjs.com/)

### 🌐 **Live Game Link:** [https://jithin0306.github.io/UNO-/](https://jithin0306.github.io/UNO-/)

</div>

---

## ✨ Key Highlights

- **🔥 Official Mattel *UNO Show 'Em No Mercy™* Rulebook**:
  - **25-Card Mercy Rule Elimination**: Any player who reaches **25 or more cards** is immediately knocked out of the match (*MERCY KO*), and their cards are recycled under the discard pile.
  - **Ruthless Draw Stacking (`+2`, `+4`, `+6`, `+10`)**: Stack any Draw card of **equal or higher penalty value** onto an incoming attack and pass the combined total to the next player.
  - **Draw Until Playable**: In *No Mercy* mode, if you don't have a playable card on your turn, you must keep drawing from the deck until you draw a playable card (or hit 25 cards and get eliminated).
  - **7 Swap & 0 Pass**: Playing a **7** forces a hand swap with an active player of your choice; playing a **0** rotates everyone's hands in the current direction of play.
  - **Special Action & Wild Cards**: Includes **Skip Everyone** (play again immediately), **Discard All** (drop all cards of that color from your hand), **Wild Reverse Draw 4**, **Wild Draw 6**, **Wild Draw 10**, and **Wild Color Roulette**.

- **⏱️ 1-Minute (`01:00`) Turn Countdown Timer, Auto-Move & 3-Round AFK Elimination**:
  - **60-Second Turn Timer**: Every turn features a live `01:00` countdown clock and color-shifting progress bar (emerald → amber → pulsing crimson with countdown ticks in the final 10 seconds), synchronized across all multiplayer peers.
  - **Automatic Card Play / Draw**: If a player does not make a move within 1 minute (`00:00`), a random playable card is automatically thrown from their hand (or drawn from the deck if no card is playable) and an AFK strike (`AFK 1/3`, `AFK 2/3`) is recorded.
  - **3-Round Inactivity Elimination**: If a player fails to act for **3 rounds** (`AFK 3/3`), they are immediately eliminated from the match (`ELIMINATED (3 AFK)`).

- **💀 Full-Stage Cinematic Elimination Animation (Synced Across All Players)**:
  - Whenever any player is knocked out—either via the **25-Card Mercy Rule** or **3-Round AFK Disqualification**—every player at the table simultaneously sees a full-screen **Cinematic Elimination Showcase** featuring crimson shockwave rings, flying card shards, the eliminated player's portrait with an animated `✕` knockout stamp, survivor count pill, and sub-bass elimination gong.
  - Eliminated seats convert into crossed-out **Tombstone Badges (`💀 ELIMINATED`)** on the table.

- **🌐 Real-Time P2P Online Multiplayer, Live 4-Seat Lobby Roster & Instant Rematch**:
  - Powered by **PeerJS WebRTC** data channels with zero backend required.
  - **Live `PLAYERS IN LOBBY` Roster**: Host a private room (`#XXXXX`) and watch friends join in real time across all **4 Table Seats (`Seat 1` – `Seat 4`)** with their uploaded Profile Pictures, Display Names, `👑 HOST` / `● JOINED` status badges, and optional `+ BOT` / `✕` seat toggles before launching the table.
  - **Synchronized Table Entry**: Clicking **`ENTER GAME TABLE`** deals fresh hands and automatically brings all connected lobby friends into the 3D game table simultaneously.
  - **In-Room `REMATCH / PLAY AGAIN` & Dismiss Controls**: After winning or losing a match, **any player or the room Host** can click **`REMATCH / PLAY AGAIN`** to immediately deal a fresh match in the same room (reviving any eliminated players), or click **`DISMISS`** (`✕`) to inspect the final table state without leaving the room.

- **🎵 100% Copyright-Free Looping Background Music & Live Volume Capsule**:
  - Built-in polyphonic Web Audio API background music sequencer playing **100% copyright-free loops** with studio lowpass warmth and stereo delay.
  - Switch anytime between **3 original loops**:
    1. **Emerald Lounge (`92 BPM`)** — Smooth jazz-lounge Rhodes chords & walking sub-bass
    2. **No Mercy Pulse (`108 BPM`)** — Dark synthwave arena groove & arpeggio
    3. **Midnight Lo-Fi (`82 BPM`)** — Mellow lo-fi chillhop keys & beat
  - Interactive **Music Controls Capsule** on both the Home Screen and In-Game HUD with **Mute/Unmute**, **Volume `−` / `+` buttons**, **0%–100% Volume Slider**, and **Track Switcher** (independent from card SFX mute).

- **📸 Custom Profile Picture & Identity Sync**:
  - Upload your own **Profile Picture** directly from your device's local file gallery (`JPG`, `PNG`, `WEBP`).
  - Automatic `160×160` center-crop & compression persists your avatar in `localStorage` and broadcasts it in real time to all connected friends in the lobby and at the table.

- **🤖 Smart Cyber-Bots & Watchdog Turn Engine**:
  - Choose **1 vs 1 Duel**, **1 vs 3 Full Table**, or **Empty Table** (`0 Bots`).
  - Custom **3D Cyber-Robot Profile Avatars** (*Kairo*, *Nyx*, and *Jax*) with natural human-paced reaction timing (`1.2s – 2.2s`) and a continuous watchdog turn engine so bots never stall on consecutive/extra turns.

- **📱 Desktop & Mobile Optimized (Portrait + Landscape)**:
  - Automatic color-grouped player hand (`Red` → `Blue` → `Green` → `Yellow` → `Wild`) with dynamic viewport scaling so 100% of your cards stay visible at `100%` browser zoom and on mobile screens.

---

## 🕹️ Official *Show 'Em No Mercy* & Table Rules Implemented

| Rule / Feature | Effect in Game |
| :--- | :--- |
| **Mercy Rule (25 Cards)** | Hold **25 or more cards** at any point and you are **immediately eliminated** (`ELIMINATED`) with a full-stage knockout animation. |
| **1-Minute Turn Timer & Auto-Move** | Each turn has a **60-second (`01:00`)** timer; if it expires, a random playable card is automatically played (or drawn). |
| **3-Round AFK Elimination** | Timing out for **3 turns (`AFK 3/3`)** immediately eliminates the inactive player from the match. |
| **Stacking (`+2`, `+4`, `+6`, `+10`)** | Deflect an incoming penalty by playing any Draw card with a value **$\ge$** the last played Draw card. |
| **7 — Hand Swap** | When any `7` is played, you **must** choose another active player and swap your entire hand with theirs. |
| **0 — Pass All Hands** | When any `0` is played, all active players pass their entire hand to the next player in the direction of play. |
| **Skip Everyone** | Skips all other players at the table and grants you an **immediate extra turn**. |
| **Discard All** | Immediately discards **every card in your hand** that matches the color of the *Discard All* card. |
| **Wild Color Roulette** | Choose a color; the next player reveals cards from the deck until they flip that color (ignoring Wilds) and keeps them all. |
| **2-Player Reverse = Skip** | Whenever only 2 active players remain, any **Reverse** card acts like a **Skip**, and **Wild Reverse Draw 4** makes your opponent draw 4 cards unless they can stack. |

---

## 🚀 Getting Started Locally

### Prerequisites
- **Node.js** `v18+` and `npm`

### Installation & Development Server

```bash
# 1. Clone the repository
git clone https://github.com/Jithin0306/UNO-.git
cd UNO-

# 2. Install dependencies
npm install

# 3. Start the local Vite dev server
npm run dev
```

Open `http://localhost:5173` in your browser.

### Production Build & Deployment

```bash
# Build production bundle into dist/
npm run build

# Deploy to GitHub Pages
npm run deploy
```

---

## 🗂️ Project Structure

```text
src/
├── components/
│   ├── CardFlightLayer.tsx    # Bezier card flight trajectories & table shockwaves
│   ├── CenterTableArea.tsx    # 3D Draw Pile, Discard Pile & Pulsing Active Color Ring
│   ├── GameHUD.tsx            # In-game HUD, 60s Turn Timer, Elimination Cinema, Rematch & Dismiss Modal
│   ├── HomeScreen.tsx         # 2-Column No Mercy Console, Gallery Avatar Uploader & 4-Seat Live Lobby Roster
│   ├── MusicControls.tsx      # Looping Background Music Mute, Volume (- / Slider / +) & Track Switcher
│   ├── OpponentSeat.tsx       # Top/Left/Right seats, Robot avatars, AFK badges & Eliminated Tombstones
│   ├── PlayerHand.tsx         # Auto-sorted color clusters & responsive 100%-zoom/mobile hand math
│   ├── PoolTableStage.tsx     # 3D emerald billiards table cabinet, brass pockets & overhead lighting
│   └── UnoCard.tsx            # High-contrast physical UNO & No Mercy card renderer
├── styles/
│   └── billiards.css          # 3D table shaders, Elimination Cinema, Lobby Roster, Timer & mobile styles
├── types/
│   └── uno.ts                 # Core TypeScript interfaces for cards, seats, eliminations & network sync
├── utils/
│   ├── avatarImage.ts         # Local gallery image cropper/compressor & Cyber-Robot SVG generator
│   ├── deckBuilder.ts         # Official 168-card No Mercy & Classic deck generator + play validation
│   ├── handSorting.ts         # Strict color-group & rank hand organizer
│   ├── multiplayerManager.ts  # PeerJS WebRTC Host/Client state, Lobby sync & Rematch messaging
│   └── soundEffects.ts        # Copyright-free looping BGM synthesizer + card/timer/elimination SFX
└── App.tsx                    # Authoritative game loop, 60s Timer/AFK engine, AI watchdog & P2P hooks
```

---

## 📄 License

This project is created for educational and entertainment purposes. *UNO®* and *UNO Show 'Em No Mercy™* are registered trademarks of Mattel, Inc.
