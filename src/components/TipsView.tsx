'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Calendar,
  CheckSquare,
  ImagePlus,
  Mic,
  Sparkles,
  Square,
  Wallet,
  X,
} from 'lucide-react';
import {
  processCopilotCommand,
  type CopilotMetrics,
} from '@/lib/copilot-engine';
import { compressImageFile } from '@/lib/image-utils';
import type {
  CalendarEvent,
  FinanceExpense,
  FinanceIncome,
  FinanceMonth,
  Goal,
  Note,
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
  onGoalCreated: (goal: Goal) => void;
  onNoteCreated: (note: Note) => void;
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
  imageUrl?: string | null;
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
  onGoalCreated,
  onNoteCreated,
  onNavigate,
}: TipsViewProps) {
  const firstName = displayName.split(' ')[0] || 'Você';
  const currentMonthKey = todayStr.slice(0, 7);

  const [activeTab, setActiveTab] = useState<'chat' | 'diagnosis'>('chat');
  const [question, setQuestion] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const finalTranscriptRef = useRef('');
  const photoInputRef = useRef<HTMLInputElement | null>(null);

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
        severity:
          dueSoon.length > 0 || (totalIncome > 0 && savingsRate < 15)
            ? 'warning'
            : 'good',
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

    const metrics: CopilotMetrics = {
      score: clampedScore,
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
    };

    return { score: clampedScore, summary, insights, metrics };
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
      text: `Olá, ${firstName}! Eu sou o Severino, seu mordomo digital da vida adulta.\n\nPode digitar, tocar no microfone ou anexar uma foto para me pedir:\n• "Lança um gasto de 150 de internet fixo"\n• "Recebi 500 de freela"\n• "Cria uma tarefa pagar boleto amanhã às 10h"\n• "Anota aí: comprar filtro de café" (ou anexe uma foto)\n• "Cria uma meta correr no parque sábado"`,
    },
  ]);

  async function handlePhotoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      setAttachedImage(compressed);
    } catch {
      // ignore invalid image
    } finally {
      e.target.value = '';
    }
  }

  async function sendMessage(customPrompt?: string) {
    const rawText = (customPrompt ?? question).trim();
    const imgToSend = customPrompt ? null : attachedImage;
    if ((!rawText && !imgToSend) || thinking) return;
    const text = rawText || 'Anotação com foto';

    setQuestion('');
    if (!customPrompt) setAttachedImage(null);
    setMessages((prev) => [...prev, { role: 'user', text, imageUrl: imgToSend }]);
    setThinking(true);

    const [reply] = await Promise.all([
      processCopilotCommand(text, {
        userId,
        firstName,
        todayStr,
        currentMonthKey,
        metrics: analysis.metrics,
        topInsightTitle: analysis.insights[0]?.title,
        imageDataUrl: imgToSend,
        onTaskCreated,
        onEventCreated,
        onExpensesCreated,
        onIncomesCreated,
        onGoalCreated,
        onNoteCreated,
      }),
      new Promise((r) => setTimeout(r, 300)),
    ]);

    setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
    setThinking(false);
  }

  function toggleVoiceInput() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const w = window as unknown as {
      SpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        maxAlternatives: number;
        onresult: ((ev: { results: ArrayLike<{ isFinal?: boolean; 0: { transcript: string } }> }) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
        start: () => void;
        stop: () => void;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        maxAlternatives: number;
        onresult: ((ev: { results: ArrayLike<{ isFinal?: boolean; 0: { transcript: string } }> }) => void) | null;
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
    finalTranscriptRef.current = '';
    setLiveTranscript('');

    rec.onresult = (event) => {
      let combined = '';
      for (let i = 0; i < event.results.length; i++) {
        combined += event.results[i][0].transcript + ' ';
      }
      const trimmed = combined.trim();
      finalTranscriptRef.current = trimmed;
      setLiveTranscript(trimmed);
    };

    rec.onerror = () => {
      setListening(false);
      setLiveTranscript('');
    };

    rec.onend = () => {
      setListening(false);
      const spoken = finalTranscriptRef.current.trim();
      setLiveTranscript('');
      if (spoken) {
        void sendMessage(spoken);
      }
    };

    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <div className="eyebrow">SEU MORDOMO DIGITAL</div>
          <h1>Severino</h1>
          <p className="subtitle">
            Peça por texto ou voz para lançar gastos, receitas, tarefas e agendas.
          </p>
        </div>
      </div>

      <div className="coach-hero">
        <div className="coach-hero-main">
          <div className="welcome-eyebrow">ÍNDICE DE EQUILÍBRIO</div>
          <h2>
            {analysis.score}/100 · {analysis.summary}
          </h2>
          <div className="coach-pills" style={{ marginTop: 10 }}>
            <span>
              <Calendar size={13} strokeWidth={2.2} />
              {analysis.metrics.todayEvents.length} hoje
            </span>
            <span>
              <CheckSquare size={13} strokeWidth={2.2} />
              {analysis.metrics.openTasks.length} tarefas abertas
            </span>
            <span>
              <Wallet size={13} strokeWidth={2.2} />
              {formatBRL(analysis.metrics.balance)} saldo
            </span>
          </div>
        </div>
        <div className="coach-score-ring">
          <strong>{analysis.score}</strong>
          <small>pontos</small>
        </div>
      </div>

      <div className="filter-row" style={{ marginBottom: 16 }}>
        <button
          type="button"
          className={`chip ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <Sparkles size={13} style={{ display: 'inline', marginRight: 5 }} />
          Conversar com Severino
        </button>
        <button
          type="button"
          className={`chip ${activeTab === 'diagnosis' ? 'active' : ''}`}
          onClick={() => setActiveTab('diagnosis')}
        >
          <BarChart3 size={13} style={{ display: 'inline', marginRight: 5 }} />
          Diagnóstico &amp; Ações ({analysis.insights.length})
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
                {m.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.imageUrl}
                    alt="Anexo"
                    style={{
                      display: 'block',
                      maxWidth: 200,
                      maxHeight: 160,
                      borderRadius: 10,
                      marginBottom: 6,
                      objectFit: 'cover',
                    }}
                  />
                )}
                {m.text}
              </div>
            ))}
            {thinking && (
              <div className="coach-msg bot muted">Severino está executando...</div>
            )}
          </div>

          {attachedImage && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 8,
                padding: '6px 10px',
                borderRadius: 12,
                background: 'var(--bg-elev)',
                border: '1px solid var(--border)',
                width: 'fit-content',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={attachedImage}
                alt="Foto anexada"
                style={{ width: 38, height: 38, borderRadius: 8, objectFit: 'cover' }}
              />
              <span style={{ fontSize: 12 }}>Foto pronta para anotar</span>
              <button
                type="button"
                className="close"
                onClick={() => setAttachedImage(null)}
                title="Remover foto"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="coach-input-row"
          >
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhotoPick}
            />
            <input
              type="text"
              placeholder="Fale, digite ou anexe uma foto para o Severino..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <button
              type="button"
              className="btn secondary mic-btn"
              onClick={() => photoInputRef.current?.click()}
              title="Anexar foto para anotação"
              aria-label="Anexar foto"
            >
              <ImagePlus size={17} />
            </button>
            {speechSupported && (
              <button
                type="button"
                className={`btn secondary mic-btn ${listening ? 'listening' : ''}`}
                onClick={toggleVoiceInput}
                title={listening ? 'Parar gravação' : 'Falar com o Severino'}
                aria-label="Falar com o Severino"
              >
                {listening ? <Square size={16} /> : <Mic size={17} />}
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

      {listening && (
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
              {liveTranscript || 'Pode falar naturalmente o que deseja lançar...'}
            </p>
            <button
              type="button"
              className="btn"
              onClick={() => recognitionRef.current?.stop()}
            >
              Concluir fala ✓
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
