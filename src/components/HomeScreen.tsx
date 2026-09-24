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
    <div className="home-screen-overlay">
      {/* Ambient Billiards Spotlight & Vignette */}
      <div className="home-ambient-glow" />

      <motion.div
        className="home-center-column"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {/* HERO TITLE HEADER (Inspired by Reference Image + Dark Billiards Aesthetic) */}
        <div className="home-hero-branding">
          <h1 className="home-hero-title">NO MERCY</h1>
          <div className="home-hero-subtitle">
            NO APOLOGIES. NO LIMITS.
          </div>
          <p className="home-hero-tagline">
            Stack penalties, swap hands on 7, draw +10, and rule the private billiards table!
          </p>
        </div>

        {/* MAIN INTERACTIVE MENU CARD */}
        <div className="home-menu-card">
          {/* PLAYER NAME INPUT + EXPLICIT SAVE BUTTON (Always visible at top of card) */}
          <div className="home-name-row">
            <div className="home-name-input-wrap">
              <User size={15} className="home-input-icon" />
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitNameSave();
                }}
                placeholder="Enter your player name..."
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
                  <Check size={13} />
                  <span>SAVED</span>
                </>
              ) : (
                <span>SAVE</span>
              )}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'main' && (
              <motion.div
                key="tab-main"
                className="home-menu-buttons-stack"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.18 }}
              >
                <button
                  type="button"
                  className="home-btn home-btn-primary"
                  onClick={() => {
                    commitNameSave();
                    onStartQuickPlay('1v1');
                  }}
                >
                  <Zap size={16} />
                  <span>QUICK PLAY (1v1 VS BOT)</span>
                </button>

                <button
                  type="button"
                  className="home-btn home-btn-secondary"
                  onClick={() => {
                    commitNameSave();
                    setActiveTab('custom');
                  }}
                >
                  <Settings size={16} />
                  <span>CUSTOM MATCH (1v1 / 1v3 / BOTS)</span>
                </button>

                <button
                  type="button"
                  className="home-btn home-btn-secondary"
                  onClick={() => {
                    commitNameSave();
                    setActiveTab('online');
                  }}
                >
                  <Globe size={16} />
                  <span>WEBRTC P2P ROOM (PLAY WITH FRIENDS)</span>
                </button>

                <button
                  type="button"
                  className="home-btn home-btn-secondary"
                  onClick={() => setActiveTab('rules')}
                >
                  <BookOpen size={16} />
                  <span>RULEBOOK & SPECIAL CARDS</span>
                </button>
              </motion.div>
            )}

            {/* CUSTOM MATCH TAB */}
            {activeTab === 'custom' && (
              <motion.div
                key="tab-custom"
                className="home-subpanel"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.18 }}
              >
                <div className="subpanel-header">
                  <button
                    type="button"
                    className="subpanel-back-btn"
                    onClick={() => setActiveTab('main')}
                  >
                    <ArrowLeft size={14} />
                    <span>BACK</span>
                  </button>
                  <span className="subpanel-title">CUSTOM TABLE SETUP</span>
                </div>

                <div className="custom-option-group">
                  <label>OPPONENT FORMAT</label>
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
                  <label>GAME RULESET</label>
                  <div className="custom-Segmented-row">
                    <button
                      type="button"
                      className={`seg-btn ${mode === 'no_mercy' ? 'active' : ''}`}
                      onClick={() => {
                        if (mode !== 'no_mercy') onToggleMode();
                      }}
                    >
                      NO MERCY (+6 / +10)
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
                  <label>7-0 HAND SWAP & ROTATE RULE</label>
                  <div className="custom-Segmented-row">
                    <button
                      type="button"
                      className={`seg-btn ${sevenZeroRule ? 'active' : ''}`}
                      onClick={() => {
                        if (!sevenZeroRule) onToggleSevenZero();
                      }}
                    >
                      ENABLED (7 SWAP / 0 ROTATE)
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
                  <Play size={16} />
                  <span>START TABLE MATCH</span>
                </button>
              </motion.div>
            )}

            {/* ONLINE WEBRTC P2P ROOM TAB */}
            {activeTab === 'online' && (
              <motion.div
                key="tab-online"
                className="home-subpanel"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.18 }}
              >
                <div className="subpanel-header">
                  <button
                    type="button"
                    className="subpanel-back-btn"
                    onClick={() => setActiveTab('main')}
                  >
                    <ArrowLeft size={14} />
                    <span>BACK</span>
                  </button>
                  <span className="subpanel-title">WEBRTC P2P MULTIPLAYER</span>
                </div>

                {errorMsg && <div className="home-error-banner">{errorMsg}</div>}

                {mpRole === 'offline' ? (
                  <div className="online-subpanel-options">
                    <div className="online-card-block">
                      <div className="block-label">HOST A NEW TABLE FOR FRIENDS</div>
                      <button
                        type="button"
                        className="home-btn home-btn-primary"
                        disabled={isBusy}
                        onClick={async () => {
                          setErrorMsg('');
                          const finalName = commitNameSave();
                          setIsBusy(true);
                          try {
                            await onHostOnlineRoom(finalName);
                          } catch {
                            setErrorMsg('Could not create room. Please try again.');
                          } finally {
                            setIsBusy(false);
                          }
                        }}
                      >
                        <Users size={16} />
                        <span>
                          {isBusy ? 'CREATING ROOM...' : 'CREATE ROOM & GET CODE'}
                        </span>
                      </button>
                    </div>

                    <div className="online-divider">
                      <span>OR JOIN WITH ROOM CODE</span>
                    </div>

                    <div className="online-card-block">
                      <div className="online-join-row">
                        <input
                          type="text"
                          className="home-code-field"
                          value={joinCodeInput}
                          onChange={(e) =>
                            setJoinCodeInput(e.target.value.toUpperCase())
                          }
                          placeholder="ROOM CODE (E.G. 42Y7Y)"
                          maxLength={8}
                        />
                        <button
                          type="button"
                          className="home-btn home-btn-emerald"
                          disabled={isBusy || !joinCodeInput.trim()}
                          onClick={async () => {
                            setErrorMsg('');
                            const finalName = commitNameSave();
                            setIsBusy(true);
                            try {
                              await onJoinOnlineRoom(
                                joinCodeInput.trim(),
                                finalName
                              );
                              onEnterOnlineTable();
                            } catch {
                              setErrorMsg(
                                'Could not connect to Room Code. Verify the Host is online.'
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
                    <div className="lobby-code-label">SHARE THIS ROOM CODE</div>
                    <div className="lobby-code-giant">#{roomCode}</div>
                    <div className="lobby-connected-status">
                      {connectedFriendsCount + 1} PLAYER(S) IN ROOM • {mpStatusText}
                    </div>

                    <div className="lobby-action-pair">
                      <button
                        type="button"
                        className="home-btn home-btn-secondary"
                        onClick={handleCopyInvite}
                      >
                        {copiedLink ? <Check size={15} /> : <Copy size={15} />}
                        <span>
                          {copiedLink ? 'INVITE LINK COPIED!' : 'COPY INVITE LINK'}
                        </span>
                      </button>

                      <button
                        type="button"
                        className="home-btn home-btn-primary"
                        onClick={() => {
                          commitNameSave();
                          onEnterOnlineTable();
                        }}
                      >
                        <Play size={16} />
                        <span>ENTER BILLIARDS TABLE</span>
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* RULEBOOK TAB */}
            {activeTab === 'rules' && (
              <motion.div
                key="tab-rules"
                className="home-subpanel"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.18 }}
              >
                <div className="subpanel-header">
                  <button
                    type="button"
                    className="subpanel-back-btn"
                    onClick={() => setActiveTab('main')}
                  >
                    <ArrowLeft size={14} />
                    <span>BACK</span>
                  </button>
                  <span className="subpanel-title">NO MERCY RULEBOOK</span>
                </div>

                <ul className="home-rules-list">
                  <li>
                    <strong>Stacking Penalties:</strong> Stack <code>+2</code>,{' '}
                    <code>+4</code>, <code>+6</code>, or <code>+10</code> cards of
                    equal or higher value to pass the combined draw penalty to the
                    next player!
                  </li>
                  <li>
                    <strong>7-0 Rule:</strong> Playing a <code>7</code> swaps your
                    entire hand with an opponent. Playing a <code>0</code> rotates
                    all active hands in the direction of play.
                  </li>
                  <li>
                    <strong>Skip Everyone & Drop All:</strong>{' '}
                    <code>Skip All (⊘⊘)</code> skips every opponent and grants you an
                    immediate extra turn. <code>Drop All (❖)</code> discards every
                    card of that color from your hand at once!
                  </li>
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
