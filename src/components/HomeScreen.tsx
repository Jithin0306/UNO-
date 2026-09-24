import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Zap,
  Settings,
  Globe,
  BookOpen,
  Check,
  Copy,
  ArrowLeft,
  Play,
  Users,
  ShieldAlert,
  Layers,
  Repeat,
  Sparkles,
} from 'lucide-react';
import { GameMode, UnoCardData } from '../types/uno';
import { UnoCard } from './UnoCard';

interface HomeScreenProps {
  savedName: string;
  mode: GameMode;
  sevenZeroRule: boolean;
  initialInviteCode: string;
  mpRole: 'offline' | 'host' | 'client';
  roomCode: string;
  connectedFriendsCount: number;
  mpStatusText: string;
  onSavePlayerName: (name: string) => void;
  onStartQuickPlay: (preset: '1v1' | '1v3' | 'no_bots') => void;
  onToggleMode: () => void;
  onToggleSevenZero: () => void;
  onHostOnlineRoom: (playerName: string) => Promise<string>;
  onJoinOnlineRoom: (roomCode: string, playerName: string) => Promise<void>;
  onEnterOnlineTable: () => void;
}

const SHOWCASE_FAN_CARDS: Array<{
  card: UnoCardData;
  rotate: number;
  offsetX: number;
  offsetY: number;
  zIndex: number;
}> = [
  {
    card: {
      id: 'showcase-red-7',
      color: 'red',
      value: '7',
      category: 'number',
    },
    rotate: -24,
    offsetX: -118,
    offsetY: 22,
    zIndex: 1,
  },
  {
    card: {
      id: 'showcase-green-skipall',
      color: 'green',
      value: 'skip_all',
      category: 'special',
    },
    rotate: -12,
    offsetX: -60,
    offsetY: 8,
    zIndex: 2,
  },
  {
    card: {
      id: 'showcase-wild-10',
      color: 'wild',
      value: 'wild_draw10',
      category: 'wild',
    },
    rotate: 0,
    offsetX: 0,
    offsetY: -4,
    zIndex: 5,
  },
  {
    card: {
      id: 'showcase-wild-roulette',
      color: 'wild',
      value: 'wild_color_roulette',
      category: 'wild',
    },
    rotate: 12,
    offsetX: 60,
    offsetY: 8,
    zIndex: 3,
  },
  {
    card: {
      id: 'showcase-blue-draw4',
      color: 'blue',
      value: 'draw4',
      category: 'special',
    },
    rotate: 24,
    offsetX: 118,
    offsetY: 22,
    zIndex: 1,
  },
];

export const HomeScreen: React.FC<HomeScreenProps> = ({
  savedName,
  mode,
  sevenZeroRule,
  initialInviteCode,
  mpRole,
  roomCode,
  connectedFriendsCount,
  mpStatusText,
  onSavePlayerName,
  onStartQuickPlay,
  onToggleMode,
  onToggleSevenZero,
  onHostOnlineRoom,
  onJoinOnlineRoom,
  onEnterOnlineTable,
}) => {
  const [nameInput, setNameInput] = useState(
    savedName && savedName !== 'Player 1' ? savedName : 'Commander'
  );
  const [nameSavedToast, setNameSavedToast] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'main' | 'custom' | 'online' | 'rules'
  >(initialInviteCode ? 'online' : 'main');
  const [customPreset, setCustomPreset] = useState<'1v1' | '1v3' | 'no_bots'>(
    '1v1'
  );
  const [joinCodeInput, setJoinCodeInput] = useState(
    initialInviteCode ? initialInviteCode.toUpperCase() : ''
  );
  const [copiedLink, setCopiedLink] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (initialInviteCode) {
      setJoinCodeInput(initialInviteCode.toUpperCase());
      setActiveTab('online');
    }
  }, [initialInviteCode]);

  const commitNameSave = (): string => {
    const clean = nameInput.trim() || savedName || 'Commander';
    setNameInput(clean);
    onSavePlayerName(clean);
    setNameSavedToast(true);
    window.setTimeout(() => setNameSavedToast(false), 1800);
    return clean;
  };

  const handleCopyInvite = () => {
    if (!roomCode) return;
    const url = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="nm-home-backdrop">
      {/* Translucent Radial Vignette so the 3D Emerald Billiards Table Shines Through */}
      <div className="nm-aura-crimson" />
      <div className="nm-aura-emerald" />

      <motion.div
        className="nm-showcase-shell"
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* ============================================================
            LEFT COLUMN: OFFICIAL BRAND EMBLEM + 3D PHYSICAL CARD FAN
           ============================================================ */}
        <div className="nm-left-showcase">
          {/* Layered UNO + SHOW 'EM + NO MERCY Emblem */}
          <div className="nm-emblem-stack">
            <div className="nm-uno-tilted-pill">
              <span>UNO</span>
            </div>
            <div className="nm-show-em-badge">SHOW &apos;EM</div>
            <div className="nm-title-wrapper">
              <span className="nm-title-bloom" aria-hidden="true">
                NO MERCY
              </span>
              <h1 className="nm-title-main">NO MERCY</h1>
            </div>
            <div className="nm-subtitle">NO APOLOGIES. NO LIMITS.</div>
          </div>

          {/* 3D Fanned Physical UNO Cards */}
          <div className="nm-physical-fan-stage" aria-hidden="true">
            <div className="nm-fan-glow-ring" />
            {SHOWCASE_FAN_CARDS.map((item, idx) => (
              <motion.div
                key={item.card.id}
                className="nm-fan-card-wrapper"
                style={{
                  zIndex: item.zIndex,
                }}
                initial={{
                  opacity: 0,
                  y: 40,
                  x: 0,
                  rotate: 0,
                }}
                animate={{
                  opacity: 1,
                  x: item.offsetX,
                  y: [item.offsetY, item.offsetY - 7, item.offsetY],
                  rotate: item.rotate,
                }}
                transition={{
                  opacity: { duration: 0.35, delay: idx * 0.06 },
                  x: { duration: 0.45, delay: idx * 0.06, type: 'spring' },
                  rotate: { duration: 0.45, delay: idx * 0.06, type: 'spring' },
                  y: {
                    duration: 3.6 + idx * 0.3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  },
                }}
              >
                <UnoCard
                  card={item.card}
                  size="md"
                  playable={item.card.value === 'wild_draw10'}
                />
              </motion.div>
            ))}
          </div>

          {/* Official Mattel No Mercy Rulebook Highlights */}
          <div className="nm-rule-badges-grid">
            <div className="nm-mini-feature">
              <ShieldAlert size={14} className="nm-feat-icon-rose" />
              <div>
                <strong>25-Card Mercy KO</strong>
                <span>Hold 25+ cards and you&apos;re eliminated</span>
              </div>
            </div>

            <div className="nm-mini-feature">
              <Layers size={14} className="nm-feat-icon-amber" />
              <div>
                <strong>Stack +2 to +10</strong>
                <span>Stack equal or higher Draw cards</span>
              </div>
            </div>

            <div className="nm-mini-feature">
              <Repeat size={14} className="nm-feat-icon-cyan" />
              <div>
                <strong>7 Swap &amp; 0 Pass</strong>
                <span>Swap hands on 7, rotate all on 0</span>
              </div>
            </div>

            <div className="nm-mini-feature">
              <Sparkles size={14} className="nm-feat-icon-emerald" />
              <div>
                <strong>Draw Until Playable</strong>
                <span>Draw cards until you can play</span>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================
            RIGHT COLUMN: INTERACTIVE GLASS LAUNCH CONSOLE
           ============================================================ */}
        <div className="nm-glass-card">
          <div className="nm-glass-top-highlight" />

          {/* PLAYER NAME CAPSULE WITH INTEGRATED SAVE BUTTON */}
          <div className="nm-profile-block">
            <div className="nm-profile-label-row">
              <span>PLAYER IDENTITY</span>
              <span className="nm-profile-status">
                {nameSavedToast
                  ? '✓ NAME SAVED & SYNCED'
                  : `ACTIVE: ${(nameInput.trim() || savedName || 'Commander').toUpperCase()}`}
              </span>
            </div>

            <div className="nm-profile-input-capsule">
              <User size={15} className="nm-profile-icon" />
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitNameSave();
                }}
                placeholder="Enter your player name..."
                maxLength={16}
                aria-label="Player Name"
              />
              <button
                type="button"
                className={`nm-profile-save-btn ${
                  nameSavedToast ? 'is-saved' : ''
                }`}
                onClick={commitNameSave}
              >
                {nameSavedToast ? (
                  <>
                    <Check size={12} strokeWidth={3} />
                    <span>SAVED</span>
                  </>
                ) : (
                  <span>SAVE</span>
                )}
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* ============================================================
                MAIN MENU STACK
               ============================================================ */}
            {activeTab === 'main' && (
              <motion.div
                key="nm-tab-main"
                className="nm-menu-stack"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                {/* 1. QUICK PLAY 1v1 DUEL (Featured Crimson-Rose Hero Button) */}
                <button
                  type="button"
                  className="nm-mode-card nm-mode-primary"
                  onClick={() => {
                    commitNameSave();
                    onStartQuickPlay('1v1');
                  }}
                >
                  <div className="nm-mode-card-left">
                    <div className="nm-mode-icon-box box-crimson">
                      <Zap size={18} fill="currentColor" />
                    </div>
                    <div className="nm-mode-text">
                      <span className="nm-mode-title">
                        QUICK PLAY • 1v1 DUEL
                      </span>
                      <span className="nm-mode-desc">
                        Heads-up No Mercy battle against 1 AI opponent
                      </span>
                    </div>
                  </div>
                  <span className="nm-mode-cta-pill">PLAY</span>
                </button>

                {/* 2. 1v3 FULL TABLE (4-Player Chaos) */}
                <button
                  type="button"
                  className="nm-mode-card nm-mode-emerald"
                  onClick={() => {
                    commitNameSave();
                    onStartQuickPlay('1v3');
                  }}
                >
                  <div className="nm-mode-card-left">
                    <div className="nm-mode-icon-box box-emerald">
                      <Users size={18} />
                    </div>
                    <div className="nm-mode-text">
                      <span className="nm-mode-title">
                        FULL TABLE • 1v3 CHAOS
                      </span>
                      <span className="nm-mode-desc">
                        4-player table with 0&apos;s Pass, 7&apos;s Swap &amp; +10 stacks
                      </span>
                    </div>
                  </div>
                  <span className="nm-mode-cta-pill pill-outline">4 SEATS</span>
                </button>

                {/* 3. WEBRTC P2P ONLINE ROOM */}
                <button
                  type="button"
                  className="nm-mode-card nm-mode-slate"
                  onClick={() => {
                    commitNameSave();
                    setActiveTab('online');
                  }}
                >
                  <div className="nm-mode-card-left">
                    <div className="nm-mode-icon-box box-cyan">
                      <Globe size={18} />
                    </div>
                    <div className="nm-mode-text">
                      <span className="nm-mode-title">
                        PLAY WITH FRIENDS (ONLINE P2P)
                      </span>
                      <span className="nm-mode-desc">
                        Host a private 0-bot room or join with a 5-letter code
                      </span>
                    </div>
                  </div>
                  <span className="nm-mode-cta-pill pill-cyan">
                    {mpRole !== 'offline' ? `#${roomCode}` : 'LOBBY'}
                  </span>
                </button>

                {/* 4. BOTTOM DUAL UTILITY ROW: CUSTOM SETUP & OFFICIAL RULEBOOK */}
                <div className="nm-dual-row">
                  <button
                    type="button"
                    className="nm-utility-btn"
                    onClick={() => {
                      commitNameSave();
                      setActiveTab('custom');
                    }}
                  >
                    <Settings size={15} className="nm-icon-violet" />
                    <span>CUSTOM MATCH</span>
                  </button>

                  <button
                    type="button"
                    className="nm-utility-btn"
                    onClick={() => setActiveTab('rules')}
                  >
                    <BookOpen size={15} className="nm-icon-amber" />
                    <span>OFFICIAL RULEBOOK</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* ============================================================
                CUSTOM MATCH SUBPANEL
               ============================================================ */}
            {activeTab === 'custom' && (
              <motion.div
                key="nm-tab-custom"
                className="nm-subpanel"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.18 }}
              >
                <div className="nm-subpanel-head">
                  <button
                    type="button"
                    className="nm-back-btn"
                    onClick={() => setActiveTab('main')}
                  >
                    <ArrowLeft size={14} />
                    <span>BACK</span>
                  </button>
                  <span className="nm-subpanel-title">CUSTOM TABLE SETUP</span>
                </div>

                <div className="nm-field-group">
                  <label>OPPONENT SEATS &amp; BOTS</label>
                  <div className="nm-segmented">
                    <button
                      type="button"
                      className={`nm-seg-item ${
                        customPreset === '1v1' ? 'active' : ''
                      }`}
                      onClick={() => setCustomPreset('1v1')}
                    >
                      1v1 (1 BOT)
                    </button>
                    <button
                      type="button"
                      className={`nm-seg-item ${
                        customPreset === '1v3' ? 'active' : ''
                      }`}
                      onClick={() => setCustomPreset('1v3')}
                    >
                      1v3 (3 BOTS)
                    </button>
                    <button
                      type="button"
                      className={`nm-seg-item ${
                        customPreset === 'no_bots' ? 'active' : ''
                      }`}
                      onClick={() => setCustomPreset('no_bots')}
                    >
                      0 BOTS
                    </button>
                  </div>
                </div>

                <div className="nm-field-group">
                  <label>OFFICIAL DECK EDITION</label>
                  <div className="nm-segmented">
                    <button
                      type="button"
                      className={`nm-seg-item ${
                        mode === 'no_mercy' ? 'active' : ''
                      }`}
                      onClick={() => {
                        if (mode !== 'no_mercy') onToggleMode();
                      }}
                    >
                      NO MERCY (168 CARDS / 25 KO)
                    </button>
                    <button
                      type="button"
                      className={`nm-seg-item ${
                        mode === 'classic' ? 'active' : ''
                      }`}
                      onClick={() => {
                        if (mode !== 'classic') onToggleMode();
                      }}
                    >
                      CLASSIC UNO
                    </button>
                  </div>
                </div>

                <div className="nm-field-group">
                  <label>7&apos;S SWAP &amp; 0&apos;S PASS</label>
                  <div className="nm-segmented">
                    <button
                      type="button"
                      className={`nm-seg-item ${sevenZeroRule ? 'active' : ''}`}
                      onClick={() => {
                        if (!sevenZeroRule) onToggleSevenZero();
                      }}
                    >
                      ENABLED
                    </button>
                    <button
                      type="button"
                      className={`nm-seg-item ${
                        !sevenZeroRule ? 'active' : ''
                      }`}
                      onClick={() => {
                        if (sevenZeroRule) onToggleSevenZero();
                      }}
                    >
                      DISABLED
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  className="nm-btn nm-btn-crimson"
                  onClick={() => {
                    commitNameSave();
                    onStartQuickPlay(customPreset);
                  }}
                >
                  <Play size={15} fill="currentColor" />
                  <span>LAUNCH CUSTOM TABLE</span>
                </button>
              </motion.div>
            )}

            {/* ============================================================
                WEBRTC P2P ROOM SUBPANEL
               ============================================================ */}
            {activeTab === 'online' && (
              <motion.div
                key="nm-tab-online"
                className="nm-subpanel"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.18 }}
              >
                <div className="nm-subpanel-head">
                  <button
                    type="button"
                    className="nm-back-btn"
                    onClick={() => setActiveTab('main')}
                  >
                    <ArrowLeft size={14} />
                    <span>BACK</span>
                  </button>
                  <span className="nm-subpanel-title">WEBRTC P2P ROOM</span>
                </div>

                {mpRole === 'offline' ? (
                  <div className="nm-online-stack">
                    <div className="nm-online-section">
                      <span className="nm-section-caption">
                        HOST A PRIVATE ROOM (STARTS WITH 0 BOTS FOR FRIENDS)
                      </span>
                      <button
                        type="button"
                        className="nm-btn nm-btn-crimson"
                        disabled={isBusy}
                        onClick={async () => {
                          const finalName = commitNameSave();
                          setErrorMsg('');
                          setIsBusy(true);
                          try {
                            await onHostOnlineRoom(finalName);
                          } catch (err: any) {
                            setErrorMsg(err?.message || 'Could not host room');
                          } finally {
                            setIsBusy(false);
                          }
                        }}
                      >
                        <Users size={16} />
                        <span>
                          {isBusy ? 'CREATING ROOM...' : 'HOST PRIVATE ROOM'}
                        </span>
                      </button>
                    </div>

                    <div className="nm-divider-line">
                      <span>OR JOIN WITH CODE</span>
                    </div>

                    <div className="nm-online-section">
                      <span className="nm-section-caption">
                        ENTER FRIEND&apos;S 5-CHARACTER ROOM CODE
                      </span>
                      <div className="nm-join-bar">
                        <input
                          type="text"
                          className="nm-code-input"
                          value={joinCodeInput}
                          onChange={(e) =>
                            setJoinCodeInput(e.target.value.toUpperCase())
                          }
                          placeholder="CODE (e.g. A8K2P)"
                          maxLength={8}
                        />
                        <button
                          type="button"
                          className="nm-join-submit-btn"
                          disabled={isBusy || !joinCodeInput.trim()}
                          onClick={async () => {
                            const finalName = commitNameSave();
                            setErrorMsg('');
                            setIsBusy(true);
                            try {
                              await onJoinOnlineRoom(
                                joinCodeInput.trim(),
                                finalName
                              );
                            } catch (err: any) {
                              setErrorMsg(
                                err?.message || 'Could not connect to Host'
                              );
                            } finally {
                              setIsBusy(false);
                            }
                          }}
                        >
                          {isBusy ? '...' : 'JOIN'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="nm-lobby-active-card">
                    <span className="nm-lobby-tag">
                      {mpRole === 'host'
                        ? 'ROOM ACTIVE • SHARE CODE WITH FRIENDS'
                        : 'CONNECTED TO P2P ROOM'}
                    </span>
                    <div className="nm-lobby-code">#{roomCode}</div>
                    <div className="nm-lobby-meta">
                      {mpStatusText} • {connectedFriendsCount + 1} Player(s)
                      Ready
                    </div>

                    <div className="nm-lobby-actions">
                      {mpRole === 'host' && (
                        <button
                          type="button"
                          className="nm-btn nm-btn-slate"
                          onClick={handleCopyInvite}
                        >
                          {copiedLink ? (
                            <Check size={15} />
                          ) : (
                            <Copy size={15} />
                          )}
                          <span>
                            {copiedLink
                              ? 'INVITE LINK COPIED!'
                              : 'COPY INVITE LINK'}
                          </span>
                        </button>
                      )}
                      <button
                        type="button"
                        className="nm-btn nm-btn-crimson"
                        onClick={() => {
                          commitNameSave();
                          onEnterOnlineTable();
                        }}
                      >
                        <Play size={15} fill="currentColor" />
                        <span>ENTER GAME TABLE</span>
                      </button>
                    </div>
                  </div>
                )}

                {errorMsg && <div className="nm-error-box">{errorMsg}</div>}
              </motion.div>
            )}

            {/* ============================================================
                OFFICIAL MATTEL RULEBOOK & ACTION CARDS SUBPANEL
               ============================================================ */}
            {activeTab === 'rules' && (
              <motion.div
                key="nm-tab-rules"
                className="nm-subpanel"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.18 }}
              >
                <div className="nm-subpanel-head">
                  <button
                    type="button"
                    className="nm-back-btn"
                    onClick={() => setActiveTab('main')}
                  >
                    <ArrowLeft size={14} />
                    <span>BACK</span>
                  </button>
                  <span className="nm-subpanel-title">
                    OFFICIAL SHOW &apos;EM NO MERCY RULES
                  </span>
                </div>

                <div className="nm-rules-cards-list">
                  <div className="nm-rule-item">
                    <span className="nm-rule-pill pill-rose">MERCY KO</span>
                    <div>
                      <strong>25+ Cards Elimination Rule</strong>
                      <p>
                        If any player ever reaches 25 or more cards in their
                        hand, they are immediately knocked out! Last player
                        standing wins (+250 KO Bonus).
                      </p>
                    </div>
                  </div>

                  <div className="nm-rule-item">
                    <span className="nm-rule-pill pill-emerald">DRAW RULE</span>
                    <div>
                      <strong>Draw Until You Can Play</strong>
                      <p>
                        If you do not have a matching card on your turn, you
                        must draw from the Draw Pile until you draw a playable
                        card (or hit 25 cards!).
                      </p>
                    </div>
                  </div>

                  <div className="nm-rule-item">
                    <span className="nm-rule-pill pill-amber">STACKING</span>
                    <div>
                      <strong>Stacking (+2, +4, +6, +10)</strong>
                      <p>
                        Stack any Draw Card of equal or higher value to add to
                        the total penalty and pass it to the next player.
                      </p>
                    </div>
                  </div>

                  <div className="nm-rule-item">
                    <span className="nm-rule-pill pill-cyan">ROULETTE</span>
                    <div>
                      <strong>Wild Color Roulette &amp; 7-0 Rules</strong>
                      <p>
                        Color Roulette forces the next player to flip cards
                        until they reveal the chosen color. 7 swaps hands; 0
                        passes all hands!
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
