import { Op } from 'sequelize';
import Game from '../models/game.model';
import Player from '../models/player.model';
import Card from '../models/card.model';
import Score from '../models/score.model';
import GamePlayer from '../models/game-player.model';
import { drawCardsForPlayer, reshuffleDiscardIntoDeck } from './deck.service';
import { AppError } from '../middlewares/error.middleware';
import { memoize, filter, pipe, accumulate } from '../utils/functional-helpers';

const VALID_CARD_VALUES = [
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  'Skip',
  'Reverse',
  'Draw Two',
  'Wild Card',
  'Wild Draw Four',
];

const COLORS = ['red', 'blue', 'yellow', 'green'] as const;

function buildDeck(
  gameId: number
): Array<{ color: string; value: string; gameId: number; location: string }> {
  const deck: Array<{ color: string; value: string; gameId: number; location: string }> = [];

  for (const color of COLORS) {
    deck.push({ color, value: '0', gameId, location: 'deck' });

    for (const value of [
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      'Skip',
      'Reverse',
      'Draw Two',
    ]) {
      deck.push({ color, value, gameId, location: 'deck' });
      deck.push({ color, value, gameId, location: 'deck' });
    }
  }

  for (let i = 0; i < 4; i++) {
    deck.push({ color: 'wild', value: 'Wild Card', gameId, location: 'deck' });
    deck.push({ color: 'wild', value: 'Wild Draw Four', gameId, location: 'deck' });
  }

  return deck;
}

function shuffleDeck<T>(deck: T[]): T[] {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

interface GameData {
  title: string;
  status: string;
  maxPlayers: number;
  currentPlayerId?: number | null;
  direction?: string | null;
}

interface UpdateGameData {
  title?: string;
  status?: string;
  maxPlayers?: number;
  currentPlayerId?: number | null;
  direction?: string | null;
}

export class GameService {
  private formatGameOutput(game: Game) {
    return {
      id: game.id,
      title: game.title,
      status: game.status,
      maxPlayers: game.maxPlayers,
      currentPlayerId: game.currentPlayerId,
      direction: game.direction || 'clockwise',
      createdAt: game.createdAt,
    };
  }

  public async createGame(data: GameData) {
    const gameData = {
      ...data,
      status: data.status || 'waiting',
    };
    const game = await Game.create(gameData);
    return this.formatGameOutput(game);
  }

  public async getGameById(id: number) {
    const game = await Game.findByPk(id);
    if (!game) {
      throw new AppError('Game not found', 404);
    }
    return game;
  }

  public async getGameByIdFormatted(id: number) {
    const game = await this.getGameById(id);
    return this.formatGameOutput(game);
  }

  public async getAllGames() {
    const games = await Game.findAll();
    return games.map((game) => this.formatGameOutput(game));
  }

  public async updateGame(id: number, data: UpdateGameData) {
    const game = await this.getGameById(id);
    await game.update(data);
    return this.formatGameOutput(game);
  }

  public async deleteGame(id: number) {
    const game = await this.getGameById(id);
    await game.destroy();
    return { message: 'Game deleted successfully' };
  }

  private async getTopDiscardCard(gameId: number) {
    return Card.findOne({
      where: { gameId, location: 'discard' },
      order: [
        ['updatedAt', 'DESC'],
        ['id', 'DESC'],
      ],
    });
  }

  public async getTopDiscard(gameId: number) {
    await this.getGameById(gameId);
    const topDiscardCard = await this.getTopDiscardCard(gameId);

    return {
      id: topDiscardCard?.id ?? null,
      color: topDiscardCard?.color ?? null,
      value: topDiscardCard?.value ?? null,
    };
  }

  public async getGameState(gameId: number, userId: number) {
    const game = await Game.findByPk(gameId, {
      include: [
        {
          model: Player,
          as: 'players',
          attributes: ['id', 'name'],
          through: { attributes: [] },
        },
      ],
    });

    if (!game) {
      throw new AppError('Game not found', 404);
    }

    const gamePlayers = (game as any).players || [];
    const isParticipant = gamePlayers.some((p: any) => p.id === userId);
    if (!isParticipant) {
      throw new AppError('Player is not part of this game', 403);
    }

    const topDiscardCard = await this.getTopDiscardCard(gameId);

    const topDiscard = topDiscardCard
      ? {
          id: topDiscardCard.id,
          color: topDiscardCard.color,
          value: topDiscardCard.value,
        }
      : null;

    const playerHandCards = await Card.findAll({
      where: { gameId, playerId: userId, location: 'hand' },
    });

    const hand = playerHandCards.map((c) => ({
      id: c.id,
      color: c.color,
      value: c.value,
    }));

    const unoEntries = await GamePlayer.findAll({ where: { gameId } });
    const unoByPlayerId = new Map<number, boolean>(
      (unoEntries || []).map((entry) => [entry.playerId, entry.saidUno ?? false])
    );

    const players = await Promise.all(
      gamePlayers.map(async (p: any) => {
        const cardCount = await Card.count({
          where: { gameId, playerId: p.id, location: 'hand' },
        });
        return {
          id: p.id,
          name: p.name,
          cardCount,
          saidUno: unoByPlayerId.get(p.id) ?? false,
        };
      })
    );

    return {
      id: game.id,
      title: game.title,
      status: game.status,
      maxPlayers: game.maxPlayers,
      currentPlayerId: game.currentPlayerId,
      direction: game.direction || 'clockwise',
      topDiscard,
      players,
      hand,
    };
  }

  public async startGame(gameId: number) {
    const game = await Game.findByPk(gameId, {
      include: [
        {
          model: Player,
          as: 'players',
          attributes: ['id', 'name', 'email'],
          through: { attributes: ['id', 'joinedAt', 'isReady'] },
        },
      ],
    });

    if (!game) {
      throw new AppError('Game not found', 404);
    }

    if (game.status !== 'waiting') {
      throw new AppError('Game has already started or is finished', 400);
    }

    const gamePlayers = (game as any).players || [];
    if (gamePlayers.length < 2) {
      throw new AppError('At least 2 players are required to start the game', 400);
    }

    // LOBBY-01: all players must have confirmed they are ready before the host can start
    const hasUnreadyPlayers = gamePlayers.some(
      (p: any) => p.GamePlayer?.isReady === false || p.GamePlayer?.isReady === 0
    );
    if (hasUnreadyPlayers) {
      throw new AppError('All players must be ready before the game can start', 400);
    }

    const CARDS_PER_PLAYER = 7;
    const requiredCards = gamePlayers.length * CARDS_PER_PLAYER;

    await Card.destroy({ where: { gameId } });

    const rawDeck = buildDeck(gameId);
    const shuffled = shuffleDeck(rawDeck);

    const created = await Card.bulkCreate(shuffled);

    gamePlayers.sort((a: any, b: any) => {
      const idA = a.GamePlayer?.id || a.id;
      const idB = b.GamePlayer?.id || b.id;
      return idA - idB;
    });

    const dealCards = created.slice(0, requiredCards);
    const updates: Array<Promise<any>> = [];

    gamePlayers.forEach((player: any, playerIndex: number) => {
      const hand = dealCards.slice(
        playerIndex * CARDS_PER_PLAYER,
        (playerIndex + 1) * CARDS_PER_PLAYER
      );
      updates.push(
        Card.update(
          { playerId: player.id, location: 'hand' },
          { where: { id: { [Op.in]: hand.map((c) => c.id) } } }
        )
      );
    });

    await Promise.all(updates);

    // Flips the first discard card. Never starts with a wild card, so the
    // valid color is already defined from the start of the game.
    const remainingDeck = created.slice(requiredCards);
    const starterCard = remainingDeck.find((c) => c.color !== 'wild');
    if (starterCard) {
      await Card.update({ location: 'discard', playerId: null }, { where: { id: starterCard.id } });
    }

    await GamePlayer.update({ saidUno: false }, { where: { gameId } });

    game.status = 'in_progress';
    game.direction = 'clockwise';
    await game.save();

    return {
      gameId: game.id,
      status: game.status,
      direction: game.direction,
      totalCards: created.length,
      players: gamePlayers.map((p: any) => ({
        id: p.id,
        name: p.name,
        cardsDealt: CARDS_PER_PLAYER,
      })),
    };
  }

  public async getTurn(gameId: number) {
    const game = await Game.findByPk(gameId, {
      include: [
        {
          model: Player,
          as: 'players',
          attributes: ['id', 'name', 'email'],
          through: { attributes: ['id', 'joinedAt'] },
        },
      ],
    });

    if (!game) {
      throw new AppError('Game not found', 404);
    }

    const gamePlayers = (game as any).players || [];
    if (gamePlayers.length === 0) {
      throw new AppError('No players in this game', 400);
    }

    gamePlayers.sort((a: any, b: any) => {
      const idA = a.GamePlayer?.id || a.id;
      const idB = b.GamePlayer?.id || b.id;
      return idA - idB;
    });

    let currentPlayer = gamePlayers.find((p: any) => p.id === game.currentPlayerId);
    if (!currentPlayer) {
      currentPlayer = gamePlayers[0];
      game.currentPlayerId = currentPlayer.id;
      await game.save();
    }

    return {
      gameId: game.id,
      currentPlayerId: currentPlayer.id,
      currentPlayer: {
        id: currentPlayer.id,
        name: currentPlayer.name,
        email: currentPlayer.email,
      },
      direction: game.direction || 'clockwise',
    };
  }

  public async advanceTurn(gameId: number, requestingPlayerId: number, cardValue?: string) {
    if (cardValue !== undefined && !VALID_CARD_VALUES.includes(cardValue)) {
      throw new AppError(
        `Invalid cardValue "${cardValue}". Must be one of: ${VALID_CARD_VALUES.join(', ')}`,
        400
      );
    }

    const game = await Game.findByPk(gameId, {
      include: [
        {
          model: Player,
          as: 'players',
          attributes: ['id', 'name', 'email'],
          through: { attributes: ['id', 'joinedAt'] },
        },
      ],
    });

    if (!game) {
      throw new AppError('Game not found', 404);
    }

    const gamePlayers = (game as any).players || [];
    if (gamePlayers.length === 0) {
      throw new AppError('No players in this game', 400);
    }

    gamePlayers.sort((a: any, b: any) => {
      const idA = a.GamePlayer?.id || a.id;
      const idB = b.GamePlayer?.id || b.id;
      return idA - idB;
    });

    if (game.currentPlayerId !== requestingPlayerId) {
      throw new AppError('It is not your turn', 403);
    }

    const N = gamePlayers.length;
    let currentDirection = game.direction || 'clockwise';
    let currentIndex = gamePlayers.findIndex((p: any) => p.id === game.currentPlayerId);
    if (currentIndex === -1) {
      currentIndex = 0;
    }

    const dirMultiplierPre = currentDirection === 'clockwise' ? 1 : -1;
    const skippedIndex = (((currentIndex + 1 * dirMultiplierPre) % N) + N) % N;
    const skippedPlayer = gamePlayers[skippedIndex];

    // filter: identifica cartas que pulam turno
    const skipCards = filter(
      ['Skip', 'Draw Two', 'Wild Draw Four'],
      (v) => v === cardValue
    );

    // pipe: aplica as transformações de direção e passo em sequência
    type TurnState = { direction: string; step: number };
    const applyReverse = (state: TurnState): TurnState => {
      if (cardValue !== 'Reverse') return state;
      return {
        direction: state.direction === 'clockwise' ? 'counter-clockwise' : 'clockwise',
        step: N === 2 ? 2 : 1,
      };
    };
    const applySkip = (state: TurnState): TurnState => {
      if (skipCards.length === 0) return state;
      return { ...state, step: 2 };
    };
    const resolveTurn = pipe<TurnState>(applyReverse, applySkip);
    const { direction: resolvedDirection, step } = resolveTurn({ direction: currentDirection, step: 1 });
    currentDirection = resolvedDirection;

    // accumulate: soma o passo ao índice atual (mod N) para achar o próximo
    const nextIndex = accumulate(
      [step],
      (acc, s) => (((acc + s * (currentDirection === 'clockwise' ? 1 : -1)) % N) + N) % N,
      currentIndex
    );
    const nextPlayer = gamePlayers[nextIndex];

    let cardsDrawn = 0;
    if (cardValue === 'Draw Two' || cardValue === 'Wild Draw Four') {
      const drawCount = cardValue === 'Draw Two' ? 2 : 4;

      const deckCards = await drawCardsForPlayer(gameId, skippedPlayer.id, drawCount);

      if (deckCards.length > 0) {
        cardsDrawn = deckCards.length;
        await GamePlayer.update(
          { saidUno: false },
          { where: { gameId, playerId: skippedPlayer.id } }
        );
      }
    }

    game.direction = currentDirection;
    game.currentPlayerId = nextPlayer.id;
    await game.save();

    return {
      gameId: game.id,
      previousPlayerId: gamePlayers[currentIndex].id,
      currentPlayerId: nextPlayer.id,
      currentPlayer: {
        id: nextPlayer.id,
        name: nextPlayer.name,
        email: nextPlayer.email,
      },
      direction: currentDirection,
      ...(cardsDrawn > 0 && {
        drawEffect: {
          targetPlayerId: skippedPlayer.id,
          targetPlayerName: skippedPlayer.name,
          cardsDrawn,
        },
      }),
    };
  }

  public async playCard(gameId: number, playerId: number, cardId: number, chosenColor?: string) {
    const game = await Game.findByPk(gameId);
    if (!game) {
      throw new AppError('Game not found', 404);
    }

    if (game.status !== 'in_progress') {
      throw new AppError('Game is not in progress', 400);
    }

    if (game.currentPlayerId !== playerId) {
      throw new AppError('It is not your turn', 403);
    }

    const card = await Card.findByPk(cardId);
    if (!card || card.gameId !== gameId) {
      throw new AppError('Card not found', 404);
    }

    if (card.location !== 'hand' || card.playerId !== playerId) {
      throw new AppError('Card is not in your hand', 400);
    }

    const topDiscard = await this.getTopDiscardCard(gameId);
    if (!topDiscard) {
      throw new AppError('The discard pile has not been started yet', 400);
    }

    const isWild = card.color === 'wild';
    const matchesColor = card.color === topDiscard.color;
    const matchesValue = card.value === topDiscard.value;
    if (!isWild && !matchesColor && !matchesValue) {
      throw new AppError('Card does not match the current color or value', 400);
    }

    let discardColor = card.color;
    if (isWild) {
      if (!chosenColor || !COLORS.includes(chosenColor as (typeof COLORS)[number])) {
        throw new AppError(
          `chosenColor is required for wild cards and must be one of: ${COLORS.join(', ')}`,
          400
        );
      }
      discardColor = chosenColor;
    }

    await card.update({ location: 'discard', playerId: null, color: discardColor });

    const playedCard = { id: card.id, color: discardColor, value: card.value };

    /*
      GAME-11: the round ends as soon as a player runs out of cards. The turn is
      not passed on in that case, the game is settled and scored right away.
    */
    const remainingInHand = await Card.count({
      where: { gameId, playerId, location: 'hand' },
    });

    if (remainingInHand === 0) {
      const roundResult = await this.settleGame(gameId, playerId);
      return {
        ...roundResult,
        currentPlayerId: null as number | null,
        roundFinished: true,
        playedCard,
      };
    }

    const turnResult = await this.advanceTurn(gameId, playerId, card.value);

    return {
      ...turnResult,
      currentPlayerId: turnResult.currentPlayerId as number | null,
      roundFinished: false,
      playedCard,
    };
  }

  public async drawCard(gameId: number, playerId: number) {
    const game = await Game.findByPk(gameId);
    if (!game) {
      throw new AppError('Game not found', 404);
    }

    if (game.status !== 'in_progress') {
      throw new AppError('Game is not in progress', 400);
    }

    if (game.currentPlayerId !== playerId) {
      throw new AppError('It is not your turn', 403);
    }

    const deckQuery = {
      where: { gameId, location: 'deck', playerId: null },
      order: [['id', 'ASC']] as [string, string][],
    };
    let deckCard = await Card.findOne(deckQuery);

    if (!deckCard) {
      await reshuffleDiscardIntoDeck(gameId);
      deckCard = await Card.findOne(deckQuery);
    }

    if (!deckCard) {
      throw new AppError('No cards left to draw', 400);
    }

    await deckCard.update({ location: 'hand', playerId });
    await GamePlayer.update({ saidUno: false }, { where: { gameId, playerId } });

    const topDiscard = await this.getTopDiscardCard(gameId);
    const isWild = deckCard.color === 'wild';
    const canPlayDrawnCard =
      !!topDiscard &&
      (isWild || deckCard.color === topDiscard.color || deckCard.value === topDiscard.value);

    const drawnCard = { id: deckCard.id, color: deckCard.color, value: deckCard.value };

    if (!canPlayDrawnCard) {
      const turnResult = await this.advanceTurn(gameId, playerId);
      return { ...turnResult, drawnCard, canPlayDrawnCard: false };
    }

    return {
      gameId: game.id,
      currentPlayerId: playerId,
      drawnCard,
      canPlayDrawnCard: true,
    };
  }

  // memoize: evita recalcular a pontuação da mesma carta duas vezes
  private getCardScore = memoize((value: string): number => {
    if (/^\d+$/.test(value)) return parseInt(value, 10);
    if (value === 'Skip' || value === 'Reverse' || value === 'Draw Two') return 20;
    return 50;
  });

  /*
    Closes an in-progress game: scores every hand, stores the results and marks
    the game as finished. When winnerId is given (a player emptied their hand)
    that player is the winner; otherwise the lowest score wins.
  */
  private async settleGame(gameId: number, winnerId?: number) {
    const game = await Game.findByPk(gameId, {
      include: [
        {
          model: Player,
          as: 'players',
          attributes: ['id', 'name'],
          through: { attributes: [] },
        },
      ],
    });

    if (!game) {
      throw new AppError('Game not found', 404);
    }

    if (game.status !== 'in_progress') {
      throw new AppError('Game is not in progress', 400);
    }

    const gamePlayers = (game as any).players || [];

    // Calculates each player's score based on the cards left in hand
    const playerScores = await Promise.all(
      gamePlayers.map(async (player: any) => {
        const handCards = await Card.findAll({
          where: { gameId, playerId: player.id, location: 'hand' },
          attributes: ['value'],
        });
        const total = handCards.reduce((sum, card) => sum + this.getCardScore(card.value), 0);
        return { playerId: player.id, playerName: player.name, score: total };
      })
    );

    // Persists a Score for each player
    await Score.bulkCreate(
      playerScores.map((ps) => ({ playerId: ps.playerId, gameId, score: ps.score }))
    );

    const winner =
      playerScores.find((ps) => ps.playerId === winnerId) ??
      playerScores.reduce((min, ps) => (ps.score < min.score ? ps : min));

    game.status = 'finished';
    game.currentPlayerId = null;
    await game.save();

    return {
      gameId: game.id,
      status: game.status,
      winner: { playerId: winner.playerId, playerName: winner.playerName, score: winner.score },
      scores: playerScores.map((ps) => ({
        playerId: ps.playerId,
        playerName: ps.playerName,
        score: ps.score,
      })),
    };
  }

  public async endGame(gameId: number) {
    return this.settleGame(gameId);
  }
}
