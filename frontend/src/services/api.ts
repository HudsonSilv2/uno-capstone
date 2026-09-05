import { request, tokenStorage } from './http';
import type {
  CardColor,
  ChallengeResult,
  DrawCardResult,
  Game,
  GamePlayer,
  GameState,
  Player,
  PlayCardResult,
  ReadyResult,
  RoundResult,
  ScoreEntry,
  Session,
  StartGameResult,
  TopDiscard,
  TurnResult,
  UnoCallResult,
} from '../types/api';

export const authApi = {
  register(data: { name: string; email: string; password: string }): Promise<Player> {
    return request<Player>('/auth/register', { method: 'POST', body: data, auth: false });
  },

  login(data: { email: string; password: string }): Promise<Session> {
    return request<Session>('/auth/login', { method: 'POST', body: data, auth: false });
  },

  async logout(): Promise<void> {
    try {
      await request<{ message: string }>('/auth/logout', { method: 'POST' });
    } finally {
      tokenStorage.clear();
    }
  },

  profile(signal?: AbortSignal): Promise<Player> {
    return request<Player>('/auth/profile', { signal });
  },
};

export const playersApi = {
  update(id: number, data: { name?: string; email?: string }): Promise<Player> {
    return request<Player>(`/players/${id}`, { method: 'PUT', body: data });
  },

  getById(id: number): Promise<Player> {
    return request<Player>(`/players/${id}`);
  },
};

export const gamesApi = {
  list(signal?: AbortSignal): Promise<Game[]> {
    return request<Game[]>('/games', { signal });
  },

  getById(id: number, signal?: AbortSignal): Promise<Game> {
    return request<Game>(`/games/${id}`, { signal });
  },

  create(data: { title: string; maxPlayers: number }): Promise<Game> {
    return request<Game>('/games', {
      method: 'POST',
      body: { title: data.title, maxPlayers: data.maxPlayers, status: 'waiting' },
    });
  },

  remove(id: number): Promise<{ message: string }> {
    return request<{ message: string }>(`/games/${id}`, { method: 'DELETE' });
  },

  join(gameId: number): Promise<{ id: number; gameId: number; playerId: number }> {
    return request(`/games/${gameId}/join`, { method: 'POST' });
  },

  leave(gameId: number): Promise<{ message: string }> {
    return request<{ message: string }>(`/games/${gameId}/leave`, { method: 'POST' });
  },

  players(gameId: number, signal?: AbortSignal): Promise<GamePlayer[]> {
    return request<GamePlayer[]>(`/games/${gameId}/players`, { signal });
  },

  start(gameId: number): Promise<StartGameResult> {
    return request<StartGameResult>(`/games/${gameId}/start`, { method: 'POST' });
  },

  state(gameId: number, signal?: AbortSignal): Promise<GameState> {
    return request<GameState>(`/games/${gameId}/state`, { signal });
  },

  turn(gameId: number, signal?: AbortSignal): Promise<TurnResult> {
    return request<TurnResult>(`/games/${gameId}/turn`, { signal });
  },

  topDiscard(gameId: number, signal?: AbortSignal): Promise<TopDiscard> {
    return request<TopDiscard>(`/games/${gameId}/discard`, { signal });
  },

  playCard(gameId: number, cardId: number, chosenColor?: CardColor): Promise<PlayCardResult> {
    return request<PlayCardResult>(`/games/${gameId}/play`, {
      method: 'POST',
      body: chosenColor ? { cardId, chosenColor } : { cardId },
    });
  },

  drawCard(gameId: number): Promise<DrawCardResult> {
    return request<DrawCardResult>(`/games/${gameId}/draw`, { method: 'POST' });
  },

  callUno(gameId: number): Promise<UnoCallResult> {
    return request<UnoCallResult>(`/games/${gameId}/uno`, { method: 'POST' });
  },

  challenge(gameId: number, targetPlayerId: number): Promise<ChallengeResult> {
    return request<ChallengeResult>(`/games/${gameId}/challenge`, {
      method: 'POST',
      body: { targetPlayerId },
    });
  },

  ready(gameId: number): Promise<ReadyResult> {
    return request<ReadyResult>(`/games/${gameId}/ready`, { method: 'POST' });
  },

  end(gameId: number): Promise<RoundResult> {
    return request<RoundResult>(`/games/${gameId}/end`, { method: 'POST' });
  },

  scores(gameId: number, signal?: AbortSignal): Promise<ScoreEntry[]> {
    return request<ScoreEntry[]>(`/games/${gameId}/scores`, { signal });
  },
};
