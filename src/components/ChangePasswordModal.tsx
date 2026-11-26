'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ChangePasswordModalProps {
  displayName: string;
  onSuccess: () => void;
}

export function ChangePasswordModal({
  displayName,
  onSuccess,
}: ChangePasswordModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('A nova senha precisa ter pelo menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem. Confira e tente novamente.');
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const { error: authError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (authError) {
      setError(authError.message || 'Não foi possível atualizar a senha.');
      setSaving(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ must_change_password: false })
        .eq('id', user.id);

      if (profileError) {
        setError('Senha alterada, mas falhou ao atualizar perfil. Recarregue a página.');
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    onSuccess();
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-head">
          <div>
            <div className="eyebrow">PRIMEIRO ACESSO</div>
            <h2>Troque sua senha, {displayName}</h2>
          </div>
        </div>
        <p className="muted" style={{ fontSize: 13, marginTop: 0, marginBottom: 16 }}>
          Como é o seu primeiro acesso, defina uma nova senha pessoal para proteger
          sua rotina e seus compromissos.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="firstNewPass">Nova senha</label>
            <input
              id="firstNewPass"
              type="password"
              minLength={6}
              required
              placeholder="Mínimo de 6 caracteres"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="firstConfirmPass">Confirmar nova senha</label>
            <input
              id="firstConfirmPass"
              type="password"
              minLength={6}
              required
              placeholder="Repita a nova senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="access-error" style={{ marginBottom: 10 }}>
              {error}
            </div>
          )}

          <div className="modal-actions">
            <button className="btn" type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar nova senha e continuar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

