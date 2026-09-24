import {
  ActiveColor,
  CardCategory,
  CardColor,
  CardValue,
  GameMode,
  UnoCardData,
} from '../types/uno';
import { sortHandCards } from './handSorting';

const COLORS: ActiveColor[] = ['red', 'blue', 'green', 'yellow'];

let cardIdCounter = 1;

function makeCard(
  color: CardColor,
  value: CardValue,
  category: CardCategory
): UnoCardData {
  const id = `card-${cardIdCounter++}-${color}-${value}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
  return {
    id,
    color,
    value,
    category,
    discardRotation: (Math.random() - 0.5) * 14,
    discardOffsetX: (Math.random() - 0.5) * 10,
    discardOffsetY: (Math.random() - 0.5) * 8,
  };
}

export function createDeck(mode: GameMode): UnoCardData[] {
  const deck: UnoCardData[] = [];

  for (const color of COLORS) {
    // Number cards 0-9
    deck.push(makeCard(color, '0', 'number'));
    for (let n = 1; n <= 9; n++) {
      const val = String(n) as CardValue;
      deck.push(makeCard(color, val, 'number'));
      deck.push(makeCard(color, val, 'number'));
    }

    // Standard specials: Skip, Reverse, Draw 2
    for (let i = 0; i < 2; i++) {
      deck.push(makeCard(color, 'skip', 'special'));
      deck.push(makeCard(color, 'reverse', 'special'));
      deck.push(makeCard(color, 'draw2', 'special'));
    }

    // No Mercy additional specials (Page 2 of Official Rulebook: Draw Four, Skip Everyone, Discard All)
    if (mode === 'no_mercy') {
      deck.push(makeCard(color, 'draw4', 'special'));
      deck.push(makeCard(color, 'skip_all', 'special'));
      deck.push(makeCard(color, 'discard_all', 'special'));
    }
  }

  // Wild cards
  for (let i = 0; i < 4; i++) {
    deck.push(makeCard('wild', 'wild', 'wild'));
    deck.push(makeCard('wild', 'wild_draw4', 'wild'));
  }

  if (mode === 'no_mercy') {
    for (let i = 0; i < 3; i++) {
      deck.push(makeCard('wild', 'wild_reverse_draw4', 'wild'));
      deck.push(makeCard('wild', 'wild_draw6', 'wild'));
      deck.push(makeCard('wild', 'wild_color_roulette', 'wild'));
    }
    for (let i = 0; i < 2; i++) {
      deck.push(makeCard('wild', 'wild_draw10', 'wild'));
    }
  }

  return shuffleDeck(deck);
}

export function shuffleDeck(cards: UnoCardData[]): UnoCardData[] {
  const copy = [...cards];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Crafts an initial 9-card showcase hand for the human player that contains
 * cards across Red, Blue, Green, Yellow, and Wild groups (with numbers before specials)
 * so the strict color-group sorting and visual gaps are immediately striking on launch.
 */
export function dealInitialHands(mode: GameMode): {
  playerHand: UnoCardData[];
  opponentHands: [UnoCardData[], UnoCardData[], UnoCardData[]];
  drawPile: UnoCardData[];
  discardPile: UnoCardData[];
  initialColor: ActiveColor;
} {
  const fullDeck = createDeck(mode);
  const remaining: UnoCardData[] = [];
  const playerHand: UnoCardData[] = [];

  // Pick a curated spread of real cards from the shuffled deck for the player's opening hand
  // so every color group (Red, Blue, Green, Yellow, Wild) & number/special order is demonstrated
  const desiredSpecs: Array<{ color: CardColor; isSpecial: boolean }> = [
    { color: 'red', isSpecial: false },
    { color: 'red', isSpecial: false },
    { color: 'red', isSpecial: true },
    { color: 'blue', isSpecial: false },
    { color: 'blue', isSpecial: true },
    { color: 'green', isSpecial: false },
    { color: 'green', isSpecial: true },
    { color: 'yellow', isSpecial: false },
    { color: 'wild', isSpecial: true },
  ];

  const usedIndices = new Set<number>();

  for (const spec of desiredSpecs) {
    const idx = fullDeck.findIndex(
      (c, i) =>
        !usedIndices.has(i) &&
        c.color === spec.color &&
        (spec.color === 'wild'
          ? true
          : spec.isSpecial
          ? c.category === 'special'
          : c.category === 'number')
    );
    if (idx !== -1) {
      usedIndices.add(idx);
      playerHand.push(fullDeck[idx]);
    }
  }

  fullDeck.forEach((c, i) => {
    if (!usedIndices.has(i)) remaining.push(c);
  });

  const opp1 = remaining.splice(0, 7);
  const opp2 = remaining.splice(0, 7);
  const opp3 = remaining.splice(0, 7);

  // Pick 3 under-cards for the discard stack + 1 top number card so the discard pile immediately looks like a physical stack
  const starterIdx = remaining.findIndex((c) => c.category === 'number');
  const topStarter =
    starterIdx !== -1 ? remaining.splice(starterIdx, 1)[0] : remaining.pop()!;
  topStarter.discardRotation = -4;
  topStarter.discardOffsetX = 0;
  topStarter.discardOffsetY = 0;

  const under1 = remaining.pop()!;
  under1.discardRotation = 7;
  under1.discardOffsetX = -5;
  under1.discardOffsetY = 3;

  const under2 = remaining.pop()!;
  under2.discardRotation = -11;
  under2.discardOffsetX = 4;
  under2.discardOffsetY = -3;

  const under3 = remaining.pop()!;
  under3.discardRotation = 14;
  under3.discardOffsetX = -3;
  under3.discardOffsetY = -4;

  const discardPile = [under3, under2, under1, topStarter];
  const initialColor: ActiveColor =
    topStarter.color === 'wild' ? 'green' : topStarter.color;

  return {
    playerHand: sortHandCards(playerHand),
    opponentHands: [
      sortHandCards(opp1),
      sortHandCards(opp2),
      sortHandCards(opp3),
    ],
    drawPile: remaining,
    discardPile,
    initialColor,
  };
}

export function getPenaltyValue(value: CardValue): number {
  switch (value) {
    case 'draw2':
      return 2;
    case 'draw4':
    case 'wild_draw4':
    case 'wild_reverse_draw4':
      return 4;
    case 'wild_draw6':
      return 6;
    case 'wild_draw10':
      return 10;
    default:
      return 0;
  }
}

export function canPlayCard(
  card: UnoCardData,
  topCard: UnoCardData,
  activeColor: ActiveColor,
  pendingPenalty: number
): boolean {
  // If there is an active draw penalty stack, only draw cards of >= penalty value can stack
  if (pendingPenalty > 0) {
    const cardPen = getPenaltyValue(card.value);
    const topPen = getPenaltyValue(topCard.value);
    return cardPen > 0 && cardPen >= topPen;
  }

  if (card.color === 'wild') {
    return true;
  }

  if (card.color === activeColor) {
    return true;
  }

  if (card.value === topCard.value) {
    return true;
  }

  return false;
}
