import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Zap,
  Settings,
  Globe,
  Trophy,
  BookOpen,
  Check,
  Copy,
  ArrowLeft,
  Play,
  Users,
  ChevronRight,
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
    savedName && savedName !== 'Player 1' ? savedName : 'Commander'
  );
  const [nameSavedToast, setNameSavedToast] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'main' | 'custom' | 'online' | 'career' | 'rules'
  >(initialInviteCode ? 'online' : 'main');
  const [quickFormat, setQuickFormat] = useState<'1v1' | '1v3'>('1v1');
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
      {/* Ambient Atmospheric Glows (Crimson Rose + Deep Indigo + Subtle Emerald) */}
      <div className="nm-aura-crimson" />
      <div className="nm-aura-indigo" />
      <div className="nm-vignette-layer" />

      {/* Subtle Floating Ambient UNO Cards in Deep Background */}
      <div className="nm-ambient-cards-layer" aria-hidden="true">
        <motion.div
          className="nm-bg-card nm-bg-card-1"
          animate={{ y: [0, -14, 0], rotate: [-18, -14, -18] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span>+10</span>
        </motion.div>
        <motion.div
          className="nm-bg-card nm-bg-card-2"
          animate={{ y: [0, 16, 0], rotate: [22, 26, 22] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span>7</span>
        </motion.div>
        <motion.div
          className="nm-bg-card nm-bg-card-3"
          animate={{ y: [0, -12, 0], rotate: [12, 8, 12] }}
          transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span>+4</span>
        </motion.div>
        <motion.div
          className="nm-bg-card nm-bg-card-4"
          animate={{ y: [0, 14, 0], rotate: [-24, -20, -24] }}
          transition={{ duration: 7.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span>0</span>
        </motion.div>
      </div>

      <motion.div
        className="nm-center-container"
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* ============================================================
            HERO BRANDING (ICONIC WHITE-TO-CRIMSON GLOWING TYPOGRAPHY)
           ============================================================ */}
        <div className="nm-hero-header">
          <div className="nm-title-wrapper">
            <span className="nm-title-bloom" aria-hidden="true">
              NO MERCY
            </span>
            <h1 className="nm-title-main">NO MERCY</h1>
          </div>

          <div className="nm-subtitle">NO APOLOGIES. NO LIMITS.</div>

          <p className="nm-tagline">
            Stack, swap hands, draw +10, and eliminate at 25 cards!
          </p>
        </div>

        {/* ============================================================
            SLEEK FROSTED OBSIDIAN GLASS MENU CARD
           ============================================================ */}
        <div className="nm-glass-card">
          <div className="nm-glass-top-highlight" />

          {/* PLAYER NAME CAPSULE WITH INTEGRATED SAVE BUTTON */}
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
              className={`nm-profile-save-btn ${nameSavedToast ? 'is-saved' : ''}`}
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

          <AnimatePresence mode="wait">
            {/* ============================================================
                MAIN MENU STACK (FAITHFUL TO REFERENCE + PREMIUM GLASS POLISH)
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
                {/* 1. QUICK PLAY (VS BOTS) - SIGNATURE CRIMSON ROSE CTA */}
                <div className="nm-quickplay-group">
                  <button
                    type="button"
                    className="nm-btn nm-btn-crimson"
                    onClick={() => {
                      commitNameSave();
                      onStartQuickPlay(quickFormat);
                    }}
                  >
                    <Zap size={16} className="nm-icon-amber" fill="currentColor" />
                    <span>QUICK PLAY ({quickFormat.toUpperCase()} VS BOTS)</span>
                  </button>

                  {/* Subtle inline format toggle pill (1v1 / 1v3) */}
                  <div className="nm-quick-toggle" title="Select Quick Play Bot Format">
                    <button
                      type="button"
                      className={`nm-qpill ${quickFormat === '1v1' ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setQuickFormat('1v1');
                      }}
                    >
                      1v1
                    </button>
                    <button
                      type="button"
                      className={`nm-qpill ${quickFormat === '1v3' ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setQuickFormat('1v3');
                      }}
                    >
                      1v3
                    </button>
                  </div>
                </div>

                {/* 2. CUSTOM MATCH */}
                <button
                  type="button"
                  className="nm-btn nm-btn-slate"
                  onClick={() => {
                    commitNameSave();
                    setActiveTab('custom');
                  }}
                >
                  <span className="nm-btn-left">
                    <Settings size={16} className="nm-icon-violet" />
                    <span>CUSTOM MATCH</span>
                  </span>
                  <ChevronRight size={15} className="nm-btn-chevron" />
                </button>

                {/* 3. WEBRTC P2P ROOM */}
                <button
                  type="button"
                  className="nm-btn nm-btn-slate"
                  onClick={() => {
                    commitNameSave();
                    setActiveTab('online');
                  }}
                >
                  <span className="nm-btn-left">
                    <Globe size={16} className="nm-icon-cyan" />
                    <span>WEBRTC P2P ROOM</span>
                  </span>
                  {mpRole !== 'offline' ? (
                    <span className="nm-live-room-badge">#{roomCode}</span>
                  ) : (
                    <ChevronRight size={15} className="nm-btn-chevron" />
                  )}
                </button>

                {/* 4. BATTLE CAREER */}
                <button
                  type="button"
                  className="nm-btn nm-btn-slate"
                  onClick={() => {
                    commitNameSave();
                    setActiveTab('career');
                  }}
                >
                  <span className="nm-btn-left">
                    <Trophy size={16} className="nm-icon-gold" />
                    <span>BATTLE CAREER</span>
                  </span>
                  <ChevronRight size={15} className="nm-btn-chevron" />
                </button>

                {/* 5. RULEBOOK & CARDS */}
                <button
                  type="button"
                  className="nm-btn nm-btn-slate"
                  onClick={() => setActiveTab('rules')}
                >
                  <span className="nm-btn-left">
                    <BookOpen size={16} className="nm-icon-emerald" />
                    <span>RULEBOOK &amp; CARDS</span>
                  </span>
                  <ChevronRight size={15} className="nm-btn-chevron" />
                </button>
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
                  <span className="nm-subpanel-title">CUSTOM MATCH</span>
                </div>

                <div className="nm-field-group">
                  <label>TABLE FORMAT &amp; BOTS</label>
                  <div className="nm-segmented">
                    <button
                      type="button"
                      className={`nm-seg-item ${customPreset === '1v1' ? 'active' : ''}`}
                      onClick={() => setCustomPreset('1v1')}
                    >
                      1v1 (1 BOT)
                    </button>
                    <button
                      type="button"
                      className={`nm-seg-item ${customPreset === '1v3' ? 'active' : ''}`}
                      onClick={() => setCustomPreset('1v3')}
                    >
                      1v3 (3 BOTS)
                    </button>
                    <button
                      type="button"
                      className={`nm-seg-item ${customPreset === 'no_bots' ? 'active' : ''}`}
                      onClick={() => setCustomPreset('no_bots')}
                    >
                      0 BOTS
                    </button>
                  </div>
                </div>

                <div className="nm-field-group">
                  <label>GAME EDITION</label>
                  <div className="nm-segmented">
                    <button
                      type="button"
                      className={`nm-seg-item ${mode === 'no_mercy' ? 'active' : ''}`}
                      onClick={() => {
                        if (mode !== 'no_mercy') onToggleMode();
                      }}
                    >
                      NO MERCY (+10 / KO)
                    </button>
                    <button
                      type="button"
                      className={`nm-seg-item ${mode === 'classic' ? 'active' : ''}`}
                      onClick={() => {
                        if (mode !== 'classic') onToggleMode();
                      }}
                    >
                      CLASSIC UNO
                    </button>
                  </div>
                </div>

                <div className="nm-field-group">
                  <label>7-0 HAND SWAP &amp; ROTATE</label>
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
                      className={`nm-seg-item ${!sevenZeroRule ? 'active' : ''}`}
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
                  <span>START CUSTOM MATCH</span>
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
                        HOST A PRIVATE ROOM (0 BOTS BY DEFAULT)
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
                        <span>{isBusy ? 'CREATING ROOM...' : 'HOST PRIVATE ROOM'}</span>
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
                      {mpStatusText} • {connectedFriendsCount + 1} Player(s) Ready
                    </div>

                    <div className="nm-lobby-actions">
                      {mpRole === 'host' && (
                        <button
                          type="button"
                          className="nm-btn nm-btn-slate"
                          onClick={handleCopyInvite}
                        >
                          {copiedLink ? <Check size={15} /> : <Copy size={15} />}
                          <span>
                            {copiedLink ? 'INVITE LINK COPIED!' : 'COPY INVITE LINK'}
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
                BATTLE CAREER SUBPANEL
               ============================================================ */}
            {activeTab === 'career' && (
              <motion.div
                key="nm-tab-career"
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
                  <span className="nm-subpanel-title">BATTLE CAREER</span>
                </div>

                <div className="nm-career-rank-banner">
                  <div className="nm-rank-icon">🏆</div>
                  <div className="nm-rank-info">
                    <span className="nm-rank-tier">NO MERCY CONTENDER</span>
                    <strong className="nm-rank-player">
                      {nameInput.trim() || savedName || 'Commander'}
                    </strong>
                  </div>
                  <span className="nm-rank-badge">SEASON 1</span>
                </div>

                <div className="nm-career-grid">
                  <div className="nm-stat-box">
                    <span className="nm-stat-value">NO MERCY</span>
                    <span className="nm-stat-label">PREFERRED EDITION</span>
                  </div>
                  <div className="nm-stat-box">
                    <span className="nm-stat-value">25 CARDS</span>
                    <span className="nm-stat-label">ELIMINATION LIMIT</span>
                  </div>
                  <div className="nm-stat-box">
                    <span className="nm-stat-value">+10 WILD</span>
                    <span className="nm-stat-label">MAX STACK PENALTY</span>
                  </div>
                  <div className="nm-stat-box">
                    <span className="nm-stat-value">WEBRTC P2P</span>
                    <span className="nm-stat-label">MULTIPLAYER ENGINE</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ============================================================
                RULEBOOK & CARDS SUBPANEL
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
                  <span className="nm-subpanel-title">RULEBOOK &amp; CARDS</span>
                </div>

                <div className="nm-rules-cards-list">
                  <div className="nm-rule-item">
                    <span className="nm-rule-pill pill-rose">25+ KO</span>
                    <div>
                      <strong>Mercy Rule Elimination</strong>
                      <p>Reach 25 or more cards in your hand and you are eliminated on the spot.</p>
                    </div>
                  </div>

                  <div className="nm-rule-item">
                    <span className="nm-rule-pill pill-amber">+2 TO +10</span>
                    <div>
                      <strong>Ruthless Penalty Stacking</strong>
                      <p>Stack equal or higher draw cards (+2, +4, +6, +10) to pass the total penalty to the next player.</p>
                    </div>
                  </div>

                  <div className="nm-rule-item">
                    <span className="nm-rule-pill pill-cyan">7 &amp; 0</span>
                    <div>
                      <strong>7 Hand Swap &amp; 0 Table Rotate</strong>
                      <p>Playing a 7 swaps your hand with a chosen player. Playing a 0 rotates every hand in turn order.</p>
                    </div>
                  </div>

                  <div className="nm-rule-item">
                    <span className="nm-rule-pill pill-emerald">ROULETTE</span>
                    <div>
                      <strong>Wild Color Roulette</strong>
                      <p>Choose a color—the next player draws from the deck until they reveal a card of that color.</p>
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
