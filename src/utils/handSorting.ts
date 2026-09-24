import { CardColor, CardValue, UnoCardData } from '../types/uno';

const COLOR_ORDER: Record<CardColor, number> = {
  red: 1,
  blue: 2,
  green: 3,
  yellow: 4,
  wild: 5,
};

const NUMBER_ORDER: Record<string, number> = {
  '0': 0,
  '1': 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
};

/**
 * Within special cards:
 * Skip → Reverse → Draw 2 → No Mercy additional specials (Skip Everyone → Discard All)
 * Within wild cards:
 * Wild → Wild +4 → Wild Reverse +4 → Wild +6 → Wild +10
 */
const SPECIAL_VALUE_ORDER: Record<CardValue, number> = {
  '0': 0,
  '1': 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  skip: 20,
  reverse: 21,
  draw2: 22,
  draw4: 23,
  skip_all: 24,
  discard_all: 25,
  wild: 40,
  wild_draw4: 41,
  wild_reverse_draw4: 42,
  wild_draw6: 43,
  wild_draw10: 44,
  wild_color_roulette: 45,
};

/**
 * Strict deterministic sort comparator for UNO cards:
 * 1. Red number cards (0->9)
 * 2. Red special cards (Skip -> Reverse -> Draw 2 -> No Mercy specials)
 * 3. Blue number cards (0->9)
 * 4. Blue special cards
 * 5. Green number cards (0->9)
 * 6. Green special cards
 * 7. Yellow number cards (0->9)
 * 8. Yellow special cards
 * 9. Wild/colorless cards (Wild -> +4 -> Reverse +4 -> +6 -> +10)
 */
export function compareUnoCards(a: UnoCardData, b: UnoCardData): number {
  const colorDiff = COLOR_ORDER[a.color] - COLOR_ORDER[b.color];
  if (colorDiff !== 0) return colorDiff;

  // Number cards ALWAYS appear before special cards of the same color
  const isANumber = a.category === 'number' ? 0 : 1;
  const isBNumber = b.category === 'number' ? 0 : 1;
  if (isANumber !== isBNumber) return isANumber - isBNumber;

  if (a.category === 'number' && b.category === 'number') {
    const numDiff = (NUMBER_ORDER[a.value] ?? 0) - (NUMBER_ORDER[b.value] ?? 0);
    if (numDiff !== 0) return numDiff;
  } else {
    const specDiff =
      (SPECIAL_VALUE_ORDER[a.value] ?? 99) - (SPECIAL_VALUE_ORDER[b.value] ?? 99);
    if (specDiff !== 0) return specDiff;
  }

  return a.id.localeCompare(b.id);
}

export function sortHandCards(cards: UnoCardData[]): UnoCardData[] {
  return [...cards].sort(compareUnoCards);
}

export interface SortedHandGroup {
  color: CardColor;
  cards: UnoCardData[];
}

/**
 * Groups an already-sorted hand into color clusters:
 * RED -> BLUE -> GREEN -> YELLOW -> WILD
 */
export function groupSortedHandByColor(cards: UnoCardData[]): SortedHandGroup[] {
  const sorted = sortHandCards(cards);
  const groups: SortedHandGroup[] = [];

  for (const card of sorted) {
    const lastGroup = groups[groups.length - 1];
    if (!lastGroup || lastGroup.color !== card.color) {
      groups.push({
        color: card.color,
        cards: [card],
      });
    } else {
      lastGroup.cards.push(card);
    }
  }

  return groups;
}
