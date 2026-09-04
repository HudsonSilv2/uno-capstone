import type { Card, CardColor, CardValue, Direction, GameStatus } from '../types/api';

export const PLAYABLE_COLORS: Exclude<CardColor, 'wild'>[] = ['red', 'blue', 'yellow', 'green'];

export const COLOR_LABELS: Record<CardColor, string> = {
  red: 'Vermelho',
  blue: 'Azul',
  yellow: 'Amarelo',
  green: 'Verde',
  wild: 'Coringa',
};

const VALUE_LABELS: Partial<Record<CardValue, string>> = {
  Skip: 'Pular',
  Reverse: 'Reverter',
  'Draw Two': 'Compra 2',
  'Wild Card': 'Coringa',
  'Wild Draw Four': 'Coringa +4',
};

export function cardLabel(card: Card): string {
  const value = VALUE_LABELS[card.value] ?? card.value;
  return card.color === 'wild' ? value : `${COLOR_LABELS[card.color]} ${value}`;
}

export function isWild(card: Card): boolean {
  return card.color === 'wild';
}

/*
  GAME-05, mirrored on the client only to enable/disable cards in the hand.
  The back-end still validates every play; when the two readings disagree, the
  server's answer is the one that counts.

  When a wild card goes to the discard pile the back-end already stores the
  chosen color on it, so comparing against the top color is enough.
*/
export function isPlayable(card: Card, topDiscard: Card | null): boolean {
  if (!topDiscard) {
    return true;
  }
  if (card.color === 'wild') {
    return true;
  }
  return card.color === topDiscard.color || card.value === topDiscard.value;
}

export function hasPlayableCard(hand: Card[], topDiscard: Card | null): boolean {
  return hand.some((card) => isPlayable(card, topDiscard));
}

export const STATUS_LABELS: Record<GameStatus, string> = {
  waiting: 'Aguardando jogadores',
  in_progress: 'Em andamento',
  finished: 'Encerrada',
};

export const DIRECTION_LABELS: Record<Direction, string> = {
  clockwise: 'Horário',
  'counter-clockwise': 'Anti-horário',
};

/* Game rules the screens rely on (PART-04, PLAYER-01). */
export const MIN_PLAYERS_TO_START = 2;
export const MAX_PLAYERS_ALLOWED = 4;
