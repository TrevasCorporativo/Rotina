import { createClient } from '@/lib/supabase/client';
import type {
  CalendarEvent,
  FinanceExpense,
  FinanceIncome,
  Priority,
  Task,
} from '@/lib/types';

export interface CopilotMetrics {
  score: number;
  todayEvents: CalendarEvent[];
  tomorrowEvents: CalendarEvent[];
  next7DaysCount: number;
  overdueTasks: Task[];
  openTasks: Task[];
  doneCount: number;
  balance: number;
  totalIncome: number;
  totalExp: number;
  unpaidExp: FinanceExpense[];
  monthExp: FinanceExpense[];
}

export interface CopilotContext {
  userId: string;
  firstName: string;
  todayStr: string;
  currentMonthKey: string;
  metrics: CopilotMetrics;
  topInsightTitle?: string;
  onTaskCreated: (task: Task) => void;
  onEventCreated: (ev: CalendarEvent) => void;
  onExpensesCreated: (exps: FinanceExpense[]) => void;
  onIncomesCreated: (incs: FinanceIncome[]) => void;
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
    .replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, ' ')
    .replace(/\b\d{1,2}[:h]\d{0,2}\b/gi, ' ')
    .replace(/(?:r\$\s*)?\d+(?:[.,]\d{1,2})?/gi, ' ')
    .replace(/\b\d{1,2}\s*(?:mes|meses|mês|x)\b/gi, ' ')
    .replace(
      /\b(severino|lan[cç][aeo]|lan[cç]ar|adicion[ae]|adicionar|cri[ae]|criar|coloc[ae]|colocar|registr[ae]|registrar|marc[ae]|marcar|agend[ae]|agendar|agenda|novo|nova|um|uma|para|pra|pro|de|do|da|dos|das|no|na|nos|nas|em|com|por|durante|hoje|amanh[aã]|fixo|fixa|mensal|gasto|despesa|conta|receita|renda|sal[aá]rio|tarefa|compromisso|evento|meta|reais|r\$|as|às|aos|data|dia|hora|hor[aá]rio|valor|vencimento|categoria|prioridade|alta|m[eé]dia|baixa|urgente|local|obs|observa[cç][aã]o)\b/gi,
      ' '
    )
    .replace(/[,:;!?\-–—]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return fallback;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export async function processCopilotCommand(
  promptText: string,
  ctx: CopilotContext
): Promise<string> {
  const q = normalizeText(promptText);
  const supabase = createClient();
  const {
    userId,
    firstName,
    todayStr,
    currentMonthKey,
    metrics,
    topInsightTitle,
    onTaskCreated,
    onEventCreated,
    onExpensesCreated,
    onIncomesCreated,
  } = ctx;

  // 1. Reports
  if (/(relatorio|extrato|panorama)/.test(q)) {
    if (/(financ|gast|receit|dinheiro|conta)/.test(q)) {
      const byCat = new Map<string, number>();
      for (const e of metrics.monthExp) {
        byCat.set(e.category, (byCat.get(e.category) ?? 0) + Number(e.amount));
      }
      const topCats = Array.from(byCat.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([c, v]) => `${c}: ${formatBRL(v)}`)
        .join(' | ');

      return `Relatório Financeiro (${currentMonthKey}):\n• Receitas: ${formatBRL(
        metrics.totalIncome
      )}\n• Gastos: ${formatBRL(metrics.totalExp)}\n• Saldo previsto: ${formatBRL(
        metrics.balance
      )}\n• Contas em aberto: ${metrics.unpaidExp.length}${
        topCats ? `\n• Maiores categorias: ${topCats}` : ''
      }`;
    }

    if (/(tarefa|afazer)/.test(q)) {
      return `Relatório de Tarefas:\n• Em aberto: ${metrics.openTasks.length}\n• Em atraso: ${metrics.overdueTasks.length}\n• Concluídas: ${metrics.doneCount}${
        metrics.overdueTasks.length > 0
          ? `\n• Atrasadas agora: ${metrics.overdueTasks
              .slice(0, 3)
              .map((t) => t.title)
              .join(', ')}`
          : ''
      }`;
    }

    if (/(agenda|compromisso|evento)/.test(q)) {
      return `Relatório da Agenda:\n• Compromissos hoje: ${
        metrics.todayEvents.length
      }\n• Próximos 7 dias: ${metrics.next7DaysCount}${
        metrics.todayEvents.length > 0
          ? `\n• Hoje: ${metrics.todayEvents
              .map((e) => `${e.event_time.slice(0, 5)} ${e.title}`)
              .join(', ')}`
          : ''
      }`;
    }

    return `Relatório Geral, ${firstName}:\n• Equilíbrio: ${metrics.score}/100\n• Financeiro: ${formatBRL(
      metrics.totalIncome
    )} receita · ${formatBRL(metrics.totalExp)} gastos · ${formatBRL(
      metrics.balance
    )} saldo\n• Tarefas: ${metrics.openTasks.length} abertas (${metrics.overdueTasks.length} atrasadas)\n• Agenda: ${metrics.todayEvents.length} hoje · ${metrics.next7DaysCount} nos próximos 7 dias`;
  }

  // 2. Action: Create Expense
  const isCreateAction =
    /(lanca|lance|lanco|adiciona|adicione|cria|crie|coloca|coloque|registra|registre|gastei|paguei|comprei|recebi|ganhei|marca|marque|agend|novo|nova)/.test(
      q
    );

  if (isCreateAction && /(gasto|despesa|conta|gastei|paguei|comprei)/.test(q)) {
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
    return `Gasto lançado!\n• "${title}" (${category}): ${formatBRL(amount)}${
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
    return `Receita lançada!\n• "${title}" (${category}): +${formatBRL(amount)}${
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
    return `Compromisso agendado!\n• "${title}" em ${eventDate
      .split('-')
      .reverse()
      .join('/')} às ${eventTime} (com notificação automática).`;
  }

  // 5. Action: Create Task (explicit "tarefa/lembrete" OR create verb with a date when not expense/income/event)
  const hasDateMention =
    /\b(hoje|amanha)\b|\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/.test(q);
  if (
    isCreateAction &&
    (/(tarefa|lembrete|afazer|lembrar)/.test(q) || hasDateMention)
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
    return `Tarefa criada!\n• "${title}" para ${dueDate
      .split('-')
      .reverse()
      .join('/')} às ${dueTime} (notificação ativada).`;
  }

  // 6. Conversational Q&A
  if (/^(oi|ola|e ai|bom dia|boa tarde|boa noite|tudo bem|severino)/.test(q)) {
    return `Oi, ${firstName}! Severino na área. Seu índice de equilíbrio hoje está em ${metrics.score}/100. Posso lançar gastos, receitas, tarefas, compromissos ou gerar um relatório — o que manda?`;
  }

  if (q.includes('obrigad') || q.includes('valeu') || q.includes('show')) {
    return `Às ordens, ${firstName}! Sempre que precisar, é só chamar o Severino.`;
  }

  if (/(descans|cansad|estress|pausa|dormir|sobrecar)/.test(q)) {
    if (metrics.todayEvents.length >= 3 || metrics.overdueTasks.length >= 2) {
      return `Olhando para os seus dados, faz todo sentido sentir o peso: são ${metrics.todayEvents.length} compromisso(s) hoje e ${metrics.overdueTasks.length} tarefa(s) atrasada(s). Escolha só 1 coisa importante, resolva, e depois se dê pelo menos 30 a 45 minutos de descanso real sem culpa.`;
    }
    return `Sua carga de hoje está bem leve (${metrics.todayEvents.length} compromisso(s) e ${metrics.openTasks.length} tarefa(s) aberta(s)). Pode descansar tranquilo(a) sim!`;
  }

  if (/(amanha|agenda|compromisso|semana|horario)/.test(q)) {
    const todayTxt = metrics.todayEvents.length
      ? metrics.todayEvents
          .map((e) => `${e.event_time.slice(0, 5)} ${e.title}`)
          .join(', ')
      : 'nenhum compromisso marcado';
    const tomorrowTxt = metrics.tomorrowEvents.length
      ? metrics.tomorrowEvents
          .map((e) => `${e.event_time.slice(0, 5)} ${e.title}`)
          .join(', ')
      : 'dia livre';
    return `Na sua agenda:\n• Hoje: ${todayTxt}.\n• Amanhã: ${tomorrowTxt}.\n• Próximos 7 dias: ${metrics.next7DaysCount} compromisso(s) no total.`;
  }

  if (/(prioriz|tarefa|fazer|hoje|atras)/.test(q)) {
    if (metrics.overdueTasks.length > 0) {
      return `Comece tirando da frente o que já passou do prazo: "${metrics.overdueTasks[0].title}". Depois escolha mais 1 tarefa aberta (${metrics.openTasks.length} no total) e deixe o resto para amanhã sem peso.`;
    }
    if (metrics.openTasks.length > 0) {
      return `Você não tem atrasos! Das ${metrics.openTasks.length} tarefa(s) em aberto, escolha "${metrics.openTasks[0].title}" como foco principal agora.`;
    }
    return `Suas tarefas estão todas em dia! Aproveite para descansar ou adiantar algo leve.`;
  }

  if (/(gast|financ|dinheiro|sald|receita|conta|pagar)/.test(q)) {
    if (metrics.totalIncome === 0 && metrics.totalExp === 0) {
      return `Ainda não tem receitas nem gastos lançados neste mês. Você pode me dizer agora mesmo: "Lança salário de 4000 fixo" ou "Lança gasto de 150 de internet".`;
    }
    return `No Financeiro deste mês:\n• Receitas: ${formatBRL(
      metrics.totalIncome
    )}\n• Gastos: ${formatBRL(metrics.totalExp)}\n• Saldo previsto: ${formatBRL(
      metrics.balance
    )}\n• Contas em aberto: ${metrics.unpaidExp.length}`;
  }

  return `Entendi, ${firstName}! Seu equilíbrio hoje está em ${metrics.score}/100 (${metrics.todayEvents.length} compromisso(s) hoje, ${metrics.overdueTasks.length} tarefa(s) atrasada(s) e saldo de ${formatBRL(metrics.balance)}).\n\n${
    topInsightTitle
      ? `Minha principal sugestão agora: ${topInsightTitle.toLowerCase()}. `
      : ''
  }Se quiser, pode pedir algo direto como: "Lança gasto de 80 no mercado" ou "Cria tarefa pagar internet amanhã".`;
}

