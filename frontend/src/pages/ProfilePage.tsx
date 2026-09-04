import { useState, type FormEvent } from 'react';
import { authApi, playersApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import type { Player } from '../types/api';

/* USR-02 */
export function ProfilePage() {
  const { player, setPlayer } = useAuth();

  if (!player) {
    return null;
  }

  /*
    The key remounts the form when the profile changes on the server, which
    avoids syncing field by field inside an effect.
  */
  return (
    <ProfileForm
      key={`${player.name}|${player.email}`}
      player={player}
      onSaved={setPlayer}
    />
  );
}

function ProfileForm({ player, onSaved }: { player: Player; onSaved: (player: Player) => void }) {
  const [name, setName] = useState(player.name);
  const [email, setEmail] = useState(player.email);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isDirty = name.trim() !== player.name || email.trim() !== player.email;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFeedback(null);

    if (name.trim().length < 2) {
      setFeedback({ kind: 'error', text: 'Informe um nome com pelo menos 2 caracteres.' });
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setFeedback({ kind: 'error', text: 'Informe um e-mail válido.' });
      return;
    }

    setIsSaving(true);
    try {
      await playersApi.update(player.id, { name: name.trim(), email: email.trim() });
      /* Re-reads through /auth/profile, the route that leaves the password out. */
      onSaved(await authApi.profile());
      setFeedback({ kind: 'success', text: 'Perfil atualizado.' });
    } catch (error) {
      setFeedback({
        kind: 'error',
        text: error instanceof Error ? error.message : 'Não foi possível salvar.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page page--narrow">
      <div className="page__head">
        <div>
          <p className="eyebrow">Perfil</p>
          <h1>{player.name}</h1>
          <p className="page__lead">
            Cadastro criado em{' '}
            {player.createdAt
              ? new Date(player.createdAt).toLocaleDateString('pt-BR')
              : 'data não informada'}
            .
          </p>
        </div>
      </div>

      <form className="panel stack" onSubmit={handleSubmit}>
        <div className="field">
          <label className="field__label" htmlFor="profile-name">
            Nome
          </label>
          <input
            id="profile-name"
            className="field__control"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={isSaving}
          />
        </div>

        <div className="field">
          <label className="field__label" htmlFor="profile-email">
            E-mail
          </label>
          <input
            id="profile-email"
            type="email"
            className="field__control"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isSaving}
          />
        </div>

        {feedback && (
          <p className={`notice notice--${feedback.kind}`} role="alert">
            {feedback.text}
          </p>
        )}

        <div className="row">
          <button type="submit" className="btn btn--primary" disabled={!isDirty || isSaving}>
            {isSaving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </form>
    </div>
  );
}
