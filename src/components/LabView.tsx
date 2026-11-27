'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Flame,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  CONFRONTATION_CARDS,
  DEFAULT_RESCUE_ACTIONS,
  RECOVERY_MILESTONES,
} from '@/lib/recovery-content';
import type { RecoveryLog, RecoveryTrack } from '@/lib/types';

interface LabViewProps {
  userId: string;
  todayStr: string;
  tracks: RecoveryTrack[];
  logs: RecoveryLog[];
  onTracksChange: React.Dispatch<React.SetStateAction<RecoveryTrack[]>>;
  onLogsChange: React.Dispatch<React.SetStateAction<RecoveryLog[]>>;
  onToast: (msg: string) => void;
}

const LAB_CATEGORIES = ['Pureza', 'Digital', 'Hábitos', 'Substâncias', 'Outro'];

function computeStreakParts(startedAtIso: string, nowMs: number) {
  const diffMs = Math.max(0, nowMs - new Date(startedAtIso).getTime());
  const totalHours = Math.floor(diffMs / 3600000);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return { days, hours };
}

export function LabView({
  userId,
  todayStr,
  tracks,
  logs,
  onTracksChange,
  onLogsChange,
  onToast,
}: LabViewProps) {
  const supabase = createClient();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [activeTab, setActiveTab] = useState<'tracks' | 'journal' | 'milestones'>(
    'tracks'
  );
  const [cardIdx, setCardIdx] = useState(0);
  const [expandedTrackId, setExpandedTrackId] = useState<string | null>(null);

  // Create / Edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<RecoveryTrack | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Pureza');
  const [whyStatement, setWhyStatement] = useState('');
  const [triggers, setTriggers] = useState('');
  const [replacementAction, setReplacementAction] = useState('');
  const [saving, setSaving] = useState(false);

  // Rescue SOS modal
  const [rescueTrack, setRescueTrack] = useState<RecoveryTrack | null>(null);
  const [rescueOpen, setRescueOpen] = useState(false);
  const [rescueSeconds, setRescueSeconds] = useState(60);
  const [rescueCardIdx, setRescueCardIdx] = useState(0);
  const [rescueChecks, setRescueChecks] = useState<boolean[]>([false, false, false]);

  // Relapse honest modal
  const [relapseTrack, setRelapseTrack] = useState<RecoveryTrack | null>(null);
  const [relapseNote, setRelapseNote] = useState('');

  // Quick reflection
  const [reflectionText, setReflectionText] = useState('');

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!rescueOpen || rescueSeconds <= 0) return;
    const id = setTimeout(() => setRescueSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(id);
  }, [rescueOpen, rescueSeconds]);

  const activeCard = CONFRONTATION_CARDS[cardIdx % CONFRONTATION_CARDS.length];
  const rescueCard = CONFRONTATION_CARDS[rescueCardIdx % CONFRONTATION_CARDS.length];

  function openCreate(preset?: 'pornografia' | 'redes') {
    setEditingTrack(null);
    if (preset === 'pornografia') {
      setTitle('Pornografia');
      setCategory('Pureza');
      setWhyStatement(
        'Honrar a Deus com meu corpo e mente, ser um homem íntegro no secreto e presente para minha esposa e família.'
      );
      setTriggers('Celular à noite no quarto, tédio, estresse, cansaço, solidão');
      setReplacementAction(
        'Deixar o celular na sala, lavar o rosto com água fria, fazer 20 flexões e orar o Salmo 51.'
      );
    } else if (preset === 'redes') {
      setTitle('Telas e redes sociais');
      setCategory('Digital');
      setWhyStatement('Recuperar meu tempo, foco e paz mental.');
      setTriggers('Ansiedade, procrastinação, pegar o celular ao acordar');
      setReplacementAction('Colocar o celular longe e ler 5 páginas ou caminhar.');
    } else {
      setTitle('');
      setCategory('Pureza');
      setWhyStatement('');
      setTriggers('');
      setReplacementAction('');
    }
    setModalOpen(true);
  }

  function openEdit(track: RecoveryTrack) {
    setEditingTrack(track);
    setTitle(track.title);
    setCategory(track.category);
    setWhyStatement(track.why_statement);
    setTriggers(track.triggers);
    setReplacementAction(track.replacement_action);
    setModalOpen(true);
  }

  function openRescue(track?: RecoveryTrack) {
    setRescueTrack(track ?? tracks[0] ?? null);
    setRescueSeconds(60);
    setRescueCardIdx((i) => (i + 1) % CONFRONTATION_CARDS.length);
    setRescueChecks([false, false, false]);
    setRescueOpen(true);
  }

  async function handleSaveTrack(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      if (editingTrack) {
        const { data, error } = await supabase
          .from('recovery_tracks')
          .update({
            title: title.trim(),
            category,
            why_statement: whyStatement.trim(),
            triggers: triggers.trim(),
            replacement_action: replacementAction.trim(),
          })
          .eq('id', editingTrack.id)
          .select('*')
          .single();

        if (error || !data) {
          onToast('Erro ao atualizar frente.');
          return;
        }
        onTracksChange((prev) =>
          prev.map((t) => (t.id === editingTrack.id ? (data as RecoveryTrack) : t))
        );
        onToast('Frente atualizada!');
      } else {
        const { data, error } = await supabase
          .from('recovery_tracks')
          .insert({
            user_id: userId,
            title: title.trim(),
            category,
            why_statement: whyStatement.trim(),
            triggers: triggers.trim(),
            replacement_action: replacementAction.trim(),
          })
          .select('*')
          .single();

        if (error || !data) {
          onToast('Erro ao salvar frente.');
          return;
        }
        onTracksChange((prev) => [data as RecoveryTrack, ...prev]);
        onToast('Frente iniciada! Um dia de cada vez.');
      }
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDailyVictory(track: RecoveryTrack) {
    if (track.last_checkin_date === todayStr) {
      onToast('Vitória de hoje já registrada!');
      return;
    }
    const { days } = computeStreakParts(track.streak_started_at, Date.now());
    const nextBest = Math.max(track.best_streak_days, days);

    const { data: updated, error } = await supabase
      .from('recovery_tracks')
      .update({
        last_checkin_date: todayStr,
        best_streak_days: nextBest,
      })
      .eq('id', track.id)
      .select('*')
      .single();

    if (error || !updated) {
      onToast('Erro ao registrar vitória de hoje.');
      return;
    }

    onTracksChange((prev) =>
      prev.map((t) => (t.id === track.id ? (updated as RecoveryTrack) : t))
    );

    const { data: logRow } = await supabase
      .from('recovery_logs')
      .insert({
        user_id: userId,
        track_id: track.id,
        log_type: 'victory',
        note: `Dia limpo confirmado (${days}d na sequência).`,
      })
      .select('*')
      .single();

    if (logRow) onLogsChange((prev) => [logRow as RecoveryLog, ...prev]);
    onToast('Vitória de hoje confirmada! Continue firme.');
  }

  async function handleOvercomeTemptation() {
    const target = rescueTrack ?? tracks[0];
    if (target) {
      const { data: logRow } = await supabase
        .from('recovery_logs')
        .insert({
          user_id: userId,
          track_id: target.id,
          log_type: 'temptation_overcome',
          note: 'Impulso vencido no Modo Resgate.',
        })
        .select('*')
        .single();
      if (logRow) onLogsChange((prev) => [logRow as RecoveryLog, ...prev]);
    }
    setRescueOpen(false);
    onToast('Você venceu esse impulso!');
  }

  async function handleConfirmRelapse(e: React.FormEvent) {
    e.preventDefault();
    if (!relapseTrack) return;
    const { days } = computeStreakParts(relapseTrack.streak_started_at, Date.now());
    const nextBest = Math.max(relapseTrack.best_streak_days, days);
    const nowIso = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from('recovery_tracks')
      .update({
        streak_started_at: nowIso,
        best_streak_days: nextBest,
        relapse_count: relapseTrack.relapse_count + 1,
        last_checkin_date: null,
      })
      .eq('id', relapseTrack.id)
      .select('*')
      .single();

    if (error || !updated) {
      onToast('Erro ao registrar recomeço.');
      return;
    }

    onTracksChange((prev) =>
      prev.map((t) => (t.id === relapseTrack.id ? (updated as RecoveryTrack) : t))
    );

    const { data: logRow } = await supabase
      .from('recovery_logs')
      .insert({
        user_id: userId,
        track_id: relapseTrack.id,
        log_type: 'relapse',
        note:
          relapseNote.trim() ||
          `Recomeço honesto após ${days} dia(s). Levantar e ajustar a rota.`,
      })
      .select('*')
      .single();

    if (logRow) onLogsChange((prev) => [logRow as RecoveryLog, ...prev]);
    setRelapseTrack(null);
    setRelapseNote('');
    onToast('Recomeço registrado. A graça te levanta — siga em frente.');
  }

  async function handleDeleteTrack(id: string) {
    if (!confirm('Remover esta frente do Laboratório?')) return;
    const { error } = await supabase.from('recovery_tracks').delete().eq('id', id);
    if (error) {
      onToast('Erro ao remover frente.');
      return;
    }
    onTracksChange((prev) => prev.filter((t) => t.id !== id));
    onLogsChange((prev) => prev.filter((l) => l.track_id !== id));
    onToast('Removido do Laboratório');
  }

  async function handleAddReflection(e: React.FormEvent) {
    e.preventDefault();
    const target = tracks[0];
    if (!reflectionText.trim() || !target) return;
    const { data, error } = await supabase
      .from('recovery_logs')
      .insert({
        user_id: userId,
        track_id: target.id,
        log_type: 'reflection',
        note: reflectionText.trim(),
      })
      .select('*')
      .single();
    if (error || !data) {
      onToast('Erro ao salvar reflexão.');
      return;
    }
    onLogsChange((prev) => [data as RecoveryLog, ...prev]);
    setReflectionText('');
    onToast('Registro salvo!');
  }

  return (
    <section className="lab-page">
      <div className="page-head">
        <div>
          <div className="eyebrow">DOMÍNIO PRÓPRIO, FÉ E CARÁTER</div>
          <h1>Laboratório</h1>
          <p className="subtitle">
            Tratamento, verdade e domínio próprio — um dia de cada vez.
          </p>
        </div>
        <div className="lab-head-actions">
          <button
            type="button"
            className="btn lab-rescue-btn"
            onClick={() => openRescue()}
          >
            <AlertTriangle size={14} />
            Modo Resgate
          </button>
          <button
            type="button"
            className="btn secondary"
            onClick={() => openCreate()}
          >
            ＋ Nova frente
          </button>
        </div>
      </div>

      {/* Confrontation & Grace Banner */}
      <div className="panel lab-confront-panel">
        <div className="panel-head" style={{ marginBottom: 8 }}>
          <span className="tag prio-ok">{activeCard.pillar}</span>
          <button
            type="button"
            className="btn secondary small"
            onClick={() => setCardIdx((i) => (i + 1) % CONFRONTATION_CARDS.length)}
          >
            <RefreshCw size={12} />
            Trocar
          </button>
        </div>
        <h2 className="lab-confront-title">{activeCard.title}</h2>
        <p className="lab-confront-body">{activeCard.message}</p>
        {activeCard.verse && (
          <p className="lab-confront-verse">{activeCard.verse}</p>
        )}
      </div>

      {/* Clean Navigation Tabs */}
      <div className="filter-row" style={{ marginBottom: 14 }}>
        <button
          type="button"
          className={`chip ${activeTab === 'tracks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tracks')}
        >
          Frentes ({tracks.length})
        </button>
        <button
          type="button"
          className={`chip ${activeTab === 'journal' ? 'active' : ''}`}
          onClick={() => setActiveTab('journal')}
        >
          Diário ({logs.length})
        </button>
        <button
          type="button"
          className={`chip ${activeTab === 'milestones' ? 'active' : ''}`}
          onClick={() => setActiveTab('milestones')}
        >
          Fases (90d)
        </button>
      </div>

      {activeTab === 'tracks' && (
        <>
          {tracks.length ? (
            <div className="lab-grid">
              {tracks.map((track) => {
                const { days, hours } = computeStreakParts(
                  track.streak_started_at,
                  nowMs
                );
                const nextMilestone =
                  RECOVERY_MILESTONES.find((m) => m.days > days) ??
                  RECOVERY_MILESTONES[RECOVERY_MILESTONES.length - 1];
                const milestonePct = Math.min(
                  100,
                  Math.round((days / nextMilestone.days) * 100)
                );
                const checkedToday = track.last_checkin_date === todayStr;
                const isExpanded = expandedTrackId === track.id;

                return (
                  <div key={track.id} className="panel lab-track-card">
                    <div className="panel-head" style={{ marginBottom: 10 }}>
                      <div className="lab-track-title-wrap">
                        <span className="tag prio-type">{track.category}</span>
                        <h2 className="lab-track-title">{track.title}</h2>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          type="button"
                          className="icon-mini-btn"
                          title="Editar"
                          onClick={() => openEdit(track)}
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          className="icon-mini-btn"
                          title="Remover"
                          onClick={() => handleDeleteTrack(track.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="lab-streak-box">
                      <div>
                        <div className="lab-streak-num">
                          <Flame size={18} style={{ color: 'var(--accent)' }} />
                          <strong>
                            {days} {days === 1 ? 'dia' : 'dias'}
                          </strong>
                          <span>e {hours}h limpo</span>
                        </div>
                        <small className="muted">
                          Recorde: {Math.max(track.best_streak_days, days)}d
                        </small>
                      </div>
                      <button
                        type="button"
                        className={`btn small ${checkedToday ? 'secondary' : ''}`}
                        onClick={() => handleDailyVictory(track)}
                      >
                        <CheckCircle2 size={14} />
                        {checkedToday ? 'Vencido hoje' : 'Venci hoje'}
                      </button>
                    </div>

                    <div className="progress-wrap" style={{ marginTop: 10, marginBottom: 10 }}>
                      <div className="progress-label">
                        <span>{nextMilestone.title}</span>
                        <strong>{milestonePct}%</strong>
                      </div>
                      <div className="progress">
                        <span style={{ width: `${milestonePct}%` }} />
                      </div>
                    </div>

                    {(track.why_statement ||
                      track.triggers ||
                      track.replacement_action) && (
                      <button
                        type="button"
                        className="lab-expand-btn"
                        onClick={() =>
                          setExpandedTrackId(isExpanded ? null : track.id)
                        }
                      >
                        <span>Plano e gatilhos</span>
                        {isExpanded ? (
                          <ChevronUp size={15} />
                        ) : (
                          <ChevronDown size={15} />
                        )}
                      </button>
                    )}

                    {isExpanded && (
                      <div style={{ marginTop: 8 }}>
                        {track.why_statement && (
                          <div className="lab-detail">
                            <strong>Meu porquê</strong>
                            <p>{track.why_statement}</p>
                          </div>
                        )}
                        {track.triggers && (
                          <div className="lab-detail">
                            <strong>Gatilhos</strong>
                            <p>{track.triggers}</p>
                          </div>
                        )}
                        {track.replacement_action && (
                          <div className="lab-detail">
                            <strong>Plano de fuga</strong>
                            <p>{track.replacement_action}</p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="lab-card-actions">
                      <button
                        type="button"
                        className="btn small lab-rescue-btn"
                        onClick={() => openRescue(track)}
                      >
                        <AlertTriangle size={13} />
                        Preciso de ajuda
                      </button>
                      <button
                        type="button"
                        className="btn secondary small"
                        onClick={() => {
                          setRelapseTrack(track);
                          setRelapseNote('');
                        }}
                      >
                        Recomeçar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="panel">
              <div className="panel-head">
                <h2>Comece sua jornada de limpeza</h2>
              </div>
              <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
                Cadastre o hábito ou vício que você quer vencer para ativar o contador,
                plano de fuga e Modo Resgate.
              </p>
              <div className="lab-empty-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => openCreate('pornografia')}
                >
                  Iniciar plano: Pornografia
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => openCreate('redes')}
                >
                  Telas / Redes Sociais
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => openCreate()}
                >
                  ＋ Cadastrar outro
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'journal' && (
        <div className="panel">
          <div className="panel-head">
            <h2>Diário de firmeza</h2>
          </div>
          {tracks.length > 0 && (
            <form onSubmit={handleAddReflection} className="lab-journal-form">
              <input
                type="text"
                placeholder="Escreva uma oração, alerta ou compromisso de hoje..."
                value={reflectionText}
                onChange={(e) => setReflectionText(e.target.value)}
              />
              <button type="submit" className="btn small">
                Registrar
              </button>
            </form>
          )}
          <div className="task-list">
            {logs.length ? (
              logs.slice(0, 15).map((log) => (
                <div key={log.id} className="task" style={{ cursor: 'default' }}>
                  <span
                    className={`prio-kind-dot ${
                      log.log_type === 'relapse' ? 'urgent' : ''
                    }`}
                  >
                    {log.log_type === 'victory'
                      ? '✓'
                      : log.log_type === 'temptation_overcome'
                      ? '◈'
                      : log.log_type === 'relapse'
                      ? '↻'
                      : '✎'}
                  </span>
                  <div>
                    <div className="task-title" style={{ fontSize: 13 }}>
                      {log.note || log.log_type}
                    </div>
                    <div className="task-meta">
                      {new Date(log.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty">
                Seus check-ins, impulsos vencidos e reflexões aparecerão aqui.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'milestones' && (
        <div className="panel">
          <div className="panel-head">
            <h2>Fases da sua limpeza</h2>
          </div>
          <div className="task-list">
            {RECOVERY_MILESTONES.map((m) => (
              <div key={m.days} className="task" style={{ cursor: 'default' }}>
                <span className="prio-kind-dot">{m.days}d</span>
                <div>
                  <div className="task-title">{m.title}</div>
                  <div className="task-meta">{m.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div className="modal">
            <div className="modal-head">
              <h2>{editingTrack ? 'Editar frente' : 'Nova frente de limpeza'}</h2>
              <button
                type="button"
                className="close"
                onClick={() => setModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveTrack}>
              <div className="form-row">
                <div className="field">
                  <label htmlFor="labTitle">O que vencer?</label>
                  <input
                    id="labTitle"
                    required
                    placeholder="Ex: Pornografia, Redes sociais..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="labCat">Área</label>
                  <select
                    id="labCat"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {LAB_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="field">
                <label htmlFor="labWhy">Seu porquê (Deus, família e caráter)</label>
                <textarea
                  id="labWhy"
                  rows={2}
                  placeholder="Por que você não aceita mais isso na sua vida?"
                  value={whyStatement}
                  onChange={(e) => setWhyStatement(e.target.value)}
                />
              </div>

              <div className="field">
                <label htmlFor="labTriggers">Gatilhos</label>
                <input
                  id="labTriggers"
                  placeholder="Ex: Celular na cama, tédio, estresse..."
                  value={triggers}
                  onChange={(e) => setTriggers(e.target.value)}
                />
              </div>

              <div className="field">
                <label htmlFor="labAction">Ação na hora da tentação</label>
                <textarea
                  id="labAction"
                  rows={2}
                  placeholder="Ex: Largar o celular na sala, lavar o rosto, orar..."
                  value={replacementAction}
                  onChange={(e) => setReplacementAction(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn" disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar plano'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SOS Rescue Modal */}
      {rescueOpen && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setRescueOpen(false);
          }}
        >
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-head">
              <h2 style={{ color: 'var(--red)' }}>Modo Resgate · Não negocie agora</h2>
              <button
                type="button"
                className="close"
                onClick={() => setRescueOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="rescue-timer-box">
              <div>
                <strong>{rescueSeconds}s</strong>
                <span>
                  {rescueSeconds > 0
                    ? 'Respire fundo (4s inspira · 4s segura · 4s solta). O pico do impulso passa em minutos.'
                    : 'Sua mente já desacelerou — saia do ambiente agora.'}
                </span>
              </div>
              <button
                type="button"
                className="btn secondary small"
                onClick={() => setRescueSeconds(60)}
              >
                ↻ 60s
              </button>
            </div>

            <div className="panel lab-confront-panel" style={{ marginBottom: 12 }}>
              <div className="panel-head" style={{ marginBottom: 6 }}>
                <span className="tag prio-ok">{rescueCard.pillar}</span>
                <button
                  type="button"
                  className="btn secondary small"
                  onClick={() =>
                    setRescueCardIdx((i) => (i + 1) % CONFRONTATION_CARDS.length)
                  }
                >
                  Próximo
                </button>
              </div>
              <strong style={{ display: 'block', marginBottom: 4 }}>
                {rescueCard.title}
              </strong>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55 }}>
                {rescueCard.message}
              </p>
              {rescueCard.verse && (
                <p className="lab-confront-verse" style={{ marginTop: 6 }}>
                  {rescueCard.verse}
                </p>
              )}
            </div>

            {rescueTrack?.why_statement && (
              <div className="lab-detail" style={{ marginBottom: 10 }}>
                <strong>Sua própria palavra</strong>
                <p>{rescueTrack.why_statement}</p>
              </div>
            )}

            <div className="lab-detail" style={{ marginBottom: 12 }}>
              <strong>Corte imediato</strong>
              {[
                'Fechei a aba / bloqueei o conteúdo agora',
                'Saí do quarto / fui para um lugar visível',
                rescueTrack?.replacement_action || DEFAULT_RESCUE_ACTIONS[2],
              ].map((label, idx) => (
                <label
                  key={label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 12.5,
                    marginTop: 6,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    className="check"
                    checked={rescueChecks[idx]}
                    onChange={(e) => {
                      const next = [...rescueChecks];
                      next[idx] = e.target.checked;
                      setRescueChecks(next);
                    }}
                  />
                  {label}
                </label>
              ))}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn secondary"
                onClick={() => setRescueOpen(false)}
              >
                Fechar
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleOvercomeTemptation}
              >
                Venci esse impulso ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Honest Relapse Modal */}
      {relapseTrack && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setRelapseTrack(null);
          }}
        >
          <div className="modal">
            <div className="modal-head">
              <h2>Recomeçar com verdade</h2>
              <button
                type="button"
                className="close"
                onClick={() => setRelapseTrack(null)}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.55, marginTop: 0 }}>
              Confessar e recomeçar exige coragem. Identifique o que abriu a brecha para
              fechar essa porta hoje.
            </p>
            <form onSubmit={handleConfirmRelapse}>
              <div className="field">
                <label htmlFor="relapseNote">
                  Qual foi o gatilho ou brecha? (ex: levei o celular para a cama)
                </label>
                <textarea
                  id="relapseNote"
                  rows={3}
                  placeholder="Anote para não repetir o mesmo erro..."
                  value={relapseNote}
                  onChange={(e) => setRelapseNote(e.target.value)}
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setRelapseTrack(null)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn">
                  Zerar contador e recomeçar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
