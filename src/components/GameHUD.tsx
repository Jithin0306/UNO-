import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Volume2,
  VolumeX,
  RotateCcw,
  Users,
  Copy,
  Check,
  Wifi,
  Bot,
  Edit3,
  Camera,
  Clock,
  Skull,
  AlertTriangle,
} from 'lucide-react';
import {
  ActiveColor,
  EliminationEvent,
  GameMode,
  Player,
} from '../types/uno';
import {
  compressAvatarImageFile,
  DEFAULT_HUMAN_AVATAR,
} from '../utils/avatarImage';
import { MusicControls } from './MusicControls';

interface GameHUDProps {
  mode: GameMode;
  sevenZeroRule: boolean;
  myPlayerName: string;
  myAvatarUrl: string;
  myAfkCount: number;
  turnSecondsLeft: number;
  activeElimination: EliminationEvent | null;
  activePlayer: Player;
  playerCardCount: number;
  activeBotCount: number;
  activeTotalPlayers: number;
  isPlayerTurn: boolean;
  hasCalledUno: boolean;
  muted: boolean;
  awaitingWildColor: boolean;
  awaitingSevenSwap: boolean;
  winner: Player | null;
  mpRole: 'offline' | 'host' | 'client';
  roomCode: string;
  initialInviteCode: string;
  connectedFriendsCount: number;
  mpStatusText: string;
  onUpdateMyName: (newName: string) => void;
  onUpdateMyAvatar: (newAvatarUrl: string) => void;
  onDismissElimination: () => void;
  onHostOnlineRoom: (playerName: string) => Promise<string>;
  onJoinOnlineRoom: (roomCode: string, playerName: string) => Promise<void>;
  onLeaveOnlineRoom: () => void;
  onSetBotPreset: (preset: '1v1' | '1v3' | 'no_bots') => void;
  onToggleMode: () => void;
  onToggleSevenZero: () => void;
  onToggleMute: () => void;
  onCallUno: () => void;
  onDrawCard: () => void;
  onSelectWildColor: (color: ActiveColor) => void;
  onNewMatch: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  mode,
  sevenZeroRule,
  myPlayerName,
  myAvatarUrl,
  myAfkCount,
  turnSecondsLeft,
  activeElimination,
  activePlayer,
  playerCardCount,
  activeBotCount,
  activeTotalPlayers,
  isPlayerTurn,
  hasCalledUno,
  muted,
  awaitingWildColor,
  awaitingSevenSwap,
  winner,
  mpRole,
  roomCode,
  initialInviteCode,
  connectedFriendsCount,
  mpStatusText,
  onUpdateMyName,
  onUpdateMyAvatar,
  onDismissElimination,
  onHostOnlineRoom,
  onJoinOnlineRoom,
  onLeaveOnlineRoom,
  onSetBotPreset,
  onToggleMode,
  onToggleSevenZero,
  onToggleMute,
  onCallUno,
  onDrawCard,
  onSelectWildColor,
  onNewMatch,
}) => {
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [nickname, setNickname] = useState(myPlayerName || '');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [avatarUpdatedToast, setAvatarUpdatedToast] = useState(false);
  const hudFileInputRef = useRef<HTMLInputElement | null>(null);

  // When an invite link (?room=XXXXX) is opened, automatically pop open the modal with the code pre-filled so the friend enters their name!
  useEffect(() => {
    if (initialInviteCode) {
      setJoinCodeInput(initialInviteCode.toUpperCase());
      setShowRoomModal(true);
    }
  }, [initialInviteCode]);

  useEffect(() => {
    if (myPlayerName && myPlayerName !== 'Host' && myPlayerName !== 'Friend') {
      setNickname(myPlayerName);
    }
  }, [myPlayerName]);

  const turnText =
    activeTotalPlayers < 2
      ? 'ADD A BOT OR INVITE A FRIEND'
      : isPlayerTurn
      ? `YOUR TURN (${myPlayerName.toUpperCase()})`
      : `${activePlayer.name.toUpperCase()}'S TURN`;

  const handleCopyInvite = () => {
    if (!roomCode) return;
    const url = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleNameChange = (val: string) => {
    setNickname(val);
    const trimmed = val.trim();
    if (trimmed.length > 0) {
      onUpdateMyName(trimmed);
    }
  };

  const handleHudAvatarSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressAvatarImageFile(file);
      onUpdateMyAvatar(dataUrl);
      setAvatarUpdatedToast(true);
      window.setTimeout(() => setAvatarUpdatedToast(false), 2000);
    } catch {
      // ignore invalid file
    } finally {
      e.target.value = '';
    }
  };

  return (
    <>
      {/* TOP MINIMAL BAR: Top-Left Online Room Button, Top-Center Mode & Bot Presets, Top-Right [ Exit ] */}
      <header className="hud-top-minimal-bar">
        {/* Top-Left Online Multiplayer Room Pill */}
        <button
          type="button"
          className={`hud-top-left-tag is-clickable-room-btn ${
            mpRole !== 'offline' ? 'is-online-active' : ''
          }`}
          onClick={() => setShowRoomModal(true)}
          title="Host or Join an Online Multiplayer Table with Friends"
        >
          <span className="room-live-dot" />
          <Users size={13} />
          <span className="room-code-label">
            {mpRole === 'host'
              ? `ROOM #${roomCode} (${connectedFriendsCount + 1} HUMAN)`
              : mpRole === 'client'
              ? `JOINED #${roomCode} AS ${myPlayerName.toUpperCase()}`
              : 'PLAY WITH FRIENDS • ONLINE ROOM'}
          </span>
        </button>

        {/* Top-Center: Locked Read-Only Match Status (Mode & Bots cannot be changed mid-game) */}
        <div
          className="hud-top-center-pills"
          title="Match settings are locked while a game is in progress. Return to HOME to start a different mode or bot setup."
        >
          <div className="hud-mode-pill" style={{ cursor: 'default' }}>
            <Bot size={13} className="bot-preset-icon" />
            <span className="mode-badge-title">
              {activeTotalPlayers === 2
                ? '1v1 DUEL'
                : `${activeTotalPlayers} PLAYERS`}
            </span>
          </div>

          <div
            className={`hud-mode-pill ${
              mode === 'no_mercy' ? 'is-no-mercy' : ''
            }`}
            style={{ cursor: 'default' }}
          >
            <span className="mode-badge-prefix">MODE</span>
            <span className="mode-badge-title">
              {mode === 'no_mercy' ? 'NO MERCY' : 'CLASSIC'}
            </span>
          </div>

          <div
            className={`hud-rule-pill ${
              sevenZeroRule || mode === 'no_mercy' ? 'rule-on' : 'rule-off'
            }`}
            style={{ cursor: 'default' }}
          >
            <span>
              7-0: {sevenZeroRule || mode === 'no_mercy' ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>

        {/* Top-Right: Background Music Controls, SFX Mute & [ Exit ] */}
        <div className="hud-top-right-actions">
          <MusicControls compact />

          <button
            type="button"
            className="hud-icon-btn"
            onClick={onToggleMute}
            aria-label={muted ? 'Unmute Card SFX' : 'Mute Card SFX'}
            title={muted ? 'Unmute Card SFX' : 'Mute Card SFX'}
          >
            {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          <button
            type="button"
            className="hud-exit-bracket-btn"
            onClick={onNewMatch}
            title="Return to Home Screen"
          >
            <span className="bracket-char">[</span>
            <span className="exit-word">EXIT</span>
            <span className="bracket-char">]</span>
          </button>
        </div>
      </header>

      {/* BOTTOM FOREGROUND CONTROLS INTEGRATED INTO THE TABLE */}
      <div className="hud-bottom-table-bar">
        {/* Left: Your Player Avatar, Name Badge & Your Cards Count */}
        <div className="hud-bottom-left-meta">
          <button
            type="button"
            className="your-player-name-pill"
            onClick={() => setShowRoomModal(true)}
            title="Click to change your Profile Picture or Display Name"
          >
            <img
              src={myAvatarUrl || DEFAULT_HUMAN_AVATAR}
              alt={myPlayerName}
              className="your-pill-avatar"
            />
            <span className="your-name-tag">{myPlayerName}</span>
            <Edit3 size={11} className="name-edit-icon" />
          </button>

          <div
            className={`your-cards-counter-pill ${
              mode === 'no_mercy' && playerCardCount >= 20
                ? 'mercy-danger-zone'
                : ''
            }`}
          >
            <span className="counter-caption">Your Cards:</span>
            <span className="counter-value">
              {mode === 'no_mercy'
                ? `${playerCardCount} / 25`
                : playerCardCount}
            </span>
          </div>

          {myAfkCount > 0 && (
            <div
              className="your-afk-warning-pill"
              title="Missed 1-minute turns! At 3/3 AFK rounds you are eliminated from the game."
            >
              <AlertTriangle size={12} />
              <span>AFK {myAfkCount} / 3</span>
            </div>
          )}
        </div>

        {/* Center-Bottom: Integrated Turn Indicator + 1-Minute (60s) Auto-Move Timer */}
        <div
          className={`table-integrated-turn-banner ${
            isPlayerTurn && activeTotalPlayers >= 2
              ? 'is-your-turn'
              : 'is-opponent-turn'
          }`}
        >
          <div className="turn-banner-main-row">
            <span className="turn-wing left-wing" />
            <span className="turn-indicator-label">
              {awaitingWildColor
                ? 'SELECT ACTIVE COLOR'
                : awaitingSevenSwap
                ? 'SELECT PLAYER TO SWAP HANDS'
                : turnText}
            </span>
            {activeTotalPlayers >= 2 && !winner && (
              <div
                className={`turn-countdown-timer-pill ${
                  turnSecondsLeft <= 10
                    ? 'timer-critical'
                    : turnSecondsLeft <= 20
                    ? 'timer-warning'
                    : 'timer-normal'
                }`}
                title="1-Minute Turn Timer: If no move is made in 60s, a random playable card is thrown or drawn automatically (3 AFK rounds = Elimination)"
              >
                <Clock size={12} className="timer-clock-icon" />
                <span className="timer-digits">
                  {Math.floor(turnSecondsLeft / 60)}:
                  {String(turnSecondsLeft % 60).padStart(2, '0')}
                </span>
              </div>
            )}
            <span className="turn-wing right-wing" />
          </div>

          {activeTotalPlayers >= 2 && !winner && (
            <div className="turn-timer-progress-track">
              <div
                className={`turn-timer-progress-fill ${
                  turnSecondsLeft <= 10
                    ? 'fill-critical'
                    : turnSecondsLeft <= 20
                    ? 'fill-warning'
                    : 'fill-normal'
                }`}
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(100, (turnSecondsLeft / 60) * 100)
                  )}%`,
                }}
              />
            </div>
          )}
        </div>

        {/* Right: UNO Button (Disabled until player can actually call UNO) & DRAW Button */}
        <div className="hud-bottom-right-controls">
          {(() => {
            const canCallUnoNow =
              (playerCardCount === 1 ||
                (playerCardCount === 2 && isPlayerTurn)) &&
              !hasCalledUno &&
              activeTotalPlayers >= 2;
            return (
              <button
                type="button"
                disabled={!canCallUnoNow}
                className={`table-action-btn btn-uno ${
                  canCallUnoNow ? 'uno-ready-pulse' : 'disabled'
                } ${hasCalledUno ? 'uno-called' : ''}`}
                onClick={() => {
                  if (canCallUnoNow) onCallUno();
                }}
              >
                <span>{hasCalledUno ? 'UNO CALLED!' : 'UNO'}</span>
              </button>
            );
          })()}

          <button
            type="button"
            className={`table-action-btn btn-draw ${
              isPlayerTurn && activeTotalPlayers >= 2 ? 'can-draw' : 'disabled'
            }`}
            disabled={
              !isPlayerTurn ||
              activeTotalPlayers < 2 ||
              awaitingWildColor ||
              awaitingSevenSwap
            }
            onClick={onDrawCard}
          >
            <span>DRAW</span>
          </button>
        </div>
      </div>

      {/* ONLINE MULTIPLAYER FRIENDS LOUNGE & NAME MODAL */}
      <AnimatePresence>
        {showRoomModal && (
          <motion.div
            key="online-room-modal"
            className="victory-table-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowRoomModal(false)}
          >
            <motion.div
              className="online-lounge-modal-card"
              initial={{ y: 24, scale: 0.94 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 16, scale: 0.94 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="lounge-modal-header">
                <div className="lounge-title-group">
                  <Wifi size={16} className="gold-icon" />
                  <h3>PLAYER PROFILE &amp; ONLINE LOUNGE</h3>
                </div>
                <button
                  type="button"
                  className="lounge-close-btn"
                  onClick={() => setShowRoomModal(false)}
                >
                  ✕
                </button>
              </div>

              {/* PROFILE PICTURE GALLERY UPLOADER */}
              <div className="lounge-input-group">
                <label>
                  YOUR PROFILE PICTURE{' '}
                  {avatarUpdatedToast
                    ? '— ✓ PHOTO UPDATED & SYNCED!'
                    : '(UPLOAD FROM LOCAL GALLERY)'}
                </label>
                <input
                  ref={hudFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleHudAvatarSelected}
                  style={{ display: 'none' }}
                />
                <div className="nm-profile-avatar-row">
                  <button
                    type="button"
                    className="nm-avatar-preview-trigger"
                    onClick={() => hudFileInputRef.current?.click()}
                    title="Click to upload photo from your device gallery"
                  >
                    <img
                      src={myAvatarUrl || DEFAULT_HUMAN_AVATAR}
                      alt={myPlayerName}
                      className="nm-avatar-preview-img"
                    />
                    <span className="nm-avatar-camera-badge">
                      <Camera size={11} />
                    </span>
                  </button>

                  <div className="nm-avatar-actions-col">
                    <div className="nm-avatar-actions-btns">
                      <button
                        type="button"
                        className="nm-upload-photo-btn"
                        onClick={() => hudFileInputRef.current?.click()}
                      >
                        <Camera size={13} />
                        <span>CHOOSE FROM GALLERY</span>
                      </button>
                      {myAvatarUrl &&
                        myAvatarUrl !== DEFAULT_HUMAN_AVATAR && (
                          <button
                            type="button"
                            className="nm-reset-photo-btn"
                            onClick={() =>
                              onUpdateMyAvatar(DEFAULT_HUMAN_AVATAR)
                            }
                          >
                            <RotateCcw size={12} />
                            <span>RESET</span>
                          </button>
                        )}
                    </div>
                    <span className="nm-avatar-helper-hint">
                      Shown on your seat to all connected friends at the table
                    </span>
                  </div>
                </div>
              </div>

              <div className="lounge-input-group">
                <label>YOUR DISPLAY NAME (SHOWN TO ALL FRIENDS AT THE TABLE)</label>
                <div className="lounge-name-save-row">
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleNameChange(nickname);
                      }
                    }}
                    placeholder="Enter your name (e.g. Jithin, Rahul)..."
                    maxLength={16}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="home-save-name-btn"
                    onClick={() => handleNameChange(nickname)}
                  >
                    <Check size={13} />
                    <span>SAVE</span>
                  </button>
                </div>
              </div>

              {mpRole === 'offline' ? (
                <div className="lounge-split-actions">
                  {/* Host Box */}
                  <div className="lounge-action-box">
                    <h4>CREATE PRIVATE TABLE</h4>
                    <p>Starts a clean room with 0 bots—add bots manually if desired.</p>
                    <button
                      type="button"
                      className="lounge-primary-btn"
                      disabled={isBusy}
                      onClick={async () => {
                        const finalName = nickname.trim() || 'Host';
                        onUpdateMyName(finalName);
                        setIsBusy(true);
                        try {
                          await onHostOnlineRoom(finalName);
                        } finally {
                          setIsBusy(false);
                        }
                      }}
                    >
                      {isBusy ? 'CONNECTING...' : 'HOST ONLINE TABLE'}
                    </button>
                  </div>

                  {/* Join Box */}
                  <div className="lounge-action-box">
                    <h4>JOIN FRIEND'S CODE</h4>
                    <input
                      type="text"
                      className="room-code-input"
                      value={joinCodeInput}
                      onChange={(e) =>
                        setJoinCodeInput(e.target.value.toUpperCase())
                      }
                      placeholder="E.G. LUA2H"
                      maxLength={8}
                    />
                    <button
                      type="button"
                      className="lounge-secondary-btn"
                      disabled={isBusy || !joinCodeInput.trim()}
                      onClick={async () => {
                        const finalName =
                          nickname.trim() ||
                          `Player_${Math.floor(10 + Math.random() * 89)}`;
                        onUpdateMyName(finalName);
                        setIsBusy(true);
                        try {
                          await onJoinOnlineRoom(
                            joinCodeInput.trim(),
                            finalName
                          );
                          setShowRoomModal(false);
                        } finally {
                          setIsBusy(false);
                        }
                      }}
                    >
                      {isBusy ? 'JOINING...' : 'JOIN TABLE NOW'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="lounge-active-session-box">
                  <div className="session-code-banner">
                    <span className="session-label">ACTIVE ROOM CODE</span>
                    <span className="session-big-code">#{roomCode}</span>
                    <span className="session-status-pill">
                      PLAYING AS: {myPlayerName.toUpperCase()} • {mpStatusText}
                    </span>
                  </div>

                  <div className="session-buttons-row">
                    <button
                      type="button"
                      className="lounge-primary-btn"
                      onClick={handleCopyInvite}
                    >
                      {copiedLink ? <Check size={15} /> : <Copy size={15} />}
                      <span>
                        {copiedLink ? 'INVITE LINK COPIED!' : 'COPY INVITE LINK'}
                      </span>
                    </button>

                    <button
                      type="button"
                      className="lounge-secondary-btn"
                      onClick={() => setShowRoomModal(false)}
                    >
                      SAVE & RETURN
                    </button>

                    <button
                      type="button"
                      className="lounge-leave-btn"
                      onClick={() => {
                        onLeaveOnlineRoom();
                      }}
                    >
                      DISCONNECT
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FLOATING WILD COLOR SELECTOR ORBS OVER THE TABLE CENTER */}
      <AnimatePresence>
        {awaitingWildColor && (
          <motion.div
            key="wild-picker"
            className="wild-color-table-overlay"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
          >
            <div className="wild-picker-glass-ring">
              <div className="wild-picker-title">CHOOSE TABLE COLOR</div>
              <div className="wild-color-orbs-grid">
                {(['red', 'blue', 'green', 'yellow'] as ActiveColor[]).map(
                  (c) => (
                    <button
                      key={c}
                      type="button"
                      className={`wild-orb-choice orb-${c}`}
                      onClick={() => onSelectWildColor(c)}
                    >
                      <span className="orb-inner-core" />
                      <span className="orb-color-name">{c.toUpperCase()}</span>
                    </button>
                  )
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CINEMATIC FULL-STAGE ELIMINATION ANIMATION (25-CARD MERCY KO & 3-ROUND AFK TIMEOUT) */}
      <AnimatePresence>
        {activeElimination && (
          <motion.div
            key={activeElimination.id}
            className="elimination-cinema-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onDismissElimination}
          >
            {/* Expanding Crimson Shockwave Rings */}
            <motion.div
              className="elim-shockwave-ring ring-1"
              initial={{ scale: 0.25, opacity: 0.95 }}
              animate={{ scale: 2.35, opacity: 0 }}
              transition={{ duration: 1.4, ease: 'easeOut' }}
            />
            <motion.div
              className="elim-shockwave-ring ring-2"
              initial={{ scale: 0.2, opacity: 0.85 }}
              animate={{ scale: 1.85, opacity: 0 }}
              transition={{ duration: 1.1, delay: 0.15, ease: 'easeOut' }}
            />

            {/* Flying Shattered Cards Burst */}
            {[
              { x: -195, y: -115, r: -42 },
              { x: 195, y: -110, r: 38 },
              { x: -230, y: 35, r: -65 },
              { x: 230, y: 40, r: 62 },
              { x: -155, y: 140, r: -28 },
              { x: 160, y: 135, r: 34 },
            ].map((shard, idx) => (
              <motion.div
                key={idx}
                className="elim-flying-card-shard"
                initial={{ x: 0, y: 0, rotate: 0, scale: 0.4, opacity: 0 }}
                animate={{
                  x: shard.x,
                  y: shard.y,
                  rotate: shard.r,
                  scale: 1,
                  opacity: [0, 0.9, 0],
                }}
                transition={{ duration: 1.65, ease: 'easeOut' }}
              >
                <span>UNO</span>
              </motion.div>
            ))}

            {/* Main Elimination Broadcast Plaque */}
            <motion.div
              className="elimination-showcase-card"
              initial={{ scale: 0.65, y: 40, rotateX: 25 }}
              animate={{
                scale: [0.65, 1.06, 1],
                y: 0,
                rotateX: 0,
              }}
              exit={{ scale: 0.85, opacity: 0, y: -25 }}
              transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="elim-card-top-laser" />

              <div className="elim-header-tag">
                <Skull size={15} className="elim-skull-pulse" />
                <span>
                  {activeElimination.reason === 'afk_3_rounds'
                    ? 'INACTIVITY DISQUALIFICATION • 3 ROUNDS AFK'
                    : 'MERCY RULE KNOCKOUT • 25+ CARDS LIMIT'}
                </span>
                <Skull size={15} className="elim-skull-pulse" />
              </div>

              {/* Player Portrait with Slamming X Stamp */}
              <div className="elim-avatar-stage">
                <motion.div
                  className="elim-avatar-ring"
                  animate={{
                    x: [0, -8, 8, -6, 6, 0],
                  }}
                  transition={{ duration: 0.45, delay: 0.15 }}
                >
                  <img
                    src={activeElimination.avatarUrl || DEFAULT_HUMAN_AVATAR}
                    alt={activeElimination.playerName}
                    className="elim-avatar-img"
                  />
                </motion.div>

                <motion.div
                  className="elim-giant-x-stamp"
                  initial={{ scale: 2.8, opacity: 0, rotate: -20 }}
                  animate={{ scale: 1, opacity: 1, rotate: -8 }}
                  transition={{
                    type: 'spring',
                    stiffness: 420,
                    damping: 18,
                    delay: 0.22,
                  }}
                >
                  ✕
                </motion.div>

                <div className="elim-knockout-ribbon">ELIMINATED</div>
              </div>

              <h2 className="elim-player-name">
                {activeElimination.playerName.toUpperCase()}
              </h2>

              <p className="elim-reason-description">
                {activeElimination.reason === 'afk_3_rounds'
                  ? `${activeElimination.playerName} did not make a move for 3 rounds (1-minute timeout per turn) and has been eliminated from the table!`
                  : `${activeElimination.playerName} reached ${activeElimination.cardCount} cards (25-card No Mercy limit) and has been knocked out of the match!`}
              </p>

              <div className="elim-survivor-pill">
                <span>
                  {activeElimination.survivorsLeft === 1
                    ? '🏆 1 CHAMPION REMAINS AT THE TABLE!'
                    : `🔥 ${activeElimination.survivorsLeft} SURVIVORS REMAIN IN THE MATCH`}
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SUBTLE VICTORY / MERCY KNOCKOUT OVERLAY WHEN A ROUND COMPLETES */}
      <AnimatePresence>
        {winner && (
          <motion.div
            key="victory-modal"
            className="victory-table-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="victory-billiards-plaque"
              initial={{ y: 30, scale: 0.92 }}
              animate={{ y: 0, scale: 1 }}
            >
              <div className="victory-eyebrow">
                {winner.hand.length > 0
                  ? '💀 MERCY RULE (25+ CARDS ELIMINATION)'
                  : 'MATCH COMPLETE'}
              </div>
              <h2 className="victory-headline">
                {winner.seat === 'bottom'
                  ? winner.hand.length > 0
                    ? 'VICTORY BY KNOCKOUT!'
                    : 'VICTORY AT THE TABLE'
                  : winner.hand.length > 0
                  ? `KNOCKED OUT! ${winner.name.toUpperCase()} WINS`
                  : `${winner.name.toUpperCase()} WINS THE HAND`}
              </h2>
              <p className="victory-sub">
                {winner.seat === 'bottom'
                  ? winner.hand.length > 0
                    ? 'Every opponent reached 25+ cards and was knocked out by the Mercy Rule! (+250 KO Bonus)'
                    : 'You cleared your final card across the emerald felt.'
                  : winner.hand.length > 0
                  ? 'You reached 25 or more cards in your hand and were eliminated by the No Mercy Rule!'
                  : `${winner.name} emptied their hand first.`}
              </p>
              {mpRole !== 'client' && (
                <button
                  type="button"
                  className="victory-deal-btn"
                  onClick={onNewMatch}
                >
                  <RotateCcw size={16} />
                  <span>DEAL NEXT MATCH</span>
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
