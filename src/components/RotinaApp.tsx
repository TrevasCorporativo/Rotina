'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getHolidayForDate } from '@/lib/holidays';
import {
  getExistingPushSubscription,
  isPushSupported,
  subscribeToPush,
} from '@/lib/push';
import { useTheme } from '@/lib/theme';
import type { CalendarEvent, Profile, Task } from '@/lib/types';
import { BrandLogo } from './BrandLogo';
import { ChangePasswordModal } from './ChangePasswordModal';
import {
  EntryModal,
  type NewEventPayload,
  type NewTaskPayload,
} from './EntryModal';
import { ProfileView } from './ProfileView';

type ViewId = 'dashboard' | 'tasks' | 'calendar' | 'profile';

interface RotinaAppProps {
  initialProfile: Profile;
  initialTasks: Task[];
  initialEvents: CalendarEvent[];
}

const FUNNY_PHRASES = [
  'A vida adulta mandou lembranças. Vamos fingir que temos um plano.',
  'Se está na agenda, existe uma chance de acontecer.',
  'Pequenos passos. Grandes boletos.',
  'Hoje a meta é fazer o possível sem abrir 37 abas na cabeça.',
  'Organizando o caos desde… agora.',
];

function localDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fmtDate(
  s: string | null,
  opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' }
): string {
  if (!s) return 'Sem prazo';
  return new Date(`${s}T12:00:00`).toLocaleDateString('pt-BR', opts);
}

export function RotinaApp({
  initialProfile,
  initialTasks,
  initialEvents,
}: RotinaAppProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);

  const [view, setView] = useState<ViewId>('dashboard');
  const [dashFilter, setDashFilter] = useState<'all' | 'today' | 'open'>('all');
  const [taskFilter, setTaskFilter] = useState<'all' | 'open' | 'done'>('all');

  const todayStr = useMemo(() => localDate(new Date()), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());

  const [modalMode, setModalMode] = useState<'task' | 'event' | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [pushNeedsPrompt, setPushNeedsPrompt] = useState(false);

  const [phrase] = useState(
    () => FUNNY_PHRASES[Math.floor(Math.random() * FUNNY_PHRASES.length)]
  );

  const hr = new Date().getHours();
  const greeting = hr < 12 ? 'Bom dia!' : hr < 18 ? 'Boa tarde!' : 'Boa noite!';
  const todayLabel = new Date().toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get('view');
    if (v === 'tasks' || v === 'calendar' || v === 'profile') {
      queueMicrotask(() => setView(v));
    }

    if (isPushSupported()) {
      getExistingPushSubscription()
        .then(async (sub) => {
          if (sub) return;
          if (Notification.permission === 'granted') {
            await subscribeToPush().catch(() => {});
          } else if (Notification.permission === 'default') {
            // Try automatic activation; if browser requires user gesture, show banner
            try {
              await subscribeToPush();
              setPushNeedsPrompt(false);
            } catch {
              setPushNeedsPrompt(true);
            }
          }
        })
        .catch(() => {});
    }
  }, []);

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((curr) => (curr === msg ? null : curr));
    }, 2400);
  }

  async function handleEnablePushQuick() {
    try {
      await subscribeToPush();
      setPushNeedsPrompt(false);
      showToast('Notificações ativadas neste aparelho!');
    } catch (err: unknown) {
      showToast((err as Error).message || 'Não foi possível ativar notificações.');
    }
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  }

  async function handleSaveEntry(payload: NewTaskPayload | NewEventPayload) {
    const supabase = createClient();

    if (payload.type === 'task') {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: profile.id,
          title: payload.title,
          category: payload.category,
          due_date: payload.due_date,
          due_time: payload.due_time,
          priority: payload.priority,
          notify_enabled: true,
          reminder_preset: payload.reminder_preset,
        })
        .select('*')
        .single();

      if (error || !data) {
        showToast('Erro ao salvar tarefa.');
        return;
      }
      setTasks((prev) => [data as Task, ...prev]);
      showToast('Tarefa adicionada');
    } else {
      const { data, error } = await supabase
        .from('events')
        .insert({
          user_id: profile.id,
          title: payload.title,
          event_date: payload.event_date,
          event_time: payload.event_time,
          location: payload.location,
          notes: payload.notes,
          notify_enabled: true,
          notify_minutes_before: payload.notify_minutes_before,
          reminder_preset: payload.reminder_preset,
        })
        .select('*')
        .single();

      if (error || !data) {
        showToast('Erro ao salvar evento.');
        return;
      }
      setEvents((prev) => [...prev, data as CalendarEvent]);
      showToast('Evento adicionado');
    }
  }

  async function toggleTask(task: Task) {
    const nextDone = !task.done;
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, done: nextDone } : t))
    );

    const supabase = createClient();
    const { error } = await supabase
      .from('tasks')
      .update({ done: nextDone })
      .eq('id', task.id);

    if (error) {
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, done: task.done } : t))
      );
      showToast('Não foi possível atualizar a tarefa.');
    }
  }

  async function deleteTask(id: string) {
    if (!confirm('Excluir esta tarefa?')) return;
    const supabase = createClient();
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) {
      showToast('Erro ao excluir tarefa.');
      return;
    }
    setTasks((prev) => prev.filter((t) => t.id !== id));
    showToast('Tarefa excluída');
  }

  async function deleteEvent(id: string) {
    if (!confirm('Excluir este evento?')) return;
    const supabase = createClient();
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) {
      showToast('Erro ao excluir evento.');
      return;
    }
    setEvents((prev) => prev.filter((e) => e.id !== id));
    showToast('Evento excluído');
  }

  const openCount = tasks.filter((t) => !t.done).length;
  const doneCount = tasks.filter((t) => t.done).length;
  const todayEventsCount = events.filter((e) => e.event_date === todayStr).length;
  const pct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;

  const dashTasks = useMemo(() => {
    return tasks
      .filter((t) =>
        dashFilter === 'all'
          ? true
          : dashFilter === 'today'
          ? t.due_date === todayStr
          : !t.done
      )
      .sort(
        (a, b) =>
          Number(a.done) - Number(b.done) ||
          (a.priority === 'high' ? -1 : b.priority === 'high' ? 1 : 0)
      )
      .slice(0, 6);
  }, [tasks, dashFilter, todayStr]);

  const allFilteredTasks = useMemo(() => {
    return tasks
      .filter((t) =>
        taskFilter === 'all' ? true : taskFilter === 'done' ? t.done : !t.done
      )
      .sort(
        (a, b) =>
          Number(a.done) - Number(b.done) ||
          (a.due_date || '9999').localeCompare(b.due_date || '9999')
      );
  }, [tasks, taskFilter]);

  const upcomingEvents = useMemo(() => {
    return events
      .filter((e) => e.event_date >= todayStr)
      .sort((a, b) =>
        `${a.event_date}${a.event_time}`.localeCompare(
          `${b.event_date}${b.event_time}`
        )
      )
      .slice(0, 4);
  }, [events, todayStr]);

  const weekDays = useMemo(() => {
    const d = new Date();
    const day = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((day + 6) % 7));
    return ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((label, i) => {
      const x = new Date(monday);
      x.setDate(monday.getDate() + i);
      return { label, dateStr: localDate(x), num: x.getDate() };
    });
  }, []);

  const calendarCells = useMemo(() => {
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const first = new Date(y, m, 1);
    const start = (first.getDay() + 6) % 7;
    const days = new Date(y, m + 1, 0).getDate();
    const prev = new Date(y, m, 0).getDate();

    return Array.from({ length: 42 }, (_, i) => {
      const n = i - start + 1;
      const dt =
        n < 1
          ? new Date(y, m - 1, prev + n)
          : n > days
          ? new Date(y, m + 1, n - days)
          : new Date(y, m, n);
      const s = localDate(dt);
      const outside = n < 1 || n > days;
      const dayEvents = events.filter((e) => e.event_date === s);
      const holiday = getHolidayForDate(s);
      return { dateStr: s, dayNum: dt.getDate(), outside, dayEvents, holiday };
    });
  }, [currentMonth, events]);

  const selectedDayEvents = useMemo(() => {
    return events
      .filter((e) => e.event_date === selectedDate)
      .sort((a, b) => a.event_time.localeCompare(b.event_time));
  }, [events, selectedDate]);

  const selectedHoliday = getHolidayForDate(selectedDate);

  const initials = profile.display_name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

  const crumbLabel: Record<ViewId, string> = {
    dashboard: 'Visão geral',
    tasks: 'Minhas tarefas',
    calendar: 'Agenda',
    profile: 'Meu perfil',
  };

  function renderTaskItem(t: Task) {
    const prioLabel =
      t.priority === 'high' ? 'Alta' : t.priority === 'medium' ? 'Média' : 'Baixa';

    return (
      <div key={t.id} className={`task ${t.done ? 'done' : ''}`}>
        <input
          className="check"
          type="checkbox"
          checked={t.done}
          aria-label="Concluir tarefa"
          onChange={() => toggleTask(t)}
        />
        <div className="task-main">
          <div className="task-title">{t.title}</div>
          <div className="task-meta">
            <span>{t.category}</span>
            <span>·</span>
            <span>
              {fmtDate(t.due_date)}
              {t.due_time ? ` às ${t.due_time.slice(0, 5)}` : ''}
            </span>
            <span className={`tag ${t.priority}`}>{prioLabel}</span>
          </div>
        </div>
        <button
          className="task-delete"
          title="Excluir tarefa"
          onClick={() => deleteTask(t.id)}
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <div className="app">
      {profile.must_change_password && (
        <ChangePasswordModal
          displayName={profile.display_name}
          onSuccess={() => {
            setProfile((p) => ({ ...p, must_change_password: false }));
            showToast('Senha atualizada! Bem-vindo(a)!');
          }}
        />
      )}

      <aside className="sidebar">
        <div className="brand">
          <BrandLogo size={36} /> Modo Sobrevivência
        </div>
        <div>
          <div className="nav-label">ESPAÇO PESSOAL</div>
          <nav className="nav">
            <button
              className={view === 'dashboard' ? 'active' : ''}
              onClick={() => setView('dashboard')}
            >
              <span className="ico">◫</span>Visão geral
            </button>
            <button
              className={view === 'tasks' ? 'active' : ''}
              onClick={() => setView('tasks')}
            >
              <span className="ico">☑</span>Minhas tarefas
            </button>
            <button
              className={view === 'calendar' ? 'active' : ''}
              onClick={() => setView('calendar')}
            >
              <span className="ico">▦</span>Agenda
            </button>
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-bottom">
            <strong>Respira. Vai dar certo. Talvez.</strong>
            <span>Um boleto, uma tarefa e um surto de cada vez.</span>
          </div>

          <button
            type="button"
            className={`sidebar-profile-btn ${view === 'profile' ? 'active' : ''}`}
            onClick={() => setView('profile')}
          >
            <div className="avatar" style={{ width: 34, height: 34, fontSize: 12 }}>
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt={profile.display_name} />
              ) : (
                initials
              )}
            </div>
            <div className="sidebar-profile-info">
              <strong>{profile.display_name}</strong>
              <span>Meu perfil</span>
            </div>
          </button>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div className="crumb">
            Workspace <span style={{ padding: '0 7px' }}>/</span>
            <span>{crumbLabel[view]}</span>
          </div>
          <div className="top-actions">
            <button
              type="button"
              className="theme-toggle"
              onClick={toggleTheme}
              title="Alternar tema claro/escuro"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <div className="today-pill">{todayLabel}</div>
            <span className="user-welcome">{profile.display_name}</span>
            <button className="logout-btn" onClick={handleLogout}>
              Sair ↗
            </button>
            <button
              type="button"
              className="avatar-btn"
              title="Abrir meu perfil"
              onClick={() => setView('profile')}
            >
              <div className="avatar">
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar_url} alt={profile.display_name} />
                ) : (
                  initials
                )}
              </div>
            </button>
          </div>
        </div>

        {pushNeedsPrompt && (
          <div className="push-alert-bar">
            <span>
              🔔 <strong>Notificações obrigatórias:</strong> ative neste dispositivo para
              receber alertas de tarefas e compromissos mesmo com o site fechado.
            </span>
            <button
              type="button"
              className="btn small"
              onClick={handleEnablePushQuick}
            >
              Ativar agora
            </button>
          </div>
        )}

        {view === 'dashboard' && (
          <section>
            <div className="page-head">
              <div>
                <div className="eyebrow">SEU DIA EM FOCO</div>
                <h1>Visão geral</h1>
                <p className="subtitle">
                  O painel oficial de quem está tentando ter a vida nos eixos.
                </p>
              </div>
              <button className="btn" onClick={() => setModalMode('task')}>
                ＋ Nova tarefa
              </button>
            </div>

            <div className="welcome-card">
              <div className="welcome-copy">
                <div className="welcome-eyebrow">CENTRAL DE CONTROLE DO CAOS</div>
                <h2>
                  {greeting} {profile.display_name.split(' ')[0]}
                </h2>
                <p>{phrase}</p>
                <button
                  className="btn welcome-btn"
                  onClick={() => setModalMode('task')}
                >
                  Adicionar uma tarefa <span style={{ marginLeft: 4 }}>＋</span>
                </button>
              </div>
              <div className="welcome-art">
                <div className="orb orb1" />
                <div className="orb orb2" />
                <div className="leaf leaf1">✦</div>
                <div className="leaf leaf2">✧</div>
                <div className="welcome-symbol">◒</div>
              </div>
            </div>

            <div className="stats">
              <div className="stat">
                <div className="stat-top">
                  Tarefas abertas <span className="stat-icon">☑</span>
                </div>
                <strong>{openCount}</strong>
                <small>Itens que ainda precisam da sua atenção</small>
              </div>
              <div className="stat">
                <div className="stat-top">
                  Concluídas{' '}
                  <span
                    className="stat-icon"
                    style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                  >
                    ✓
                  </span>
                </div>
                <strong>{doneCount}</strong>
                <small>Pequenos avanços contam</small>
              </div>
              <div className="stat">
                <div className="stat-top">
                  Compromissos{' '}
                  <span
                    className="stat-icon"
                    style={{ background: 'rgba(223, 147, 66, 0.14)', color: 'var(--orange)' }}
                  >
                    ◷
                  </span>
                </div>
                <strong>{todayEventsCount}</strong>
                <small>Eventos cadastrados para hoje</small>
              </div>
              <div className="stat">
                <div className="stat-top">
                  Seu progresso <span className="stat-icon">↗</span>
                </div>
                <strong>{pct}%</strong>
                <small>Das tarefas cadastradas</small>
              </div>
            </div>

            <div className="content-grid">
              <div className="panel">
                <div className="panel-head">
                  <h2>Prioridades</h2>
                  <button
                    className="btn secondary small"
                    onClick={() => setView('tasks')}
                  >
                    Ver todas
                  </button>
                </div>
                <div className="filter-row">
                  <button
                    className={`chip ${dashFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setDashFilter('all')}
                  >
                    Todas
                  </button>
                  <button
                    className={`chip ${dashFilter === 'today' ? 'active' : ''}`}
                    onClick={() => setDashFilter('today')}
                  >
                    Hoje
                  </button>
                  <button
                    className={`chip ${dashFilter === 'open' ? 'active' : ''}`}
                    onClick={() => setDashFilter('open')}
                  >
                    Em aberto
                  </button>
                </div>
                <div className="task-list">
                  {dashTasks.length ? (
                    dashTasks.map(renderTaskItem)
                  ) : (
                    <div className="empty">
                      Tudo em dia. Que tal adicionar uma tarefa?
                    </div>
                  )}
                </div>
                <div className="progress-wrap">
                  <div className="progress-label">
                    <span>Progresso geral</span>
                    <strong>{pct}%</strong>
                  </div>
                  <div className="progress">
                    <span style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>

              <div>
                <div className="panel">
                  <div className="panel-head">
                    <h2>Próximos compromissos</h2>
                    <button
                      className="btn secondary small"
                      onClick={() => setView('calendar')}
                    >
                      Agenda
                    </button>
                  </div>
                  <div className="agenda-list">
                    {upcomingEvents.length ? (
                      upcomingEvents.map((ev) => (
                        <div key={ev.id} className="event">
                          <div className="event-time">
                            {ev.event_time.slice(0, 5)}
                            <br />
                            {fmtDate(ev.event_date)}
                          </div>
                          <div className="event-bar" />
                          <div>
                            <div className="event-title">{ev.title}</div>
                            <div className="event-sub">
                              {ev.location || ev.category || 'Compromisso'}
                            </div>
                            {ev.notes && <div className="event-notes">{ev.notes}</div>}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="empty">Nenhum compromisso próximo.</div>
                    )}
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-head">
                    <h2>Esta semana</h2>
                    <span className="muted" style={{ fontSize: 10 }}>
                      Resumo rápido
                    </span>
                  </div>
                  <div className="week">
                    {weekDays.map((d) => (
                      <div
                        key={d.dateStr}
                        className={`day ${d.dateStr === todayStr ? 'selected' : ''}`}
                      >
                        {d.label}
                        <b>{d.num}</b>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {view === 'tasks' && (
          <section>
            <div className="page-head">
              <div>
                <div className="eyebrow">ORGANIZE E EXECUTE</div>
                <h1>Minhas tarefas</h1>
                <p className="subtitle">
                  Tudo o que você precisa fazer, em um só lugar.
                </p>
              </div>
              <button className="btn" onClick={() => setModalMode('task')}>
                ＋ Nova tarefa
              </button>
            </div>
            <div className="panel">
              <div className="panel-head">
                <h2>Lista de tarefas</h2>
                <span className="muted" style={{ fontSize: 11 }}>
                  {tasks.length} {tasks.length === 1 ? 'tarefa' : 'tarefas'}
                </span>
              </div>
              <div className="filter-row">
                <button
                  className={`chip ${taskFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setTaskFilter('all')}
                >
                  Todas
                </button>
                <button
                  className={`chip ${taskFilter === 'open' ? 'active' : ''}`}
                  onClick={() => setTaskFilter('open')}
                >
                  Em aberto
                </button>
                <button
                  className={`chip ${taskFilter === 'done' ? 'active' : ''}`}
                  onClick={() => setTaskFilter('done')}
                >
                  Concluídas
                </button>
              </div>
              <div className="task-list">
                {allFilteredTasks.length ? (
                  allFilteredTasks.map(renderTaskItem)
                ) : (
                  <div className="empty">
                    Nenhuma tarefa por aqui. Adicione uma nova tarefa para começar.
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {view === 'calendar' && (
          <section>
            <div className="page-head">
              <div>
                <div className="eyebrow">SEU TEMPO, BEM PLANEJADO</div>
                <h1>Agenda</h1>
                <p className="subtitle">
                  Visualize seus compromissos, feriados e planeje os próximos dias.
                </p>
              </div>
              <button className="btn" onClick={() => setModalMode('event')}>
                ＋ Novo evento
              </button>
            </div>

            <div className="panel">
              <div className="panel-head">
                <h2>Calendário</h2>
                <div className="calendar-toolbar">
                  <button
                    className="btn secondary small"
                    onClick={() =>
                      setCurrentMonth(
                        (d) => new Date(d.getFullYear(), d.getMonth() - 1, 1)
                      )
                    }
                  >
                    ‹
                  </button>
                  <strong>
                    {currentMonth.toLocaleDateString('pt-BR', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </strong>
                  <button
                    className="btn secondary small"
                    onClick={() =>
                      setCurrentMonth(
                        (d) => new Date(d.getFullYear(), d.getMonth() + 1, 1)
                      )
                    }
                  >
                    ›
                  </button>
                  <button
                    className="btn secondary small"
                    onClick={() => {
                      setCurrentMonth(new Date());
                      setSelectedDate(todayStr);
                    }}
                  >
                    Hoje
                  </button>
                </div>
              </div>

              <div className="calendar">
                {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d) => (
                  <div key={d} className="dow">
                    {d}
                  </div>
                ))}
                {calendarCells.map((cell) => (
                  <div
                    key={cell.dateStr}
                    className={`cell ${cell.outside ? 'out' : ''} ${
                      cell.dateStr === selectedDate ? 'selected' : ''
                    }`}
                    onClick={() => {
                      setSelectedDate(cell.dateStr);
                      setCurrentMonth(new Date(`${cell.dateStr}T12:00:00`));
                    }}
                  >
                    <div className="cell-num">{cell.dayNum}</div>
                    {cell.holiday && (
                      <span className="holiday-dot" title={cell.holiday}>
                        {cell.holiday}
                      </span>
                    )}
                    {cell.dayEvents.slice(0, 2).map((ev) => (
                      <span key={ev.id} className="event-dot">
                        {ev.title}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="panel">
              <div className="panel-head">
                <h2>
                  Compromissos ·{' '}
                  {fmtDate(selectedDate, {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                  })}
                </h2>
                <button
                  className="btn secondary small"
                  onClick={() => setModalMode('event')}
                >
                  ＋ Adicionar
                </button>
              </div>

              {selectedHoliday && (
                <div className="holiday-banner">
                  🎉 Feriado nacional: <strong>{selectedHoliday}</strong>
                </div>
              )}

              <div className="agenda-list">
                {selectedDayEvents.length ? (
                  selectedDayEvents.map((ev) => (
                    <div key={ev.id} className="event">
                      <div className="event-time">{ev.event_time.slice(0, 5)}</div>
                      <div className="event-bar" />
                      <div>
                        <div className="event-title">{ev.title}</div>
                        <div className="event-sub">
                          {ev.location || 'Sem local informado'}
                        </div>
                        {ev.notes && <div className="event-notes">{ev.notes}</div>}
                      </div>
                      <button
                        className="task-delete"
                        title="Excluir evento"
                        onClick={() => deleteEvent(ev.id)}
                      >
                        ×
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="empty">Nenhum compromisso nesta data.</div>
                )}
              </div>
            </div>
          </section>
        )}

        {view === 'profile' && (
          <ProfileView
            profile={profile}
            onProfileUpdated={setProfile}
            onToast={showToast}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav" aria-label="Navegação mobile">
        <button
          className={view === 'dashboard' ? 'active' : ''}
          onClick={() => setView('dashboard')}
        >
          <span>◫</span>
          <small>Início</small>
        </button>
        <button
          className={view === 'tasks' ? 'active' : ''}
          onClick={() => setView('tasks')}
        >
          <span>☑</span>
          <small>Tarefas</small>
        </button>
        <button
          className={view === 'calendar' ? 'active' : ''}
          onClick={() => setView('calendar')}
        >
          <span>▦</span>
          <small>Agenda</small>
        </button>
        <button
          className={view === 'profile' ? 'active' : ''}
          onClick={() => setView('profile')}
        >
          <span>☺</span>
          <small>Perfil</small>
        </button>
      </nav>

      {modalMode && (
        <EntryModal
          mode={modalMode}
          defaultDate={modalMode === 'event' ? selectedDate : todayStr}
          onClose={() => setModalMode(null)}
          onSave={handleSaveEntry}
        />
      )}

      {toastMsg && <div className="toast">{toastMsg}</div>}
    </div>
  );
}
