# Privacy, Data Protection & Security Architecture (`docs/privacy-security.md`)

> **Regulatory Reference:** Digital Personal Data Protection (DPDP) Act, 2023 & Draft DPDP Rules, 2025 (MeitY, India), alongside applicable Indian CERT-In cybersecurity guidance.
> **Disclaimer:** This document describes technical privacy, data-minimisation, security, and user-rights controls implemented in the codebase. It does not constitute formal legal advice or a claim of government certification.

---

## 1. Data Inventory & Data Minimisation Architecture

The game is architected as a **Zero-Database Client-Side Application** with optional **PeerJS WebRTC P2P multiplayer**. No central backend database stores personal data.

| Storage Key (`localStorage`) | Data Category | Purpose | Legal Basis | Default State | Retention & Deletion |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `uno_royale_player_id` | System Player ID (`plr_...`) | Local session identification, data export, and deletion tracking | Essential | Generated locally | Deleted & regenerated on **Delete Account** |
| `uno_royale_account_created` | Creation Timestamp (ISO-8601) | Included in user's JSON data export | Essential | Generated locally | Deleted on **Delete Account** |
| `uno_player_name` | Display Name / Username | Displayed on player seat badge | Affirmative Consent | Not stored until saved | Deleted on consent withdrawal or **Delete Account** |
| `uno_player_avatar` | `160×160` Cropped Data-URL Avatar | Displayed on player seat badge; shared in P2P room if consented | Affirmative Consent | Not stored until uploaded | Deleted on consent withdrawal, **Clear Photo**, or **Delete Account** |
| `uno_royale_match_stats` | Local Match Statistics (`matches_played`, `matches_won`, `mercy_knockouts`) | Personal statistics counter on device | Affirmative Consent | Disabled (`false`) | Deleted immediately on consent withdrawal or **Delete Account** |
| `uno_royale_privacy_consent` | Granular Consent Record | Stores boolean consent toggles & timestamp | Legal Compliance | Optional flags `false` | Deleted on **Delete Account** |
| `uno_royale_security_audit_log` | Rolling Security Event Log | Records rate-limit blocks & invalid turn/card rejections | Security / Legitimate Use | Rolling 30-day / 60-entry cap | Automatically pruned after 30 days or **Delete Account** |
| `uno_royale_player_reports` | Local Misconduct Reports | Records player reports submitted in P2P rooms | Safety & Moderation | Capped at 20 entries | Deleted on **Delete Account** |
| `uno_royale_bgm_*` | Audio Mute, Volume & Track Index | Remembers background music preferences | Essential Functional | Local preference | Deleted on **Delete Account** |

### Data Explicitly Excluded (Never Collected)
- Email addresses / Gmail login / password-reset emails
- Phone numbers / OTPs
- Home addresses or precise GPS coordinates
- Date of birth, Aadhaar, PAN, or government identifiers
- Google Analytics, Meta Pixel, or third-party advertising cookies

---

## 2. Consent Implementation (`src/utils/securityValidation.ts`)

1. **No Pre-Selected Optional Checkboxes**:
   - `DEFAULT_CONSENT` sets `local_profile_persistence: false`, `p2p_avatar_sharing: false`, and `local_match_stats: false`.
   - There is **no "Accept All" button** that silently enables optional processing.
2. **Granular Affirmative Control (`/privacy-settings`)**:
   - Users can independently toggle each optional processing category and click **Save My Privacy Choices**, or click **Withdraw All Optional Consent** (`withdrawAllOptionalConsent()`).
   - Withdrawing `local_profile_persistence` immediately deletes `uno_player_name` and `uno_player_avatar` from `localStorage`.
   - Withdrawing `local_match_stats` immediately deletes `uno_royale_match_stats` from `localStorage`.

---

## 3. User Rights Workflows (DPDP Act Sections 11–14)

- **Right to Access & Data Portability (`/download-data` / `exportMyPersonalDataJSON`)**:
  - Exports a structured, machine-readable `.json` file containing `player_id`, `username`, `account_created`, `privacy_consent_preferences`, `statistics`, and `active_p2p_room`.
- **Right to Correction (`/privacy-settings`)**:
  - Users can edit their `username` (`sanitizePlayerName`) and update or clear their `avatarUrl` at any time.
  - System-generated `player_id` (`plr_...`) is rendered `readOnly` and `disabled` so internal identifiers cannot be spoofed.
- **Right to Erasure (`Settings → Delete Account` / `deleteAllMyPersonalData`)**:
  - Presents a clear pre-deletion explanation of all data to be erased.
  - Upon confirmation, wipes all `STORAGE_KEYS` from `localStorage` and `sessionStorage`, triggers graceful WebRTC Host migration (`mpManager.leaveWithHostMigration()`) if connected to a room, resets display name to `"Player 1"`, and generates a clean anonymous session.

---

## 4. Multiplayer Security & Authoritative Validation

1. **Authoritative Host Verification (`src/App.tsx` & `src/utils/multiplayerManager.ts`)**:
   - In PeerJS P2P rooms, the Room Host validates every client action before mutating state:
     - `PLAY_CARD`: Verifies `seatPlayer.isActive && !seatPlayer.isEliminated`, `turnIndex === msg.seatIndex`, card ownership (`seatPlayer.hand.find(c => c.id === msg.cardId)`), and rule legality (`canPlayCard(...)`).
     - `DRAW_CARD`: Verifies `turnIndex === msg.seatIndex`.
     - `SWAP_SEVEN`: Verifies `awaitingSevenSwapForSeat === msg.seatIndex`.
   - Any out-of-turn or unowned card action is rejected and logged in the rolling security log (`INVALID_TURN_REJECTED`, `INVALID_CARD_OWNERSHIP`, `ILLEGAL_CARD_PLAY_REJECTED`).
2. **Input Sanitization (`src/utils/securityValidation.ts`)**:
   - `sanitizePlayerName`: Strips HTML/script characters (`<>"'\/`), control characters, `javascript:` URIs, and `on*=` attributes; caps length at 18 characters.
   - `sanitizeRoomCode`: Enforces 5-character uppercase alphanumeric format (`/^[A-Z0-9]{5}$/`).
   - `sanitizeAvatarDataUrl`: Allows only valid `data:image/(jpeg|png|webp|svg+xml)` payloads under `46 KB`.
3. **Sliding-Window Rate Limiting (`checkRateLimit`)**:
   - `join_<peer>`: Max 4 join handshakes per 15 seconds per peer.
   - `action_seat_<idx>`: Max 10 gameplay actions per 3 seconds per seat.
   - `player_report`: Max 3 player misconduct reports per 60 seconds.
4. **Content-Security-Policy (CSP) & HTTP Security Headers (`index.html`)**:
   - `Content-Security-Policy`: Restricts `connect-src` to `'self'`, `https://*.peerjs.com`, and `wss://*.peerjs.com`; blocks `<object>`/`<embed>` (`object-src 'none'`); restricts `img-src` to `'self' data: blob:`.
   - `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=(), usb=()`.

---

## 5. Third-Party Processors Inventory

1. **GitHub Pages** (`github.io`): Static HTTPS hosting and CDN delivery.
2. **PeerJS Cloud Broker** (`0.peerjs.com`): WebRTC session signaling broker used strictly when a user initiates or joins an online P2P room code.
3. **Google Fonts** (`fonts.googleapis.com` / `fonts.gstatic.com`): Static webfont stylesheet delivery.

---

## 6. Security Logging & Incident Response (CERT-In Alignment)

- **Security Logging Policy**:
  - `logSecurityEvent` records validation rejections, rate-limit blocks, consent changes, data exports, and deletions using UTC ISO-8601 timestamps (`new Date().toISOString()`).
  - Logs are capped at 60 entries and pruned automatically after 30 days. No sensitive personal data, tokens, or credentials are ever written to logs.
- **Vulnerability Disclosure & Incident Response (`/security`)**:
  - Researchers and users are directed via `/security` to responsibly report vulnerabilities through the repository security advisory channel (`github.com/Jithin0306/UNO-/security`).
