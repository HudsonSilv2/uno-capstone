import type { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { Server, type Socket } from 'socket.io';
import { AppError } from '../middlewares/error.middleware';
import { isBlacklisted } from '../middlewares/auth.middleware';
import { GameService } from '../services/game.service';
import { GamePlayerService } from '../services/game-player.service';

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_change_me';

type GameSocket = Socket & {
  data: {
    playerId?: number;
    email?: string;
    gameId?: number;
  };
};

let io: Server | null = null;
const gameService = new GameService();
const gamePlayerService = new GamePlayerService();

function allowedOrigins(): string[] {
  return (
    process.env.CORS_ORIGIN ||
    process.env.FRONTEND_URL ||
    'http://localhost:5173,http://localhost:4173'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function getErrorPayload(error: unknown) {
  if (error instanceof AppError) {
    return { message: error.message, statusCode: error.statusCode };
  }

  if (error instanceof Error) {
    return { message: error.message, statusCode: 500 };
  }

  return { message: 'A ação não pôde ser concluída.', statusCode: 500 };
}

export async function syncGame(gameId: number): Promise<void> {
  if (!io) {
    return;
  }

  io.to(String(gameId)).emit('game:updated', { gameId });

  const room = io.sockets.adapter.rooms.get(String(gameId));
  if (!room) {
    return;
  }

  await Promise.all(
    [...room].map(async (socketId) => {
      const client = io?.sockets.sockets.get(socketId) as GameSocket | undefined;
      const playerId = client?.data.playerId;
      if (!client || !playerId) {
        return;
      }

      try {
        const state = await gameService.getGameState(gameId, playerId);
        client.emit('game:state', state);
      } catch (error) {
        client.emit('game:error', getErrorPayload(error));
      }
    })
  );
}

export function initGameSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins(),
      methods: ['GET', 'POST'],
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token || typeof token !== 'string') {
      next(new Error('Token not provided'));
      return;
    }

    if (isBlacklisted(token)) {
      next(new Error('Token has been invalidated'));
      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string };
      (socket as GameSocket).data.playerId = decoded.id;
      (socket as GameSocket).data.email = decoded.email;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (rawSocket) => {
    const socket = rawSocket as GameSocket;

    socket.on('game:join', async ({ gameId }: { gameId: number }) => {
      try {
        const playerId = socket.data.playerId;
        if (!playerId) {
          throw new AppError('Player not authenticated', 401);
        }

        await gameService.getGameState(gameId, playerId);
        const roomId = String(gameId);
        socket.data.gameId = gameId;
        await socket.join(roomId);
        await syncGame(gameId);
      } catch (error) {
        socket.emit('game:error', getErrorPayload(error));
      }
    });

    socket.on(
      'game:play-card',
      async ({
        gameId,
        cardId,
        chosenColor,
      }: {
        gameId: number;
        cardId: number;
        chosenColor?: string;
      }) => {
        try {
          const playerId = socket.data.playerId;
          if (!playerId) {
            throw new AppError('Player not authenticated', 401);
          }

          const result = await gameService.playCard(gameId, playerId, cardId, chosenColor);
          socket.emit('game:action-result', { type: 'play-card', result });
          await syncGame(gameId);
        } catch (error) {
          socket.emit('game:error', getErrorPayload(error));
        }
      }
    );

    socket.on('game:draw-card', async ({ gameId }: { gameId: number }) => {
      try {
        const playerId = socket.data.playerId;
        if (!playerId) {
          throw new AppError('Player not authenticated', 401);
        }

        const result = await gameService.drawCard(gameId, playerId);
        socket.emit('game:action-result', { type: 'draw-card', result });
        await syncGame(gameId);
      } catch (error) {
        socket.emit('game:error', getErrorPayload(error));
      }
    });

    socket.on('game:uno', async ({ gameId }: { gameId: number }) => {
      try {
        const playerId = socket.data.playerId;
        if (!playerId) {
          throw new AppError('Player not authenticated', 401);
        }

        const result = await gamePlayerService.callUno(gameId, playerId);
        socket.emit('game:action-result', { type: 'uno', result });
        await syncGame(gameId);
      } catch (error) {
        socket.emit('game:error', getErrorPayload(error));
      }
    });
  });

  return io;
}
