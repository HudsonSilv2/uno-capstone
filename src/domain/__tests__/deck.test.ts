import {
  buildDeck,
  shuffleDeck,
  cardPointValue,
  COLORS,
  ACTION_VALUES,
  WILD_VALUES,
  type UnoCard,
} from '../deck';

function countCards(deck: UnoCard[], color: string, value: string): number {
  return deck.filter((c) => c.color === color && c.value === value).length;
}

describe('buildDeck', () => {
  let deck: UnoCard[];

  beforeAll(() => {
    deck = buildDeck();
  });

  it('produces exactly 108 cards', () => {
    expect(deck).toHaveLength(108);
  });

  it('contains exactly 100 colored cards (25 per color × 4 colors)', () => {
    const colored = deck.filter((c) => c.color !== 'wild');
    expect(colored).toHaveLength(100);
  });

  it('contains exactly 8 wild cards (4 Wild Card + 4 Wild Draw Four)', () => {
    const wilds = deck.filter((c) => c.color === 'wild');
    expect(wilds).toHaveLength(8);
  });

  it('has exactly 1 zero card per color', () => {
    for (const color of COLORS) {
      expect(countCards(deck, color, '0')).toBe(1);
    }
  });

  it('has exactly 2 of each number card (1–9) per color', () => {
    for (const color of COLORS) {
      for (const value of ['1', '2', '3', '4', '5', '6', '7', '8', '9']) {
        expect(countCards(deck, color, value)).toBe(2);
      }
    }
  });

  it('has exactly 2 Skip cards per color', () => {
    for (const color of COLORS) {
      expect(countCards(deck, color, 'Skip')).toBe(2);
    }
  });

  it('has exactly 2 Reverse cards per color', () => {
    for (const color of COLORS) {
      expect(countCards(deck, color, 'Reverse')).toBe(2);
    }
  });

  it('has exactly 2 Draw Two cards per color', () => {
    for (const color of COLORS) {
      expect(countCards(deck, color, 'Draw Two')).toBe(2);
    }
  });

  it('has exactly 4 Wild Card cards', () => {
    expect(countCards(deck, 'wild', 'Wild Card')).toBe(4);
  });

  it('has exactly 4 Wild Draw Four cards', () => {
    expect(countCards(deck, 'wild', 'Wild Draw Four')).toBe(4);
  });

  it('returns a new array on each call (deck instances are independent)', () => {
    const deckA = buildDeck();
    const deckB = buildDeck();
    expect(deckA).not.toBe(deckB);
    expect(deckA).toEqual(deckB);
  });

  it('every card has a valid color', () => {
    const validColors = new Set([...COLORS, 'wild']);
    for (const card of deck) {
      expect(validColors.has(card.color)).toBe(true);
    }
  });

  it('every card has a valid value', () => {
    const validValues = new Set([
      '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
      ...ACTION_VALUES,
      ...WILD_VALUES,
    ]);
    for (const card of deck) {
      expect(validValues.has(card.value)).toBe(true);
    }
  });

  it('wild cards always have color "wild"', () => {
    const wilds = deck.filter((c) => WILD_VALUES.includes(c.value));
    expect(wilds.every((c) => c.color === 'wild')).toBe(true);
  });

  it('action and numbered cards never have color "wild"', () => {
    const nonWild = deck.filter((c) => !WILD_VALUES.includes(c.value));
    expect(nonWild.every((c) => c.color !== 'wild')).toBe(true);
  });
});

describe('shuffleDeck', () => {
  it('returns a new array with the same length', () => {
    const deck = buildDeck();
    const shuffled = shuffleDeck(deck);
    expect(shuffled).toHaveLength(deck.length);
    expect(shuffled).not.toBe(deck);
  });

  it('contains the same cards after shuffling (same multiset)', () => {
    const deck = buildDeck();
    const shuffled = shuffleDeck(deck);
    const sort = (d: UnoCard[]) =>
      [...d].sort((a, b) => `${a.color}${a.value}`.localeCompare(`${b.color}${b.value}`));
    expect(sort(shuffled)).toEqual(sort(deck));
  });

  it('does not mutate the original deck', () => {
    const deck = buildDeck();
    const original = [...deck];
    shuffleDeck(deck);
    expect(deck).toEqual(original);
  });
});

describe('cardPointValue', () => {
  it('returns face value for numbered cards', () => {
    expect(cardPointValue('0')).toBe(0);
    expect(cardPointValue('5')).toBe(5);
    expect(cardPointValue('9')).toBe(9);
  });

  it('returns 20 for action cards (Skip, Reverse, Draw Two)', () => {
    expect(cardPointValue('Skip')).toBe(20);
    expect(cardPointValue('Reverse')).toBe(20);
    expect(cardPointValue('Draw Two')).toBe(20);
  });

  it('returns 50 for wild cards (Wild Card, Wild Draw Four)', () => {
    expect(cardPointValue('Wild Card')).toBe(50);
    expect(cardPointValue('Wild Draw Four')).toBe(50);
  });
});
