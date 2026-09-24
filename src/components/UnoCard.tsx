import React from 'react';
import { CardValue, UnoCardData } from '../types/uno';

interface UnoCardProps {
  card: UnoCardData;
  size?: 'sm' | 'md' | 'lg';
  playable?: boolean;
  selected?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

function getCornerLabel(value: CardValue): string {
  switch (value) {
    case 'skip':
      return '⊘';
    case 'reverse':
      return '⇄';
    case 'draw2':
      return '+2';
    case 'draw4':
      return '+4';
    case 'skip_all':
      return '⊘⊘';
    case 'discard_all':
      return '❖';
    case 'wild':
      return 'W';
    case 'wild_draw4':
      return '+4';
    case 'wild_reverse_draw4':
      return '⇄+4';
    case 'wild_draw6':
      return '+6';
    case 'wild_draw10':
      return '+10';
    case 'wild_color_roulette':
      return '🎡';
    default:
      return value;
  }
}

function renderCenterArtwork(card: UnoCardData) {
  const { value, category } = card;

  if (category === 'number') {
    const needsUnderline = value === '6' || value === '9';
    return (
      <div className="uno-card-center-number-wrap">
        <span className={`uno-card-center-number ${needsUnderline ? 'has-underline' : ''}`}>
          {value}
        </span>
      </div>
    );
  }

  switch (value) {
    case 'skip':
      return (
        <svg viewBox="0 0 64 64" className="uno-card-vector-icon">
          <circle
            cx="32"
            cy="32"
            r="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="6.5"
          />
          <line
            x1="18"
            y1="46"
            x2="46"
            y2="18"
            stroke="currentColor"
            strokeWidth="6.5"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'reverse':
      return (
        <svg viewBox="0 0 64 64" className="uno-card-vector-icon">
          <path
            d="M20 26 C24 16, 38 15, 45 23 L49 18 L48 31 L35 29 L40 25 C35 20, 27 21, 24 28 Z"
            fill="currentColor"
          />
          <path
            d="M44 38 C40 48, 26 49, 19 41 L15 46 L16 33 L29 35 L24 39 C29 44, 37 43, 40 36 Z"
            fill="currentColor"
          />
        </svg>
      );

    case 'draw2':
    case 'draw4':
      return (
        <div className="uno-card-special-stack">
          <div className="mini-stack-cards">
            <span className="mini-card-layer layer-back" />
            <span className="mini-card-layer layer-front" />
          </div>
          <span className="special-plus-badge">
            {value === 'draw4' ? '+4' : '+2'}
          </span>
        </div>
      );

    case 'skip_all':
      return (
        <div className="uno-card-special-stack">
          <svg viewBox="0 0 64 64" className="uno-card-vector-icon">
            <circle
              cx="28"
              cy="32"
              r="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="5"
            />
            <circle
              cx="37"
              cy="32"
              r="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="5"
              opacity="0.75"
            />
            <line
              x1="16"
              y1="45"
              x2="49"
              y2="19"
              stroke="currentColor"
              strokeWidth="5.5"
              strokeLinecap="round"
            />
          </svg>
          <span className="special-sub-tag">ALL</span>
        </div>
      );

    case 'discard_all':
      return (
        <div className="uno-card-special-stack">
          <div className="mini-stack-cards triple">
            <span className="mini-card-layer layer-1" />
            <span className="mini-card-layer layer-2" />
            <span className="mini-card-layer layer-3" />
          </div>
          <span className="special-sub-tag">DROP ALL</span>
        </div>
      );

    case 'wild':
      return (
        <div className="uno-wild-emblem">
          <div className="wild-quad-oval">
            <span className="wq wq-red" />
            <span className="wq wq-blue" />
            <span className="wq wq-yellow" />
            <span className="wq wq-green" />
          </div>
          <span className="wild-wordmark">WILD</span>
        </div>
      );

    case 'wild_color_roulette':
      return (
        <div className="uno-wild-emblem">
          <div className="wild-quad-oval">
            <span className="wq wq-red" />
            <span className="wq wq-blue" />
            <span className="wq wq-yellow" />
            <span className="wq wq-green" />
          </div>
          <span className="wild-wordmark">ROULETTE</span>
        </div>
      );

    case 'wild_draw4':
    case 'wild_reverse_draw4':
    case 'wild_draw6':
    case 'wild_draw10': {
      const plusText =
        value === 'wild_draw6'
          ? '+6'
          : value === 'wild_draw10'
          ? '+10'
          : value === 'wild_reverse_draw4'
          ? '⇄+4'
          : '+4';
      return (
        <div className="uno-wild-emblem is-draw-wild">
          <div className="wild-fanned-cards">
            <span className="wf-card wf-red" />
            <span className="wf-card wf-blue" />
            <span className="wf-card wf-green" />
            <span className="wf-card wf-yellow" />
          </div>
          <span className="wild-draw-amount">{plusText}</span>
        </div>
      );
    }
  }
}

export const UnoCard: React.FC<UnoCardProps> = ({
  card,
  size = 'md',
  playable = false,
  selected = false,
  dimmed = false,
  onClick,
  onMouseEnter,
  className = '',
  style,
}) => {
  const cornerText = getCornerLabel(card.value);
  const isSpecial = card.category !== 'number';
  const effectiveColorClass =
    card.color === 'wild' && card.chosenColor
      ? `color-wild chosen-${card.chosenColor}`
      : `color-${card.color}`;

  return (
    <div
      className={[
        'uno-physical-card',
        `size-${size}`,
        effectiveColorClass,
        isSpecial ? 'is-special-rank' : 'is-number-rank',
        playable ? 'is-playable' : '',
        selected ? 'is-selected' : '',
        dimmed ? 'is-dimmed' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      style={style}
    >
      {/* Card Outer Stock & 3D Bevel Frame */}
      <div className="uno-card-face">
        {/* Subtle linen/cardstock micro-grain */}
        <div className="uno-card-grain" />

        {/* Crisp metallic/ivory inner border */}
        <div className="uno-card-inner-frame">
          {/* Top-Left Corner Index */}
          <div className="uno-card-corner top-left">
            <span className="corner-val">{cornerText}</span>
            {isSpecial && <span className="corner-pip" />}
          </div>

          {/* Center Tilted Oval Track */}
          <div className="uno-card-oval-well">
            <div className="uno-card-oval-ring" />
            <div className="uno-card-center-art">{renderCenterArtwork(card)}</div>
          </div>

          {/* Bottom-Right Inverted Corner Index */}
          <div className="uno-card-corner bottom-right">
            <span className="corner-val">{cornerText}</span>
            {isSpecial && <span className="corner-pip" />}
          </div>
        </div>

        {/* Restrained Top-Down Table Specular Sheen */}
        <div className="uno-card-sheen" />
      </div>
    </div>
  );
};

interface UnoCardBackProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  style?: React.CSSProperties;
}

export const UnoCardBack: React.FC<UnoCardBackProps> = ({
  size = 'md',
  className = '',
  style,
}) => {
  return (
    <div
      className={`uno-physical-card-back size-${size} ${className}`}
      style={style}
    >
      <div className="card-back-surface">
        <div className="card-back-gold-border">
          <div className="card-back-oval">
            <span className="card-back-logo">UNO</span>
          </div>
        </div>
      </div>
    </div>
  );
};
