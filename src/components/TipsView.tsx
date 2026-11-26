'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type {
  CalendarEvent,
  FinanceExpense,
  FinanceIncome,
  FinanceMonth,
  Priority,
  Task,
} from '@/lib/types';

interface TipsViewProps {
  userId: string;
  displayName: string;
  todayStr: string;
  nowTimeStr: string;
  tasks: Task[];
  events: CalendarEvent[];
  financeMonths: FinanceMonth[];
  financeExpenses: FinanceExpense[];
  financeIncomes: FinanceIncome[];
  onTaskCreated: (task: Task) => void;
  onEventCreated: (ev: CalendarEvent) => void;
  onExpensesCreated: (exps: FinanceExpense[]) => void;
  onIncomesCreated: (incs: FinanceIncome[]) => void;
  onNavigate: (view: 'tasks' | 'calendar' | 'finance') => void;
}

interface CoachInsight {
  id: string;
  pillar: 'Agenda & Energia' | 'Tarefas & Foco' | 'Financeiro';
  severity: 'alert' | 'warning' | 'good' | 'info';
  title: string;
  analysis: string;
  actions: string[];
  ctaLabel?: string;
  ctaTarget?: 'tasks' | 'calendar' | 'finance';
}

interface ChatMessage {
  role: 'assistant' | 'user';
  text: string;
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function addDaysStr(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addMonthsToKey(monthKey: string, offset: number): string {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(y, m - 1 + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function extractAmount(raw: string): number | null {
  const m = raw.match(/(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)/i);
  if (!m) return null;
  const val = Number(m[1].replace(',', '.'));
  return Number.isFinite(val) && val > 0 ? val : null;
}

function extractRecurrenceMonths(norm: string): number {
  if (/\b(fixo|fixa|todo mes|todos os meses|mensal)\b/.test(norm)) return 12;
  const m = norm.match(/(?:por|durante|em)\s*(\d{1,2})\s*(?:mes|meses|x)\b/);
  if (m) return Math.min(60, Math.max(2, Number(m[1])));
  const xMatch = norm.match(/\b(\d{1,2})x\b/);
  if (xMatch) return Math.min(60, Math.max(2, Number(xMatch[1])));
  return 1;
}

function extractDate(norm: string, todayStr: string): string {
  if (norm.includes('amanha')) return addDaysStr(todayStr, 1);
  if (norm.includes('hoje')) return todayStr;
  const dm = norm.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (dm) {
    const day = String(Number(dm[1])).padStart(2, '0');
    const month = String(Number(dm[2])).padStart(2, '0');
    const year = dm[3]
      ? dm[3].length === 2
        ? `20${dm[3]}`
        : dm[3]
      : todayStr.slice(0, 4);
    return `${year}-${month}-${day}`;
  }
  return todayStr;
}

function extractTime(norm: string): string | null {
  const hm = norm.match(/\b(\d{1,2})[:h](\d{2})?\b/);
  if (!hm) return null;
  const h = Number(hm[1]);
  const m = Number(hm[2] ?? 0);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function detectExpenseCategory(norm: string): string {
  if (/(aluguel|condominio|casa|iptu|moradia)/.test(norm)) return 'Moradia';
  if (/(internet|luz|agua|energia|telefone|celular|conta)/.test(norm)) return 'Contas';
  if (/(mercado|almoco|jantar|lanche|ifood|comida|cafe|padaria)/.test(norm))
    return 'Alimentação';
  if (/(uber|99|gasolina|combustivel|onibus|metro|estacionamento|carro)/.test(norm))
    return 'Transporte';
  if (/(medico|remedio|farmacia|dentista|academia|consulta|saude)/.test(norm))
    return 'Saúde';
  if (/(netflix|spotify|youtube|amazon|assinatura|streaming)/.test(norm))
    return 'Assinaturas';
  if (/(cinema|viagem|passeio|bar|festa|lazer|jogo)/.test(norm)) return 'Lazer';
  return 'Outros';
}

function detectIncomeCategory(norm: string): string {
  if (/(salario|pagamento|holerite)/.test(norm)) return 'Salário';
  if (/(freela|freelance|projeto|servico)/.test(norm)) return 'Freelance';
  if (/(extra|bonus|comissao|venda|rendimento)/.test(norm)) return 'Renda Extra';
  return 'Outros';
}

function cleanTitle(raw: string, fallback: string): string {
  const cleaned = raw
    .replace(
      /\b(lan[cç][aeo]|lan[cç]ar|adicion[ae]|adicionar|cri[ae]|criar|coloc[ae]|colocar|registr[ae]|registrar|marc[ae]|marcar|agend[ae]|agendar|agenda|novo|nova|um|uma|para|pra|de|do|da|no|na|em|com|por|durante|hoje|amanh[aã]|fixo|fixa|mensal|gasto|despesa|conta|receita|renda|sal[aá]rio|tarefa|compromisso|evento|reais|r\$|as|às|alta|m[eé]dia|baixa|urgente)\b/gi,
      ' '
    )
    .replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, ' ')
    .replace(/\b\d{1,2}[:h]\d{0,2}\b/gi, ' ')
    .replace(/\b\d+(?:[.,]\d{1,2})?\b/g, ' ')
    .replace(/\b\d{1,2}\s*(?:mes|meses|mês|x)\b/gi, ' ')
    .replace(/[,:;!?]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return fallback;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function TipsView({
  userId,
  displayName,
  todayStr,
  nowTimeStr,
  tasks,
  events,
  financeMonths,
  financeExpenses,
  financeIncomes,
  onTaskCreated,
  onEventCreated,
  onExpensesCreated,
  onIncomesCreated,
  onNavigate,
}: TipsViewProps) {
  const firstName = displayName.split(' ')[0] || 'Você';
  const currentMonthKey = todayStr.slice(0, 7);

  const [activeTab, setActiveTab] = useState<'chat' | 'diagnosis'>('chat');
  const [question, setQuestion] = useState('');
  const [thinking, setThinking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    const w = window as unknown as {
      SpeechRecognition?: unknown;
      webkitSpeechRecognition?: unknown;
    };
    if (w.SpeechRecognition || w.webkitSpeechRecognition) {
      queueMicrotask(() => setSpeechSupported(true));
    }
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const analysis = useMemo(() => {
    const insights: CoachInsight[] = [];
    let score = 82;

    const monthExp = financeExpenses.filter((e) => e.month_key === currentMonthKey);
    const monthInc = financeIncomes.filter((i) => i.month_key === currentMonthKey);
    const legacyIncome = Number(
      financeMonths.find((m) => m.month_key === currentMonthKey)?.estimated_income ?? 0
    );
    const totalIncome =
      monthInc.reduce((acc, i) => acc + Number(i.amount), 0) + legacyIncome;
    const totalExp = monthExp.reduce((acc, e) => acc + Number(e.amount), 0);
    const unpaidExp = monthExp.filter((e) => !e.paid);
    const balance = totalIncome - totalExp;

    const openTasks = tasks.filter((t) => !t.done);
    const doneTasks = tasks.filter((t) => t.done);
    const overdueTasks = openTasks.filter(
      (t) =>
        t.due_date &&
        (t.due_date < todayStr ||
          (t.due_date === todayStr &&
            t.due_time &&
            t.due_time.slice(0, 5) < nowTimeStr))
    );
    const highOpen = openTasks.filter((t) => t.priority === 'high');

    const todayEvents = events
      .filter((e) => e.event_date === todayStr)
      .sort((a, b) => a.event_time.localeCompare(b.event_time));
    const tomorrowStr = addDaysStr(todayStr, 1);
    const tomorrowEvents = events
      .filter((e) => e.event_date === tomorrowStr)
      .sort((a, b) => a.event_time.localeCompare(b.event_time));
    const next7DaysEvents = events.filter(
      (e) => e.event_date >= todayStr && e.event_date <= addDaysStr(todayStr, 7)
    );

    let tightGaps = 0;
    for (let i = 1; i < todayEvents.length; i++) {
      const [h1, m1] = todayEvents[i - 1].event_time.split(':').map(Number);
      const [h2, m2] = todayEvents[i].event_time.split(':').map(Number);
      const diffMins = h2 * 60 + m2 - (h1 * 60 + m1);
      if (diffMins >= 0 && diffMins < 60) tightGaps++;
    }

    if (todayEvents.length >= 4 || tomorrowEvents.length >= 4 || tightGaps >= 2) {
      score -= 14;
      insights.push({
        id: 'agenda-heavy',
        pillar: 'Agenda & Energia',
        severity: 'alert',
        title: 'Agenda apertada — cuide do seu descanso',
        analysis: `Você tem ${todayEvents.length} compromisso(s) hoje e ${tomorrowEvents.length} amanhã. Dias muito cheios drenam energia rápido.`,
        actions: [
          'Veja se algo pode ser remarcado ou resolvido por mensagem.',
          'Reserve 30 min livres para respirar e comer sem pressa.',
        ],
        ctaLabel: 'Rever Agenda',
        ctaTarget: 'calendar',
      });
    } else if (next7DaysEvents.length >= 10) {
      score -= 8;
      insights.push({
        id: 'agenda-busy-week',
        pillar: 'Agenda & Energia',
        severity: 'warning',
        title: 'Semana movimentada',
        analysis: `Há ${next7DaysEvents.length} compromissos nos próximos 7 dias. Planeje pausas para não chegar esgotado(a).`,
        actions: ['Escolha uma noite livre esta semana para descansar de verdade.'],
        ctaLabel: 'Ver semana',
        ctaTarget: 'calendar',
      });
    } else {
      insights.push({
        id: 'agenda-ok',
        pillar: 'Agenda & Energia',
        severity: 'good',
        title:
          todayEvents.length === 0
            ? 'Dia livre de compromissos fixos'
            : 'Ritmo equilibrado na agenda',
        analysis:
          todayEvents.length === 0
            ? 'Sua agenda de hoje está aberta — ótimo momento para focar com calma ou descansar.'
            : `Você tem ${todayEvents.length} compromisso(s) hoje e ${tomorrowEvents.length} amanhã, com bom espaço entre eles.`,
        actions: ['Aproveite para manter intervalos leves e dormir bem hoje.'],
        ctaLabel: 'Abrir Agenda',
        ctaTarget: 'calendar',
      });
    }

    if (overdueTasks.length > 0) {
      score -= Math.min(20, overdueTasks.length * 5);
      insights.push({
        id: 'tasks-overdue',
        pillar: 'Tarefas & Foco',
        severity: 'alert',
        title: `${overdueTasks.length} ${
          overdueTasks.length === 1 ? 'tarefa em atraso' : 'tarefas em atraso'
        }`,
        analysis: `Itens atrasados (${overdueTasks
          .slice(0, 2)
          .map((t) => `"${t.title}"`)
          .join(', ')}) ficam pesando na cabeça.`,
        actions: [
          'Resolva a menor delas agora (menos de 10 min) para destravar.',
          'Reagende as que não cabem hoje para uma data real.',
        ],
        ctaLabel: 'Ir para Tarefas',
        ctaTarget: 'tasks',
      });
    } else if (highOpen.length >= 3) {
      score -= 8;
      insights.push({
        id: 'tasks-high',
        pillar: 'Tarefas & Foco',
        severity: 'warning',
        title: 'Muitas prioridades altas juntas',
        analysis: `${highOpen.length} tarefas estão como prioridade Alta. Escolha no máximo 3 essenciais para hoje.`,
        actions: ['Foque em uma de cada vez antes de abrir novas frentes.'],
        ctaLabel: 'Organizar tarefas',
        ctaTarget: 'tasks',
      });
    } else {
      insights.push({
        id: 'tasks-ok',
        pillar: 'Tarefas & Foco',
        severity: 'good',
        title:
          openTasks.length === 0
            ? 'Todas as tarefas concluídas!'
            : `${openTasks.length} tarefa(s) sob controle`,
        analysis:
          openTasks.length === 0
            ? `Você já confirmou ${doneTasks.length} tarefa(s). Excelente ritmo!`
            : 'Volume tranquilo e sem atrasos. Continue no seu ritmo.',
        actions: ['Conclua uma pendência por vez com foco.'],
        ctaLabel: 'Ver tarefas',
        ctaTarget: 'tasks',
      });
    }

    if (totalIncome === 0 && totalExp === 0) {
      score -= 5;
      insights.push({
        id: 'fin-empty',
        pillar: 'Financeiro',
        severity: 'info',
        title: 'Lance sua receita e contas do mês',
        analysis:
          'Com sua receita recorrente e gastos lançados, consigo te mostrar exatamente quanto sobra livre.',
        actions: ['Adicione suas receitas e contas fixas na aba Financeiro.'],
        ctaLabel: 'Abrir Financeiro',
        ctaTarget: 'finance',
      });
    } else if (balance < 0) {
      score -= 20;
      insights.push({
        id: 'fin-negative',
        pillar: 'Financeiro',
        severity: 'alert',
        title: `Orçamento negativo em ${formatBRL(Math.abs(balance))}`,
        analysis: `Os gastos (${formatBRL(totalExp)}) passaram da receita (${formatBRL(
          totalIncome
        )}) neste mês.`,
        actions: [
          'Segure gastos variáveis pelos próximos dias.',
          'Revise assinaturas ou compras parceladas que podem esperar.',
        ],
        ctaLabel: 'Ajustar Financeiro',
        ctaTarget: 'finance',
      });
    } else {
      const savingsRate =
        totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : 0;
      const dueSoon = unpaidExp.filter(
        (e) => e.due_day && e.due_day <= Number(todayStr.slice(8, 10)) + 4
      );
      insights.push({
        id: 'fin-status',
        pillar: 'Financeiro',
        severity: dueSoon.length > 0 || (totalIncome > 0 && savingsRate < 15) ? 'warning' : 'good',
        title:
          dueSoon.length > 0
            ? `${dueSoon.length} conta(s) vencem em breve`
            : `Saldo positivo de ${formatBRL(balance)}`,
        analysis:
          dueSoon.length > 0
            ? `Fique de olho em: ${dueSoon
                .slice(0, 2)
                .map((e) => `${e.title} (dia ${e.due_day})`)
                .join(', ')}.`
            : `Você tem ${savingsRate}% da receita livre este mês. Ótimo controle!`,
        actions: [
          dueSoon.length > 0
            ? 'Separe o valor e marque como pago assim que quitar.'
            : 'Considere guardar uma parte desse saldo para sua reserva.',
        ],
        ctaLabel: 'Ver Financeiro',
        ctaTarget: 'finance',
      });
    }

    const clampedScore = Math.max(25, Math.min(100, score));
    const summary =
      clampedScore >= 80
        ? 'Sua rotina está bem equilibrada.'
        : clampedScore >= 60
        ? 'Tudo sob controle, com alguns pontos para ajustar.'
        : 'Dia mais pesado — desacelere e priorize o essencial.';

    return {
      score: clampedScore,
      summary,
      insights,
      metrics: {
        todayEvents,
        tomorrowEvents,
        next7DaysCount: next7DaysEvents.length,
        overdueTasks,
        openTasks,
        doneCount: doneTasks.length,
        balance,
        totalIncome,
        totalExp,
        unpaidExp,
        monthExp,
        monthInc,
      },
    };
  }, [
    currentMonthKey,
    events,
    financeExpenses,
    financeIncomes,
    financeMonths,
    nowTimeStr,
    tasks,
    todayStr,
  ]);

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      role: 'assistant',
      text: `Oi, ${firstName}! Posso conversar sobre sua rotina, gerar relatórios e também executar ações para você.\n\nExperimente pedir:\n• "Lança um gasto de 150 de internet fixo"\n• "Recebi 500 de freela"\n• "Cria uma tarefa pagar boleto amanhã às 10h"\n• "Marca na agenda dentista amanhã às 15h"\n• "Me dá um relatório financeiro"`,
    },
  ]);

  async function processCopilotInput(promptText: string): Promise<string> {
    const q = normalizeText(promptText);
    const supabase = createClient();

    // 1. Reports
    if (/(relatorio|extrato|panorama)/.test(q)) {
      const {
        totalIncome,
        totalExp,
        balance,
        monthExp,
        unpaidExp,
        openTasks,
        overdueTasks,
        doneCount,
        todayEvents,
        next7DaysCount,
      } = analysis.metrics;

      if (/(financ|gast|receit|dinheiro|conta)/.test(q)) {
        const byCat = new Map<string, number>();
        for (const e of monthExp) {
          byCat.set(e.category, (byCat.get(e.category) ?? 0) + Number(e.amount));
        }
        const topCats = Array.from(byCat.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([c, v]) => `${c}: ${formatBRL(v)}`)
          .join(' | ');

        return `📊 Relatório Financeiro (${currentMonthKey}):\n• Receitas: ${formatBRL(
          totalIncome
        )}\n• Gastos: ${formatBRL(totalExp)}\n• Saldo previsto: ${formatBRL(
          balance
        )}\n• Contas em aberto: ${unpaidExp.length}\n${
          topCats ? `• Maiores categorias: ${topCats}` : ''
        }`;
      }

      if (/(tarefa|afazer)/.test(q)) {
        return `☑ Relatório de Tarefas:\n• Em aberto: ${openTasks.length}\n• Em atraso: ${overdueTasks.length}\n• Concluídas: ${doneCount}${
          overdueTasks.length > 0
            ? `\n• Atrasadas agora: ${overdueTasks
                .slice(0, 3)
                .map((t) => t.title)
                .join(', ')}`
            : ''
        }`;
      }

      if (/(agenda|compromisso|evento)/.test(q)) {
        return `📅 Relatório da Agenda:\n• Compromissos hoje: ${
          todayEvents.length
        }\n• Próximos 7 dias: ${next7DaysCount}${
          todayEvents.length > 0
            ? `\n• Hoje: ${todayEvents
                .map((e) => `${e.event_time.slice(0, 5)} ${e.title}`)
                .join(', ')}`
            : ''
        }`;
      }

      return `📋 Relatório Geral, ${firstName}:\n• Equilíbrio: ${analysis.score}/100\n• Financeiro: ${formatBRL(
        totalIncome
      )} receita · ${formatBRL(totalExp)} gastos · ${formatBRL(
        balance
      )} saldo\n• Tarefas: ${openTasks.length} abertas (${overdueTasks.length} atrasadas)\n• Agenda: ${todayEvents.length} hoje · ${next7DaysCount} nos próximos 7 dias`;
    }

    // 2. Action: Create Expense
    const isCreateAction =
      /(lanca|lance|lanco|adiciona|adicione|cria|crie|coloca|coloque|registra|registre|gastei|paguei|comprei|recebi|ganhei|marca|marque|agend|novo|nova)/.test(
        q
      );

    if (
      isCreateAction &&
      /(gasto|despesa|conta|gastei|paguei|comprei)/.test(q)
    ) {
      const amount = extractAmount(promptText);
      if (!amount) {
        return 'Para lançar o gasto, me diga o valor também! Exemplo: "Lança um gasto de 120 de internet".';
      }
      const totalMonths = extractRecurrenceMonths(q);
      const category = detectExpenseCategory(q);
      const title = cleanTitle(promptText, category);
      const groupId = totalMonths > 1 ? crypto.randomUUID() : null;

      const rows = Array.from({ length: totalMonths }, (_, i) => ({
        user_id: userId,
        month_key: addMonthsToKey(currentMonthKey, i),
        title,
        amount,
        category,
        due_day: null,
        paid: false,
        recurrence_group_id: groupId,
        installment_index: totalMonths > 1 ? i + 1 : null,
        installment_total: totalMonths > 1 ? totalMonths : null,
      }));

      const { data, error } = await supabase
        .from('finance_expenses')
        .insert(rows)
        .select('*');

      if (error || !data) {
        return 'Ops, não consegui salvar esse gasto no banco agora. Tente novamente!';
      }

      onExpensesCreated(data as FinanceExpense[]);
      return `✅ Gasto lançado!\n• "${title}" (${category}): ${formatBRL(amount)}${
        totalMonths > 1 ? ` · repetido por ${totalMonths} meses` : ' · somente este mês'
      }.`;
    }

    // 3. Action: Create Income
    if (
      isCreateAction &&
      /(receita|renda|salario|recebi|ganhei|entrada)/.test(q)
    ) {
      const amount = extractAmount(promptText);
      if (!amount) {
        return 'Para lançar a receita, informe o valor! Exemplo: "Recebi 500 de freela" ou "Lança salário de 4500 fixo".';
      }
      const totalMonths = extractRecurrenceMonths(q);
      const category = detectIncomeCategory(q);
      const title = cleanTitle(promptText, category);
      const groupId = totalMonths > 1 ? crypto.randomUUID() : null;

      const rows = Array.from({ length: totalMonths }, (_, i) => ({
        user_id: userId,
        month_key: addMonthsToKey(currentMonthKey, i),
        title,
        amount,
        category,
        receive_day: null,
        recurrence_group_id: groupId,
        installment_index: totalMonths > 1 ? i + 1 : null,
        installment_total: totalMonths > 1 ? totalMonths : null,
      }));

      const { data, error } = await supabase
        .from('finance_incomes')
        .insert(rows)
        .select('*');

      if (error || !data) {
        return 'Ops, não consegui salvar essa receita agora. Tente novamente!';
      }

      onIncomesCreated(data as FinanceIncome[]);
      return `✅ Receita lançada!\n• "${title}" (${category}): +${formatBRL(amount)}${
        totalMonths > 1 ? ` · repetida por ${totalMonths} meses` : ' · somente este mês'
      }.`;
    }

    // 4. Action: Create Calendar Event
    if (
      isCreateAction &&
      /(agenda|compromisso|evento|reuniao|consulta|medico|dentista|marcar|agendar)/.test(
        q
      )
    ) {
      const eventDate = extractDate(q, todayStr);
      const eventTime = extractTime(q) ?? '09:00';
      const title = cleanTitle(promptText, 'Compromisso');

      const { data, error } = await supabase
        .from('events')
        .insert({
          user_id: userId,
          title,
          event_date: eventDate,
          event_time: eventTime,
          location: null,
          notes: null,
          notify_enabled: true,
          notify_minutes_before: 15,
          reminder_preset: 'relative',
        })
        .select('*')
        .single();

      if (error || !data) {
        return 'Não consegui criar esse compromisso na agenda. Tente novamente!';
      }

      onEventCreated(data as CalendarEvent);
      return `📅 Compromisso agendado!\n• "${title}" em ${eventDate
        .split('-')
        .reverse()
        .join('/')} às ${eventTime} (com notificação automática).`;
    }

    // 5. Action: Create Task
    if (
      isCreateAction &&
      /(tarefa|lembrete|afazer|lembrar)/.test(q)
    ) {
      const dueDate = extractDate(q, todayStr);
      const dueTime = extractTime(q) ?? '09:00';
      const priority: Priority = /(alta|urgente)/.test(q)
        ? 'high'
        : /baixa/.test(q)
        ? 'low'
        : 'medium';
      const title = cleanTitle(promptText, 'Nova tarefa');

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: userId,
          title,
          category: 'Pessoal',
          due_date: dueDate,
          due_time: dueTime,
          priority,
          notify_enabled: true,
          reminder_preset: 'same_day_08',
          reminder_presets: ['same_day_08', 'relative:0'],
        })
        .select('*')
        .single();

      if (error || !data) {
        return 'Não consegui criar essa tarefa agora. Tente novamente!';
      }

      onTaskCreated(data as Task);
      return `☑ Tarefa criada!\n• "${title}" para ${dueDate
        .split('-')
        .reverse()
        .join('/')} às ${dueTime} (notificação ativada).`;
    }

    // 6. Conversational Q&A
    const {
      todayEvents,
      tomorrowEvents,
      next7DaysCount,
      overdueTasks,
      openTasks,
      balance,
      totalIncome,
      totalExp,
      unpaidExp,
    } = analysis.metrics;

    if (/^(oi|ola|e ai|bom dia|boa tarde|boa noite|tudo bem)/.test(q)) {
      return `Oi, ${firstName}! Tudo ótimo por aqui. Seu índice de equilíbrio hoje está em ${analysis.score}/100. Posso lançar gastos, receitas, tarefas, compromissos ou gerar um relatório — o que você precisa agora?`;
    }

    if (q.includes('obrigad') || q.includes('valeu') || q.includes('show')) {
      return `Por nada, ${firstName}! Sempre que precisar, é só me chamar aqui.`;
    }

    if (
      /(descans|cansad|estress|pausa|dormir|sobrecar)/.test(q)
    ) {
      if (todayEvents.length >= 3 || overdueTasks.length >= 2) {
        return `Olhando para os seus dados, faz todo sentido você sentir o peso: são ${todayEvents.length} compromisso(s) hoje e ${overdueTasks.length} tarefa(s) atrasada(s). Escolha só 1 coisa importante, resolva, e depois se dê pelo menos 30 a 45 minutos de descanso real sem culpa.`;
      }
      return `Sua carga de hoje está bem leve (${todayEvents.length} compromisso(s) e ${openTasks.length} tarefa(s) aberta(s)). Pode descansar tranquilo(a) sim!`;
    }

    if (/(amanha|agenda|compromisso|semana|horario)/.test(q)) {
      const todayTxt = todayEvents.length
        ? todayEvents
            .map((e) => `${e.event_time.slice(0, 5)} ${e.title}`)
            .join(', ')
        : 'nenhum compromisso marcado';
      const tomorrowTxt = tomorrowEvents.length
        ? tomorrowEvents
            .map((e) => `${e.event_time.slice(0, 5)} ${e.title}`)
            .join(', ')
        : 'dia livre';
      return `Na sua agenda:\n• Hoje: ${todayTxt}.\n• Amanhã: ${tomorrowTxt}.\n• Próximos 7 dias: ${next7DaysCount} compromisso(s) no total.`;
    }

    if (/(prioriz|tarefa|fazer|hoje|atras)/.test(q)) {
      if (overdueTasks.length > 0) {
        return `Comece tirando da frente o que já passou do prazo: "${overdueTasks[0].title}". Depois escolha mais 1 tarefa aberta (${openTasks.length} no total) e deixe o resto para amanhã sem peso.`;
      }
      if (openTasks.length > 0) {
        return `Você não tem atrasos! Das ${openTasks.length} tarefa(s) em aberto, escolha "${openTasks[0].title}" como foco principal agora.`;
      }
      return `Suas tarefas estão todas em dia! Aproveite para descansar ou adiantar algo leve.`;
    }

    if (/(gast|financ|dinheiro|sald|receita|conta|pagar)/.test(q)) {
      if (totalIncome === 0 && totalExp === 0) {
        return `Ainda não tem receitas nem gastos lançados neste mês. Você pode dizer aqui mesmo: "Lança salário de 4000 fixo" ou "Lança gasto de 150 de internet".`;
      }
      return `No Financeiro deste mês:\n• Receitas: ${formatBRL(totalIncome)}\n• Gastos: ${formatBRL(totalExp)}\n• Saldo previsto: ${formatBRL(balance)}\n• Contas em aberto: ${unpaidExp.length}`;
    }

    return `Entendi, ${firstName}! Seu equilíbrio hoje está em ${analysis.score}/100 (${todayEvents.length} compromisso(s) hoje, ${overdueTasks.length} tarefa(s) atrasada(s) e saldo de ${formatBRL(balance)}).\n\nSe quiser, pode pedir algo direto como: "Lança gasto de 80 no mercado", "Cria tarefa ligar pro médico amanhã" ou "Relatório financeiro".`;
  }

  async function sendMessage(customPrompt?: string) {
    const text = (customPrompt ?? question).trim();
    if (!text || thinking) return;

    setQuestion('');
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setThinking(true);

    const [reply] = await Promise.all([
      processCopilotInput(text),
      new Promise((r) => setTimeout(r, 320)),
    ]);

    setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
    setThinking(false);
  }

  function toggleVoiceInput() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const w = window as unknown as {
      SpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        maxAlternatives: number;
        onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
        start: () => void;
        stop: () => void;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        maxAlternatives: number;
        onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
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
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (transcript) {
        setQuestion(transcript);
        void sendMessage(transcript);
      }
    };

    rec.onerror = () => {
      setListening(false);
    };

    rec.onend = () => {
      setListening(false);
    };

    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <div className="eyebrow">COPILOTO DE ROTINA</div>
          <h1>Dicas &amp; Bem-estar</h1>
          <p className="subtitle">
            Converse, peça relatórios ou mande lançar gastos, receitas, tarefas e
            agendas.
          </p>
        </div>
      </div>

      {/* Compact Hero */}
      <div className="coach-hero">
        <div className="coach-hero-main">
          <div className="welcome-eyebrow">ÍNDICE DE EQUILÍBRIO</div>
          <h2>
            {analysis.score}/100 · {analysis.summary}
          </h2>
          <div className="coach-pills" style={{ marginTop: 10 }}>
            <span>📅 {analysis.metrics.todayEvents.length} hoje</span>
            <span>☑ {analysis.metrics.openTasks.length} tarefas abertas</span>
            <span>💰 {formatBRL(analysis.metrics.balance)} saldo</span>
          </div>
        </div>
        <div className="coach-score-ring">
          <strong>{analysis.score}</strong>
          <small>pontos</small>
        </div>
      </div>

      {/* Clean 2-tab switcher */}
      <div className="filter-row" style={{ marginBottom: 16 }}>
        <button
          type="button"
          className={`chip ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          ✦ Conversar com Copiloto
        </button>
        <button
          type="button"
          className={`chip ${activeTab === 'diagnosis' ? 'active' : ''}`}
          onClick={() => setActiveTab('diagnosis')}
        >
          📊 Diagnóstico &amp; Ações ({analysis.insights.length})
        </button>
      </div>

      {activeTab === 'chat' ? (
        <div className="panel">
          <div className="filter-row">
            {[
              'Me dá um relatório geral',
              'O que devo priorizar hoje?',
              'Preciso descansar?',
              'Relatório financeiro',
            ].map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="chip"
                onClick={() => sendMessage(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="coach-chat">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`coach-msg ${m.role === 'user' ? 'user' : 'bot'}`}
              >
                {m.text}
              </div>
            ))}
            {thinking && (
              <div className="coach-msg bot muted">Executando...</div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="coach-input-row"
          >
            <input
              type="text"
              placeholder={
                listening
                  ? 'Ouvindo... pode falar!'
                  : 'Ex.: Lança gasto de 150 de internet ou Cria tarefa amanhã 10h'
              }
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            {speechSupported && (
              <button
                type="button"
                className={`btn secondary mic-btn ${listening ? 'listening' : ''}`}
                onClick={toggleVoiceInput}
                title={listening ? 'Parar gravação' : 'Falar com o Copiloto'}
                aria-label="Falar com o Copiloto"
              >
                {listening ? '⏹' : '🎙️'}
              </button>
            )}
            <button className="btn" type="submit" disabled={thinking}>
              Enviar
            </button>
          </form>
        </div>
      ) : (
        <div className="tips-grid">
          {analysis.insights.map((item) => (
            <div key={item.id} className={`panel tip-card tip-${item.severity}`}>
              <div className="panel-head" style={{ marginBottom: 10 }}>
                <span
                  className={`tag ${
                    item.severity === 'alert'
                      ? 'high'
                      : item.severity === 'warning'
                      ? 'medium'
                      : item.severity === 'good'
                      ? 'low'
                      : ''
                  }`}
                >
                  {item.pillar}
                </span>
              </div>

              <h2 style={{ fontSize: 16, marginBottom: 8 }}>{item.title}</h2>
              <p
                className="muted"
                style={{ fontSize: 13, lineHeight: 1.6, margin: '0 0 12px' }}
              >
                {item.analysis}
              </p>

              <ul className="tip-actions-list">
                {item.actions.map((act, i) => (
                  <li key={i}>{act}</li>
                ))}
              </ul>

              {item.ctaLabel && item.ctaTarget && (
                <button
                  type="button"
                  className="btn secondary small"
                  onClick={() => onNavigate(item.ctaTarget!)}
                >
                  {item.ctaLabel} →
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
