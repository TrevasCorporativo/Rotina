'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getHolidayForDate } from '@/lib/holidays';
import { getDailyMotivation, getDailyVerse } from '@/lib/daily-messages';
import {
  getExistingPushSubscription,
  isPushSupported,
  subscribeToPush,
} from '@/lib/push';
import { useTheme } from '@/lib/theme';
import type {
  CalendarEvent,
  FinanceExpense,
  FinanceIncome,
  FinanceMonth,
  Profile,
  Task,
} from '@/lib/types';
import { BrandLogo } from './BrandLogo';
import { ChangePasswordModal } from './ChangePasswordModal';
import {
  EntryModal,
  type NewEventPayload,
  type NewTaskPayload,
} from './EntryModal';
import { FinanceView } from './FinanceView';
import { ProfileView } from './ProfileView';
import { TipsView } from './TipsView';

type ViewId = 'dashboard' | 'tasks' | 'calendar' | 'finance' | 'tips' | 'profile';

interface RotinaAppProps {
  initialProfile: Profile;
  initialTasks: Task[];
  initialEvents: CalendarEvent[];
  initialFinanceMonths: FinanceMonth[];
  initialFinanceExpenses: FinanceExpense[];
  initialFinanceIncomes: FinanceIncome[];
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
  initialFinanceMonths,
  initialFinanceExpenses,
  initialFinanceIncomes,
}: RotinaAppProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);

  const [view, setView] = useState<ViewId>('dashboard');
  const [dashFilter, setDashFilter] = useState<'all' | 'today' | 'open'>('all');
  const [taskFilter, setTaskFilter] = useState<'all' | 'open' | 'done'>('all');

  const [nowClock, setNowClock] = useState<Date>(() => new Date());
  const todayStr = useMemo(() => localDate(nowClock), [nowClock]);
  const nowTimeStr = useMemo(
    () =>
      nowClock.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
    [nowClock]
  );
  const liveClockLabel = useMemo(
    () =>
      nowClock.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }),
    [nowClock]
  );

  useEffect(() => {
    const timer = setInterval(() => setNowClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());

  const [modalMode, setModalMode] = useState<'task' | 'event' | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [pushNeedsPrompt, setPushNeedsPrompt] = useState(false);
  const [refreshState, setRefreshState] = useState<{
    open: boolean;
    step: string;
    progress: number;
  }>({ open: false, step: '', progress: 0 });

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

  async function handleMobileRefresh() {
    setRefreshState({
      open: true,
      step: 'Buscando novas atualizações do sistema...',
      progress: 25,
    });

    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        await reg?.update().catch(() => {});
      }

      await new Promise((r) => setTimeout(r, 420));
      setRefreshState({
        open: true,
        step: 'Sincronizando tarefas, agenda e perfil...',
        progress: 68,
      });

      const supabase = createClient();
      const [{ data: freshProfile }, { data: freshTasks }, { data: freshEvents }] =
        await Promise.all([
          supabase.from('profiles').select('*').eq('id', profile.id).single(),
          supabase.from('tasks').select('*').order('created_at', { ascending: false }),
          supabase
            .from('events')
            .select('*')
            .order('event_date', { ascending: true })
            .order('event_time', { ascending: true }),
        ]);

      if (freshProfile) setProfile(freshProfile as Profile);
      if (freshTasks) setTasks(freshTasks as Task[]);
      if (freshEvents) setEvents(freshEvents as CalendarEvent[]);

      setRefreshState({
        open: true,
        step: 'Tudo atualizado! Aplicando novidades...',
        progress: 100,
      });

      await new Promise((r) => setTimeout(r, 450));
      window.location.reload();
    } catch {
      setRefreshState({ open: false, step: '', progress: 0 });
      showToast('Não foi possível atualizar agora.');
    }
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
          reminder_presets: payload.reminder_presets,
        })
        .select('*')
        .single();

      if (error || !data) {
        showToast('Erro ao salvar tarefa.');
        return;
      }
      setTasks((prev) => [data as Task, ...prev]);
      showToast('Tarefa adicionada');
    } else if (payload.id) {
      const { data, error } = await supabase
        .from('events')
        .update({
          title: payload.title,
          event_date: payload.event_date,
          event_time: payload.event_time,
          location: payload.location,
          notes: payload.notes,
          notify_enabled: true,
          notify_minutes_before: payload.notify_minutes_before,
          reminder_preset: payload.reminder_preset,
          notified_at: null,
        })
        .eq('id', payload.id)
        .select('*')
        .single();

      if (error || !data) {
        showToast('Erro ao atualizar evento.');
        return;
      }
      setEvents((prev) =>
        prev.map((ev) => (ev.id === payload.id ? (data as CalendarEvent) : ev))
      );
      showToast('Evento atualizado');
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
      const dayEvents = events
        .filter((e) => e.event_date === s)
        .sort((a, b) => a.event_time.localeCompare(b.event_time));
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
  const dailyMotivation = useMemo(() => getDailyMotivation(todayStr), [todayStr]);
  const dailyVerse = useMemo(() => getDailyVerse(todayStr), [todayStr]);

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
    finance: 'Financeiro',
    tips: 'Dicas',
    profile: 'Meu perfil',
  };

  function isTaskOverdue(t: Task): boolean {
    if (t.done || !t.due_date) return false;
    if (t.due_date < todayStr) return true;
    if (t.due_date === todayStr && t.due_time) {
      return t.due_time.slice(0, 5) < nowTimeStr;
    }
    return false;
  }

  function isEventOverdue(ev: CalendarEvent): boolean {
    if (ev.event_date < todayStr) return true;
    if (ev.event_date === todayStr) {
      return ev.event_time.slice(0, 5) < nowTimeStr;
    }
    return false;
  }

  function renderTaskItem(t: Task) {
    const prioLabel =
      t.priority === 'high' ? 'Alta' : t.priority === 'medium' ? 'Média' : 'Baixa';
    const overdue = isTaskOverdue(t);

    return (
      <div
        key={t.id}
        className={`task ${t.done ? 'done' : ''} ${overdue ? 'overdue' : ''}`}
      >
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
    <div className={`app ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
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
        <div className="sidebar-top">
          <div className="brand">
            <BrandLogo size={36} />
            <span className="brand-text">Modo Sobrevivência</span>
          </div>
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={() => setSidebarCollapsed((c) => !c)}
            title={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
            aria-label={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {sidebarCollapsed ? '»' : '«'}
          </button>
        </div>
        <div>
          <div className="nav-label">ESPAÇO PESSOAL</div>
          <nav className="nav">
            <button
              className={view === 'dashboard' ? 'active' : ''}
              onClick={() => setView('dashboard')}
              title="Visão geral"
            >
              <span className="ico">◫</span>
              <span className="nav-text">Visão geral</span>
            </button>
            <button
              className={view === 'tasks' ? 'active' : ''}
              onClick={() => setView('tasks')}
              title="Minhas tarefas"
            >
              <span className="ico">☑</span>
              <span className="nav-text">Minhas tarefas</span>
            </button>
            <button
              className={view === 'calendar' ? 'active' : ''}
              onClick={() => setView('calendar')}
              title="Agenda"
            >
              <span className="ico">▦</span>
              <span className="nav-text">Agenda</span>
            </button>
            <button
              className={view === 'finance' ? 'active' : ''}
              onClick={() => setView('finance')}
              title="Financeiro"
            >
              <span className="ico">＄</span>
              <span className="nav-text">Financeiro</span>
            </button>
            <button
              className={view === 'tips' ? 'active' : ''}
              onClick={() => setView('tips')}
              title="Dicas"
            >
              <span className="ico">✦</span>
              <span className="nav-text">Dicas</span>
            </button>
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-bottom">
            <strong>Respira. Vai dar certo. Talvez.</strong>
            <span>Um boleto, uma tarefa e um surto de cada vez.</span>
          </div>

          <div className="sidebar-user-row">
            <button
              type="button"
              className={`sidebar-profile-btn ${view === 'profile' ? 'active' : ''}`}
              onClick={() => setView('profile')}
              title="Meu perfil"
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
            <button
              type="button"
              className="sidebar-logout-btn"
              onClick={handleLogout}
              title="Sair"
              aria-label="Sair"
            >
              ↗
            </button>
          </div>
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
              className="mobile-refresh-btn"
              onClick={handleMobileRefresh}
              title="Buscar atualizações"
              aria-label="Atualizar aplicativo"
            >
              <span className="refresh-ico">↻</span>
            </button>
            <button
              type="button"
              className="theme-toggle"
              onClick={toggleTheme}
              title="Alternar tema claro/escuro"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <div className="today-pill live-datetime" aria-label="Data e hora atual">
              <span className="date-part">{todayLabel}</span>
              <span className="time-sep">·</span>
              <span className="time-part">{liveClockLabel}</span>
            </div>
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
                        <div
                          key={ev.id}
                          className={`event ${isEventOverdue(ev) ? 'overdue' : ''}`}
                          style={{ cursor: 'pointer' }}
                          title="Clique 2x para editar"
                          onDoubleClick={() => {
                            setEditingEvent(ev);
                            setModalMode('event');
                          }}
                        >
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
                          <button
                            className="event-edit"
                            title="Editar evento"
                            onClick={() => {
                              setEditingEvent(ev);
                              setModalMode('event');
                            }}
                          >
                            ✎
                          </button>
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

                <div className="panel">
                  <div className="panel-head">
                    <h2>Inspiração &amp; Versículo</h2>
                    <span className="muted" style={{ fontSize: 10 }}>
                      Para meditar hoje
                    </span>
                  </div>
                  <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.6 }}>
                    ✨ {dailyMotivation}
                  </p>
                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: 12,
                      background: 'var(--accent-soft)',
                      fontSize: 12,
                      lineHeight: 1.6,
                    }}
                  >
                    <strong style={{ display: 'block', color: 'var(--accent)', marginBottom: 4 }}>
                      📖 {dailyVerse.reference}
                    </strong>
                    <span>&ldquo;{dailyVerse.text}&rdquo;</span>
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
                    title="Clique 2x para criar evento neste dia"
                    onClick={() => {
                      setSelectedDate(cell.dateStr);
                      setCurrentMonth(new Date(`${cell.dateStr}T12:00:00`));
                    }}
                    onDoubleClick={() => {
                      setSelectedDate(cell.dateStr);
                      setCurrentMonth(new Date(`${cell.dateStr}T12:00:00`));
                      setEditingEvent(null);
                      setModalMode('event');
                    }}
                  >
                    <div className="cell-num">{cell.dayNum}</div>
                    {cell.holiday && (
                      <span className="holiday-dot" title={cell.holiday}>
                        {cell.holiday}
                      </span>
                    )}
                    {cell.dayEvents.slice(0, 2).map((ev) => (
                      <span
                        key={ev.id}
                        className={`event-dot ${isEventOverdue(ev) ? 'overdue' : ''}`}
                        title="Clique 2x para editar este evento"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setEditingEvent(ev);
                          setModalMode('event');
                        }}
                      >
                        <strong>{ev.event_time.slice(0, 5)}</strong> {ev.title}
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
                    <div
                      key={ev.id}
                      className={`event ${isEventOverdue(ev) ? 'overdue' : ''}`}
                      style={{ cursor: 'pointer' }}
                      title="Clique 2x para editar"
                      onDoubleClick={() => {
                        setEditingEvent(ev);
                        setModalMode('event');
                      }}
                    >
                      <div className="event-time">{ev.event_time.slice(0, 5)}</div>
                      <div className="event-bar" />
                      <div>
                        <div className="event-title">{ev.title}</div>
                        <div className="event-sub">
                          {ev.location || 'Sem local informado'}
                        </div>
                        {ev.notes && <div className="event-notes">{ev.notes}</div>}
                      </div>
                      <div className="event-actions">
                        <button
                          className="event-edit"
                          title="Editar evento"
                          onClick={() => {
                            setEditingEvent(ev);
                            setModalMode('event');
                          }}
                        >
                          ✎
                        </button>
                        <button
                          className="task-delete"
                          title="Excluir evento"
                          onClick={() => deleteEvent(ev.id)}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty">Nenhum compromisso nesta data.</div>
                )}
              </div>
            </div>
          </section>
        )}

        {view === 'finance' && (
          <FinanceView
            userId={profile.id}
            initialMonths={initialFinanceMonths}
            initialExpenses={initialFinanceExpenses}
            initialIncomes={initialFinanceIncomes}
            onToast={showToast}
          />
        )}

        {view === 'tips' && (
          <TipsView
            displayName={profile.display_name}
            todayStr={todayStr}
            nowTimeStr={nowTimeStr}
            tasks={tasks}
            events={events}
            financeMonths={initialFinanceMonths}
            financeExpenses={initialFinanceExpenses}
            financeIncomes={initialFinanceIncomes}
            onNavigate={(target) => setView(target)}
          />
        )}

        {view === 'profile' && (
          <ProfileView
            profile={profile}
            onProfileUpdated={setProfile}
            onToast={showToast}
            onLogout={handleLogout}
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
          className={view === 'finance' ? 'active' : ''}
          onClick={() => setView('finance')}
        >
          <span>＄</span>
          <small>Finanças</small>
        </button>
        <button
          className={view === 'tips' ? 'active' : ''}
          onClick={() => setView('tips')}
        >
          <span>✦</span>
          <small>Dicas</small>
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
          key={editingEvent?.id ?? modalMode}
          mode={modalMode}
          defaultDate={modalMode === 'event' ? selectedDate : todayStr}
          editingEvent={editingEvent}
          onClose={() => {
            setModalMode(null);
            setEditingEvent(null);
          }}
          onSave={handleSaveEntry}
        />
      )}

      {toastMsg && <div className="toast">{toastMsg}</div>}

      {refreshState.open && (
        <div className="refresh-overlay" role="status" aria-live="polite">
          <div className="refresh-card">
            <div className="refresh-pulse">
              <BrandLogo size={54} />
            </div>
            <h3>Atualizando seu espaço</h3>
            <p>{refreshState.step}</p>
            <div className="refresh-bar">
              <span style={{ width: `${refreshState.progress}%` }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
