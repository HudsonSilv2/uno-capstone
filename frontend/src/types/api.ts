/*
  Back-end API contracts.

  These types mirror exactly what Express returns. Nothing here is made up on
  the client: the server is the single source of truth about the game state.
*/

export type CardColor = 'red' | 'blue' | 'yellow' | 'green' | 'wild';

export type CardValue =
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

export type GameStatus = 'waiting' | 'in_progress' | 'finished';

export type Direction = 'clockwise' | 'counter-clockwise';

export interface Player {
  id: number;
  name: string;
  email: string;
  createdAt?: string;
}

export interface Session {
  token: string;
  player: Player;
}

export interface Card {
  id: number;
  color: CardColor;
  value: CardValue;
}

/* GET /api/games/:id/discard returns nulls while the discard pile is empty. */
export interface TopDiscard {
  id: number | null;
  color: CardColor | null;
  value: CardValue | null;
}

export interface Game {
  id: number;
  title: string;
  status: GameStatus;
  maxPlayers: number;
  currentPlayerId: number | null;
  direction: Direction;
  createdAt?: string;
}

export interface GamePlayer {
  id: number;
  name: string;
  email: string;
  joinedAt: string;
  saidUno: boolean;
}

export interface GameStatePlayer {
  id: number;
  name: string;
  cardCount: number;
  saidUno: boolean;
}

/* GET /api/games/:id/state - the hand returned is only the authenticated player's. */
export interface GameState {
  id: number;
  title: string;
  status: GameStatus;
  maxPlayers: number;
  currentPlayerId: number | null;
  direction: Direction;
  topDiscard: Card | null;
  players: GameStatePlayer[];
  hand: Card[];
}

export interface TurnResult {
  gameId: number;
  previousPlayerId?: number;
  currentPlayerId: number | null;
  currentPlayer?: { id: number; name: string; email?: string };
  direction: Direction;
  drawEffect?: {
    targetPlayerId: number;
    targetPlayerName: string;
    cardsDrawn: number;
  };
}

export interface PlayerScore {
  playerId: number;
  playerName: string;
  score: number;
}

export interface RoundResult {
  gameId: number;
  status: GameStatus;
  winner: PlayerScore;
  scores: PlayerScore[];
}

/*
  POST /api/games/:id/play returns the turn result or, when the player empties
  their hand, the round result. roundFinished tells the two cases apart.
*/
export type PlayCardResult = { playedCard: Card } & (
  | ({ roundFinished: true } & RoundResult)
  | ({ roundFinished: false } & TurnResult)
);

export interface DrawCardResult {
  gameId: number;
  currentPlayerId: number | null;
  drawnCard: Card;
  canPlayDrawnCard: boolean;
  direction?: Direction;
}

export interface StartGameResult {
  gameId: number;
  status: GameStatus;
  direction: Direction;
  totalCards: number;
  players: Array<{ id: number; name: string; cardsDealt: number }>;
}

export interface ScoreEntry {
  id: string;
  playerId: string;
  playerName: string | null;
  gameId: string;
  score: number;
  timestamp: string;
}

export interface UnoCallResult {
  gameId: number;
  playerId: number;
  saidUno: boolean;
}
