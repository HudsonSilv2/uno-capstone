import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './AppHeader.css';

export function AppHeader() {
  const { player, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/entrar', { replace: true });
  };

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <Link to="/" className="app-header__brand">
          <span className="app-header__mark">UNO</span>
          <span className="app-header__brand-text">Capstone</span>
        </Link>

        {isAuthenticated && (
          <nav className="app-header__nav" aria-label="Navegação principal">
            <NavLink to="/partidas" className="app-header__link">
              Partidas
            </NavLink>
            <NavLink to="/regras" className="app-header__link">
              Regras
            </NavLink>
            <NavLink to="/perfil" className="app-header__link">
              Perfil
            </NavLink>
          </nav>
        )}

        {isAuthenticated && player && (
          <div className="app-header__account">
            <span className="app-header__player">{player.name}</span>
            <button type="button" className="btn btn--ghost" onClick={handleLogout}>
              Sair
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
