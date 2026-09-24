import React, { useState } from 'react';
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

  // Automatically sort and partition into strict color groups:
  // RED (numbers -> specials) | BLUE (numbers -> specials) | GREEN | YELLOW | WILD
  const colorGroups = groupSortedHandByColor(cards);
  const totalCards = cards.length;
  const groupCount = colorGroups.length;

  /**
   * Dynamic responsive spacing so 20, 25, or 40+ cards fit comfortably inside the screen
   * without overflowing horizontally or sinking off the bottom edge of the viewport:
   * - Card width for `md`/`lg` is ~102px-116px.
   * - We dynamically adjust `overlapMarginPx`, `groupGapPx`, and `cardSize` based on `totalCards`.
   */
  const useCompactCardSize = totalCards >= 16;
  const cardWidthPx = useCompactCardSize ? 96 : 114;

  // Available safe horizontal width on desktop/laptop (~88% of viewport width)
  const viewportW =
    typeof window !== 'undefined' ? Math.min(window.innerWidth * 0.92, 1680) : 1360;

  // Gap between color groups (Red | Blue | Green | Yellow | Wild)
  const groupGapPx =
    totalCards <= 10
      ? 26
      : totalCards <= 16
      ? 20
      : totalCards <= 24
      ? 16
      : 13;

  const totalGroupGapsWidth = Math.max(0, groupCount - 1) * groupGapPx;
  const totalOverlapsCount = Math.max(1, totalCards - groupCount);

  // Calculate ideal negative margin so the entire hand fits within `viewportW`
  const rawRequiredStep =
    (viewportW - totalGroupGapsWidth - groupCount * cardWidthPx) /
    totalOverlapsCount;

  // Clamp negative overlap so corner numbers/symbols always stay readable (min 22px visible strip per card)
  const minOverlapMargin = -(cardWidthPx - 23);
  const maxOverlapMargin = useCompactCardSize ? -34 : -36;
  const dynamicOverlapMarginPx = Math.max(
    minOverlapMargin,
    Math.min(maxOverlapMargin, Math.floor(rawRequiredStep))
  );

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
          style={{ gap: `${groupGapPx}px` }}
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
                    // Clamp group vertical curve to max 6px so large hands never sink off-screen
                    y: Math.abs(normalizedGroupOffset) * 6,
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
                          ? (globalIndex / (totalCards - 1)) * 2 - 1 // Always in range [-1, +1] regardless of card count!
                          : 0;

                      // Bounded fan angle (max ±9deg even with 35 cards!) and bounded arch drop (max 10px!)
                      const fanAngle = normalizedPos * (totalCards > 18 ? 6.5 : 9.5);
                      const archDrop = Math.pow(Math.abs(normalizedPos), 1.6) * 9;

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
                            y: isHovered ? -38 : isPlayable ? archDrop - 6 : archDrop,
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
                              idxInGroup > 0 ? `${dynamicOverlapMarginPx}px` : '0px',
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
