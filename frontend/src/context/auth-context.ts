import { createContext } from 'react';
import type { Player } from '../types/api';

export interface AuthContextValue {
  player: Player | null;
  isAuthenticated: boolean;
  isRestoring: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setPlayer: (player: Player) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
