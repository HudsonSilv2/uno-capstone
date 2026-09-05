export type UnoColor = 'red' | 'blue' | 'yellow' | 'green' | 'wild';

export type UnoValue =
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | 'Skip'
  | 'Reverse'
  | 'Draw Two'
  | 'Wild Card'
  | 'Wild Draw Four';

export interface UnoCard {
  color: UnoColor;
  value: UnoValue;
}

export const COLORS: ReadonlyArray<Exclude<UnoColor, 'wild'>> = [
  'red',
  'blue',
  'yellow',
  'green',
];

export const NUMBERED_VALUES: ReadonlyArray<UnoValue> = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
];

export const ACTION_VALUES: ReadonlyArray<UnoValue> = ['Skip', 'Reverse', 'Draw Two'];

export const WILD_VALUES: ReadonlyArray<UnoValue> = ['Wild Card', 'Wild Draw Four'];

export function buildDeck(): UnoCard[] {
  const deck: UnoCard[] = [];

  for (const color of COLORS) {
    deck.push({ color, value: '0' });

    for (const value of NUMBERED_VALUES) {
      deck.push({ color, value });
      deck.push({ color, value });
    }

    for (const value of ACTION_VALUES) {
      deck.push({ color, value });
      deck.push({ color, value });
    }
  }

  for (const value of WILD_VALUES) {
    for (let i = 0; i < 4; i++) {
      deck.push({ color: 'wild', value });
    }
  }

  return deck;
}

export function shuffleDeck<T>(deck: ReadonlyArray<T>): T[] {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function cardPointValue(value: UnoValue): number {
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  if (ACTION_VALUES.includes(value as UnoValue)) return 20;
  return 50;
}
