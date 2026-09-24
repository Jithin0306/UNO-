/**
 * Reads an image file from the user's local file gallery and center-crops +
 * compresses it into a crisp 160x160 JPEG Data URL (~8-15 KB) so it fits
 * comfortably in localStorage and syncs rapidly across WebRTC PeerJS connections.
 */
export function compressAvatarImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Selected file is not an image'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 160;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }

        // Center-crop square region from source image
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;

        ctx.fillStyle = '#09111d';
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to decode image'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export const DEFAULT_HUMAN_AVATAR =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80';

/**
 * Generates a crisp, futuristic 3D Cyber-Robot SVG portrait Data URL for AI Bots.
 */
function createRobotAvatarDataUrl(
  primaryGlow: string,
  secondaryMetal: string,
  eyeStyle: 'twin' | 'visor' | 'cyclops'
): string {
  const eyesMarkup =
    eyeStyle === 'twin'
      ? `
        <rect x="50" y="64" width="22" height="14" rx="6" fill="${primaryGlow}" />
        <rect x="88" y="64" width="22" height="14" rx="6" fill="${primaryGlow}" />
        <circle cx="57" cy="69" r="3" fill="#ffffff" />
        <circle cx="95" cy="69" r="3" fill="#ffffff" />
      `
      : eyeStyle === 'visor'
      ? `
        <rect x="46" y="63" width="68" height="15" rx="7.5" fill="${primaryGlow}" />
        <path d="M52 67 H106" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" opacity="0.85" />
      `
      : `
        <rect x="48" y="63" width="64" height="16" rx="8" fill="#060b14" stroke="${primaryGlow}" stroke-width="2" />
        <circle cx="80" cy="71" r="7" fill="${primaryGlow}" />
        <circle cx="78" cy="69" r="2.5" fill="#ffffff" />
      `;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
    <defs>
      <radialGradient id="bg" cx="50%" cy="45%" r="60%">
        <stop offset="0%" stop-color="${secondaryMetal}" />
        <stop offset="100%" stop-color="#050911" />
      </radialGradient>
      <linearGradient id="headShell" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#334155" />
        <stop offset="50%" stop-color="#1e293b" />
        <stop offset="100%" stop-color="#0f172a" />
      </linearGradient>
    </defs>

    <!-- Dark Cyber Background -->
    <rect width="160" height="160" fill="url(#bg)" />
    <circle cx="80" cy="82" r="62" fill="none" stroke="${primaryGlow}" stroke-opacity="0.22" stroke-width="2" />

    <!-- Robot Antenna -->
    <line x1="80" y1="20" x2="80" y2="38" stroke="#94a3b8" stroke-width="5" stroke-linecap="round" />
    <circle cx="80" cy="17" r="7" fill="${primaryGlow}" />
    <circle cx="78" cy="15" r="2.5" fill="#ffffff" />

    <!-- Side Ear Transceivers -->
    <rect x="24" y="62" width="11" height="30" rx="5" fill="#475569" stroke="${primaryGlow}" stroke-width="2" />
    <rect x="125" y="62" width="11" height="30" rx="5" fill="#475569" stroke="${primaryGlow}" stroke-width="2" />

    <!-- Main Robot Metallic Head Chassis -->
    <rect x="34" y="38" width="92" height="78" rx="22" fill="url(#headShell)" stroke="${primaryGlow}" stroke-width="3" />
    <path d="M50 45 H110" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" opacity="0.45" />

    <!-- Face Optical Screen -->
    <rect x="43" y="54" width="74" height="34" rx="12" fill="#050811" stroke="#475569" stroke-width="1.5" />

    <!-- Glowing Robot Eyes / Visor -->
    ${eyesMarkup}

    <!-- Digital Voice Equalizer Mouth Grill -->
    <rect x="54" y="96" width="52" height="11" rx="5.5" fill="#060b14" stroke="#334155" stroke-width="1.5" />
    <line x1="63" y1="98" x2="63" y2="105" stroke="${primaryGlow}" stroke-width="3" stroke-linecap="round" />
    <line x1="71" y1="97" x2="71" y2="106" stroke="${primaryGlow}" stroke-width="3" stroke-linecap="round" />
    <line x1="80" y1="97" x2="80" y2="106" stroke="${primaryGlow}" stroke-width="3" stroke-linecap="round" />
    <line x1="89" y1="97" x2="89" y2="106" stroke="${primaryGlow}" stroke-width="3" stroke-linecap="round" />
    <line x1="97" y1="98" x2="97" y2="105" stroke="${primaryGlow}" stroke-width="3" stroke-linecap="round" />

    <!-- Robot Neck & Shoulder Armor -->
    <rect x="64" y="116" width="32" height="12" rx="3" fill="#1e293b" stroke="#475569" stroke-width="1.5" />
    <path d="M38 152 C42 128, 118 128, 122 152 Z" fill="url(#headShell)" stroke="${primaryGlow}" stroke-width="2.5" />
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const BOT_AVATAR_KAIRO = createRobotAvatarDataUrl(
  '#38bdf8',
  '#0c2d48',
  'twin'
);
export const BOT_AVATAR_NYX = createRobotAvatarDataUrl(
  '#c084fc',
  '#2e1065',
  'visor'
);
export const BOT_AVATAR_JAX = createRobotAvatarDataUrl(
  '#34d399',
  '#064e3b',
  'cyclops'
);
