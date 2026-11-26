import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { LoginScreen } from '@/components/LoginScreen';
import { RotinaApp } from '@/components/RotinaApp';
import type { CalendarEvent, Profile, Task } from '@/lib/types';

async function HomeContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <LoginScreen />;
  }

  const [{ data: profile }, { data: tasks }, { data: events }] =
    await Promise.all([
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
    ]);

  if (!profile) {
    return <LoginScreen />;
  }

  return (
    <RotinaApp
      initialProfile={profile as Profile}
      initialTasks={(tasks ?? []) as Task[]}
      initialEvents={(events ?? []) as CalendarEvent[]}
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
