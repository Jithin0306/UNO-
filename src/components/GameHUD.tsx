import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { ActiveColor, GameMode, Player } from '../types/uno';

interface GameHUDProps {
  mode: GameMode;
  sevenZeroRule: boolean;
  myPlayerName: string;
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

        {/* Top-Center: Table Format (1v1 / 1v3 / No Bots) & Game Mode */}
        <div className="hud-top-center-pills">
          {mpRole !== 'client' && (
            <div
              className="hud-bot-preset-group"
              title="Choose 1v1, 1v3, or No Bots (you can also click + ADD BOT on any seat)"
            >
              <Bot size={13} className="bot-preset-icon" />
              <button
                type="button"
                className={`bot-preset-chip ${
                  activeTotalPlayers === 2 && activeBotCount === 1
                    ? 'is-active'
                    : ''
                }`}
                onClick={() => onSetBotPreset('1v1')}
              >
                1v1
              </button>
              <button
                type="button"
                className={`bot-preset-chip ${
                  activeTotalPlayers === 4 ? 'is-active' : ''
                }`}
                onClick={() => onSetBotPreset('1v3')}
              >
                1v3
              </button>
              <button
                type="button"
                className={`bot-preset-chip ${
                  activeBotCount === 0 ? 'is-active' : ''
                }`}
                onClick={() => onSetBotPreset('no_bots')}
              >
                0 BOTS
              </button>
            </div>
          )}

          <button
            type="button"
            className={`hud-mode-pill ${mode === 'no_mercy' ? 'is-no-mercy' : ''}`}
            onClick={onToggleMode}
            disabled={mpRole === 'client'}
            title="Click to switch between UNO No Mercy and Classic UNO"
          >
            <span className="mode-badge-prefix">MODE</span>
            <span className="mode-badge-title">
              {mode === 'no_mercy' ? 'NO MERCY' : 'CLASSIC'}
            </span>
          </button>

          <button
            type="button"
            className={`hud-rule-pill ${sevenZeroRule ? 'rule-on' : 'rule-off'}`}
            onClick={onToggleSevenZero}
            disabled={mpRole === 'client'}
            title="Toggle 7-0 Swap & Rotate Rule"
          >
            <span>7-0: {sevenZeroRule ? 'ON' : 'OFF'}</span>
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
        {/* Left: Your Player Name Badge & Your Cards Count */}
        <div className="hud-bottom-left-meta">
          <button
            type="button"
            className="your-player-name-pill"
            onClick={() => setShowRoomModal(true)}
            title="Click to change your display name"
          >
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
        </div>

        {/* Center-Bottom: Integrated Turn Indicator above Player's Hand */}
        <div
          className={`table-integrated-turn-banner ${
            isPlayerTurn && activeTotalPlayers >= 2
              ? 'is-your-turn'
              : 'is-opponent-turn'
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
                  <h3>PRIVATE BILLIARDS LOUNGE • PLAYER & ROOM</h3>
                </div>
                <button
                  type="button"
                  className="lounge-close-btn"
                  onClick={() => setShowRoomModal(false)}
                >
                  ✕
                </button>
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
