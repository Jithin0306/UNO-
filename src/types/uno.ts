export type CardColor = 'red' | 'blue' | 'green' | 'yellow' | 'wild';
export type ActiveColor = 'red' | 'blue' | 'green' | 'yellow';

export type NumberValue = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';

export type ColoredSpecialValue =
  | 'skip'
  | 'reverse'
  | 'draw2'
  | 'skip_all'
  | 'discard_all';

export type WildSpecialValue =
  | 'wild'
  | 'wild_draw4'
  | 'wild_reverse_draw4'
  | 'wild_draw6'
  | 'wild_draw10';

export type CardValue = NumberValue | ColoredSpecialValue | WildSpecialValue;

export type CardCategory = 'number' | 'special' | 'wild';

export interface UnoCardData {
  id: string;
  color: CardColor;
  value: CardValue;
  category: CardCategory;
  /** Assigned when a Wild card is played onto the discard pile */
  chosenColor?: ActiveColor;
  /** Organic slight rotation & offset when resting on the discard pile */
  discardRotation?: number;
  discardOffsetX?: number;
  discardOffsetY?: number;
}

export type SeatPosition = 'bottom' | 'left' | 'top' | 'right';

export interface Player {
  id: string;
  name: string;
  title: string;
  seat: SeatPosition;
  avatarUrl: string;
  accentColor: string;
  hand: UnoCardData[];
  isAI: boolean;
  calledUno: boolean;
}

export type GameMode = 'no_mercy' | 'classic';

export interface CardFlight {
  id: string;
  card: UnoCardData;
  fromSeat: SeatPosition | 'draw_pile';
  toSeat: SeatPosition | 'discard_pile';
  faceUp: boolean;
  delayMs?: number;
}

export type SpecialEffectType =
  | 'reverse'
  | 'skip'
  | 'draw_penalty'
  | 'seven_swap'
  | 'zero_rotate'
  | 'wild_shift'
  | 'discard_all';

export interface TableSpecialEffect {
  id: string;
  type: SpecialEffectType;
  color: ActiveColor;
  targetSeat?: SeatPosition;
  sourceSeat?: SeatPosition;
  label?: string;
  penaltyAmount?: number;
}
