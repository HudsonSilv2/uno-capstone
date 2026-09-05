import { io } from 'socket.io-client';
import { tokenStorage } from './http';

export const socket = io(import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3000', {
  autoConnect: false,
  auth: (callback) => {
    callback({ token: tokenStorage.get() });
  },
});

export function emitGameAction<T>(
  event: 'game:play-card' | 'game:draw-card' | 'game:uno' | 'game:challenge',
  payload: Record<string, unknown>,
  resultType: 'play-card' | 'draw-card' | 'uno' | 'challenge'
): Promise<T> {
  if (!socket.connected) {
    socket.connect();
  }

  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error('O servidor não respondeu à jogada.'));
    }, 8000);

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      socket.off('game:action-result', handleResult);
      socket.off('game:error', handleError);
    };

    const handleResult = ({ type, result }: { type: string; result: T }) => {
      if (type !== resultType) {
        return;
      }
      cleanup();
      resolve(result);
    };

    const handleError = ({ message }: { message: string }) => {
      cleanup();
      reject(new Error(message));
    };

    socket.on('game:action-result', handleResult);
    socket.on('game:error', handleError);
    socket.emit(event, payload);
  });
}
