import { Suspense } from 'react';
import { loadWorkspaceData } from '@/lib/load-workspace';
import { LoginScreen } from '@/components/LoginScreen';
import { RotinaApp, type ViewId } from '@/components/RotinaApp';

async function WorkspaceLoader({ initialView }: { initialView: ViewId }) {
  const data = await loadWorkspaceData();

  if (!data) {
    return <LoginScreen />;
  }

  return (
    <RotinaApp
      initialView={initialView}
      initialProfile={data.profile}
      initialTasks={data.tasks}
      initialEvents={data.events}
      initialFinanceMonths={data.financeMonths}
      initialFinanceExpenses={data.financeExpenses}
      initialFinanceIncomes={data.financeIncomes}
      initialGoals={data.goals}
      initialNotes={data.notes}
    />
  );
}

export function WorkspacePage({ initialView }: { initialView: ViewId }) {
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
      <WorkspaceLoader initialView={initialView} />
    </Suspense>
  );
}

