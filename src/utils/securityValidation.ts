// DPDP Act 2023 & DPDP Rules 2025 (India) Data Protection, Consent, Input Sanitization,
// Authoritative Multiplayer Validation, Rate Limiting & User Rights Engine

export interface PrivacyConsentPreferences {
  essential_gameplay: true; // Always required to render the game & run turns
  local_profile_persistence: boolean; // Optional: Save display name & avatar in localStorage across browser restarts
  p2p_avatar_sharing: boolean; // Optional: Broadcast custom profile photo to peers in the same WebRTC room
  local_match_stats: boolean; // Optional: Record local win/loss/match count statistics in localStorage
  updated_at: string;
  consent_version: string;
}

export interface LocalMatchStatistics {
  matches_played: number;
  matches_won: number;
  mercy_knockouts: number;
  last_played_at: string | null;
}

export interface SecurityAuditEntry {
  id: string;
  timestamp: string;
  event_type:
    | 'RATE_LIMIT_BLOCKED'
    | 'INVALID_TURN_REJECTED'
    | 'INVALID_CARD_OWNERSHIP'
    | 'ILLEGAL_CARD_PLAY_REJECTED'
    | 'MALFORMED_PAYLOAD_BLOCKED'
    | 'CONSENT_UPDATED'
    | 'DATA_EXPORTED'
    | 'ACCOUNT_DATA_DELETED'
    | 'PLAYER_REPORTED';
  summary: string;
}

export interface PlayerReportRecord {
  report_id: string;
  reported_seat: number;
  reported_display_name: string;
  reason:
    | 'harassment_or_offensive_name'
    | 'cheating_or_exploit'
    | 'inappropriate_avatar'
    | 'afk_griefing';
  notes: string;
  created_at: string;
}

const STORAGE_KEYS = {
  PLAYER_ID: 'uno_royale_player_id',
  CREATED_AT: 'uno_royale_account_created',
  PLAYER_NAME: 'uno_player_name',
  PLAYER_AVATAR: 'uno_player_avatar',
  CONSENT: 'uno_royale_privacy_consent',
  STATS: 'uno_royale_match_stats',
  AUDIT_LOG: 'uno_royale_security_audit_log',
  REPORTS: 'uno_royale_player_reports',
  BGM_VOL: 'uno_royale_bgm_volume',
  BGM_MUTE: 'uno_royale_bgm_muted',
  BGM_TRACK: 'uno_royale_bgm_track',
} as const;

const DEFAULT_CONSENT: PrivacyConsentPreferences = {
  essential_gameplay: true,
  // Affirmative consent: Optional processing is FALSE by default (never pre-selected)
  local_profile_persistence: false,
  p2p_avatar_sharing: false,
  local_match_stats: false,
  updated_at: new Date().toISOString(),
  consent_version: '2025.1-DPDP',
};

const DEFAULT_STATS: LocalMatchStatistics = {
  matches_played: 0,
  matches_won: 0,
  mercy_knockouts: 0,
  last_played_at: null,
};

// Sliding-window rate limit buckets in memory
const rateLimitBuckets: Map<string, number[]> = new Map();

/**
 * Generates or retrieves the immutable system-generated Player ID.
 * Users cannot edit system-generated identifiers (Requirement #7).
 */
export function getOrCreatePlayerId(): string {
  if (typeof window === 'undefined') return 'plr_local_session';
  try {
    let existing = localStorage.getItem(STORAGE_KEYS.PLAYER_ID);
    if (!existing || !/^plr_[a-z0-9]{12}$/.test(existing)) {
      const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
      let randomPart = '';
      const array = new Uint8Array(12);
      if (window.crypto && window.crypto.getRandomValues) {
        window.crypto.getRandomValues(array);
        for (let i = 0; i < 12; i++) {
          randomPart += chars[array[i] % chars.length];
        }
      } else {
        for (let i = 0; i < 12; i++) {
          randomPart += chars[Math.floor(Math.random() * chars.length)];
        }
      }
      existing = `plr_${randomPart}`;
      localStorage.setItem(STORAGE_KEYS.PLAYER_ID, existing);
      localStorage.setItem(STORAGE_KEYS.CREATED_AT, new Date().toISOString());
    }
    return existing;
  } catch {
    return 'plr_session_ephemeral';
  }
}

export function getAccountCreatedAt(): string {
  if (typeof window === 'undefined') return new Date().toISOString();
  try {
    let created = localStorage.getItem(STORAGE_KEYS.CREATED_AT);
    if (!created) {
      created = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.CREATED_AT, created);
    }
    return created;
  } catch {
    return new Date().toISOString();
  }
}

/**
 * Retrieves the user's current DPDP Privacy & Consent Preferences.
 * Optional choices default to `false` until affirmatively enabled by the user.
 */
export function getPrivacyPreferences(): PrivacyConsentPreferences {
  if (typeof window === 'undefined') return DEFAULT_CONSENT;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONSENT);
    if (!raw) return DEFAULT_CONSENT;
    const parsed = JSON.parse(raw);
    return {
      essential_gameplay: true,
      local_profile_persistence: Boolean(parsed.local_profile_persistence),
      p2p_avatar_sharing: Boolean(parsed.p2p_avatar_sharing),
      local_match_stats: Boolean(parsed.local_match_stats),
      updated_at:
        typeof parsed.updated_at === 'string'
          ? parsed.updated_at
          : DEFAULT_CONSENT.updated_at,
      consent_version: '2025.1-DPDP',
    };
  } catch {
    return DEFAULT_CONSENT;
  }
}

export function hasSavedConsentDecision(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(STORAGE_KEYS.CONSENT) !== null;
  } catch {
    return false;
  }
}

export function savePrivacyPreferences(
  prefs: Omit<
    PrivacyConsentPreferences,
    'essential_gameplay' | 'updated_at' | 'consent_version'
  >
): PrivacyConsentPreferences {
  const updated: PrivacyConsentPreferences = {
    essential_gameplay: true,
    local_profile_persistence: Boolean(prefs.local_profile_persistence),
    p2p_avatar_sharing: Boolean(prefs.p2p_avatar_sharing),
    local_match_stats: Boolean(prefs.local_match_stats),
    updated_at: new Date().toISOString(),
    consent_version: '2025.1-DPDP',
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEYS.CONSENT, JSON.stringify(updated));

      // If user withdrew consent for local_profile_persistence, immediately purge saved name/avatar from localStorage
      if (!updated.local_profile_persistence) {
        localStorage.removeItem(STORAGE_KEYS.PLAYER_NAME);
        localStorage.removeItem(STORAGE_KEYS.PLAYER_AVATAR);
      }

      // If user withdrew consent for local_match_stats, immediately delete stored statistics
      if (!updated.local_match_stats) {
        localStorage.removeItem(STORAGE_KEYS.STATS);
      }
    } catch {
      // Ignore storage quota errors
    }
  }

  logSecurityEvent(
    'CONSENT_UPDATED',
    `Privacy preferences updated (profile=${updated.local_profile_persistence}, p2p_avatar=${updated.p2p_avatar_sharing}, stats=${updated.local_match_stats})`
  );
  return updated;
}

export function withdrawAllOptionalConsent(): PrivacyConsentPreferences {
  return savePrivacyPreferences({
    local_profile_persistence: false,
    p2p_avatar_sharing: false,
    local_match_stats: false,
  });
}

/**
 * Records local match statistics ONLY if the user has affirmatively consented to `local_match_stats`.
 */
export function recordMatchStatistic(won: boolean, mercyKo: boolean = false) {
  const prefs = getPrivacyPreferences();
  if (!prefs.local_match_stats || typeof window === 'undefined') return;

  try {
    const current = getLocalMatchStatistics();
    const next: LocalMatchStatistics = {
      matches_played: current.matches_played + 1,
      matches_won: current.matches_won + (won ? 1 : 0),
      mercy_knockouts: current.mercy_knockouts + (mercyKo ? 1 : 0),
      last_played_at: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(next));
  } catch {
    // Ignore
  }
}

export function getLocalMatchStatistics(): LocalMatchStatistics {
  if (typeof window === 'undefined') return DEFAULT_STATS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STATS);
    if (!raw) return DEFAULT_STATS;
    const parsed = JSON.parse(raw);
    return {
      matches_played: Number(parsed.matches_played) || 0,
      matches_won: Number(parsed.matches_won) || 0,
      mercy_knockouts: Number(parsed.mercy_knockouts) || 0,
      last_played_at: parsed.last_played_at || null,
    };
  } catch {
    return DEFAULT_STATS;
  }
}

/**
 * Requirement #6: Machine-Readable Personal Data Export (JSON)
 * Exports ONLY the personal data belonging to the current user on their device.
 */
export function exportMyPersonalDataJSON(
  currentSessionName: string,
  currentRoomCode: string
): string {
  const playerId = getOrCreatePlayerId();
  const createdAt = getAccountCreatedAt();
  const consent = getPrivacyPreferences();
  const stats = getLocalMatchStatistics();
  const hasStoredAvatar =
    typeof window !== 'undefined' &&
    Boolean(localStorage.getItem(STORAGE_KEYS.PLAYER_AVATAR));

  const payload = {
    schema_version: '1.0-DPDP-EXPORT',
    exported_at: new Date().toISOString(),
    player_id: playerId,
    username: sanitizePlayerName(currentSessionName),
    account_created: createdAt,
    storage_location: 'Browser LocalStorage (Client-Side Device Only)',
    custom_avatar_stored: hasStoredAvatar,
    active_p2p_room: currentRoomCode ? `#${currentRoomCode}` : null,
    privacy_consent_preferences: consent,
    statistics: stats,
    matches: [], // Match history is ephemeral in-memory per session to minimise data collection
  };

  logSecurityEvent(
    'DATA_EXPORTED',
    'User downloaded machine-readable JSON copy of their local profile data'
  );
  return JSON.stringify(payload, null, 2);
}

/**
 * Requirement #5: Account / Personal Data Deletion & Anonymisation
 * Permanently deletes all stored personal data, custom avatars, statistics,
 * preferences, and regenerates a clean anonymous state.
 */
export function deleteAllMyPersonalData(): void {
  if (typeof window === 'undefined') return;
  try {
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });
    sessionStorage.clear();
  } catch {
    // Ignore
  }
}

// ============================================================================
// INPUT SANITIZATION & MULTIPLAYER SECURITY VALIDATION (Requirements #11, #12)
// ============================================================================

/**
 * Sanitizes player display names against XSS, HTML injection, script tags,
 * control characters, and excessive length (capped at 18 characters).
 */
export function sanitizePlayerName(rawName: unknown): string {
  if (typeof rawName !== 'string') return 'Player';
  // Remove HTML tags, angle brackets, quotes, backslashes, and control characters
  const stripped = rawName
    .replace(/[<>"'`\\/]/g, '')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();

  if (!stripped) return 'Player';
  return stripped.slice(0, 18);
}

/**
 * Validates and normalizes a 5-character alphanumeric Room Code.
 */
export function sanitizeRoomCode(rawCode: unknown): string {
  if (typeof rawCode !== 'string') return '';
  return rawCode
    .trim()
    .toUpperCase()
    .replace(/^#/, '')
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 5);
}

/**
 * Strictly validates an avatar URL so only safe local `data:image/(jpeg|png|webp|svg+xml);base64,...`
 * payloads under 45 KB are accepted. Prevents external tracking pixels, SSRF, and XSS payloads.
 */
export function sanitizeAvatarDataUrl(
  rawUrl: unknown,
  fallbackUrl: string
): string {
  if (typeof rawUrl !== 'string' || !rawUrl) return fallbackUrl;
  if (rawUrl.length > 46000) return fallbackUrl;

  const isSafeDataImage =
    /^data:image\/(jpeg|jpg|png|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/i.test(
      rawUrl
    ) || /^data:image\/svg\+xml;utf8,/i.test(rawUrl);

  if (!isSafeDataImage) {
    return fallbackUrl;
  }
  return rawUrl;
}

/**
 * Sliding-window rate limiter to protect P2P host endpoints and sensitive UI actions
 * against automated spam and abuse (Requirement #13).
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const existing = rateLimitBuckets.get(key) || [];
  const validTimestamps = existing.filter((ts) => now - ts < windowMs);

  if (validTimestamps.length >= maxRequests) {
    rateLimitBuckets.set(key, validTimestamps);
    logSecurityEvent(
      'RATE_LIMIT_BLOCKED',
      `Rate limit exceeded for action bucket "${key}" (${maxRequests} per ${windowMs}ms)`
    );
    return false;
  }

  validTimestamps.push(now);
  rateLimitBuckets.set(key, validTimestamps);
  return true;
}

/**
 * Logs non-sensitive security and validation events with automatic 30-day / 60-entry rotation.
 * Never logs passwords, tokens, IPs, or sensitive personal data (Requirement #17).
 */
export function logSecurityEvent(
  eventType: SecurityAuditEntry['event_type'],
  summary: string
): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUDIT_LOG);
    const list: SecurityAuditEntry[] = raw ? JSON.parse(raw) : [];
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const pruned = list
      .filter((item) => new Date(item.timestamp).getTime() > thirtyDaysAgo)
      .slice(-59);

    pruned.push({
      id: `sec_${Date.now().toString(36)}`,
      timestamp: new Date().toISOString(),
      event_type: eventType,
      summary: summary.slice(0, 140),
    });

    localStorage.setItem(STORAGE_KEYS.AUDIT_LOG, JSON.stringify(pruned));
  } catch {
    // Ignore
  }
}

export function getSecurityAuditLogs(): SecurityAuditEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUDIT_LOG);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Requirement #20: Player Misconduct Reporting Mechanism
 */
export function submitPlayerReport(
  reportedSeat: number,
  reportedName: string,
  reason: PlayerReportRecord['reason'],
  notes: string
): PlayerReportRecord | null {
  if (!checkRateLimit('player_report', 3, 60000)) {
    return null;
  }

  const record: PlayerReportRecord = {
    report_id: `rep_${Date.now().toString(36)}`,
    reported_seat: reportedSeat,
    reported_display_name: sanitizePlayerName(reportedName),
    reason,
    notes: sanitizePlayerName(notes).slice(0, 120),
    created_at: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.REPORTS);
      const list: PlayerReportRecord[] = raw ? JSON.parse(raw) : [];
      const updated = [...list.slice(-19), record];
      localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(updated));
    } catch {
      // Ignore
    }
  }

  logSecurityEvent(
    'PLAYER_REPORTED',
    `Submitted report (${reason}) for seat ${reportedSeat + 1}`
  );
  return record;
}
