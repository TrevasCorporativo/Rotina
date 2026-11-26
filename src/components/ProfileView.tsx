'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  getExistingPushSubscription,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/push';
import type { Profile } from '@/lib/types';

interface ProfileViewProps {
  profile: Profile;
  onProfileUpdated: (updated: Profile) => void;
  onToast: (msg: string) => void;
}

export function ProfileView({
  profile,
  onProfileUpdated,
  onToast,
}: ProfileViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [notifyTasks, setNotifyTasks] = useState(profile.notify_tasks);
  const [notifyEvents, setNotifyEvents] = useState(profile.notify_events);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [pushSupported, setPushSupported] = useState(false);
  const [pushActive, setPushActive] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(async () => {
      const supported = isPushSupported();
      if (!active) return;
      setPushSupported(supported);
      if (supported) {
        try {
          const sub = await getExistingPushSubscription();
          if (active) setPushActive(Boolean(sub));
        } catch {
          if (active) setPushActive(false);
        }
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const initials = profile.display_name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      onToast('A imagem deve ter no máximo 5 MB.');
      return;
    }

    setUploadingAvatar(true);
    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const filePath = `${profile.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        onToast('Erro ao enviar foto: ' + uploadError.message);
        return;
      }

      const { data: publicData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const avatarUrl = `${publicData.publicUrl}?t=${Date.now()}`;

      const { data: updated, error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', profile.id)
        .select('*')
        .single();

      if (updateError || !updated) {
        onToast('Foto enviada, mas falhou ao atualizar perfil.');
        return;
      }

      onProfileUpdated(updated as Profile);
      onToast('Foto de perfil atualizada!');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = displayName.trim();
    if (!trimmed) return;

    setSavingProfile(true);
    const supabase = createClient();

    const { data: updated, error } = await supabase
      .from('profiles')
      .update({
        display_name: trimmed,
        notify_tasks: notifyTasks,
        notify_events: notifyEvents,
      })
      .eq('id', profile.id)
      .select('*')
      .single();

    setSavingProfile(false);

    if (error || !updated) {
      onToast('Erro ao salvar perfil.');
      return;
    }

    onProfileUpdated(updated as Profile);
    onToast('Perfil salvo com sucesso!');
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      onToast('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      onToast('As senhas não coincidem.');
      return;
    }

    setSavingPassword(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);

    if (error) {
      onToast(error.message || 'Erro ao alterar senha.');
      return;
    }

    setNewPassword('');
    setConfirmPassword('');
    onToast('Senha alterada com sucesso!');
  }

  async function handleTogglePush() {
    setPushLoading(true);
    try {
      if (pushActive) {
        await unsubscribeFromPush();
        setPushActive(false);
        onToast('Notificações desativadas neste dispositivo.');
      } else {
        await subscribeToPush();
        setPushActive(true);
        onToast('Notificações ativadas neste dispositivo!');
      }
    } catch (err: unknown) {
      onToast((err as Error).message || 'Não foi possível configurar notificações.');
    } finally {
      setPushLoading(false);
    }
  }

  async function handleTestPush() {
    setPushLoading(true);
    try {
      const res = await fetch('/api/push/test', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        onToast(data.error || 'Erro ao enviar teste.');
      } else {
        onToast('Notificação de teste enviada!');
      }
    } finally {
      setPushLoading(false);
    }
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <div className="eyebrow">SUA CONTA PRIVADA</div>
          <h1>Meu perfil</h1>
          <p className="subtitle">
            Personalize sua foto, sua senha e as notificações no celular.
          </p>
        </div>
      </div>

      <div className="content-grid">
        <div className="panel">
          <div className="panel-head">
            <h2>Dados pessoais & foto</h2>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              marginBottom: 22,
              flexWrap: 'wrap',
            }}
          >
            <div
              className="avatar"
              style={{ width: 74, height: 74, fontSize: 24 }}
            >
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt={profile.display_name} />
              ) : (
                initials
              )}
            </div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                style={{ display: 'none' }}
                onChange={handleAvatarChange}
              />
              <button
                type="button"
                className="btn secondary small"
                disabled={uploadingAvatar}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadingAvatar ? 'Enviando foto...' : 'Importar foto de perfil'}
              </button>
              <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>
                JPG, PNG ou WebP até 5 MB. Só você vê seu espaço.
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveProfile}>
            <div className="field">
              <label htmlFor="profileName">Nome de exibição</label>
              <input
                id="profileName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                maxLength={50}
              />
            </div>

            <div className="field">
              <label>Login de acesso</label>
              <input value={profile.login_key} disabled />
            </div>

            <div style={{ display: 'grid', gap: 10, margin: '14px 0 18px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  className="check"
                  checked={notifyTasks}
                  onChange={(e) => setNotifyTasks(e.target.checked)}
                />
                Receber lembretes de tarefas no horário
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  className="check"
                  checked={notifyEvents}
                  onChange={(e) => setNotifyEvents(e.target.checked)}
                />
                Receber lembretes de compromissos da agenda
              </label>
            </div>

            <button className="btn" type="submit" disabled={savingProfile}>
              {savingProfile ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </form>
        </div>

        <div>
          <div className="panel">
            <div className="panel-head">
              <h2>Notificações com o site fechado</h2>
            </div>
            <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>
              Ative neste aparelho para receber alertas de agendas, compromissos e
              tarefas mesmo com o navegador fechado.
            </p>

            {!pushSupported ? (
              <div className="empty" style={{ padding: 14 }}>
                Este navegador não suporta Web Push. No celular, use Chrome (Android)
                ou Safari com &ldquo;Adicionar à Tela de Início&rdquo; (iOS).
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: pushActive ? '#e7f5f1' : '#f8f9fb',
                    color: pushActive ? '#268675' : '#626977',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {pushActive
                    ? '✓ Notificações ativadas neste dispositivo'
                    : 'Notificações ainda não ativadas neste dispositivo'}
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className={pushActive ? 'btn secondary small' : 'btn small'}
                    disabled={pushLoading}
                    onClick={handleTogglePush}
                  >
                    {pushLoading
                      ? 'Aguarde...'
                      : pushActive
                      ? 'Desativar neste aparelho'
                      : 'Ativar notificações push'}
                  </button>

                  {pushActive && (
                    <button
                      type="button"
                      className="btn secondary small"
                      disabled={pushLoading}
                      onClick={handleTestPush}
                    >
                      Testar notificação agora
                    </button>
                  )}
                </div>

                <p className="muted" style={{ fontSize: 11, margin: '4px 0 0' }}>
                  Dica para celular: instale o site na Tela de Início (&ldquo;Instalar
                  app&rdquo; / &ldquo;Adicionar à Tela de Início&rdquo;) para funcionar
                  como aplicativo nativo.
                </p>
              </div>
            )}
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Alterar senha</h2>
            </div>
            <form onSubmit={handleChangePassword}>
              <div className="field">
                <label htmlFor="profileNewPass">Nova senha</label>
                <input
                  id="profileNewPass"
                  type="password"
                  minLength={6}
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="profileConfirmPass">Confirmar nova senha</label>
                <input
                  id="profileConfirmPass"
                  type="password"
                  minLength={6}
                  required
                  placeholder="Repita a nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="btn secondary"
                disabled={savingPassword}
              >
                {savingPassword ? 'Atualizando...' : 'Atualizar senha'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

