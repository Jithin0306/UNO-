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

- **🌐 Real-Time P2P Online Multiplayer (Zero Backend Required)**:
  - Powered by **PeerJS WebRTC** data channels.
  - Host a private table with a 5-character room code (e.g., `#LUA2H`) and share a one-click invite link (`?room=XXXXX`) with up to 3 friends.
  - Automatic perspective rotation so every connected player sits at the foreground (`bottom`) of their own screen.

- **📸 Custom Profile Picture & Identity Sync**:
  - Upload your own **Profile Picture** directly from your device's local file gallery (`JPG`, `PNG`, `WEBP`).
  - Automatic `160×160` center-crop & compression persists your avatar in `localStorage` and broadcasts it in real time to all connected friends at the table.

- **🤖 Smart Cyber-Bots & Flexible Match Presets**:
  - Choose **1 vs 1 Duel**, **1 vs 3 Full Table**, or **Empty Table** (`0 Bots`) to add/remove bots manually before starting.
  - Custom **3D Cyber-Robot Profile Avatars** (*Kairo*, *Nyx*, and *Jax*) with natural human-paced reaction timing (`1.2s – 2.2s`).

- **📱 Desktop & Mobile Optimized (Portrait + Landscape)**:
  - Automatic color-grouped player hand (`Red` → `Blue` → `Green` → `Yellow` → `Wild`) with dynamic viewport scaling so 100% of your cards stay visible at `100%` browser zoom and on mobile screens.

---

## 🕹️ Official *Show 'Em No Mercy* Rules Implemented

| Rule / Card | Effect in Game |
| :--- | :--- |
| **Mercy Rule (25 Cards)** | Hold **25 or more cards** at any point and you are **immediately eliminated** (`ELIMINATED`). |
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
│   ├── GameHUD.tsx            # In-game HUD, UNO button lock, Wild picker & Online Lounge modal
│   ├── HomeScreen.tsx         # 2-Column No Mercy Launch Console & Local Gallery Avatar Uploader
│   ├── OpponentSeat.tsx       # Top/Left/Right opponent stations, Robot avatars & card fans
│   ├── PlayerHand.tsx         # Auto-sorted color clusters & responsive 100%-zoom/mobile hand math
│   ├── PoolTableStage.tsx     # 3D emerald billiards table cabinet, brass pockets & overhead lighting
│   └── UnoCard.tsx            # High-contrast physical UNO & No Mercy card renderer
├── styles/
│   └── billiards.css          # 3D table shaders, animations, Home Screen & mobile media queries
├── types/
│   └── uno.ts                 # Core TypeScript interfaces for cards, seats, modes & network sync
├── utils/
│   ├── avatarImage.ts         # Local gallery image cropper/compressor & Cyber-Robot SVG generator
│   ├── deckBuilder.ts         # Official 168-card No Mercy & Classic deck generator + play validation
│   ├── handSorting.ts         # Strict color-group & rank hand organizer
│   ├── multiplayerManager.ts  # PeerJS WebRTC Host/Client state synchronization
│   └── soundEffects.ts        # Web Audio API procedural card snaps, riffles & victory fanfare
└── App.tsx                    # Authoritative game loop, Mercy Rule engine, AI controller & P2P hooks
```

---

## 📄 License

This project is created for educational and entertainment purposes. *UNO®* and *UNO Show 'Em No Mercy™* are registered trademarks of Mattel, Inc.
