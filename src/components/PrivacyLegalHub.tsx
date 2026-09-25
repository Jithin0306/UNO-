import React, { useState, useEffect } from 'react';
import {
  Shield,
  Sliders,
  Cookie,
  FileText,
  Users,
  Lock,
  Download,
  Trash2,
  Check,
  AlertTriangle,
  Flag,
  X,
  Edit3,
  ExternalLink,
} from 'lucide-react';
import { Player } from '../types/uno';
import {
  getOrCreatePlayerId,
  getAccountCreatedAt,
  getPrivacyPreferences,
  savePrivacyPreferences,
  withdrawAllOptionalConsent,
  exportMyPersonalDataJSON,
  deleteAllMyPersonalData,
  getLocalMatchStatistics,
  getSecurityAuditLogs,
  submitPlayerReport,
  sanitizePlayerName,
  PrivacyConsentPreferences,
  PlayerReportRecord,
} from '../utils/securityValidation';

export type LegalPageRoute =
  | 'privacy-policy'
  | 'privacy-settings'
  | 'cookie-policy'
  | 'terms'
  | 'community-guidelines'
  | 'security'
  | 'delete-account'
  | 'download-data'
  | 'report-player'
  | 'contact';

interface PrivacyLegalHubProps {
  activeRoute: LegalPageRoute | null;
  onClose: () => void;
  onSelectRoute: (route: LegalPageRoute) => void;
  currentPlayerName: string;
  currentRoomCode: string;
  players: Player[];
  mpRole: 'offline' | 'host' | 'client';
  onUpdatePlayerName: (newName: string) => void;
  onResetPlayerAvatar: () => void;
  onAccountDeleted: () => void;
  onKickReportedSeat?: (seatIdx: number) => void;
}

export const PrivacyLegalHub: React.FC<PrivacyLegalHubProps> = ({
  activeRoute,
  onClose,
  onSelectRoute,
  currentPlayerName,
  currentRoomCode,
  players,
  mpRole,
  onUpdatePlayerName,
  onResetPlayerAvatar,
  onAccountDeleted,
  onKickReportedSeat,
}) => {
  const [consent, setConsent] = useState<PrivacyConsentPreferences>(
    getPrivacyPreferences()
  );
  const [editNameVal, setEditNameVal] = useState<string>(currentPlayerName);
  const [savedToast, setSavedToast] = useState<string>('');
  const [confirmDeleteStep, setConfirmDeleteStep] = useState<boolean>(false);
  const [jsonPreview, setJsonPreview] = useState<string>('');
  const [reportSeatIdx, setReportSeatIdx] = useState<number>(1);
  const [reportReason, setReportReason] = useState<
    PlayerReportRecord['reason']
  >('harassment_or_offensive_name');
  const [reportNotes, setReportNotes] = useState<string>('');
  const [kickOnReport, setKickOnReport] = useState<boolean>(false);

  const playerId = getOrCreatePlayerId();
  const createdAt = getAccountCreatedAt();
  const stats = getLocalMatchStatistics();
  const auditLogs = getSecurityAuditLogs();

  useEffect(() => {
    setConsent(getPrivacyPreferences());
    setEditNameVal(currentPlayerName);
    setConfirmDeleteStep(false);
    if (activeRoute === 'download-data') {
      setJsonPreview(
        exportMyPersonalDataJSON(currentPlayerName, currentRoomCode)
      );
    }
  }, [activeRoute, currentPlayerName, currentRoomCode]);

  if (!activeRoute) return null;

  const showFeedback = (msg: string) => {
    setSavedToast(msg);
    window.setTimeout(() => setSavedToast(''), 3000);
  };

  const handleSaveConsentChoices = () => {
    const updated = savePrivacyPreferences({
      local_profile_persistence: consent.local_profile_persistence,
      p2p_avatar_sharing: consent.p2p_avatar_sharing,
      local_match_stats: consent.local_match_stats,
    });
    setConsent(updated);
    showFeedback('Your privacy & consent preferences have been saved.');
  };

  const handleWithdrawAll = () => {
    const updated = withdrawAllOptionalConsent();
    setConsent(updated);
    showFeedback(
      'All optional consent withdrawn and stored optional data cleared.'
    );
  };

  const handleDownloadDataFile = () => {
    const jsonString = exportMyPersonalDataJSON(
      currentPlayerName,
      currentRoomCode
    );
    setJsonPreview(jsonString);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uno-data-export-${playerId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showFeedback('Personal data exported as JSON.');
  };

  const handleConfirmDeleteAccount = () => {
    deleteAllMyPersonalData();
    onAccountDeleted();
    setConfirmDeleteStep(false);
    showFeedback(
      'All personal data, profile settings, and local storage have been permanently deleted.'
    );
  };

  const handleSaveCorrectedName = () => {
    const clean = sanitizePlayerName(editNameVal);
    setEditNameVal(clean);
    onUpdatePlayerName(clean);
    showFeedback(`Username updated to "${clean}".`);
  };

  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    const targetPlayer = players[reportSeatIdx];
    const rec = submitPlayerReport(
      reportSeatIdx,
      targetPlayer?.name || `Seat ${reportSeatIdx + 1}`,
      reportReason,
      reportNotes
    );
    if (!rec) {
      showFeedback('Rate limit reached: Please wait before submitting more reports.');
      return;
    }
    if (mpRole === 'host' && kickOnReport && onKickReportedSeat) {
      onKickReportedSeat(reportSeatIdx);
    }
    setReportNotes('');
    showFeedback(
      `Report #${rec.report_id} recorded${
        mpRole === 'host' && kickOnReport ? ' & player replaced by AI Bot' : ''
      }.`
    );
  };

  // Normalize sub-actions into primary tabs while highlighting the specific section
  const activeTab: LegalPageRoute =
    activeRoute === 'delete-account' ||
    activeRoute === 'download-data' ||
    activeRoute === 'privacy-settings'
      ? 'privacy-settings'
      : activeRoute === 'report-player'
      ? 'community-guidelines'
      : activeRoute === 'contact'
      ? 'privacy-policy'
      : activeRoute;

  return (
    <div
      className="dpdp-legal-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Privacy, Data Rights, Security & Legal Information"
    >
      <div className="dpdp-legal-shell">
        {/* Top Header */}
        <header className="dpdp-legal-header">
          <div className="dpdp-header-left">
            <Shield size={18} className="dpdp-emerald-icon" />
            <div>
              <h2 className="dpdp-header-title">
                PRIVACY, DATA PROTECTION &amp; USER RIGHTS CENTER
              </h2>
              <span className="dpdp-header-sub">
                Aligned with the Digital Personal Data Protection (DPDP) Act,
                2023 &amp; DPDP Rules, 2025 (India) • URL:{' '}
                <code>/{activeRoute}</code>
              </span>
            </div>
          </div>

          <button
            type="button"
            className="dpdp-close-btn"
            onClick={onClose}
            aria-label="Close Legal & Privacy Center"
          >
            <X size={18} />
            <span>RETURN TO GAME</span>
          </button>
        </header>

        {/* Navigation Tabs */}
        <nav className="dpdp-nav-bar" aria-label="Legal & Privacy Pages">
          <button
            type="button"
            className={`dpdp-nav-tab ${
              activeTab === 'privacy-policy' ? 'active' : ''
            }`}
            onClick={() => onSelectRoute('privacy-policy')}
          >
            <Shield size={13} />
            <span>/privacy-policy</span>
          </button>

          <button
            type="button"
            className={`dpdp-nav-tab ${
              activeTab === 'privacy-settings' ? 'active' : ''
            }`}
            onClick={() => onSelectRoute('privacy-settings')}
          >
            <Sliders size={13} />
            <span>/privacy-settings &amp; Rights</span>
          </button>

          <button
            type="button"
            className={`dpdp-nav-tab ${
              activeTab === 'cookie-policy' ? 'active' : ''
            }`}
            onClick={() => onSelectRoute('cookie-policy')}
          >
            <Cookie size={13} />
            <span>/cookie-policy</span>
          </button>

          <button
            type="button"
            className={`dpdp-nav-tab ${activeTab === 'terms' ? 'active' : ''}`}
            onClick={() => onSelectRoute('terms')}
          >
            <FileText size={13} />
            <span>/terms</span>
          </button>

          <button
            type="button"
            className={`dpdp-nav-tab ${
              activeTab === 'community-guidelines' ? 'active' : ''
            }`}
            onClick={() => onSelectRoute('community-guidelines')}
          >
            <Users size={13} />
            <span>/community-guidelines</span>
          </button>

          <button
            type="button"
            className={`dpdp-nav-tab ${
              activeTab === 'security' ? 'active' : ''
            }`}
            onClick={() => onSelectRoute('security')}
          >
            <Lock size={13} />
            <span>/security</span>
          </button>
        </nav>

        {savedToast && (
          <div className="dpdp-toast-banner">
            <Check size={14} />
            <span>{savedToast}</span>
          </div>
        )}

        {/* Main Content Area */}
        <div className="dpdp-content-scroll">
          {/* ================================================================
              1. /privacy-policy
             ================================================================ */}
          {activeTab === 'privacy-policy' && (
            <div className="dpdp-doc-section">
              <div className="dpdp-badge-row">
                <span className="dpdp-pill">Last Updated: September 2026</span>
                <span className="dpdp-pill">
                  Data Minimisation Architecture (Zero Server Database)
                </span>
              </div>

              <h3>1. Plain-Language Summary</h3>
              <p>
                This browser game is engineered on a strict{' '}
                <strong>Data Minimisation</strong> architecture. There is{' '}
                <strong>no central user database</strong>,{' '}
                <strong>no email or Gmail registration</strong>,{' '}
                <strong>no phone number collection</strong>, and{' '}
                <strong>no advertising or analytics tracking</strong>. All
                gameplay preferences and profile customizations stay on your own
                device inside your browser&apos;s local storage unless you
                explicitly join a peer-to-peer (WebRTC) room with friends.
              </p>

              <h3>2. Personal Data We Collect &amp; Why</h3>
              <div className="dpdp-table-wrap">
                <table className="dpdp-table">
                  <thead>
                    <tr>
                      <th>Data Category</th>
                      <th>Purpose</th>
                      <th>Storage Location</th>
                      <th>Legal Basis &amp; Retention</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <strong>Local Player ID</strong> (<code>plr_...</code>)
                      </td>
                      <td>
                        System-generated random identifier used to manage your
                        local session, data export, and deletion requests.
                      </td>
                      <td>
                        Browser <code>localStorage</code> on your device only.
                      </td>
                      <td>
                        Required for user-rights management; deleted immediately
                        when you click <em>Delete Account</em>.
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Display Name (Username)</strong>
                      </td>
                      <td>
                        Displayed on your seat badge during solo and multiplayer
                        matches.
                      </td>
                      <td>
                        In-memory session (or browser <code>localStorage</code>{' '}
                        if optional profile persistence is enabled).
                      </td>
                      <td>
                        Consent; retained on your device until modified or
                        deleted via <em>Delete Account</em>.
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Optional Profile Picture</strong>
                      </td>
                      <td>
                        Locally cropped <code>160×160</code> avatar displayed on
                        your seat badge.
                      </td>
                      <td>
                        Browser <code>localStorage</code> (shared over WebRTC
                        only if P2P Avatar Sharing consent is enabled).
                      </td>
                      <td>
                        Affirmative Consent; deleted immediately upon consent
                        withdrawal or <em>Delete Account</em>.
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Optional Match Statistics</strong>
                      </td>
                      <td>
                        Counts matches played, wins, and Mercy Rule knockouts on
                        your device.
                      </td>
                      <td>
                        Browser <code>localStorage</code> only (never uploaded
                        to any server).
                      </td>
                      <td>
                        Affirmative Consent (disabled by default); deleted upon
                        consent withdrawal.
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <strong>WebRTC P2P Session &amp; Network Data</strong>
                      </td>
                      <td>
                        Establishes direct browser-to-browser multiplayer card
                        sync using a 5-character room code.
                      </td>
                      <td>
                        Ephemeral WebRTC ICE candidates via PeerJS signaling
                        broker (<code>0.peerjs.com</code>).
                      </td>
                      <td>
                        Essential for online multiplayer when initiated by you;
                        terminated immediately when leaving the room.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3>3. Data We Do NOT Collect</h3>
              <p>
                In accordance with data minimisation principles under the{' '}
                <strong>Digital Personal Data Protection (DPDP) Act, 2023</strong>
                , we <strong>never</strong> request, collect, or store:
              </p>
              <ul>
                <li>Email addresses or Gmail accounts</li>
                <li>Phone numbers or SMS verification codes</li>
                <li>Home addresses or precise GPS geolocation</li>
                <li>Dates of birth, Aadhaar, PAN, or government IDs</li>
                <li>
                  Third-party analytics profiles, Google Analytics, Meta Pixel,
                  or cross-site advertising identifiers
                </li>
              </ul>

              <h3>4. Third-Party Services Used</h3>
              <ul>
                <li>
                  <strong>GitHub Pages (Static Web Hosting &amp; HTTPS CDN):</strong>{' '}
                  Delivers the static HTML, CSS, and JavaScript files to your
                  browser over encrypted HTTPS.
                </li>
                <li>
                  <strong>PeerJS Cloud Broker (<code>0.peerjs.com</code>):</strong>{' '}
                  Used <em>only</em> when you explicitly click{' '}
                  <strong>Host Private Room</strong> or{' '}
                  <strong>Join Room</strong> to exchange WebRTC connection
                  handshakes between players in the same 5-character room.
                </li>
                <li>
                  <strong>Google Fonts (<code>fonts.googleapis.com</code>):</strong>{' '}
                  Loads display typography (<code>Cinzel</code> and{' '}
                  <code>Outfit</code>).
                </li>
              </ul>

              <h3>5. Your Rights (Data Principal Rights)</h3>
              <p>
                Under the DPDP Act, 2023 and DPDP Rules, 2025, you can exercise
                the following rights at any time directly inside{' '}
                <button
                  type="button"
                  className="dpdp-inline-link"
                  onClick={() => onSelectRoute('privacy-settings')}
                >
                  /privacy-settings
                </button>
                :
              </p>
              <ul>
                <li>
                  <strong>Right to Access &amp; Data Portability:</strong>{' '}
                  Download a complete machine-readable <code>JSON</code> export
                  of your data via <strong>Download My Data</strong>.
                </li>
                <li>
                  <strong>Right to Correction &amp; Updating:</strong> Correct
                  or update your Display Name and Profile Picture at any time.
                </li>
                <li>
                  <strong>Right to Erasure (Delete Account):</strong>{' '}
                  Permanently erase all personal data, custom avatars, and local
                  records with a single click via{' '}
                  <strong>Delete Account</strong>.
                </li>
                <li>
                  <strong>Right to Withdraw Consent:</strong> Toggle off any
                  optional processing or click{' '}
                  <strong>Withdraw All Optional Consent</strong> at any time.
                </li>
              </ul>

              <h3>6. Children&apos;s Data Safeguards</h3>
              <p>
                This game does not conduct behavioural monitoring, profiling, or
                targeted advertising directed at children, and collects no
                personal contact information (no email, phone, or location) from
                any user of any age.
              </p>

              <h3>7. Grievance Redressal &amp; Contact Mechanism</h3>
              <p>
                If you have questions regarding your privacy, data rights, or
                wish to raise a grievance under the DPDP Act, 2023, please open
                an issue or contact the project maintainer via the official
                repository security &amp; support tracker:{' '}
                <a
                  href="https://github.com/Jithin0306/UNO-/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dpdp-ext-anchor"
                >
                  github.com/Jithin0306/UNO-/issues <ExternalLink size={11} />
                </a>
                .
              </p>
            </div>
          )}

          {/* ================================================================
              2. /privacy-settings (Consent, Correction, Download JSON, Delete Account)
             ================================================================ */}
          {activeTab === 'privacy-settings' && (
            <div className="dpdp-doc-section">
              <h3>1. Granular Privacy &amp; Consent Controls</h3>
              <p>
                Optional data processing is <strong>disabled by default</strong>{' '}
                and only activates when you affirmatively enable it below. You
                may withdraw optional consent at any time.
              </p>

              <div className="dpdp-consent-list">
                {/* Required */}
                <div className="dpdp-consent-card is-required">
                  <div className="dpdp-consent-text">
                    <div className="dpdp-consent-title-row">
                      <span className="dpdp-tag-required">[Required]</span>
                      <strong>Essential Game &amp; Table Functionality</strong>
                    </div>
                    <p>
                      Required to deal cards, enforce game rules, run the
                      60-second turn timer, and synchronize turns when you join
                      a WebRTC room.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={true}
                    disabled={true}
                    aria-label="Essential Game Functionality (Required)"
                  />
                </div>

                {/* Optional 1 */}
                <label className="dpdp-consent-card">
                  <div className="dpdp-consent-text">
                    <div className="dpdp-consent-title-row">
                      <span className="dpdp-tag-optional">[Optional]</span>
                      <strong>
                        Save Display Name &amp; Avatar on This Device
                      </strong>
                    </div>
                    <p>
                      Stores your chosen display name and uploaded profile
                      picture in browser <code>localStorage</code> so you do not
                      have to re-enter them next time you open the game.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={consent.local_profile_persistence}
                    onChange={(e) =>
                      setConsent({
                        ...consent,
                        local_profile_persistence: e.target.checked,
                      })
                    }
                  />
                </label>

                {/* Optional 2 */}
                <label className="dpdp-consent-card">
                  <div className="dpdp-consent-text">
                    <div className="dpdp-consent-title-row">
                      <span className="dpdp-tag-optional">[Optional]</span>
                      <strong>
                        Share Custom Profile Picture in Online P2P Rooms
                      </strong>
                    </div>
                    <p>
                      When enabled, transmits your custom profile avatar over
                      WebRTC to other players in the same 5-character room code.
                      When disabled, other players see the default silhouette.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={consent.p2p_avatar_sharing}
                    onChange={(e) =>
                      setConsent({
                        ...consent,
                        p2p_avatar_sharing: e.target.checked,
                      })
                    }
                  />
                </label>

                {/* Optional 3 */}
                <label className="dpdp-consent-card">
                  <div className="dpdp-consent-text">
                    <div className="dpdp-consent-title-row">
                      <span className="dpdp-tag-optional">[Optional]</span>
                      <strong>Local Match Statistics Counter</strong>
                    </div>
                    <p>
                      Keeps a local count of matches played, wins, and Mercy
                      Rule knockouts on your browser (never sent to any server).
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={consent.local_match_stats}
                    onChange={(e) =>
                      setConsent({
                        ...consent,
                        local_match_stats: e.target.checked,
                      })
                    }
                  />
                </label>
              </div>

              <div className="dpdp-action-row">
                <button
                  type="button"
                  className="dpdp-btn dpdp-btn-emerald"
                  onClick={handleSaveConsentChoices}
                >
                  <Check size={14} />
                  <span>SAVE MY PRIVACY CHOICES</span>
                </button>

                <button
                  type="button"
                  className="dpdp-btn dpdp-btn-outline"
                  onClick={handleWithdrawAll}
                >
                  <span>WITHDRAW ALL OPTIONAL CONSENT</span>
                </button>
              </div>

              <hr className="dpdp-divider" />

              {/* Data Correction (Requirement #7) */}
              <h3>2. Data Correction (Edit Profile &amp; Username)</h3>
              <p>
                You may correct your editable Display Name below. System-generated
                identifiers (<code>player_id</code>) are immutable for security
                integrity.
              </p>

              <div className="dpdp-correction-grid">
                <div className="dpdp-field">
                  <label>SYSTEM PLAYER ID (READ-ONLY)</label>
                  <input
                    type="text"
                    value={playerId}
                    readOnly
                    disabled
                    className="dpdp-input-readonly"
                  />
                </div>

                <div className="dpdp-field">
                  <label>EDIT USERNAME (DISPLAY NAME)</label>
                  <div className="dpdp-inline-input-group">
                    <input
                      type="text"
                      value={editNameVal}
                      maxLength={18}
                      onChange={(e) => setEditNameVal(e.target.value)}
                      className="dpdp-input"
                    />
                    <button
                      type="button"
                      className="dpdp-btn dpdp-btn-emerald"
                      onClick={handleSaveCorrectedName}
                    >
                      <Edit3 size={13} />
                      <span>UPDATE</span>
                    </button>
                    <button
                      type="button"
                      className="dpdp-btn dpdp-btn-outline"
                      onClick={() => {
                        onResetPlayerAvatar();
                        showFeedback('Profile picture reset to default.');
                      }}
                    >
                      <span>CLEAR PHOTO</span>
                    </button>
                  </div>
                </div>
              </div>

              <hr className="dpdp-divider" />

              {/* Data Access / Export (Requirement #6) */}
              <h3>3. Download My Data (Machine-Readable JSON Export)</h3>
              <p>
                Export a machine-readable <code>JSON</code> file containing all
                personal data and statistics associated with your local profile
                (<code>{playerId}</code>, created{' '}
                <code>{new Date(createdAt).toLocaleDateString()}</code>, Wins:{' '}
                <code>{stats.matches_won}</code> / Matches:{' '}
                <code>{stats.matches_played}</code>).
              </p>

              <div className="dpdp-action-row">
                <button
                  type="button"
                  className="dpdp-btn dpdp-btn-gold"
                  onClick={handleDownloadDataFile}
                >
                  <Download size={14} />
                  <span>DOWNLOAD MY DATA (.JSON)</span>
                </button>
              </div>

              {jsonPreview && (
                <pre className="dpdp-json-preview">{jsonPreview}</pre>
              )}

              <hr className="dpdp-divider" />

              {/* Account Deletion (Requirement #5) */}
              <h3>4. Delete Account &amp; Erase Personal Data</h3>
              <div className="dpdp-delete-warning-box">
                <div className="dpdp-delete-head">
                  <AlertTriangle size={16} className="dpdp-rose-icon" />
                  <strong>What happens when you delete your account data?</strong>
                </div>
                <ul>
                  <li>
                    Your saved Display Name (<code>{currentPlayerName}</code>)
                    and uploaded Profile Picture are permanently erased from{' '}
                    <code>localStorage</code>.
                  </li>
                  <li>
                    Your local match statistics, consent history, and system{' '}
                    <code>player_id</code> are permanently deleted and reset to
                    an anonymous state.
                  </li>
                  <li>
                    If you are connected to an online WebRTC room, your session
                    is immediately disconnected.
                  </li>
                </ul>

                {!confirmDeleteStep ? (
                  <button
                    type="button"
                    className="dpdp-btn dpdp-btn-danger"
                    onClick={() => setConfirmDeleteStep(true)}
                  >
                    <Trash2 size={14} />
                    <span>DELETE ACCOUNT &amp; ERASE ALL PERSONAL DATA</span>
                  </button>
                ) : (
                  <div className="dpdp-action-row">
                    <button
                      type="button"
                      className="dpdp-btn dpdp-btn-danger"
                      onClick={handleConfirmDeleteAccount}
                    >
                      <Trash2 size={14} />
                      <span>CONFIRM PERMANENT DELETION</span>
                    </button>
                    <button
                      type="button"
                      className="dpdp-btn dpdp-btn-outline"
                      onClick={() => setConfirmDeleteStep(false)}
                    >
                      <span>CANCEL</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================
              3. /cookie-policy
             ================================================================ */}
          {activeTab === 'cookie-policy' && (
            <div className="dpdp-doc-section">
              <h3>Cookie &amp; Browser LocalStorage Policy</h3>
              <p>
                This website <strong>does not use HTTP tracking cookies</strong>
                , third-party advertising cookies, Google Analytics, or Meta
                Pixel. Instead, it uses strictly scoped browser{' '}
                <code>localStorage</code> keys on your device.
              </p>

              <div className="dpdp-consent-list">
                <div className="dpdp-consent-card is-required">
                  <div className="dpdp-consent-text">
                    <div className="dpdp-consent-title-row">
                      <span className="dpdp-tag-required">[Active]</span>
                      <strong>
                        Essential Functional Storage (<code>localStorage</code>)
                      </strong>
                    </div>
                    <p>
                      Stores your privacy consent record (
                      <code>uno_royale_privacy_consent</code>), audio mute/volume
                      settings (<code>uno_royale_bgm_*</code>), and local{' '}
                      <code>player_id</code> for data export/deletion rights.
                    </p>
                  </div>
                  <span className="dpdp-pill">Strictly Necessary</span>
                </div>

                <div className="dpdp-consent-card">
                  <div className="dpdp-consent-text">
                    <div className="dpdp-consent-title-row">
                      <span className="dpdp-tag-optional">[Not Used]</span>
                      <strong>Analytics Cookies &amp; Scripts</strong>
                    </div>
                    <p>
                      No Google Analytics, Hotjar, or third-party telemetry
                      cookies are installed on this website.
                    </p>
                  </div>
                  <span className="dpdp-pill">0 Cookies</span>
                </div>

                <div className="dpdp-consent-card">
                  <div className="dpdp-consent-text">
                    <div className="dpdp-consent-title-row">
                      <span className="dpdp-tag-optional">[Not Used]</span>
                      <strong>Advertising &amp; Cross-Site Tracking Cookies</strong>
                    </div>
                    <p>
                      No ad networks, retargeting pixels, or behavioural
                      profiling cookies are used.
                    </p>
                  </div>
                  <span className="dpdp-pill">0 Cookies</span>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              4. /terms
             ================================================================ */}
          {activeTab === 'terms' && (
            <div className="dpdp-doc-section">
              <h3>Terms of Service</h3>
              <h4>1. Acceptance &amp; Scope</h4>
              <p>
                By accessing or playing this browser card game, you agree to
                these Terms of Service and our Community Guidelines.
              </p>

              <h4>2. Fair Play, Anti-Cheating &amp; Multiplayer Security</h4>
              <p>
                All multiplayer rooms enforce authoritative Host validation.
                Attempting to spoof card ownership, play out of turn, inject
                malformed WebRTC payloads, or flood signaling channels with
                automated scripts will result in automatic rate-limiting and
                session disconnection.
              </p>

              <h4>3. User-Generated Content (Display Names &amp; Avatars)</h4>
              <p>
                You are responsible for the Display Name and local Profile
                Picture you choose. Names containing HTML/script injection tags
                or abusive content are automatically sanitized, and room Hosts
                may remove disruptive players from their private P2P table.
              </p>

              <h4>4. Service Availability &amp; Termination</h4>
              <p>
                The game is provided on an &quot;as-is&quot; basis over static
                HTTPS hosting and peer-to-peer WebRTC connections. You may
                terminate your use and erase all local data at any time via{' '}
                <strong>Settings → Delete Account</strong>.
              </p>
            </div>
          )}

          {/* ================================================================
              5. /community-guidelines & Player Reporting
             ================================================================ */}
          {activeTab === 'community-guidelines' && (
            <div className="dpdp-doc-section">
              <h3>Community Guidelines &amp; Fair Play</h3>
              <p>
                To keep every multiplayer table welcoming and fair, all players
                must adhere to the following rules:
              </p>
              <ul>
                <li>
                  <strong>Zero Harassment or Hate Speech:</strong> Do not use
                  offensive, threatening, or discriminatory display names.
                </li>
                <li>
                  <strong>Appropriate Profile Photos:</strong> Only upload family-friendly
                  profile images when sharing avatars in P2P rooms.
                </li>
                <li>
                  <strong>No Cheating or Packet Manipulation:</strong> Do not
                  attempt to tamper with WebRTC state synchronization or exploit
                  browser vulnerabilities.
                </li>
                <li>
                  <strong>No Intentional AFK Griefing:</strong> The table
                  enforces a 60-second turn timer and 3-round AFK elimination to
                  keep matches moving smoothly.
                </li>
              </ul>

              <hr className="dpdp-divider" />

              <h3>Report a Player in Current Room</h3>
              <form onSubmit={handleSubmitReport} className="dpdp-report-form">
                <div className="dpdp-correction-grid">
                  <div className="dpdp-field">
                    <label>SELECT TABLE SEAT TO REPORT</label>
                    <select
                      className="dpdp-input"
                      value={reportSeatIdx}
                      onChange={(e) => setReportSeatIdx(Number(e.target.value))}
                    >
                      {players.map((p, idx) => (
                        <option key={p.id || idx} value={idx}>
                          Seat {idx + 1}: {p.name} ({p.isAI ? 'AI Bot' : 'Human'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="dpdp-field">
                    <label>VIOLATION CATEGORY</label>
                    <select
                      className="dpdp-input"
                      value={reportReason}
                      onChange={(e) =>
                        setReportReason(
                          e.target.value as PlayerReportRecord['reason']
                        )
                      }
                    >
                      <option value="harassment_or_offensive_name">
                        Offensive Display Name / Harassment
                      </option>
                      <option value="inappropriate_avatar">
                        Inappropriate Profile Picture
                      </option>
                      <option value="cheating_or_exploit">
                        Suspected Cheating / Exploit Attempt
                      </option>
                      <option value="afk_griefing">
                        Intentional Stalling / Griefing
                      </option>
                    </select>
                  </div>
                </div>

                <div className="dpdp-field" style={{ marginTop: '10px' }}>
                  <label>ADDITIONAL CONTEXT (OPTIONAL)</label>
                  <input
                    type="text"
                    className="dpdp-input"
                    maxLength={120}
                    placeholder="Brief description of the issue..."
                    value={reportNotes}
                    onChange={(e) => setReportNotes(e.target.value)}
                  />
                </div>

                {mpRole === 'host' && (
                  <label className="dpdp-inline-checkbox">
                    <input
                      type="checkbox"
                      checked={kickOnReport}
                      onChange={(e) => setKickOnReport(e.target.checked)}
                    />
                    <span>
                      As Room Host, immediately replace this seat with an AI Bot
                    </span>
                  </label>
                )}

                <div className="dpdp-action-row" style={{ marginTop: '12px' }}>
                  <button type="submit" className="dpdp-btn dpdp-btn-danger">
                    <Flag size={14} />
                    <span>SUBMIT PLAYER REPORT</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ================================================================
              6. /security (Vulnerability Disclosure & Security Controls)
             ================================================================ */}
          {activeTab === 'security' && (
            <div className="dpdp-doc-section">
              <h3>Security &amp; Responsible Vulnerability Disclosure</h3>
              <div className="dpdp-security-callout">
                <strong>Responsible Disclosure Notice:</strong> Please
                responsibly report security vulnerabilities rather than publicly
                exploiting or disclosing them.
              </div>

              <p>
                Security researchers and users may report potential
                vulnerabilities via our GitHub Security Advisory / Issue tracker
                at{' '}
                <a
                  href="https://github.com/Jithin0306/UNO-/security"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dpdp-ext-anchor"
                >
                  github.com/Jithin0306/UNO-/security <ExternalLink size={11} />
                </a>
                . No email registration is required to play the game.
              </p>

              <h4>Technical Security Architecture</h4>
              <ul>
                <li>
                  <strong>Authoritative Host Validation:</strong> Every incoming
                  WebRTC action (<code>PLAY_CARD</code>, <code>DRAW_CARD</code>,{' '}
                  <code>SWAP_SEVEN</code>) is verified against active turn
                  index, actual hand card ownership, and official card playability
                  rules before state updates occur.
                </li>
                <li>
                  <strong>Strict Input Sanitization &amp; Payload Caps:</strong>{' '}
                  All usernames, room codes, and base64 avatar images are
                  validated and stripped of HTML/XSS vectors.
                </li>
                <li>
                  <strong>Sliding-Window Rate Limiting:</strong> Protects
                  against action flooding, rapid name-change spam, and abuse.
                </li>
                <li>
                  <strong>Content-Security-Policy (CSP) &amp; HTTPS:</strong>{' '}
                  Enforced via HTTP/meta security directives over TLS/HTTPS.
                </li>
              </ul>

              <h4>Local Security &amp; Validation Event Log (30-Day Rolling)</h4>
              <div className="dpdp-audit-box">
                {auditLogs.length === 0 ? (
                  <span className="dpdp-muted">
                    No security events recorded in this session.
                  </span>
                ) : (
                  auditLogs
                    .slice()
                    .reverse()
                    .slice(0, 10)
                    .map((entry) => (
                      <div key={entry.id} className="dpdp-audit-row">
                        <span className="dpdp-audit-time">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="dpdp-audit-type">
                          {entry.event_type}
                        </span>
                        <span className="dpdp-audit-msg">{entry.summary}</span>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
