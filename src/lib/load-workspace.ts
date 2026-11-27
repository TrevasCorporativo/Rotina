import { createClient } from '@/lib/supabase/server';
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

export interface WorkspaceData {
  profile: Profile;
  tasks: Task[];
  events: CalendarEvent[];
  financeMonths: FinanceMonth[];
  financeExpenses: FinanceExpense[];
  financeIncomes: FinanceIncome[];
  goals: Goal[];
  notes: Note[];
}

export async function loadWorkspaceData(): Promise<WorkspaceData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [
    { data: profile },
    { data: tasks },
    { data: events },
    { data: financeMonths },
    { data: financeExpenses },
    { data: financeIncomes },
    { data: goals },
    { data: notes },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: true })
      .order('event_time', { ascending: true }),
    supabase.from('finance_months').select('*'),
    supabase
      .from('finance_expenses')
      .select('*')
      .order('month_key', { ascending: true }),
    supabase
      .from('finance_incomes')
      .select('*')
      .order('month_key', { ascending: true }),
    supabase
      .from('goals')
      .select('*')
      .order('target_date', { ascending: true }),
    supabase
      .from('notes')
      .select('*')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false }),
  ]);

  if (!profile) return null;

  return {
    profile: profile as Profile,
    tasks: (tasks ?? []) as Task[],
    events: (events ?? []) as CalendarEvent[],
    financeMonths: (financeMonths ?? []) as FinanceMonth[],
    financeExpenses: (financeExpenses ?? []) as FinanceExpense[],
    financeIncomes: (financeIncomes ?? []) as FinanceIncome[],
    goals: (goals ?? []) as Goal[],
    notes: (notes ?? []) as Note[],
  };
}

