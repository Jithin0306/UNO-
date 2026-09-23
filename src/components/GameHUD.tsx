import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, RotateCcw, Users, Copy, Check, Wifi } from 'lucide-react';
import { ActiveColor, GameMode, Player } from '../types/uno';

interface GameHUDProps {
  mode: GameMode;
  sevenZeroRule: boolean;
  activePlayer: Player;
  playerCardCount: number;
  isPlayerTurn: boolean;
  hasCalledUno: boolean;
  muted: boolean;
  awaitingWildColor: boolean;
  awaitingSevenSwap: boolean;
  winner: Player | null;
  mpRole: 'offline' | 'host' | 'client';
  roomCode: string;
  connectedFriendsCount: number;
  mpStatusText: string;
  onHostOnlineRoom: (playerName: string) => Promise<string>;
  onJoinOnlineRoom: (roomCode: string, playerName: string) => Promise<void>;
  onLeaveOnlineRoom: () => void;
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
  activePlayer,
  playerCardCount,
  isPlayerTurn,
  hasCalledUno,
  muted,
  awaitingWildColor,
  awaitingSevenSwap,
  winner,
  mpRole,
  roomCode,
  connectedFriendsCount,
  mpStatusText,
  onHostOnlineRoom,
  onJoinOnlineRoom,
  onLeaveOnlineRoom,
  onToggleMode,
  onToggleSevenZero,
  onToggleMute,
  onCallUno,
  onDrawCard,
  onSelectWildColor,
  onNewMatch,
}) => {
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [nickname, setNickname] = useState('Player');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const turnText = isPlayerTurn
    ? 'YOUR TURN'
    : `${activePlayer.name.toUpperCase()}'S TURN`;

  const handleCopyInvite = () => {
    if (!roomCode) return;
    const url = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <>
      {/* TOP MINIMAL BAR: Top-Left Online Room Button, Top-Center Mode Info, Top-Right [ Exit ] */}
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
              ? `ROOM #${roomCode} (${connectedFriendsCount + 1}/4 ONLINE)`
              : mpRole === 'client'
              ? `JOINED #${roomCode}`
              : 'PLAY WITH FRIENDS • ONLINE ROOM'}
          </span>
        </button>

        {/* Top-Center: Game Mode / Room Information */}
        <div className="hud-top-center-pills">
          <button
            type="button"
            className={`hud-mode-pill ${mode === 'no_mercy' ? 'is-no-mercy' : ''}`}
            onClick={onToggleMode}
            disabled={mpRole === 'client'}
            title="Click to switch between UNO No Mercy and Classic UNO"
          >
            <span className="mode-badge-prefix">MODE</span>
            <span className="mode-badge-title">
              {mode === 'no_mercy' ? 'UNO NO MERCY (+6 / +10)' : 'CLASSIC UNO'}
            </span>
          </button>

          <button
            type="button"
            className={`hud-rule-pill ${sevenZeroRule ? 'rule-on' : 'rule-off'}`}
            onClick={onToggleSevenZero}
            disabled={mpRole === 'client'}
            title="Toggle 7-0 Swap & Rotate Rule"
          >
            <span>7-0 RULE: {sevenZeroRule ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* Top-Right: Mute & [ Exit ] */}
        <div className="hud-top-right-actions">
          <button
            type="button"
            className="hud-icon-btn"
            onClick={onToggleMute}
            aria-label={muted ? 'Unmute Audio' : 'Mute Audio'}
            title={muted ? 'Unmute Table Audio' : 'Mute Table Audio'}
          >
            {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          <button
            type="button"
            className="hud-exit-bracket-btn"
            onClick={onNewMatch}
            title="Reset Table / Deal New Match"
          >
            <span className="bracket-char">[</span>
            <span className="exit-word">EXIT</span>
            <span className="bracket-char">]</span>
          </button>
        </div>
      </header>

      {/* BOTTOM FOREGROUND CONTROLS INTEGRATED INTO THE TABLE */}
      <div className="hud-bottom-table-bar">
        {/* Left: Your Cards Count & Hand Legend */}
        <div className="hud-bottom-left-meta">
          <div className="your-cards-counter-pill">
            <span className="counter-caption">Your Cards:</span>
            <span className="counter-value">{playerCardCount}</span>
          </div>
          <div
            className="sorting-order-micro-hint"
            title="Hand automatically sorted by color group (Red → Blue → Green → Yellow → Wild), Numbers before Specials"
          >
            <span className="pip pip-red" />
            <span className="pip pip-blue" />
            <span className="pip pip-green" />
            <span className="pip pip-yellow" />
            <span className="pip pip-wild" />
            <span className="hint-text">AUTO-SORTED</span>
          </div>
        </div>

        {/* Center-Bottom: Integrated Turn Indicator above Player's Hand */}
        <div
          className={`table-integrated-turn-banner ${
            isPlayerTurn ? 'is-your-turn' : 'is-opponent-turn'
          }`}
        >
          <span className="turn-wing left-wing" />
          <span className="turn-indicator-label">
            {awaitingWildColor
              ? 'SELECT ACTIVE COLOR'
              : awaitingSevenSwap
              ? 'SELECT PLAYER TO SWAP HANDS'
              : turnText}
          </span>
          <span className="turn-wing right-wing" />
        </div>

        {/* Right: UNO Button & DRAW Button */}
        <div className="hud-bottom-right-controls">
          <button
            type="button"
            className={`table-action-btn btn-uno ${
              playerCardCount <= 2 && !hasCalledUno ? 'uno-ready-pulse' : ''
            } ${hasCalledUno ? 'uno-called' : ''}`}
            onClick={onCallUno}
          >
            <span>{hasCalledUno ? 'UNO CALLED!' : 'UNO'}</span>
          </button>

          <button
            type="button"
            className={`table-action-btn btn-draw ${
              isPlayerTurn ? 'can-draw' : 'disabled'
            }`}
            disabled={!isPlayerTurn || awaitingWildColor || awaitingSevenSwap}
            onClick={onDrawCard}
          >
            <span>DRAW</span>
          </button>
        </div>
      </div>

      {/* ONLINE MULTIPLAYER FRIENDS LOUNGE MODAL */}
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
                  <h3>PRIVATE BILLIARDS LOUNGE • ONLINE P2P</h3>
                </div>
                <button
                  type="button"
                  className="lounge-close-btn"
                  onClick={() => setShowRoomModal(false)}
                >
                  ✕
                </button>
              </div>

              <p className="lounge-desc">
                Host a live table to generate a 5-character Room Code (and instant
                invite link). Up to 3 friends can join your table from any browser
                — open seats automatically stay filled by smart AI bots.
              </p>

              <div className="lounge-input-group">
                <label>YOUR TABLE NAME</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Enter your display name..."
                  maxLength={14}
                />
              </div>

              {mpRole === 'offline' ? (
                <div className="lounge-split-actions">
                  {/* Host Box */}
                  <div className="lounge-action-box">
                    <h4>CREATE PRIVATE TABLE</h4>
                    <p>Start hosting and share your Room Code with friends.</p>
                    <button
                      type="button"
                      className="lounge-primary-btn"
                      disabled={isBusy}
                      onClick={async () => {
                        setIsBusy(true);
                        try {
                          await onHostOnlineRoom(nickname || 'Host');
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
                      placeholder="E.G. 804XK"
                      maxLength={8}
                    />
                    <button
                      type="button"
                      className="lounge-secondary-btn"
                      disabled={isBusy || !joinCodeInput.trim()}
                      onClick={async () => {
                        setIsBusy(true);
                        try {
                          await onJoinOnlineRoom(
                            joinCodeInput.trim(),
                            nickname || 'Guest'
                          );
                          setShowRoomModal(false);
                        } finally {
                          setIsBusy(false);
                        }
                      }}
                    >
                      {isBusy ? 'JOINING...' : 'JOIN TABLE'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="lounge-active-session-box">
                  <div className="session-code-banner">
                    <span className="session-label">ACTIVE ROOM CODE</span>
                    <span className="session-big-code">#{roomCode}</span>
                    <span className="session-status-pill">{mpStatusText}</span>
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

      {/* SUBTLE VICTORY OVERLAY WHEN A ROUND COMPLETES */}
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
              <div className="victory-eyebrow">MATCH COMPLETE</div>
              <h2 className="victory-headline">
                {winner.seat === 'bottom'
                  ? 'VICTORY AT THE TABLE'
                  : `${winner.name.toUpperCase()} WINS THE HAND`}
              </h2>
              <p className="victory-sub">
                {winner.seat === 'bottom'
                  ? 'You cleared your final card across the emerald felt.'
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
