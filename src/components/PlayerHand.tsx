import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ActiveColor, UnoCardData } from '../types/uno';
import { groupSortedHandByColor } from '../utils/handSorting';
import { canPlayCard } from '../utils/deckBuilder';
import { UnoCard } from './UnoCard';
import { soundFX } from '../utils/soundEffects';

interface PlayerHandProps {
  cards: UnoCardData[];
  topCard: UnoCardData;
  activeColor: ActiveColor;
  isPlayerTurn: boolean;
  pendingPenalty: number;
  onPlayCard: (card: UnoCardData) => void;
}

export const PlayerHand: React.FC<PlayerHandProps> = ({
  cards,
  topCard,
  activeColor,
  isPlayerTurn,
  pendingPenalty,
  onPlayCard,
}) => {
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [winWidth, setWinWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1366
  );

  useEffect(() => {
    const onResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Automatically sort and partition into strict color groups:
  // RED (numbers -> specials) | BLUE (numbers -> specials) | GREEN | YELLOW | WILD
  const colorGroups = groupSortedHandByColor(cards);
  const totalCards = cards.length;
  const groupCount = colorGroups.length;

  /**
   * Exact responsive geometry so 100% of cards ALWAYS fit within the screen
   * at 100% default browser zoom (no horizontal clipping or off-screen overflow):
   * - Card width for `md` is 102px, `lg` is 116px.
   * - Each overlap card adds `(cardWidthPx + overlapMarginPx)` to total width.
   * - Therefore: `overlapMarginPx = ((availableW - totalGroupGaps - groupCount * cardWidthPx) / totalOverlaps) - cardWidthPx`.
   */
  const useCompactCardSize = totalCards >= 11 || winWidth < 1360;
  const cardWidthPx = useCompactCardSize ? 102 : 116;

  // Leave generous horizontal safety margin (80px total) so even rotated edge cards stay 100% inside the 100% zoom viewport
  const availableW = Math.max(340, winWidth - 84);

  // Gap between color groups (Red | Blue | Green | Yellow | Wild)
  const groupGapPx =
    totalCards <= 9
      ? 22
      : totalCards <= 14
      ? 16
      : totalCards <= 19
      ? 12
      : 9;

  const totalGroupGapsWidth = Math.max(0, groupCount - 1) * groupGapPx;
  const totalOverlapsCount = Math.max(1, totalCards - groupCount);

  // Net horizontal advance allowed per overlapping card so the entire hand fits in `availableW`
  const allowedStepPerOverlap =
    (availableW - totalGroupGapsWidth - groupCount * cardWidthPx) /
    totalOverlapsCount;

  // Convert step advance to CSS `margin-left`: `margin = step - cardWidthPx`
  const rawNegativeMargin = Math.floor(allowedStepPerOverlap - cardWidthPx);

  // Keep at least 24px of each card's left edge visible so corner numbers/symbols are always readable
  const minOverlapMargin = -(cardWidthPx - 24);
  const maxOverlapMargin = useCompactCardSize ? -38 : -36;
  const dynamicOverlapMarginPx = Math.max(
    minOverlapMargin,
    Math.min(maxOverlapMargin, rawNegativeMargin)
  );

  // Compute exact resulting row width; if still wider than `availableW` (e.g., 22-24 cards on a small laptop),
  // scale the row down proportionally so 100% of cards are guaranteed visible on screen at 100% zoom!
  const estimatedRowWidth =
    totalGroupGapsWidth +
    groupCount * cardWidthPx +
    totalOverlapsCount * (cardWidthPx + dynamicOverlapMarginPx);

  const rowAutoScale =
    estimatedRowWidth > availableW
      ? Math.max(0.68, (availableW - 16) / estimatedRowWidth)
      : 1;

  let runningCardIndex = 0;

  return (
    <div className="player-foreground-hand-stage">
      {/* Subtle Ambient Turn Glow beneath the Player's Hand on the Felt */}
      <div
        className={`player-hand-felt-aura ${
          isPlayerTurn ? 'is-active-turn' : ''
        }`}
      />

      <div className="player-hand-scroll-viewport">
        <motion.div
          layout
          className="player-hand-groups-row"
          style={{
            gap: `${groupGapPx}px`,
            transform: `scale(${rowAutoScale})`,
            transformOrigin: 'bottom center',
          }}
        >
          <AnimatePresence initial={false} mode="popLayout">
            {colorGroups.map((group, groupIdx) => {
              const normalizedGroupOffset =
                groupCount > 1 ? groupIdx / (groupCount - 1) - 0.5 : 0;

              return (
                <motion.div
                  layout
                  key={`color-group-${group.color}`}
                  className={`hand-color-cluster cluster-${group.color}`}
                  initial={{ opacity: 0, y: 24, scale: 0.9 }}
                  animate={{
                    opacity: 1,
                    y: Math.abs(normalizedGroupOffset) * 5,
                    scale: 1,
                  }}
                  exit={{ opacity: 0, scale: 0.85, y: 15 }}
                  transition={{
                    type: 'spring',
                    stiffness: 290,
                    damping: 26,
                  }}
                >
                  {/* Subtle glowing color bar reflected onto the table surface under each color group */}
                  <div
                    className={`cluster-felt-reflection reflection-${group.color}`}
                  />

                  <div className="cluster-cards-fan">
                    {group.cards.map((card, idxInGroup) => {
                      const globalIndex = runningCardIndex++;
                      const normalizedPos =
                        totalCards > 1
                          ? (globalIndex / (totalCards - 1)) * 2 - 1
                          : 0;

                      const fanAngle =
                        normalizedPos * (totalCards > 16 ? 5.5 : 8.5);
                      const archDrop =
                        Math.pow(Math.abs(normalizedPos), 1.6) * 8;

                      const isPlayable =
                        isPlayerTurn &&
                        canPlayCard(card, topCard, activeColor, pendingPenalty);
                      const isHovered = hoveredCardId === card.id;

                      return (
                        <motion.div
                          layout
                          key={card.id}
                          className={`hand-card-slot ${
                            idxInGroup > 0 ? 'overlap-prev' : 'first-in-group'
                          } ${isHovered ? 'is-hovered' : ''} ${
                            isPlayable ? 'slot-playable' : 'slot-idle'
                          }`}
                          initial={{
                            opacity: 0,
                            y: -70,
                            scale: 0.7,
                            rotate: -8,
                          }}
                          animate={{
                            opacity: 1,
                            y: isHovered
                              ? -38
                              : isPlayable
                              ? archDrop - 6
                              : archDrop,
                            scale: isHovered ? 1.16 : 1,
                            rotate: isHovered ? 0 : fanAngle,
                          }}
                          exit={{
                            opacity: 0,
                            y: -120,
                            scale: 0.82,
                            rotate: 5,
                            transition: { duration: 0.2 },
                          }}
                          transition={{
                            type: 'spring',
                            stiffness: 360,
                            damping: 26,
                            mass: 0.72,
                          }}
                          style={{
                            marginLeft:
                              idxInGroup > 0
                                ? `${dynamicOverlapMarginPx}px`
                                : '0px',
                            zIndex: isHovered ? 200 : 20 + globalIndex,
                          }}
                          onMouseEnter={() => {
                            setHoveredCardId(card.id);
                            soundFX.playCardHover();
                          }}
                          onMouseLeave={() => {
                            setHoveredCardId((prev) =>
                              prev === card.id ? null : prev
                            );
                          }}
                        >
                          <UnoCard
                            card={card}
                            size={useCompactCardSize ? 'md' : 'lg'}
                            playable={isPlayable}
                            dimmed={isPlayerTurn && !isPlayable}
                            onClick={() => {
                              if (isPlayable) {
                                onPlayCard(card);
                              }
                            }}
                          />
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};
