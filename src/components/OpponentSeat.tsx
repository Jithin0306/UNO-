import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player } from '../types/uno';
import { UnoCardBack } from './UnoCard';

interface OpponentSeatProps {
  player: Player;
  isActiveTurn: boolean;
  isSkipped?: boolean;
  selectableForSwap?: boolean;
  onSelectForSwap?: (playerId: string) => void;
}

export const OpponentSeat: React.FC<OpponentSeatProps> = ({
  player,
  isActiveTurn,
  isSkipped = false,
  selectableForSwap = false,
  onSelectForSwap,
}) => {
  const cardCount = player.hand.length;
  // Cap visual fan to 10 backs so large penalties remain clean while showing accurate count
  const visibleFanCount = Math.min(cardCount, 10);

  return (
    <div
      className={[
        'opponent-table-station',
        `seat-${player.seat}`,
        isActiveTurn ? 'is-active-turn' : '',
        selectableForSwap ? 'is-swap-target' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={() => {
        if (selectableForSwap && onSelectForSwap) {
          onSelectForSwap(player.id);
        }
      }}
    >
      {/* Subtle Felt Glow Under the Active Opponent */}
      <div className="opponent-table-glow" />

      {/* Sleek Minimal Player Identity Badge */}
      <div className="opponent-hud-pill">
        <div className="opponent-avatar-frame">
          <img
            src={player.avatarUrl}
            alt={player.name}
            className="opponent-avatar-img"
          />
          {isActiveTurn && <span className="avatar-turn-ring" />}
        </div>

        <div className="opponent-meta">
          <div className="opponent-name-row">
            <span className="opponent-username">{player.name}</span>
            <span className="opponent-card-count">({cardCount})</span>
          </div>
          <div className="opponent-status-sub">
            {isActiveTurn ? (
              <span className="status-thinking">PLAYING TURN...</span>
            ) : cardCount === 1 ? (
              <span className="status-uno-alert">UNO!</span>
            ) : (
              <span className="status-role">{player.title}</span>
            )}
          </div>
        </div>

        {selectableForSwap && (
          <div className="swap-target-cta">SWAP HAND (7)</div>
        )}
      </div>

      {/* Physical Overlapping Card-Back Fan Resting on the Pool Table Felt */}
      <div className="opponent-felt-card-fan">
        <AnimatePresence initial={false}>
          {Array.from({ length: visibleFanCount }).map((_, idx) => {
            const mid = (visibleFanCount - 1) / 2;
            const delta = idx - mid;
            const fanDeg = delta * 7.5;
            const arcY = Math.abs(delta) * 2.2;

            return (
              <motion.div
                key={`${player.id}-back-${idx}`}
                className="opponent-fan-card-slot"
                initial={{ opacity: 0, scale: 0.6, y: -15 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  rotate: fanDeg,
                  y: arcY,
                }}
                exit={{ opacity: 0, scale: 0.5, y: 15 }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                style={{
                  zIndex: idx + 1,
                }}
              >
                <UnoCardBack size="xs" />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Skip / Penalty Table Pulse Overlay */}
      <AnimatePresence>
        {isSkipped && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1.05, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="opponent-skip-badge"
          >
            ⊘ SKIPPED
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
