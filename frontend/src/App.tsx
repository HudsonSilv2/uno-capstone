import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthProvider';
import { AppHeader } from './components/AppHeader';
import { RequireAuth } from './components/RequireAuth';
import { LoginPage } from './pages/LoginPage';
import { GamesPage } from './pages/GamesPage';
import { WaitingRoomPage } from './pages/WaitingRoomPage';
import { TablePage } from './pages/TablePage';
import { ResultPage } from './pages/ResultPage';
import { ProfilePage } from './pages/ProfilePage';
import { RulesPage } from './pages/RulesPage';

export default function App() {
  return (
    <AuthProvider>
      <div className="app">
        <AppHeader />
        <main className="app__main">
          <Routes>
            <Route path="/entrar" element={<LoginPage />} />

            <Route element={<RequireAuth />}>
              <Route path="/partidas" element={<GamesPage />} />
              <Route path="/partidas/:id/sala" element={<WaitingRoomPage />} />
              <Route path="/partidas/:id" element={<TablePage />} />
              <Route path="/partidas/:id/resultado" element={<ResultPage />} />
              <Route path="/perfil" element={<ProfilePage />} />
              <Route path="/regras" element={<RulesPage />} />
            </Route>

            <Route path="/" element={<Navigate to="/partidas" replace />} />
            <Route path="*" element={<Navigate to="/partidas" replace />} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  );
}
