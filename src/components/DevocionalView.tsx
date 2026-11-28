'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BookOpenCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Highlighter,
  MessageSquarePlus,
  Trash2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { BIBLE_PLAN } from '@/lib/bible-plan';
import type {
  BibleHighlight,
  BibleNote,
  DevotionalCheckin,
} from '@/lib/types';

interface BibleBookData {
  abbrev: string;
  name?: string;
  chapters: string[][];
}

interface DevocionalViewProps {
  userId: string;
  todayStr: string;
  checkins: DevotionalCheckin[];
  highlights: BibleHighlight[];
  bibleNotes: BibleNote[];
  onCheckinsChange: React.Dispatch<React.SetStateAction<DevotionalCheckin[]>>;
  onHighlightsChange: React.Dispatch<React.SetStateAction<BibleHighlight[]>>;
  onBibleNotesChange: React.Dispatch<React.SetStateAction<BibleNote[]>>;
  onToast: (msg: string) => void;
}

const HIGHLIGHT_COLORS: Array<{
  id: 'yellow' | 'green' | 'blue' | 'pink';
  label: string;
}> = [
  { id: 'yellow', label: 'Amarelo' },
  { id: 'green', label: 'Verde' },
  { id: 'blue', label: 'Azul' },
  { id: 'pink', label: 'Rosa' },
];

export function DevocionalView({
  userId,
  todayStr,
  checkins,
  highlights,
  bibleNotes,
  onCheckinsChange,
  onHighlightsChange,
  onBibleNotesChange,
  onToast,
}: DevocionalViewProps) {
  const supabase = createClient();

  const [tab, setTab] = useState<'plan' | 'bible' | 'notes'>('plan');
  const [bibleData, setBibleData] = useState<BibleBookData[] | null>(null);
  const [loadingBible, setLoadingBible] = useState(false);
  const [bibleOfflineReady, setBibleOfflineReady] = useState(false);

  // Plan day selector: default to next uncompleted day
  const nextPendingDay = useMemo(() => {
    const doneSet = new Set(checkins.map((c) => c.day_number));
    for (let d = 1; d <= 365; d++) {
      if (!doneSet.has(d)) return d;
    }
    return 1;
  }, [checkins]);

  const [selectedDay, setSelectedDay] = useState<number>(nextPendingDay);
  const [dayReflection, setDayReflection] = useState('');
  const dayPlan = BIBLE_PLAN[selectedDay - 1] ?? BIBLE_PLAN[0];
  const isDayDone = checkins.some((c) => c.day_number === selectedDay);

  // Bible reader state
  const [selectedBookAbbrev, setSelectedBookAbbrev] = useState(
    dayPlan.readings[0]?.bookAbbrev ?? 'jo'
  );
  const [selectedChapter, setSelectedChapter] = useState(
    dayPlan.readings[0]?.startChapter ?? 1
  );
  const [selectedVerse, setSelectedVerse] = useState<{
    verse: number;
    text: string;
  } | null>(null);
  const [noteInput, setNoteInput] = useState('');

  async function loadBible(notifyOnSuccess = false) {
    if (bibleData) return;
    setLoadingBible(true);
    try {
      const res = await fetch('/biblia/nvi.json');
      if (!res.ok) throw new Error('Falha ao carregar Bíblia');
      const json = (await res.json()) as BibleBookData[];
      setBibleData(json);
      setBibleOfflineReady(true);
      if ('caches' in window) {
        const cache = await caches.open('rotina-bible-v1');
        await cache.add('/biblia/nvi.json').catch(() => {});
      }
      if (notifyOnSuccess) {
        onToast('Bíblia NVI salva para leitura 100% offline!');
      }
    } catch {
      onToast('Não foi possível carregar a Bíblia agora.');
    } finally {
      setLoadingBible(false);
    }
  }

  useEffect(() => {
    let active = true;
    fetch('/biblia/nvi.json')
      .then((res) => (res.ok ? res.json() : null))
      .then(async (json: BibleBookData[] | null) => {
        if (!active || !json) return;
        setBibleData(json);
        setBibleOfflineReady(true);
        if ('caches' in window) {
          const cache = await caches.open('rotina-bible-v1');
          await cache.add('/biblia/nvi.json').catch(() => {});
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const currentBook = useMemo(() => {
    if (!bibleData) return null;
    return (
      bibleData.find(
        (b) => b.abbrev.toLowerCase() === selectedBookAbbrev.toLowerCase()
      ) ?? bibleData[0]
    );
  }, [bibleData, selectedBookAbbrev]);

  const currentChapterVerses = useMemo(() => {
    if (!currentBook) return [];
    return currentBook.chapters[selectedChapter - 1] ?? [];
  }, [currentBook, selectedChapter]);

  const chapterHighlights = useMemo(
    () =>
      highlights.filter(
        (h) =>
          h.book_abbrev.toLowerCase() === selectedBookAbbrev.toLowerCase() &&
          h.chapter === selectedChapter
      ),
    [highlights, selectedBookAbbrev, selectedChapter]
  );

  const chapterNotes = useMemo(
    () =>
      bibleNotes.filter(
        (n) =>
          n.book_abbrev.toLowerCase() === selectedBookAbbrev.toLowerCase() &&
          n.chapter === selectedChapter
      ),
    [bibleNotes, selectedBookAbbrev, selectedChapter]
  );

  async function toggleDayCheckin() {
    if (isDayDone) {
      const { error } = await supabase
        .from('devotional_checkins')
        .delete()
        .eq('user_id', userId)
        .eq('day_number', selectedDay);
      if (error) {
        onToast('Erro ao atualizar leitura.');
        return;
      }
      onCheckinsChange((prev) =>
        prev.filter((c) => c.day_number !== selectedDay)
      );
      onToast(`Dia ${selectedDay} marcado como pendente.`);
    } else {
      const { data, error } = await supabase
        .from('devotional_checkins')
        .upsert(
          {
            user_id: userId,
            day_number: selectedDay,
            completed_date: todayStr,
            reflection: dayReflection.trim(),
          },
          { onConflict: 'user_id,day_number' }
        )
        .select('*')
        .single();
      if (error || !data) {
        onToast('Erro ao confirmar leitura do dia.');
        return;
      }
      onCheckinsChange((prev) => [...prev, data as DevotionalCheckin]);
      setDayReflection('');
      onToast(`Leitura do Dia ${selectedDay} confirmada!`);
    }
  }

  function openReadingInBible(bookAbbrev: string, chapter: number) {
    setSelectedBookAbbrev(bookAbbrev);
    setSelectedChapter(chapter);
    setSelectedVerse(null);
    setTab('bible');
  }

  async function applyHighlight(color: 'yellow' | 'green' | 'blue' | 'pink') {
    if (!selectedVerse) return;
    const existing = chapterHighlights.find(
      (h) => h.verse === selectedVerse.verse
    );
    if (existing && existing.color === color) {
      const { error } = await supabase
        .from('bible_highlights')
        .delete()
        .eq('id', existing.id);
      if (!error) {
        onHighlightsChange((prev) => prev.filter((h) => h.id !== existing.id));
      }
      return;
    }

    const { data, error } = await supabase
      .from('bible_highlights')
      .upsert(
        {
          user_id: userId,
          book_abbrev: selectedBookAbbrev,
          chapter: selectedChapter,
          verse: selectedVerse.verse,
          color,
        },
        { onConflict: 'user_id,book_abbrev,chapter,verse' }
      )
      .select('*')
      .single();

    if (error || !data) {
      onToast('Erro ao marcar versículo.');
      return;
    }

    const row = data as BibleHighlight;
    onHighlightsChange((prev) => {
      const idx = prev.findIndex((h) => h.id === row.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = row;
        return copy;
      }
      return [...prev.filter((h) => !(h.book_abbrev === row.book_abbrev && h.chapter === row.chapter && h.verse === row.verse)), row];
    });
  }

  async function copySelectedVerse() {
    if (!selectedVerse) return;
    const bookTitle = currentBook?.name || selectedBookAbbrev.toUpperCase();
    const formatted = `${bookTitle} ${selectedChapter}:${selectedVerse.verse} (NVI) — "${selectedVerse.text}"`;
    await navigator.clipboard.writeText(formatted).catch(() => {});
    onToast('Versículo copiado!');
  }

  async function saveVerseComment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVerse || !noteInput.trim()) return;
    const { data, error } = await supabase
      .from('bible_notes')
      .insert({
        user_id: userId,
        book_abbrev: selectedBookAbbrev,
        chapter: selectedChapter,
        verse: selectedVerse.verse,
        verse_text: selectedVerse.text,
        comment: noteInput.trim(),
      })
      .select('*')
      .single();

    if (error || !data) {
      onToast('Erro ao salvar comentário.');
      return;
    }
    onBibleNotesChange((prev) => [data as BibleNote, ...prev]);
    setNoteInput('');
    onToast('Comentário salvo!');
  }

  async function deleteBibleNote(id: string) {
    const { error } = await supabase.from('bible_notes').delete().eq('id', id);
    if (!error) {
      onBibleNotesChange((prev) => prev.filter((n) => n.id !== id));
      onToast('Comentário excluído.');
    }
  }

  const totalPct = Math.round((checkins.length / 365) * 100);

  return (
    <section className="dev-page">
      <div className="page-head">
        <div>
          <div className="eyebrow">CRESCIMENTO ESPIRITUAL · ALERTA 22H30</div>
          <h1>Devocional</h1>
          <p className="subtitle">
            Evangelhos primeiro, depois toda a Bíblia em cronologia · NVI offline.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="school-progress-pill">
            <span>{checkins.length}/365 dias</span>
            <strong>{totalPct}%</strong>
          </div>
          <button
            type="button"
            className="btn secondary small"
            onClick={() => loadBible(true)}
            disabled={loadingBible}
          >
            <Download size={13} />
            {bibleOfflineReady ? 'Bíblia Offline OK' : 'Baixar Bíblia'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="filter-row" style={{ marginBottom: 14 }}>
        <button
          type="button"
          className={`chip ${tab === 'plan' ? 'active' : ''}`}
          onClick={() => setTab('plan')}
        >
          Plano de leitura
        </button>
        <button
          type="button"
          className={`chip ${tab === 'bible' ? 'active' : ''}`}
          onClick={() => setTab('bible')}
        >
          Bíblia offline (NVI)
        </button>
        <button
          type="button"
          className={`chip ${tab === 'notes' ? 'active' : ''}`}
          onClick={() => setTab('notes')}
        >
          Meus comentários ({bibleNotes.length})
        </button>
      </div>

      {tab === 'plan' && (
        <div className="panel">
          <div className="panel-head" style={{ marginBottom: 10 }}>
            <div>
              <span className="tag prio-ok" style={{ marginBottom: 6, display: 'inline-block' }}>
                {dayPlan.phase}
              </span>
              <h2 style={{ fontSize: 17 }}>
                Dia {dayPlan.day} · {dayPlan.title}
              </h2>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                className="btn secondary small"
                disabled={selectedDay <= 1}
                onClick={() => setSelectedDay((d) => Math.max(1, d - 1))}
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                className="btn secondary small"
                disabled={selectedDay >= 365}
                onClick={() => setSelectedDay((d) => Math.min(365, d + 1))}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          <div className="lab-detail" style={{ marginBottom: 12 }}>
            <strong>Comentário do dia</strong>
            <p>{dayPlan.commentary}</p>
            <p style={{ marginTop: 6, color: 'var(--accent)', fontWeight: 600 }}>
              {dayPlan.focusQuestion}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {dayPlan.readings.map((r) => (
              <button
                key={`${r.bookAbbrev}-${r.startChapter}`}
                type="button"
                className="btn small"
                onClick={() => openReadingInBible(r.bookAbbrev, r.startChapter)}
              >
                <BookOpenCheck size={14} />
                Ler {r.bookName} {r.startChapter}
                {r.endChapter > r.startChapter ? `–${r.endChapter}` : ''}
              </button>
            ))}
          </div>

          {!isDayDone && (
            <div className="field" style={{ marginBottom: 10 }}>
              <label htmlFor="devReflect">
                O que Deus falou com você hoje? (opcional)
              </label>
              <textarea
                id="devReflect"
                rows={2}
                placeholder="Escreva uma frase de aplicação para o seu dia..."
                value={dayReflection}
                onChange={(e) => setDayReflection(e.target.value)}
              />
            </div>
          )}

          <button
            type="button"
            className={`btn ${isDayDone ? 'secondary' : ''}`}
            onClick={toggleDayCheckin}
          >
            <CheckCircle2 size={15} />
            {isDayDone
              ? `Leitura do Dia ${selectedDay} concluída ✓`
              : `Confirmar leitura do Dia ${selectedDay}`}
          </button>
        </div>
      )}

      {tab === 'bible' && (
        <div className="panel">
          <div className="dev-bible-controls">
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="bibleBook">Livro</label>
              <select
                id="bibleBook"
                value={selectedBookAbbrev}
                onChange={(e) => {
                  setSelectedBookAbbrev(e.target.value);
                  setSelectedChapter(1);
                  setSelectedVerse(null);
                }}
              >
                {(bibleData ?? []).map((b) => (
                  <option key={b.abbrev} value={b.abbrev}>
                    {b.name || b.abbrev.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="bibleChapter">Capítulo</label>
              <select
                id="bibleChapter"
                value={selectedChapter}
                onChange={(e) => {
                  setSelectedChapter(Number(e.target.value));
                  setSelectedVerse(null);
                }}
              >
                {Array.from(
                  { length: currentBook?.chapters.length ?? 1 },
                  (_, i) => i + 1
                ).map((ch) => (
                  <option key={ch} value={ch}>
                    Cap. {ch}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedVerse && (
            <div className="dev-verse-toolbar">
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                Versículo {selectedVerse.verse} selecionado:
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {HIGHLIGHT_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`dev-hl-btn hl-${c.id}`}
                    onClick={() => applyHighlight(c.id)}
                    title={`Marcar em ${c.label}`}
                  >
                    <Highlighter size={12} /> {c.label}
                  </button>
                ))}
                <button
                  type="button"
                  className="btn secondary small"
                  onClick={copySelectedVerse}
                >
                  <Copy size={12} /> Copiar
                </button>
              </div>
              <form onSubmit={saveVerseComment} className="lab-journal-form" style={{ marginBottom: 0 }}>
                <input
                  type="text"
                  placeholder="Adicionar comentário neste versículo..."
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                />
                <button type="submit" className="btn small">
                  <MessageSquarePlus size={13} /> Salvar
                </button>
              </form>
            </div>
          )}

          {loadingBible ? (
            <div className="empty">Carregando Bíblia NVI offline...</div>
          ) : (
            <div className="dev-verses-list">
              {currentChapterVerses.map((text, idx) => {
                const verseNum = idx + 1;
                const hl = chapterHighlights.find((h) => h.verse === verseNum);
                const hasNote = chapterNotes.some((n) => n.verse === verseNum);
                const isSelected = selectedVerse?.verse === verseNum;
                return (
                  <p
                    key={verseNum}
                    onClick={() =>
                      setSelectedVerse(
                        isSelected ? null : { verse: verseNum, text }
                      )
                    }
                    className={`dev-verse ${hl ? `hl-${hl.color}` : ''} ${
                      isSelected ? 'selected' : ''
                    }`}
                  >
                    <span className="dev-verse-num">{verseNum}</span>
                    {text}
                    {hasNote && (
                      <span className="dev-verse-note-dot" title="Tem comentário">
                        ✎
                      </span>
                    )}
                  </p>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'notes' && (
        <div className="panel">
          <div className="panel-head">
            <h2>Comentários e marcações</h2>
          </div>
          <div className="task-list">
            {bibleNotes.length ? (
              bibleNotes.map((n) => (
                <div key={n.id} className="task" style={{ cursor: 'default' }}>
                  <span className="prio-kind-dot">✎</span>
                  <div style={{ flex: 1 }}>
                    <div className="task-title" style={{ fontSize: 13 }}>
                      {n.book_abbrev.toUpperCase()} {n.chapter}:{n.verse} —{' '}
                      {n.comment}
                    </div>
                    {n.verse_text && (
                      <div className="task-meta" style={{ fontStyle: 'italic' }}>
                        &ldquo;{n.verse_text}&rdquo;
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="icon-mini-btn"
                    onClick={() => deleteBibleNote(n.id)}
                    title="Excluir"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            ) : (
              <div className="empty">
                Toque em qualquer versículo na Bíblia para marcar, copiar ou comentar.
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
