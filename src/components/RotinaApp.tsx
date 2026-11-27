'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Home, Mic, Moon, Sparkles, Sun } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { processCopilotCommand } from '@/lib/copilot-engine';
import { getHolidayForDate } from '@/lib/holidays';
import { getDailyMotivation, getDailyVerse } from '@/lib/daily-messages';
import { doesEventOccurOnDate, getNextOccurrenceDate } from '@/lib/recurrence';
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
  Goal,
  Note,
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
import { GoalsView } from './GoalsView';
import { NotesView } from './NotesView';
import { ProfileView } from './ProfileView';
import { TipsView } from './TipsView';

export type ViewId =
  | 'dashboard'
  | 'tasks'
  | 'calendar'
  | 'goals'
  | 'notes'
  | 'finance'
  | 'tips'
  | 'profile';

const VIEW_PATHS: Record<ViewId, string> = {
  dashboard: '/',
  tasks: '/tarefas',
  calendar: '/agenda',
  goals: '/metas',
  notes: '/anotacoes',
  finance: '/financeiro',
  tips: '/severino',
  profile: '/perfil',
};

interface RotinaAppProps {
  initialView?: ViewId;
  initialProfile: Profile;
  initialTasks: Task[];
  initialEvents: CalendarEvent[];
  initialFinanceMonths: FinanceMonth[];
  initialFinanceExpenses: FinanceExpense[];
  initialFinanceIncomes: FinanceIncome[];
  initialGoals: Goal[];
  initialNotes: Note[];
}

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

function fmtUpcomingDay(dateStr: string, todayStr: string): string {
  if (dateStr === todayStr) return 'Hoje';
  const d = new Date(`${todayStr}T12:00:00`);
  d.setDate(d.getDate() + 1);
  if (dateStr === localDate(d)) return 'Amanhã';
  const raw = new Date(`${dateStr}T12:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
  const cleaned = raw.replace('.', '');
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function RotinaApp({
  initialView = 'dashboard',
  initialProfile,
  initialTasks,
  initialEvents,
  initialFinanceMonths,
  initialFinanceExpenses,
  initialFinanceIncomes,
  initialGoals,
  initialNotes,
}: RotinaAppProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [financeExpenses, setFinanceExpenses] = useState<FinanceExpense[]>(
    initialFinanceExpenses
  );
  const [financeIncomes, setFinanceIncomes] = useState<FinanceIncome[]>(
    initialFinanceIncomes
  );

  const [view, setViewState] = useState<ViewId>(initialView);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  useEffect(() => {
    const onPopState = () => {
      const path = window.location.pathname;
      const matched = (Object.entries(VIEW_PATHS) as Array<[ViewId, string]>).find(
        ([, p]) => p === path
      );
      setViewState(matched ? matched[0] : 'dashboard');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  function setView(nextView: ViewId) {
    setViewState(nextView);
    setMobileDrawerOpen(false);
    const targetPath = VIEW_PATHS[nextView];
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  }
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
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [pushNeedsPrompt, setPushNeedsPrompt] = useState(false);
  const [recadoModal, setRecadoModal] = useState<{
    title: string;
    body: string;
  } | null>(null);
  const [quickSpeechSupported, setQuickSpeechSupported] = useState(false);
  const [quickListening, setQuickListening] = useState(false);
  const [quickTranscript, setQuickTranscript] = useState('');
  const quickRecRef = useRef<{ stop: () => void } | null>(null);
  const quickFinalRef = useRef('');
  const [refreshState, setRefreshState] = useState<{
    open: boolean;
    step: string;
    progress: number;
  }>({ open: false, step: '', progress: 0 });

  const hr = new Date().getHours();
  const greeting = hr < 12 ? 'Bom dia!' : hr < 18 ? 'Boa tarde!' : 'Boa noite!';
  const todayLabel = new Date().toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  useEffect(() => {
    const w = window as unknown as {
      SpeechRecognition?: unknown;
      webkitSpeechRecognition?: unknown;
    };
    if (w.SpeechRecognition || w.webkitSpeechRecognition) {
      queueMicrotask(() => setQuickSpeechSupported(true));
    }

    const params = new URLSearchParams(window.location.search);
    const v = params.get('view');
    if (
      v === 'tasks' ||
      v === 'calendar' ||
      v === 'goals' ||
      v === 'notes' ||
      v === 'finance' ||
      v === 'tips' ||
      v === 'profile'
    ) {
      queueMicrotask(() => setViewState(v));
    }

    const rt = params.get('rt');
    const rb = params.get('rb');
    if (rt || rb) {
      queueMicrotask(() =>
        setRecadoModal({
          title: rt || 'Recado do dia',
          body: rb || '',
        })
      );
      window.history.replaceState({}, '', window.location.pathname);
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
      if (payload.id) {
        const { data, error } = await supabase
          .from('tasks')
          .update({
            title: payload.title,
            category: payload.category,
            due_date: payload.due_date,
            due_time: payload.due_time,
            priority: payload.priority,
            notify_enabled: true,
            reminder_preset: payload.reminder_preset,
            reminder_presets: payload.reminder_presets,
            notified_presets: [],
            notified_at: null,
          })
          .eq('id', payload.id)
          .select('*')
          .single();

        if (error || !data) {
          showToast('Erro ao atualizar tarefa.');
          return;
        }
        setTasks((prev) =>
          prev.map((t) => (t.id === payload.id ? (data as Task) : t))
        );
        showToast('Tarefa atualizada');
        return;
      }

      const targetDates =
        payload.due_dates.length > 0 ? payload.due_dates : [payload.due_date];
      const rows = targetDates.map((d) => ({
        user_id: profile.id,
        title: payload.title,
        category: payload.category,
        due_date: d,
        due_time: payload.due_time,
        priority: payload.priority,
        notify_enabled: true,
        reminder_preset: payload.reminder_preset,
        reminder_presets: payload.reminder_presets,
      }));

      const { data, error } = await supabase
        .from('tasks')
        .insert(rows)
        .select('*');

      if (error || !data) {
        showToast('Erro ao salvar tarefa.');
        return;
      }
      setTasks((prev) => [...(data as Task[]), ...prev]);
      showToast(
        data.length > 1
          ? `${data.length} tarefas adicionadas`
          : 'Tarefa adicionada'
      );
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
      const targetDates = payload.recurrence_days?.length
        ? [payload.event_date]
        : payload.event_dates.length > 0
        ? payload.event_dates
        : [payload.event_date];
      const rows = targetDates.map((d) => ({
        user_id: profile.id,
        title: payload.title,
        event_date: d,
        event_time: payload.event_time,
        location: payload.location,
        notes: payload.notes,
        notify_enabled: true,
        notify_minutes_before: payload.notify_minutes_before,
        reminder_preset: payload.reminder_preset,
        recurrence_days: payload.recurrence_days ?? null,
      }));

      const { data, error } = await supabase
        .from('events')
        .insert(rows)
        .select('*');

      if (error || !data) {
        showToast('Erro ao salvar evento.');
        return;
      }
      setEvents((prev) => [...prev, ...(data as CalendarEvent[])]);
      showToast(
        payload.recurrence_days?.length
          ? 'Compromisso recorrente adicionado'
          : data.length > 1
          ? `${data.length} eventos adicionados`
          : 'Evento adicionado'
      );
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
  const pct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;
  const todayEventsCount = events.filter((e) =>
    doesEventOccurOnDate(e, todayStr)
  ).length;
  const currentMonthKey = todayStr.slice(0, 7);
  const todayDay = Number(todayStr.slice(8, 10));
  const billsDueTodayCount = financeExpenses.filter(
    (e) => !e.paid && e.month_key === currentMonthKey && e.due_day === todayDay
  ).length;
  const todayGoalsCount = goals.filter(
    (g) => !g.done && g.target_date === todayStr
  ).length;
  const doneGoalsCount = goals.filter((g) => g.done).length;

  const priorityItems = useMemo(() => {
    const todayMs = new Date(`${todayStr}T12:00:00`).getTime();
    const diffDays = (d: string | null) =>
      d ? Math.round((new Date(`${d}T12:00:00`).getTime() - todayMs) / 86400000) : null;

    type PriorityKind = 'finance' | 'task' | 'event' | 'goal';
    interface PriorityEntry {
      key: string;
      kind: PriorityKind;
      title: string;
      subtitle: string;
      dateStr: string | null;
      timeStr: string | null;
      days: number | null;
      urgencyRank: number;
      task?: Task;
      expense?: FinanceExpense;
      event?: CalendarEvent;
      goal?: Goal;
    }

    const entries: PriorityEntry[] = [];

    // 1. Finance expenses due in current month (unpaid)
    for (const exp of financeExpenses) {
      if (exp.paid || exp.month_key !== currentMonthKey || !exp.due_day) continue;
      const dateStr = `${currentMonthKey}-${String(exp.due_day).padStart(2, '0')}`;
      const days = diffDays(dateStr);
      if (days !== null && days > 10) continue;
      entries.push({
        key: `fin-${exp.id}`,
        kind: 'finance',
        title: exp.title,
        subtitle: `R$ ${Number(exp.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        dateStr,
        timeStr: null,
        days,
        urgencyRank: days !== null && days <= 0 ? 0 : 1,
        expense: exp,
      });
    }

    // 2. Open tasks
    for (const t of tasks) {
      if (t.done) continue;
      const days = diffDays(t.due_date);
      entries.push({
        key: `task-${t.id}`,
        kind: 'task',
        title: t.title,
        subtitle: t.category || 'Tarefa',
        dateStr: t.due_date,
        timeStr: t.due_time ? t.due_time.slice(0, 5) : null,
        days,
        urgencyRank:
          days !== null && days <= 0 ? (t.priority === 'high' ? 0 : 1) : t.priority === 'high' ? 2 : 3,
        task: t,
      });
    }

    // 3. Calendar events (today or next 10 days)
    for (const ev of events) {
      const nextDate = getNextOccurrenceDate(ev, todayStr);
      if (!nextDate) continue;
      const days = diffDays(nextDate);
      if (days === null || days > 10) continue;
      if (days === 0 && ev.event_time.slice(0, 5) < nowTimeStr) continue;
      entries.push({
        key: `ev-${ev.id}-${nextDate}`,
        kind: 'event',
        title: ev.title,
        subtitle: ev.location || ev.category || 'Agenda',
        dateStr: nextDate,
        timeStr: ev.event_time.slice(0, 5),
        days,
        urgencyRank: days === 0 ? 0 : 2,
        event: { ...ev, event_date: nextDate },
      });
    }

    // 4. Open goals (prioritizing <= 10 days)
    for (const g of goals) {
      if (g.done) continue;
      const days = diffDays(g.target_date);
      entries.push({
        key: `goal-${g.id}`,
        kind: 'goal',
        title: g.title,
        subtitle: `${g.category} • ${g.progress}%`,
        dateStr: g.target_date,
        timeStr: null,
        days,
        urgencyRank: days !== null && days <= 10 ? 1 : 4,
        goal: g,
      });
    }

    return entries
      .filter((item) => {
        if (dashFilter === 'today') return item.days !== null && item.days <= 0;
        if (dashFilter === 'open') return item.days !== null && item.days <= 10;
        return true;
      })
      .sort((a, b) => {
        const aBucket =
          a.days === null ? 3 : a.days < 0 ? 0 : a.days === 0 ? 1 : a.days <= 10 ? 2 : 3;
        const bBucket =
          b.days === null ? 3 : b.days < 0 ? 0 : b.days === 0 ? 1 : b.days <= 10 ? 2 : 3;
        if (aBucket !== bBucket) return aBucket - bBucket;
        if (a.days !== null && b.days !== null && a.days !== b.days) return a.days - b.days;
        if (a.urgencyRank !== b.urgencyRank) return a.urgencyRank - b.urgencyRank;
        return (a.timeStr || '99:99').localeCompare(b.timeStr || '99:99');
      })
      .slice(0, 7);
  }, [tasks, events, financeExpenses, goals, currentMonthKey, todayStr, nowTimeStr, dashFilter]);

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

  const upcomingFeed = useMemo(() => {
    const tomorrow = new Date(`${todayStr}T12:00:00`);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = localDate(tomorrow);
    const todayMs = new Date(`${todayStr}T12:00:00`).getTime();

    type FeedItem =
      | { kind: 'event'; key: string; dateStr: string; timeLabel: string; sortTime: string; title: string; sub: string; overdue: boolean; event: CalendarEvent }
      | { kind: 'goal'; key: string; dateStr: string; timeLabel: string; sortTime: string; title: string; sub: string; overdue: boolean; goal: Goal }
      | { kind: 'finance'; key: string; dateStr: string; timeLabel: string; sortTime: string; title: string; sub: string; overdue: boolean; expense: FinanceExpense };

    const items: FeedItem[] = [];

    for (const e of events) {
      const startFrom =
        e.event_date === todayStr && e.event_time.slice(0, 5) < nowTimeStr
          ? tomorrowStr
          : e.recurrence_days?.length && e.event_time.slice(0, 5) < nowTimeStr
          ? tomorrowStr
          : todayStr;
      const nextDate = getNextOccurrenceDate(e, startFrom);
      if (!nextDate) continue;
      if (nextDate === todayStr && e.event_time.slice(0, 5) < nowTimeStr) continue;
      const ev = { ...e, event_date: nextDate };
      items.push({
        kind: 'event',
        key: `ev-${ev.id}-${nextDate}`,
        dateStr: nextDate,
        timeLabel: ev.event_time.slice(0, 5),
        sortTime: ev.event_time.slice(0, 5),
        title: ev.title,
        sub: ev.location || ev.category || 'Compromisso',
        overdue: isEventOverdue(ev),
        event: ev,
      });
    }

    for (const g of goals) {
      if (g.done || !g.target_date) continue;
      const diff = Math.round(
        (new Date(`${g.target_date}T12:00:00`).getTime() - todayMs) / 86400000
      );
      if (diff > 10) continue;
      items.push({
        kind: 'goal',
        key: `goal-${g.id}`,
        dateStr: g.target_date,
        timeLabel: 'Meta',
        sortTime: '23:58',
        title: g.title,
        sub: `${g.category} • ${g.progress}% concluído`,
        overdue: diff < 0,
        goal: g,
      });
    }

    for (const exp of financeExpenses) {
      if (exp.paid || exp.month_key !== currentMonthKey || !exp.due_day) continue;
      const dateStr = `${currentMonthKey}-${String(exp.due_day).padStart(2, '0')}`;
      const diff = Math.round(
        (new Date(`${dateStr}T12:00:00`).getTime() - todayMs) / 86400000
      );
      if (diff > 10) continue;
      items.push({
        kind: 'finance',
        key: `fin-${exp.id}`,
        dateStr,
        timeLabel: 'Conta',
        sortTime: '08:00',
        title: exp.title,
        sub: `R$ ${Number(exp.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} • ${exp.category}`,
        overdue: diff < 0,
        expense: exp,
      });
    }

    return items
      .sort((a, b) => `${a.dateStr}${a.sortTime}`.localeCompare(`${b.dateStr}${b.sortTime}`))
      .slice(0, 5);
  }, [events, goals, financeExpenses, currentMonthKey, todayStr, nowTimeStr]);

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
        .filter((e) => doesEventOccurOnDate(e, s))
        .sort((a, b) => a.event_time.localeCompare(b.event_time));
      const holiday = getHolidayForDate(s);
      return { dateStr: s, dayNum: dt.getDate(), outside, dayEvents, holiday };
    });
  }, [currentMonth, events]);

  const selectedDayEvents = useMemo(() => {
    return events
      .filter((e) => doesEventOccurOnDate(e, selectedDate))
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
    goals: 'Metas',
    notes: 'Anotações',
    finance: 'Financeiro',
    tips: 'Severino',
    profile: 'Meu perfil',
  };

  function startQuickVoice() {
    if (quickListening) {
      quickRecRef.current?.stop();
      return;
    }

    const w = window as unknown as {
      SpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        maxAlternatives: number;
        onresult: ((ev: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
        start: () => void;
        stop: () => void;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        maxAlternatives: number;
        onresult: ((ev: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
        start: () => void;
        stop: () => void;
      };
    };

    const SpeechRec = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRec) return;

    const rec = new SpeechRec();
    rec.lang = 'pt-BR';
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    quickFinalRef.current = '';
    setQuickTranscript('');

    rec.onresult = (event) => {
      let combined = '';
      for (let i = 0; i < event.results.length; i++) {
        combined += event.results[i][0].transcript + ' ';
      }
      const trimmed = combined.trim();
      quickFinalRef.current = trimmed;
      setQuickTranscript(trimmed);
    };

    rec.onerror = () => {
      setQuickListening(false);
      setQuickTranscript('');
    };

    rec.onend = async () => {
      setQuickListening(false);
      const spoken = quickFinalRef.current.trim();
      setQuickTranscript('');
      if (!spoken) return;

      const currentMonthKey = todayStr.slice(0, 7);
      const monthExp = financeExpenses.filter((e) => e.month_key === currentMonthKey);
      const monthInc = financeIncomes.filter((i) => i.month_key === currentMonthKey);
      const legacyIncome = Number(
        initialFinanceMonths.find((m) => m.month_key === currentMonthKey)?.estimated_income ?? 0
      );
      const totalIncome =
        monthInc.reduce((acc, i) => acc + Number(i.amount), 0) + legacyIncome;
      const totalExp = monthExp.reduce((acc, e) => acc + Number(e.amount), 0);
      const openTasks = tasks.filter((t) => !t.done);
      const todayEvs = events.filter((e) => e.event_date === todayStr);

      const reply = await processCopilotCommand(spoken, {
        userId: profile.id,
        firstName: profile.display_name.split(' ')[0] || 'Você',
        todayStr,
        currentMonthKey,
        metrics: {
          score: 80,
          todayEvents: todayEvs,
          tomorrowEvents: [],
          next7DaysCount: events.length,
          overdueTasks: [],
          openTasks,
          doneCount: tasks.filter((t) => t.done).length,
          balance: totalIncome - totalExp,
          totalIncome,
          totalExp,
          unpaidExp: monthExp.filter((e) => !e.paid),
          monthExp,
        },
        onTaskCreated: (task) => setTasks((prev) => [task, ...prev]),
        onEventCreated: (ev) => setEvents((prev) => [...prev, ev]),
        onExpensesCreated: (exps) => setFinanceExpenses((prev) => [...prev, ...exps]),
        onIncomesCreated: (incs) => setFinanceIncomes((prev) => [...prev, ...incs]),
        onGoalCreated: (goal) => setGoals((prev) => [goal, ...prev]),
      });

      setRecadoModal({
        title: 'Severino executou seu pedido',
        body: `Você disse: "${spoken}"\n\n${reply}`,
      });
    };

    quickRecRef.current = rec;
    setQuickListening(true);
    rec.start();
  }

  function isTaskOverdue(t: Task): boolean {
    if (t.done || !t.due_date) return false;
    if (t.due_date < todayStr) return true;
    if (t.due_date === todayStr && t.due_time) {
      return t.due_time.slice(0, 5) < nowTimeStr;
    }
    return false;
  }

  function isEventOverdue(ev: CalendarEvent, dateOverride?: string): boolean {
    const checkDate = dateOverride ?? ev.event_date;
    if (checkDate < todayStr) return true;
    if (checkDate === todayStr) {
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
        onDoubleClick={() => {
          setEditingEvent(null);
          setEditingTask(t);
          setModalMode('task');
        }}
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
        <div className="event-actions">
          <button
            className="event-edit"
            title="Editar tarefa"
            onClick={() => {
              setEditingEvent(null);
              setEditingTask(t);
              setModalMode('task');
            }}
          >
            ✎
          </button>
          <button
            className="task-delete"
            title="Excluir tarefa"
            onClick={() => deleteTask(t.id)}
          >
            ×
          </button>
        </div>
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
          <button
            type="button"
            className="brand brand-trigger"
            onClick={() => {
              if (window.innerWidth <= 680) {
                setMobileDrawerOpen(true);
              } else {
                setView('dashboard');
              }
            }}
            title="Menu / Visão geral"
          >
            <BrandLogo size={36} />
            <span className="brand-text">Modo Sobrevivência</span>
          </button>
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
              className={view === 'goals' ? 'active' : ''}
              onClick={() => setView('goals')}
              title="Metas"
            >
              <span className="ico">◎</span>
              <span className="nav-text">Metas</span>
            </button>
            <button
              className={view === 'notes' ? 'active' : ''}
              onClick={() => setView('notes')}
              title="Anotações"
            >
              <span className="ico">✎</span>
              <span className="nav-text">Anotações</span>
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
              title="Severino"
            >
              <span className="ico">✦</span>
              <span className="nav-text">Severino</span>
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
              aria-label="Alternar tema claro ou escuro"
            >
              {theme === 'dark' ? (
                <Sun size={16} strokeWidth={2.1} />
              ) : (
                <Moon size={16} strokeWidth={2.1} />
              )}
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
            <div className="page-head dash-head-compact">
              <div>
                <div className="eyebrow">SEU DIA EM FOCO</div>
                <h2 className="dash-greeting">
                  {greeting} {profile.display_name.split(' ')[0]}
                </h2>
                <p className="subtitle">{dailyMotivation}</p>
              </div>
              <button
                className="btn dashboard-head-btn"
                onClick={() => {
                  setEditingTask(null);
                  setEditingEvent(null);
                  setModalMode('task');
                }}
              >
                ＋ Nova tarefa
              </button>
            </div>

            <div className="stats stats-compact">
              <div
                className="stat"
                role="button"
                tabIndex={0}
                style={{ cursor: 'pointer' }}
                onClick={() => setView('tasks')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setView('tasks');
                  }
                }}
              >
                <div className="stat-top">
                  <span className="stat-label">Abertas</span>
                  <span className="stat-icon">☑</span>
                </div>
                <div className="stat-bottom">
                  <strong>{openCount}</strong>
                  <small>Pendentes</small>
                </div>
              </div>
              <div
                className="stat"
                role="button"
                tabIndex={0}
                style={{ cursor: 'pointer' }}
                onClick={() => setView('calendar')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setView('calendar');
                  }
                }}
              >
                <div className="stat-top">
                  <span className="stat-label">Agenda</span>
                  <span
                    className="stat-icon"
                    style={{ background: 'rgba(223, 147, 66, 0.14)', color: 'var(--orange)' }}
                  >
                    ◷
                  </span>
                </div>
                <div className="stat-bottom">
                  <strong>{todayEventsCount}</strong>
                  <small>Hoje</small>
                </div>
              </div>
              <div
                className="stat"
                role="button"
                tabIndex={0}
                style={{ cursor: 'pointer' }}
                onClick={() => setView('finance')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setView('finance');
                  }
                }}
              >
                <div className="stat-top">
                  <span className="stat-label">Finanças</span>
                  <span
                    className="stat-icon"
                    style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                  >
                    $
                  </span>
                </div>
                <div className="stat-bottom">
                  <strong>{billsDueTodayCount}</strong>
                  <small>Vencem hoje</small>
                </div>
              </div>
              <div
                className="stat"
                role="button"
                tabIndex={0}
                style={{ cursor: 'pointer' }}
                onClick={() => setView('goals')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setView('goals');
                  }
                }}
              >
                <div className="stat-top">
                  <span className="stat-label">Metas hoje</span>
                  <span className="stat-icon">◎</span>
                </div>
                <div className="stat-bottom">
                  <strong>{todayGoalsCount}</strong>
                  <small>{doneGoalsCount} concluídas</small>
                </div>
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
                    Ver tarefas
                  </button>
                </div>
                <div className="filter-row">
                  <button
                    className={`chip ${dashFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setDashFilter('all')}
                  >
                    Tudo
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
                    Próx. 10 dias
                  </button>
                </div>
                <div className="task-list">
                  {priorityItems.length ? (
                    priorityItems.map((item) => {
                      const typeLabel =
                        item.kind === 'finance'
                          ? 'Finanças'
                          : item.kind === 'event'
                          ? 'Agenda'
                          : item.kind === 'goal'
                          ? 'Meta'
                          : 'Tarefa';
                      const whenLabel =
                        item.days === null
                          ? 'Sem prazo'
                          : item.days < 0
                          ? `Atrasado (${Math.abs(item.days)}d)`
                          : item.days === 0
                          ? item.timeStr
                            ? `Hoje • ${item.timeStr}`
                            : 'Hoje'
                          : item.days === 1
                          ? item.timeStr
                            ? `Amanhã • ${item.timeStr}`
                            : 'Amanhã'
                          : `Em ${item.days}d`;
                      const isUrgent = item.days !== null && item.days <= 0;
                      return (
                        <div
                          key={item.key}
                          className="task"
                          style={{ cursor: 'pointer' }}
                          onClick={() => {
                            if (item.kind === 'task' && item.task) {
                              setEditingTask(item.task);
                              setModalMode('task');
                            } else if (item.kind === 'event' && item.event) {
                              setEditingEvent(item.event);
                              setModalMode('event');
                            } else if (item.kind === 'finance') {
                              setView('finance');
                            } else if (item.kind === 'goal') {
                              setView('goals');
                            }
                          }}
                        >
                          {item.kind === 'task' && item.task ? (
                            <input
                              type="checkbox"
                              className="check"
                              checked={item.task.done}
                              onClick={(e) => e.stopPropagation()}
                              onChange={() => toggleTask(item.task!)}
                            />
                          ) : (
                            <span
                              className={`prio-kind-dot ${isUrgent ? 'urgent' : ''}`}
                              aria-hidden="true"
                            >
                              {item.kind === 'finance'
                                ? '$'
                                : item.kind === 'event'
                                ? '◷'
                                : '◎'}
                            </span>
                          )}
                          <div>
                            <div className="task-title">{item.title}</div>
                            <div className="task-meta">
                              <span className="tag prio-type">{typeLabel}</span>
                              <span
                                className={`tag ${isUrgent ? 'high' : 'prio-ok'}`}
                              >
                                {whenLabel}
                              </span>
                              <span>{item.subtitle}</span>
                            </div>
                          </div>
                          <span className="muted" style={{ fontSize: 13 }}>
                            ›
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="empty">
                      Tudo em dia! Nenhuma pendência urgente por aqui.
                    </div>
                  )}
                </div>
                <div className="progress-wrap">
                  <div className="progress-label">
                    <span>Progresso geral (tarefas)</span>
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
                    {upcomingFeed.length ? (
                      upcomingFeed.map((item) => (
                        <div
                          key={item.key}
                          className={`event ${item.overdue ? 'overdue' : ''}`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => {
                            if (item.kind === 'event') {
                              setEditingEvent(item.event);
                              setModalMode('event');
                            } else if (item.kind === 'goal') {
                              setView('goals');
                            } else {
                              setView('finance');
                            }
                          }}
                        >
                          <div className="event-time">
                            <strong>{item.timeLabel}</strong>
                            <br />
                            {fmtUpcomingDay(item.dateStr, todayStr)}
                          </div>
                          <div className={`event-bar kind-${item.kind}`} />
                          <div>
                            <div className="event-title">{item.title}</div>
                            <div className="event-sub">{item.sub}</div>
                            {item.kind === 'event' && item.event.notes && (
                              <div className="event-notes">{item.event.notes}</div>
                            )}
                          </div>
                          <button
                            className="event-edit"
                            title={item.kind === 'event' ? 'Editar evento' : 'Abrir'}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (item.kind === 'event') {
                                setEditingEvent(item.event);
                                setModalMode('event');
                              } else if (item.kind === 'goal') {
                                setView('goals');
                              } else {
                                setView('finance');
                              }
                            }}
                          >
                            {item.kind === 'event' ? '✎' : '›'}
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
              <button
                className="btn dashboard-head-btn"
                onClick={() => setModalMode('task')}
              >
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
                        className={`event-dot ${isEventOverdue(ev, cell.dateStr) ? 'overdue' : ''}`}
                        title="Clique 2x para editar este evento"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setEditingEvent(ev);
                          setModalMode('event');
                        }}
                      >
                        <strong>{ev.event_time.slice(0, 5)}</strong>
                        <span className="event-title-inline"> {ev.title}</span>
                      </span>
                    ))}
                    {cell.dayEvents.length > 2 && (
                      <span className="event-more-pill">
                        +{cell.dayEvents.length - 2}
                      </span>
                    )}
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
                      className={`event ${isEventOverdue(ev, selectedDate) ? 'overdue' : ''}`}
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

        {view === 'goals' && (
          <GoalsView
            userId={profile.id}
            todayStr={todayStr}
            goals={goals}
            onGoalsChange={setGoals}
            onToast={showToast}
          />
        )}

        {view === 'notes' && (
          <NotesView
            userId={profile.id}
            notes={notes}
            onNotesChange={setNotes}
            onToast={showToast}
          />
        )}

        {view === 'finance' && (
          <FinanceView
            userId={profile.id}
            initialMonths={initialFinanceMonths}
            expenses={financeExpenses}
            incomes={financeIncomes}
            onExpensesChange={setFinanceExpenses}
            onIncomesChange={setFinanceIncomes}
            onToast={showToast}
          />
        )}

        {view === 'tips' && (
          <TipsView
            userId={profile.id}
            displayName={profile.display_name}
            todayStr={todayStr}
            nowTimeStr={nowTimeStr}
            tasks={tasks}
            events={events}
            financeMonths={initialFinanceMonths}
            financeExpenses={financeExpenses}
            financeIncomes={financeIncomes}
            onTaskCreated={(task) => setTasks((prev) => [task, ...prev])}
            onEventCreated={(ev) => setEvents((prev) => [...prev, ev])}
            onExpensesCreated={(exps) =>
              setFinanceExpenses((prev) => [...prev, ...exps])
            }
            onIncomesCreated={(incs) =>
              setFinanceIncomes((prev) => [...prev, ...incs])
            }
            onGoalCreated={(goal) => setGoals((prev) => [goal, ...prev])}
            onNoteCreated={(note) => setNotes((prev) => [note, ...prev])}
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

        <footer className="site-version-footer">
          Modo Sobrevivência · v1.4.0
        </footer>
      </main>

      {/* Mobile Bottom Navigation (5 items, Início highlighted in green center) */}
      <nav className="mobile-bottom-nav" aria-label="Navegação mobile">
        <button
          className={view === 'goals' ? 'active' : ''}
          onClick={() => setView('goals')}
        >
          <span>◎</span>
          <small>Metas</small>
        </button>
        <button
          className={view === 'finance' ? 'active' : ''}
          onClick={() => setView('finance')}
        >
          <span>＄</span>
          <small>Finanças</small>
        </button>
        <button
          className={`nav-center-agenda ${view === 'dashboard' ? 'active' : ''}`}
          onClick={() => setView('dashboard')}
        >
          <span className="agenda-center-pill">
            <Home size={20} strokeWidth={2.2} />
          </span>
          <small>Início</small>
        </button>
        <button
          className={view === 'calendar' ? 'active' : ''}
          onClick={() => setView('calendar')}
        >
          <span>▦</span>
          <small>Agenda</small>
        </button>
        <button
          className={view === 'tips' ? 'active' : ''}
          onClick={() => setView('tips')}
        >
          <span className="severino-nav-ico">✦</span>
          <small>Severino</small>
        </button>
      </nav>

      {/* Mobile Collapsible Drawer (starts closed) */}
      {mobileDrawerOpen && (
        <div
          className="mobile-drawer-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMobileDrawerOpen(false);
          }}
        >
          <aside className="mobile-drawer">
            <div className="sidebar-top" style={{ marginBottom: 18 }}>
              <div className="brand">
                <BrandLogo size={34} />
                <span>Modo Sobrevivência</span>
              </div>
              <button
                type="button"
                className="close"
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Fechar menu"
              >
                ✕
              </button>
            </div>

            <div className="nav-label">ESPAÇO PESSOAL</div>
            <nav className="nav" style={{ marginBottom: 20 }}>
              <button
                className={view === 'dashboard' ? 'active' : ''}
                onClick={() => setView('dashboard')}
              >
                <span className="ico">◫</span>
                <span>Visão geral</span>
              </button>
              <button
                className={view === 'tasks' ? 'active' : ''}
                onClick={() => setView('tasks')}
              >
                <span className="ico">☑</span>
                <span>Minhas tarefas</span>
              </button>
              <button
                className={view === 'calendar' ? 'active' : ''}
                onClick={() => setView('calendar')}
              >
                <span className="ico">▦</span>
                <span>Agenda</span>
              </button>
              <button
                className={view === 'goals' ? 'active' : ''}
                onClick={() => setView('goals')}
              >
                <span className="ico">◎</span>
                <span>Metas</span>
              </button>
              <button
                className={view === 'notes' ? 'active' : ''}
                onClick={() => setView('notes')}
              >
                <span className="ico">✎</span>
                <span>Anotações</span>
              </button>
              <button
                className={view === 'finance' ? 'active' : ''}
                onClick={() => setView('finance')}
              >
                <span className="ico">＄</span>
                <span>Financeiro</span>
              </button>
              <button
                className={view === 'tips' ? 'active' : ''}
                onClick={() => setView('tips')}
              >
                <span className="ico">✦</span>
                <span>Severino</span>
              </button>
            </nav>

            <div className="sidebar-footer">
              <div className="sidebar-user-row">
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
                <button
                  type="button"
                  className="sidebar-logout-btn"
                  onClick={handleLogout}
                  title="Sair"
                >
                  ↗
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {modalMode && (
        <EntryModal
          key={editingTask?.id ?? editingEvent?.id ?? modalMode}
          mode={modalMode}
          defaultDate={modalMode === 'event' ? selectedDate : todayStr}
          editingEvent={editingEvent}
          editingTask={editingTask}
          onClose={() => {
            setModalMode(null);
            setEditingEvent(null);
            setEditingTask(null);
          }}
          onSave={handleSaveEntry}
        />
      )}

      {toastMsg && <div className="toast">{toastMsg}</div>}

      {view !== 'tips' && (
        <div className="floating-agent-dock">
          <button
            type="button"
            className="floating-agent-btn"
            onClick={() => setView('tips')}
            title="Abrir Severino"
          >
            <Sparkles size={16} />
            <span>Severino</span>
          </button>
          {quickSpeechSupported && (
            <button
              type="button"
              className="floating-mic-btn"
              onClick={startQuickVoice}
              title="Falar com o Severino"
              aria-label="Falar com o Severino"
            >
              <Mic size={18} strokeWidth={2.2} />
            </button>
          )}
        </div>
      )}

      {quickListening && (
        <div className="voice-overlay" role="dialog" aria-live="polite">
          <div className="voice-card">
            <div className="voice-orb">
              <Mic size={30} strokeWidth={2.2} />
            </div>
            <div className="voice-waves" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <h3>Severino está ouvindo...</h3>
            <p className="voice-transcript">
              {quickTranscript || 'Pode falar naturalmente o que deseja lançar...'}
            </p>
            <button
              type="button"
              className="btn"
              onClick={() => quickRecRef.current?.stop()}
            >
              Concluir fala ✓
            </button>
          </div>
        </div>
      )}

      {recadoModal && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setRecadoModal(null);
          }}
        >
          <div className="modal recado-modal">
            <div className="recado-badge">RECADO DO DIA</div>
            <div className="modal-head" style={{ marginBottom: 12 }}>
              <h2>{recadoModal.title}</h2>
              <button
                className="close"
                type="button"
                onClick={() => setRecadoModal(null)}
              >
                ✕
              </button>
            </div>
            <div className="recado-body">{recadoModal.body}</div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn"
                onClick={() => setRecadoModal(null)}
              >
                Entendido ✓
              </button>
            </div>
          </div>
        </div>
      )}

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
