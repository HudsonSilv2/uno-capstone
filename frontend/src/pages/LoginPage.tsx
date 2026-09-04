import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './LoginPage.css';

type Mode = 'login' | 'register';

const MIN_PASSWORD_LENGTH = 6;

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
}

/* UI-01. Validation happens locally first, then whatever the back-end says. */
export function LoginPage() {
  const { isAuthenticated, isRestoring, login, register } = useAuth();
  const location = useLocation();

  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isRestoring) {
    return (
      <div className="page page--narrow">
        <p className="muted">Restaurando sessão...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from ?? '/partidas'} replace />;
  }

  const switchMode = (next: Mode) => {
    setMode(next);
    setFieldErrors({});
    setServerError(null);
  };

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};

    if (mode === 'register' && name.trim().length < 2) {
      errors.name = 'Informe um nome com pelo menos 2 caracteres.';
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      errors.email = 'Informe um e-mail válido.';
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `A senha precisa ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.`;
    }

    return errors;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setServerError(null);

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await register(name.trim(), email.trim(), password);
      }
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Não foi possível concluir.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page page--narrow login">
      <div className="login__intro">
        <p className="eyebrow">UNO Capstone</p>
        <h1>{mode === 'login' ? 'Entrar na sua conta' : 'Criar uma conta'}</h1>
        <p className="page__lead">
          {mode === 'login'
            ? 'Use o e-mail e a senha cadastrados para voltar às suas partidas.'
            : 'O cadastro precisa de nome, e-mail e uma senha de pelo menos seis caracteres.'}
        </p>
      </div>

      <div className="login__tabs" role="tablist" aria-label="Cadastro ou acesso">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'login'}
          className={`login__tab ${mode === 'login' ? 'is-active' : ''}`}
          onClick={() => switchMode('login')}
        >
          Entrar
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'register'}
          className={`login__tab ${mode === 'register' ? 'is-active' : ''}`}
          onClick={() => switchMode('register')}
        >
          Cadastrar
        </button>
      </div>

      <form className="panel stack" onSubmit={handleSubmit} noValidate>
        {mode === 'register' && (
          <div className={`field ${fieldErrors.name ? 'field--invalid' : ''}`}>
            <label className="field__label" htmlFor="name">
              Nome
            </label>
            <input
              id="name"
              className="field__control"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              disabled={isSubmitting}
            />
            {fieldErrors.name && <span className="field__error">{fieldErrors.name}</span>}
          </div>
        )}

        <div className={`field ${fieldErrors.email ? 'field--invalid' : ''}`}>
          <label className="field__label" htmlFor="email">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            className="field__control"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            disabled={isSubmitting}
          />
          {fieldErrors.email && <span className="field__error">{fieldErrors.email}</span>}
        </div>

        <div className={`field ${fieldErrors.password ? 'field--invalid' : ''}`}>
          <label className="field__label" htmlFor="password">
            Senha
          </label>
          <input
            id="password"
            type="password"
            className="field__control"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            disabled={isSubmitting}
          />
          {fieldErrors.password && <span className="field__error">{fieldErrors.password}</span>}
        </div>

        {serverError && (
          <p className="notice notice--error" role="alert">
            {serverError}
          </p>
        )}

        <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={isSubmitting}>
          {isSubmitting ? 'Enviando...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
        </button>
      </form>
    </div>
  );
}
