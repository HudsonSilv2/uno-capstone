import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi } from '../services/api';
import { setUnauthorizedHandler, tokenStorage } from '../services/http';
import type { Player } from '../types/api';
import { AuthContext, type AuthContextValue } from './auth-context';

/*
  USR-01 / UI-01. The session lives in the JWT issued by the back-end; the
  client keeps no local or guest user, because every game route requires a
  valid token.
*/
export function AuthProvider({ children }: { children: ReactNode }) {
  const [player, setPlayerState] = useState<Player | null>(null);
  /* No stored token means there is nothing to restore, so skip the wait. */
  const [isRestoring, setIsRestoring] = useState(() => tokenStorage.get() !== null);

  useEffect(() => {
    if (!tokenStorage.get()) {
      return;
    }

    const controller = new AbortController();
    authApi
      .profile(controller.signal)
      .then(setPlayerState)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        tokenStorage.clear();
        setPlayerState(null);
      })
      .finally(() => setIsRestoring(false));

    return () => controller.abort();
  }, []);

  /*
    When the back-end rejects the token, the session is dropped here too.
    Without this the app kept considering itself authenticated and the guarded
    routes never sent the player back to the sign-in screen.
  */
  useEffect(() => {
    setUnauthorizedHandler(() => setPlayerState(null));
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const session = await authApi.login({ email, password });
    tokenStorage.set(session.token);
    setPlayerState(session.player);
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      await authApi.register({ name, email, password });
      await login(email, password);
    },
    [login]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setPlayerState(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      player,
      isAuthenticated: player !== null,
      isRestoring,
      login,
      register,
      logout,
      setPlayer: setPlayerState,
    }),
    [player, isRestoring, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
