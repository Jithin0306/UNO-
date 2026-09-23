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

  // Flatten while tracking global card index and group index so we can calculate natural fan arc + inter-group gaps
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
        <motion.div layout className="player-hand-groups-row">
          <AnimatePresence initial={false} mode="popLayout">
            {colorGroups.map((group, groupIdx) => {
              // Subtle group angle inflection so each color cluster fans naturally toward the center
              const groupCount = colorGroups.length;
              const normalizedGroupOffset =
                groupCount > 1 ? groupIdx / (groupCount - 1) - 0.5 : 0;

              return (
                <motion.div
                  layout
                  key={`color-group-${group.color}`}
                  className={`hand-color-cluster cluster-${group.color}`}
                  initial={{ opacity: 0, y: 35, scale: 0.9 }}
                  animate={{
                    opacity: 1,
                    // Subtle vertical arch across color groups
                    y: Math.abs(normalizedGroupOffset) * 12,
                    scale: 1,
                  }}
                  exit={{ opacity: 0, scale: 0.85, y: 20 }}
                  transition={{
                    type: 'spring',
                    stiffness: 290,
                    damping: 26,
                  }}
                >
                  {/* Subtle glowing color bar reflected onto the table surface under each color group (no ugly text labels) */}
                  <div className={`cluster-felt-reflection reflection-${group.color}`} />

                  <div className="cluster-cards-fan">
                    {group.cards.map((card, idxInGroup) => {
                      const globalIndex = runningCardIndex++;
                      const centerIndex = (totalCards - 1) / 2;
                      const offsetFromCenter = globalIndex - centerIndex;

                      // Natural fan angle & vertical curve
                      const fanAngle = offsetFromCenter * 2.35;
                      const archDrop = Math.pow(Math.abs(offsetFromCenter), 1.55) * 1.45;

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
                            y: -90,
                            scale: 0.65,
                            rotate: -12,
                          }}
                          animate={{
                            opacity: 1,
                            y: isHovered ? -38 : isPlayable ? archDrop - 6 : archDrop,
                            scale: isHovered ? 1.14 : 1,
                            rotate: isHovered ? fanAngle * 0.2 : fanAngle,
                          }}
                          exit={{
                            opacity: 0,
                            y: -140,
                            scale: 0.82,
                            rotate: 6,
                            transition: { duration: 0.22 },
                          }}
                          transition={{
                            type: 'spring',
                            stiffness: 350,
                            damping: 26,
                            mass: 0.75,
                          }}
                          style={{
                            zIndex: isHovered ? 120 : 20 + globalIndex,
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
                            size="lg"
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
