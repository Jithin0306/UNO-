import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CardFlight, SeatPosition, TableSpecialEffect } from '../types/uno';
import { UnoCard, UnoCardBack } from './UnoCard';

interface CardFlightLayerProps {
  flights: CardFlight[];
  effects: TableSpecialEffect[];
}

// Normalized coordinates (% of viewport/stage) for seats and center piles
const SEAT_COORDS: Record<SeatPosition | 'draw_pile' | 'discard_pile', { x: string; y: string; rot: number }> = {
  bottom: { x: '50%', y: '82%', rot: 0 },
  left: { x: '16%', y: '48%', rot: 75 },
  top: { x: '50%', y: '18%', rot: 180 },
  right: { x: '84%', y: '48%', rot: -75 },
  draw_pile: { x: '44.5%', y: '46.5%', rot: -6 },
  discard_pile: { x: '55.5%', y: '46.5%', rot: 5 },
};

export const CardFlightLayer: React.FC<CardFlightLayerProps> = ({
  flights,
  effects,
}) => {
  return (
    <div className="table-flight-and-fx-layer" aria-hidden="true">
      {/* 1. Flying Cards (Play to Discard & Draw from Stack) */}
      <AnimatePresence>
        {flights.map((flight) => {
          const from = SEAT_COORDS[flight.fromSeat];
          const to = SEAT_COORDS[flight.toSeat];

          return (
            <motion.div
              key={flight.id}
              className="flying-card-actor"
              initial={{
                left: from.x,
                top: from.y,
                scale: flight.fromSeat === 'bottom' ? 1.08 : 0.72,
                rotate: from.rot,
                opacity: 0.95,
              }}
              animate={{
                left: to.x,
                top: to.y,
                scale: flight.toSeat === 'bottom' ? 1.02 : 0.86,
                rotate: to.rot + (flight.card.discardRotation ?? 0),
                opacity: 1,
              }}
              exit={{
                scale: 0.92,
                opacity: 0,
                transition: { duration: 0.12 },
              }}
              transition={{
                duration: 0.44,
                delay: (flight.delayMs ?? 0) / 1000,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <div className="flying-card-shadow-wrapper">
                {flight.faceUp ? (
                  <UnoCard card={flight.card} size="md" />
                ) : (
                  <UnoCardBack size="md" />
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* 2. Subtle Table Special Effect Animations */}
      <AnimatePresence>
        {effects.map((fx) => {
          if (fx.type === 'reverse') {
            return (
              <motion.div
                key={fx.id}
                className="fx-reverse-orbit-ring"
                initial={{ scale: 0.65, opacity: 0, rotate: 0 }}
                animate={{ scale: 1.25, opacity: [0, 0.9, 0], rotate: 220 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
              >
                <div className="fx-reverse-ring-graphic" />
                <span className="fx-center-callout">{fx.label || 'REVERSE'}</span>
              </motion.div>
            );
          }

          if (fx.type === 'draw_penalty' && fx.targetSeat) {
            const targetPos = SEAT_COORDS[fx.targetSeat];
            return (
              <motion.div
                key={fx.id}
                className="fx-seat-penalty-pulse"
                style={{ left: targetPos.x, top: targetPos.y }}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: [0.7, 1.2, 1.05], opacity: [0, 1, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.05 }}
              >
                <div className="penalty-shockwave" />
                <span className="penalty-floating-text">
                  +{fx.penaltyAmount ?? 2} CARDS
                </span>
              </motion.div>
            );
          }

          if (fx.type === 'seven_swap' || fx.type === 'zero_rotate') {
            return (
              <motion.div
                key={fx.id}
                className="fx-table-swap-sweep"
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1.15, opacity: [0, 0.95, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.0 }}
              >
                <div className="swap-orbit-arrows" />
                <span className="fx-center-callout">
                  {fx.label || (fx.type === 'seven_swap' ? '7 • HAND SWAP' : '0 • HANDS ROTATE')}
                </span>
              </motion.div>
            );
          }

          return (
            <motion.div
              key={fx.id}
              className="fx-generic-callout"
              initial={{ y: 12, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: [0, 1, 0], scale: 1.04 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.85 }}
            >
              <span className="fx-center-callout">{fx.label}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
