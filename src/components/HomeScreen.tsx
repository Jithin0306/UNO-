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
  Sparkles,
  ShieldAlert,
  Crown,
  Flame,
  Swords,
  Layers,
} from 'lucide-react';
import { GameMode } from '../types/uno';

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
    savedName && savedName !== 'Player 1' ? savedName : ''
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
    window.setTimeout(() => setNameSavedToast(false), 2000);
    return clean;
  };

  const handleCopyInvite = () => {
    if (!roomCode) return;
    const url = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const displayAvatarSeed = encodeURIComponent(
    nameInput.trim() || savedName || 'Commander'
  );

  return (
    <div className="home-screen-overlay">
      {/* Overhead Billiards Lamp Cone & Ambient Felt Glow */}
      <div className="home-lamp-cone" />
      <div className="home-ambient-glow" />
      <div className="home-felt-grid-pattern" />

      <motion.div
        className="home-vip-stage"
        initial={{ opacity: 0, y: 22, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* ============================================================
            HERO CREST WITH 3D FANNED PHYSICAL UNO CARDS
           ============================================================ */}
        <div className="home-hero-showcase">
          {/* 3D Fanned Physical Cards Behind Crest */}
          <div className="home-fanned-cards-crown" aria-hidden="true">
            <motion.div
              className="hero-showcase-card hcard-left-far card-red"
              animate={{ y: [0, -5, 0], rotate: [-28, -30, -28] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <span className="hcard-corner">7</span>
              <div className="hcard-oval">7</div>
            </motion.div>

            <motion.div
              className="hero-showcase-card hcard-left-mid card-green"
              animate={{ y: [0, -7, 0], rotate: [-14, -15, -14] }}
              transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
            >
              <span className="hcard-corner">⇄</span>
              <div className="hcard-oval">⇄</div>
            </motion.div>

            <motion.div
              className="hero-showcase-card hcard-center card-wild-ten"
              animate={{ y: [0, -9, 0], scale: [1, 1.03, 1] }}
              transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut', delay: 0.1 }}
            >
              <span className="hcard-corner">+10</span>
              <div className="hcard-oval hcard-wild-oval">+10</div>
              <div className="hcard-foil-glint" />
            </motion.div>

            <motion.div
              className="hero-showcase-card hcard-right-mid card-blue"
              animate={{ y: [0, -7, 0], rotate: [14, 15, 14] }}
              transition={{ duration: 4.1, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
            >
              <span className="hcard-corner">0</span>
              <div className="hcard-oval">0</div>
            </motion.div>

            <motion.div
              className="hero-showcase-card hcard-right-far card-yellow"
              animate={{ y: [0, -5, 0], rotate: [28, 30, 28] }}
              transition={{ duration: 4.7, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
            >
              <span className="hcard-corner">+4</span>
              <div className="hcard-oval">+4</div>
            </motion.div>
          </div>

          {/* Series Ribbon Badge */}
          <div className="home-series-ribbon">
            <Crown size={12} className="ribbon-crown-icon" />
            <span>UNO ROYALE • HIGH-STAKES BILLIARDS EDITION</span>
            <Crown size={12} className="ribbon-crown-icon" />
          </div>

          {/* Metallic Gold & Crimson Hero Title */}
          <h1 className="home-hero-title" data-text="NO MERCY">
            NO MERCY
          </h1>

          <div className="home-hero-subtitle-row">
            <span className="brass-wing-line" />
            <span className="home-hero-subtitle">NO APOLOGIES. NO LIMITS.</span>
            <span className="brass-wing-line" />
          </div>

          <p className="home-hero-tagline">
            Stack brutal <strong className="text-gold">+10</strong> penalties, swap hands on{' '}
            <strong className="text-gold">7</strong>, rotate all decks on{' '}
            <strong className="text-gold">0</strong>, and knock out anyone who hits{' '}
            <strong className="text-crimson">25+ cards</strong>.
          </p>
        </div>

        {/* ============================================================
            MAHOGANY & BRASS VIP LOUNGE CONSOLE
           ============================================================ */}
        <div className="home-mahogany-frame">
          {/* Four Corner Brass Pocket Rivets */}
          <span className="brass-corner-rivet rivet-tl" />
          <span className="brass-corner-rivet rivet-tr" />
          <span className="brass-corner-rivet rivet-bl" />
          <span className="brass-corner-rivet rivet-br" />

          <div className="home-menu-card">
            {/* VIP PLAYER IDENTITY PASS (Name Input + Explicit SAVE Button) */}
            <div className="home-vip-pass-bar">
              <div className="vip-pass-header">
                <div className="vip-pass-label">
                  <Sparkles size={12} className="text-gold" />
                  <span>TABLE SEAT IDENTITY</span>
                </div>
                <div className="vip-pass-sync-pill">
                  <span className={`sync-dot ${nameSavedToast ? 'pulse-green' : ''}`} />
                  <span>
                    {nameSavedToast
                      ? 'NAME LOCKED & SYNCED'
                      : `PLAYING AS: ${(nameInput.trim() || savedName || 'COMMANDER').toUpperCase()}`}
                  </span>
                </div>
              </div>

              <div className="home-name-row">
                <div className="vip-avatar-badge">
                  <img
                    src={`https://api.dicebear.com/7.x/bottts/svg?seed=${displayAvatarSeed}`}
                    alt="Player Avatar"
                  />
                </div>

                <div className="home-name-input-wrap">
                  <User size={15} className="home-input-icon" />
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitNameSave();
                    }}
                    placeholder="Enter your display name..."
                    maxLength={16}
                  />
                </div>

                <button
                  type="button"
                  className={`home-save-name-btn ${nameSavedToast ? 'is-saved' : ''}`}
                  onClick={commitNameSave}
                >
                  {nameSavedToast ? (
                    <>
                      <Check size={14} />
                      <span>SAVED</span>
                    </>
                  ) : (
                    <span>SAVE NAME</span>
                  )}
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {/* ============================================================
                  MAIN BENTO MENU TAB
                 ============================================================ */}
              {activeTab === 'main' && (
                <motion.div
                  key="tab-main"
                  className="home-bento-layout"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* PRIMARY HERO CTA: 1v1 QUICK PLAY */}
                  <button
                    type="button"
                    className="bento-hero-play-card"
                    onClick={() => {
                      commitNameSave();
                      onStartQuickPlay('1v1');
                    }}
                  >
                    <div className="bento-hero-left">
                      <div className="bento-hero-badge">
                        <Flame size={12} />
                        <span>INSTANT ACTION • HEADS-UP DUEL</span>
                      </div>
                      <div className="bento-hero-heading">
                        QUICK PLAY (1v1 VS BOT)
                      </div>
                      <div className="bento-hero-desc">
                        Jump straight onto the emerald table against 1 high-stakes AI opponent.
                      </div>
                    </div>

                    <div className="bento-hero-cta-circle">
                      <Play size={20} fill="currentColor" />
                      <span>DEAL</span>
                    </div>
                  </button>

                  {/* 2-COLUMN MODE SELECTION GRID */}
                  <div className="bento-grid-row">
                    {/* 1v3 FULL TABLE */}
                    <button
                      type="button"
                      className="bento-tile-card tile-emerald"
                      onClick={() => {
                        commitNameSave();
                        onStartQuickPlay('1v3');
                      }}
                    >
                      <div className="bento-tile-top">
                        <div className="bento-tile-icon icon-gold">
                          <Swords size={18} />
                        </div>
                        <span className="bento-tile-tag">4 SEATS</span>
                      </div>
                      <div className="bento-tile-title">1v3 FULL TABLE</div>
                      <div className="bento-tile-sub">
                        Battle 3 AI Sharks simultaneously with full table rotation & chaos.
                      </div>
                    </button>

                    {/* WEBRTC P2P MULTIPLAYER */}
                    <button
                      type="button"
                      className="bento-tile-card tile-royal"
                      onClick={() => {
                        commitNameSave();
                        setActiveTab('online');
                      }}
                    >
                      <div className="bento-tile-top">
                        <div className="bento-tile-icon icon-emerald">
                          <Globe size={18} />
                        </div>
                        <span className="bento-tile-tag tag-live">
                          {mpRole !== 'offline' ? `ROOM #${roomCode}` : 'LIVE P2P'}
                        </span>
                      </div>
                      <div className="bento-tile-title">PLAY WITH FRIENDS</div>
                      <div className="bento-tile-sub">
                        Host a private 0-bot room code or join your friend's invite link.
                      </div>
                    </button>
                  </div>

                  {/* SECONDARY UTILITY ROW: CUSTOM SETUP & RULEBOOK */}
                  <div className="bento-utility-row">
                    <button
                      type="button"
                      className="bento-secondary-pill"
                      onClick={() => {
                        commitNameSave();
                        setActiveTab('custom');
                      }}
                    >
                      <Settings size={15} className="text-gold" />
                      <span>CUSTOM TABLE & BOT COUNT</span>
                    </button>

                    <button
                      type="button"
                      className="bento-secondary-pill"
                      onClick={() => setActiveTab('rules')}
                    >
                      <BookOpen size={15} className="text-gold" />
                      <span>RULEBOOK & SPECIAL CARDS</span>
                    </button>
                  </div>

                  {/* ACTIVE HOUSE RULES FOOTER STRIP */}
                  <div className="home-active-rules-strip">
                    <div className="rule-chip">
                      <Layers size={11} />
                      <span>MODE: {mode === 'no_mercy' ? 'NO MERCY (+10)' : 'CLASSIC'}</span>
                    </div>
                    <div className="rule-chip">
                      <Sparkles size={11} />
                      <span>7-0 SWAP: {sevenZeroRule ? 'ACTIVE' : 'OFF'}</span>
                    </div>
                    <div className="rule-chip">
                      <ShieldAlert size={11} />
                      <span>MERCY KO: 25 CARDS</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ============================================================
                  CUSTOM MATCH TAB
                 ============================================================ */}
              {activeTab === 'custom' && (
                <motion.div
                  key="tab-custom"
                  className="home-subpanel"
                  initial={{ opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -14 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="subpanel-header">
                    <button
                      type="button"
                      className="subpanel-back-btn"
                      onClick={() => setActiveTab('main')}
                    >
                      <ArrowLeft size={14} />
                      <span>BACK TO LOBBY</span>
                    </button>
                    <span className="subpanel-title">CUSTOM TABLE SETUP</span>
                  </div>

                  <div className="custom-option-group">
                    <label>OPPONENT SEATING FORMAT</label>
                    <div className="custom-Segmented-row">
                      <button
                        type="button"
                        className={`seg-btn ${customPreset === '1v1' ? 'active' : ''}`}
                        onClick={() => setCustomPreset('1v1')}
                      >
                        1v1 (1 BOT)
                      </button>
                      <button
                        type="button"
                        className={`seg-btn ${customPreset === '1v3' ? 'active' : ''}`}
                        onClick={() => setCustomPreset('1v3')}
                      >
                        1v3 (3 BOTS)
                      </button>
                      <button
                        type="button"
                        className={`seg-btn ${
                          customPreset === 'no_bots' ? 'active' : ''
                        }`}
                        onClick={() => setCustomPreset('no_bots')}
                      >
                        0 BOTS (MANUAL)
                      </button>
                    </div>
                  </div>

                  <div className="custom-option-group">
                    <label>DECK EDITION</label>
                    <div className="custom-Segmented-row">
                      <button
                        type="button"
                        className={`seg-btn ${mode === 'no_mercy' ? 'active' : ''}`}
                        onClick={() => {
                          if (mode !== 'no_mercy') onToggleMode();
                        }}
                      >
                        NO MERCY (+10 / KO)
                      </button>
                      <button
                        type="button"
                        className={`seg-btn ${mode === 'classic' ? 'active' : ''}`}
                        onClick={() => {
                          if (mode !== 'classic') onToggleMode();
                        }}
                      >
                        CLASSIC UNO
                      </button>
                    </div>
                  </div>

                  <div className="custom-option-group">
                    <label>7-0 HAND SWAP & ROTATION</label>
                    <div className="custom-Segmented-row">
                      <button
                        type="button"
                        className={`seg-btn ${sevenZeroRule ? 'active' : ''}`}
                        onClick={() => {
                          if (!sevenZeroRule) onToggleSevenZero();
                        }}
                      >
                        ENABLED (7 SWAP / 0 PASS)
                      </button>
                      <button
                        type="button"
                        className={`seg-btn ${!sevenZeroRule ? 'active' : ''}`}
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
                    className="home-btn home-btn-primary"
                    onClick={() => {
                      commitNameSave();
                      onStartQuickPlay(customPreset);
                    }}
                  >
                    <Play size={16} fill="currentColor" />
                    <span>LAUNCH CUSTOM TABLE</span>
                  </button>
                </motion.div>
              )}

              {/* ============================================================
                  WEBRTC P2P ONLINE ROOM TAB
                 ============================================================ */}
              {activeTab === 'online' && (
                <motion.div
                  key="tab-online"
                  className="home-subpanel"
                  initial={{ opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -14 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="subpanel-header">
                    <button
                      type="button"
                      className="subpanel-back-btn"
                      onClick={() => setActiveTab('main')}
                    >
                      <ArrowLeft size={14} />
                      <span>BACK TO LOBBY</span>
                    </button>
                    <span className="subpanel-title">WEBRTC P2P PRIVATE LOUNGE</span>
                  </div>

                  {mpRole === 'offline' ? (
                    <div className="online-subpanel-options">
                      <div className="online-card-block">
                        <div className="block-label">
                          1. HOST A PRIVATE TABLE (STARTS WITH 0 BOTS FOR FRIENDS)
                        </div>
                        <button
                          type="button"
                          className="home-btn home-btn-primary"
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
                            {isBusy ? 'OPENING ROOM...' : 'CREATE PRIVATE ROOM'}
                          </span>
                        </button>
                      </div>

                      <div className="online-divider">
                        <span>OR JOIN FRIEND'S TABLE</span>
                      </div>

                      <div className="online-card-block">
                        <div className="block-label">
                          2. ENTER 5-LETTER ROOM CODE (MAKE SURE YOUR NAME IS SAVED ABOVE)
                        </div>
                        <div className="online-join-row">
                          <input
                            type="text"
                            className="home-code-field"
                            value={joinCodeInput}
                            onChange={(e) =>
                              setJoinCodeInput(e.target.value.toUpperCase())
                            }
                            placeholder="CODE (e.g. X7B9Q)"
                            maxLength={8}
                          />
                          <button
                            type="button"
                            className="home-btn home-btn-emerald"
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
                            <span>{isBusy ? 'JOINING...' : 'JOIN TABLE'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="online-lobby-ready-box">
                      <div className="lobby-code-label">
                        {mpRole === 'host'
                          ? 'ROOM LIVE — SHARE INVITE CODE WITH FRIENDS'
                          : 'CONNECTED TO HOST TABLE'}
                      </div>
                      <div className="lobby-code-giant">#{roomCode}</div>
                      <div className="lobby-connected-status">
                        {mpStatusText} • {connectedFriendsCount + 1} Player(s) Seated
                      </div>

                      <div className="lobby-action-pair">
                        {mpRole === 'host' && (
                          <button
                            type="button"
                            className="home-btn home-btn-secondary"
                            onClick={handleCopyInvite}
                          >
                            {copiedLink ? <Check size={15} /> : <Copy size={15} />}
                            <span>
                              {copiedLink
                                ? 'INVITE LINK COPIED!'
                                : 'COPY INVITE LINK'}
                            </span>
                          </button>
                        )}
                        <button
                          type="button"
                          className="home-btn home-btn-primary"
                          onClick={() => {
                            commitNameSave();
                            onEnterOnlineTable();
                          }}
                        >
                          <Play size={16} fill="currentColor" />
                          <span>ENTER BILLIARDS TABLE</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {errorMsg && <div className="home-error-banner">{errorMsg}</div>}
                </motion.div>
              )}

              {/* ============================================================
                  RULEBOOK & SPECIAL CARDS TAB
                 ============================================================ */}
              {activeTab === 'rules' && (
                <motion.div
                  key="tab-rules"
                  className="home-subpanel"
                  initial={{ opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -14 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="subpanel-header">
                    <button
                      type="button"
                      className="subpanel-back-btn"
                      onClick={() => setActiveTab('main')}
                    >
                      <ArrowLeft size={14} />
                      <span>BACK TO LOBBY</span>
                    </button>
                    <span className="subpanel-title">NO MERCY HOUSE RULES</span>
                  </div>

                  <div className="rules-grid-cards">
                    <div className="rule-mini-card">
                      <span className="rule-badge badge-crimson">25+ KO</span>
                      <div className="rule-mini-title">Mercy Elimination</div>
                      <p>Hold 25 or more cards at any point and you are immediately knocked out!</p>
                    </div>

                    <div className="rule-mini-card">
                      <span className="rule-badge badge-gold">STACKING</span>
                      <div className="rule-mini-title">Penalty Stacking</div>
                      <p>Stack equal or higher draw cards (+2 → +4 → +6 → +10) to pass the pain.</p>
                    </div>

                    <div className="rule-mini-card">
                      <span className="rule-badge badge-emerald">7 & 0</span>
                      <div className="rule-mini-title">7 Swap / 0 Rotate</div>
                      <p>Play a 7 to swap hands with anyone; play a 0 to rotate every hand!</p>
                    </div>

                    <div className="rule-mini-card">
                      <span className="rule-badge badge-royal">ROULETTE</span>
                      <div className="rule-mini-title">Color Roulette</div>
                      <p>Next player flips cards from the deck until they reveal the chosen color.</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
