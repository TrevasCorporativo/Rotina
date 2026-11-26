import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { LoginScreen } from '@/components/LoginScreen';
import { RotinaApp } from '@/components/RotinaApp';
import type {
  CalendarEvent,
  FinanceExpense,
  FinanceMonth,
  Profile,
  Task,
} from '@/lib/types';

async function HomeContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <LoginScreen />;
  }

  const [
    { data: profile },
    { data: tasks },
    { data: events },
    { data: financeMonths },
    { data: financeExpenses },
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
  ]);

  if (!profile) {
    return <LoginScreen />;
  }

  return (
    <RotinaApp
      initialProfile={profile as Profile}
      initialTasks={(tasks ?? []) as Task[]}
      initialEvents={(events ?? []) as CalendarEvent[]}
      initialFinanceMonths={(financeMonths ?? []) as FinanceMonth[]}
      initialFinanceExpenses={(financeExpenses ?? []) as FinanceExpense[]}
    />
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            display: 'grid',
            placeItems: 'center',
            color: '#858c98',
          }}
        >
          Carregando seu espaço...
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
