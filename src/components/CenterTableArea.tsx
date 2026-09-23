import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ActiveColor, UnoCardData } from '../types/uno';
import { UnoCard, UnoCardBack } from './UnoCard';

interface CenterTableAreaProps {
  drawPileCount: number;
  discardPile: UnoCardData[];
  activeColor: ActiveColor;
  direction: 1 | -1;
  isPlayerTurn: boolean;
  pendingPenalty: number;
  onDrawCard: () => void;
}

const COLOR_HEX_MAP: Record<ActiveColor, { glow: string; label: string }> = {
  red: { glow: '#ef4444', label: 'RED' },
  blue: { glow: '#3b82f6', label: 'BLUE' },
  green: { glow: '#22c55e', label: 'GREEN' },
  yellow: { glow: '#eab308', label: 'YELLOW' },
};

export const CenterTableArea: React.FC<CenterTableAreaProps> = ({
  drawPileCount,
  discardPile,
  activeColor,
  direction,
  isPlayerTurn,
  pendingPenalty,
  onDrawCard,
}) => {
  // Show the last 6 cards in the discard stack so previous plays remain visible underneath
  const visibleDiscardStack = discardPile.slice(-6);
  const colorMeta = COLOR_HEX_MAP[activeColor];

  // Physical stack layers for the draw pile (up to 10 visible 3D slices)
  const stackSlices = Math.min(10, Math.max(3, Math.ceil(drawPileCount / 8)));

  return (
    <div className="center-table-focal-zone">
      {/* Felt-inlaid UNO Table Watermark above the center ring */}
      <div className="felt-inlay-header" aria-hidden="true">
        <span className="inlay-diamonds">◆ ◆ ◆</span>
        <span className="inlay-brand">UNO</span>
        <span className="inlay-diamonds">◆ ◆ ◆</span>
      </div>

      {/* Subtle Pulsing Active Color Ring & Orb on the Pool Table Felt */}
      <div
        className={`table-color-ring-assembly active-color-${activeColor} ${
          direction === 1 ? 'dir-cw' : 'dir-ccw'
        }`}
        style={
          {
            '--active-color-hex': colorMeta.glow,
          } as React.CSSProperties
        }
      >
        {/* Outer soft felt illumination halo */}
        <div className="table-color-ambient-glow" />

        {/* Recessed glowing ring channel embedded in the table */}
        <div className="table-color-ring-track">
          <div className="table-color-orbit-ticks" />
        </div>

        {/* Soft Glowing Color Orb Indicator */}
        <div className="table-color-orb-pill" title={`Active Color: ${colorMeta.label}`}>
          <span className="color-orb-light" />
          <span className="color-orb-name">{colorMeta.label}</span>
          <span className="color-orb-dir">{direction === 1 ? '↻' : '↺'}</span>
        </div>

        {/* Active Draw Penalty Stack Indicator (if +2 / +4 / +6 / +10 is active) */}
        <AnimatePresence>
          {pendingPenalty > 0 && (
            <motion.div
              key="penalty-badge"
              initial={{ scale: 0.6, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.6, opacity: 0 }}
              className="center-penalty-stack-pill"
            >
              <span className="penalty-pulse-dot" />
              <span>STACK PENALTY +{pendingPenalty}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* DRAW PILE & DISCARD PILE Side-by-Side Physical Stacks */}
        <div className="center-piles-container">
          {/* DRAW PILE */}
          <div
            className={`physical-pile-slot draw-pile-slot ${
              isPlayerTurn ? 'is-interactive' : ''
            }`}
            onClick={() => {
              if (isPlayerTurn) onDrawCard();
            }}
            role="button"
            tabIndex={0}
            aria-label="Draw Card from Pile"
          >
            <div className="pile-3d-stack-wrapper">
              {/* Deep contact shadow on the felt */}
              <div className="pile-contact-shadow" />

              {/* Underlying 3D card thickness slices */}
              {Array.from({ length: stackSlices }).map((_, idx) => {
                const depthOffset = (stackSlices - idx) * 2.2;
                return (
                  <div
                    key={idx}
                    className="draw-stack-slice"
                    style={{
                      transform: `translate3d(${-depthOffset * 0.45}px, ${depthOffset}px, ${-depthOffset}px) rotate(-3deg)`,
                    }}
                  />
                );
              })}

              {/* Top Interactive Draw Card Back */}
              <motion.div
                className="draw-pile-top-card"
                whileHover={
                  isPlayerTurn
                    ? {
                        y: -8,
                        rotate: -1.5,
                        scale: 1.03,
                      }
                    : {}
                }
                whileTap={isPlayerTurn ? { scale: 0.97 } : {}}
                transition={{ type: 'spring', stiffness: 360, damping: 24 }}
              >
                <UnoCardBack size="md" />
              </motion.div>
            </div>
            <div className="pile-subtle-caption">
              <span>DRAW</span>
              <span className="pile-count-num">{drawPileCount}</span>
            </div>
          </div>

          {/* DISCARD PILE */}
          <div className="physical-pile-slot discard-pile-slot">
            <div className="pile-3d-stack-wrapper discard-stack-wrapper">
              {/* Deep contact shadow on the felt */}
              <div className="pile-contact-shadow discard-shadow" />

              {/* Stack of previously played cards remaining visible underneath */}
              <AnimatePresence initial={false}>
                {visibleDiscardStack.map((card, index) => {
                  const isTop = index === visibleDiscardStack.length - 1;
                  const rot = card.discardRotation ?? (index % 2 === 0 ? 5 : -6);
                  const offX = card.discardOffsetX ?? (index - 2) * 2.5;
                  const offY = card.discardOffsetY ?? (index - 2) * 1.8;
                  const stackElevation = index * 1.8;

                  return (
                    <motion.div
                      key={card.id}
                      className={`discard-stacked-card ${isTop ? 'is-top-discard' : 'is-under-discard'}`}
                      initial={{
                        opacity: 0,
                        scale: 1.38,
                        y: 95,
                        rotate: rot - 14,
                      }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                        x: offX,
                        y: offY - stackElevation,
                        rotate: rot,
                      }}
                      transition={{
                        type: 'spring',
                        stiffness: 310,
                        damping: 24,
                        mass: 0.85,
                      }}
                      style={{
                        zIndex: 10 + index,
                      }}
                    >
                      <UnoCard
                        card={card}
                        size="md"
                        playable={false}
                        className={isTop ? 'top-discard-glow' : ''}
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
            <div className="pile-subtle-caption">
              <span>DISCARD</span>
              <span className="pile-count-num">{discardPile.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
