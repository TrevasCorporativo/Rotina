'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Lightbulb,
  PlayCircle,
  Sparkles,
  Timer,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { COURSES, GENERATED_ACTIVITIES } from '@/lib/courses-data';
import type { CourseProgress } from '@/lib/types';

interface SchoolViewProps {
  userId: string;
  progress: CourseProgress[];
  onProgressChange: React.Dispatch<React.SetStateAction<CourseProgress[]>>;
  onToast: (msg: string) => void;
}

export function SchoolView({
  userId,
  progress,
  onProgressChange,
  onToast,
}: SchoolViewProps) {
  const supabase = createClient();
  const [courseId, setCourseId] = useState(COURSES[0].id);
  const course = useMemo(
    () => COURSES.find((c) => c.id === courseId) ?? COURSES[0],
    [courseId]
  );

  const [tab, setTab] = useState<'lessons' | 'tips' | 'practice' | 'vocab'>(
    'lessons'
  );
  const [lessonFilter, setLessonFilter] = useState<'all' | 'pending' | 'done'>(
    'all'
  );
  const [activeLessonId, setActiveLessonId] = useState(course.lessons[0].id);

  const activeLesson =
    course.lessons.find((l) => l.id === activeLessonId) ?? course.lessons[0];

  const currentProgress = progress.find(
    (p) => p.course_id === course.id && p.lesson_id === activeLesson.id
  );
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
  const lessonNotes = draftNotes[activeLesson.id] ?? currentProgress?.notes ?? '';
  const checkedItems = currentProgress?.checklist_done ?? [];
  const [savingNotes, setSavingNotes] = useState(false);

  // Activity generator + timer
  const [activityIdx, setActivityIdx] = useState(0);
  const activeActivity =
    GENERATED_ACTIVITIES[activityIdx % GENERATED_ACTIVITIES.length];
  const [practiceSeconds, setPracticeSeconds] = useState(
    GENERATED_ACTIVITIES[0].durationSec
  );
  const [practiceRunning, setPracticeRunning] = useState(false);

  useEffect(() => {
    if (!practiceRunning) return;
    const id = setInterval(() => {
      setPracticeSeconds((prev) => {
        if (prev <= 1) {
          setPracticeRunning(false);
          onToast('Atividade concluída! Avalie sua clareza e postura.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [practiceRunning, onToast]);

  const totalAllLessons = useMemo(
    () => COURSES.reduce((acc, c) => acc + c.lessons.length, 0),
    []
  );
  const totalCompletedAll = useMemo(
    () =>
      COURSES.reduce(
        (acc, c) =>
          acc +
          c.lessons.filter((l) =>
            progress.some(
              (p) => p.course_id === c.id && p.lesson_id === l.id && p.completed
            )
          ).length,
        0
      ),
    [progress]
  );

  const courseCompletedCount = course.lessons.filter((l) =>
    progress.some(
      (p) => p.course_id === course.id && p.lesson_id === l.id && p.completed
    )
  ).length;
  const coursePendingCount = course.lessons.length - courseCompletedCount;
  const coursePct = Math.round(
    (courseCompletedCount / course.lessons.length) * 100
  );

  const filteredLessons = course.lessons.filter((l) => {
    const isDone = progress.some(
      (p) => p.course_id === course.id && p.lesson_id === l.id && p.completed
    );
    if (lessonFilter === 'done') return isDone;
    if (lessonFilter === 'pending') return !isDone;
    return true;
  });

  function selectCourse(nextId: string) {
    const nextCourse = COURSES.find((c) => c.id === nextId) ?? COURSES[0];
    setCourseId(nextId);
    setActiveLessonId(nextCourse.lessons[0].id);
    if (tab === 'vocab' && !nextCourse.vocabulary?.length) {
      setTab('lessons');
    }
  }

  async function upsertProgress(
    lessonId: string,
    patch: { completed?: boolean; notes?: string; checklist_done?: string[] }
  ) {
    const existing = progress.find(
      (p) => p.course_id === course.id && p.lesson_id === lessonId
    );
    const { data, error } = await supabase
      .from('course_progress')
      .upsert(
        {
          user_id: userId,
          course_id: course.id,
          lesson_id: lessonId,
          completed: patch.completed ?? existing?.completed ?? false,
          notes: patch.notes ?? existing?.notes ?? '',
          checklist_done: patch.checklist_done ?? existing?.checklist_done ?? [],
        },
        { onConflict: 'user_id,course_id,lesson_id' }
      )
      .select('*')
      .single();

    if (error || !data) {
      onToast('Erro ao salvar progresso da aula.');
      return null;
    }

    const row = data as CourseProgress;
    onProgressChange((prev) => {
      const idx = prev.findIndex(
        (p) => p.course_id === course.id && p.lesson_id === lessonId
      );
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = row;
        return copy;
      }
      return [...prev, row];
    });
    return row;
  }

  async function toggleLessonCompleted(lessonId: string) {
    const existing = progress.find(
      (p) => p.course_id === course.id && p.lesson_id === lessonId
    );
    const nextCompleted = !(existing?.completed ?? false);
    const row = await upsertProgress(lessonId, { completed: nextCompleted });
    if (row) {
      onToast(nextCompleted ? 'Aula concluída!' : 'Aula marcada como pendente.');
    }
  }

  async function toggleChecklistItem(item: string) {
    const nextList = checkedItems.includes(item)
      ? checkedItems.filter((x) => x !== item)
      : [...checkedItems, item];
    await upsertProgress(activeLesson.id, { checklist_done: nextList });
  }

  async function handleSaveNotes() {
    setSavingNotes(true);
    try {
      const row = await upsertProgress(activeLesson.id, {
        notes: lessonNotes.trim(),
      });
      if (row) onToast('Anotações da aula salvas!');
    } finally {
      setSavingNotes(false);
    }
  }

  function generateNextActivity() {
    const nextIdx = (activityIdx + 1) % GENERATED_ACTIVITIES.length;
    setActivityIdx(nextIdx);
    setPracticeRunning(false);
    setPracticeSeconds(GENERATED_ACTIVITIES[nextIdx].durationSec);
  }

  return (
    <section className="school-page">
      <div className="page-head">
        <div>
          <div className="eyebrow">DESENVOLVIMENTO PESSOAL</div>
          <h1>Escola</h1>
          <p className="subtitle">
            {totalCompletedAll}/{totalAllLessons} aulas concluídas no total ·{' '}
            {totalAllLessons - totalCompletedAll} pendentes
          </p>
        </div>
        <div className="school-progress-pill">
          <span>
            {courseCompletedCount}/{course.lessons.length} neste curso
          </span>
          <strong>{coursePct}%</strong>
        </div>
      </div>

      {/* Course Selector Cards */}
      <div className="school-courses-bar">
        {COURSES.map((c) => {
          const done = c.lessons.filter((l) =>
            progress.some(
              (p) => p.course_id === c.id && p.lesson_id === l.id && p.completed
            )
          ).length;
          const pct = Math.round((done / c.lessons.length) * 100);
          return (
            <button
              key={c.id}
              type="button"
              className={`school-course-chip ${c.id === course.id ? 'active' : ''}`}
              onClick={() => selectCourse(c.id)}
            >
              <strong>{c.shortTitle}</strong>
              <small>
                {done}/{c.lessons.length} ({pct}%)
              </small>
            </button>
          );
        })}
      </div>

      {/* Course Progress Summary */}
      <div className="panel" style={{ padding: '12px 14px', marginBottom: 14 }}>
        <div className="progress-label" style={{ marginBottom: 6 }}>
          <span>
            <strong>{course.title}</strong> · {courseCompletedCount} feitas ·{' '}
            {coursePendingCount} restantes
          </span>
          <strong>{coursePct}%</strong>
        </div>
        <div className="progress">
          <span style={{ width: `${coursePct}%` }} />
        </div>
      </div>

      {/* Tabs */}
      <div className="filter-row" style={{ marginBottom: 14 }}>
        <button
          type="button"
          className={`chip ${tab === 'lessons' ? 'active' : ''}`}
          onClick={() => setTab('lessons')}
        >
          <PlayCircle size={13} style={{ display: 'inline', marginRight: 5 }} />
          Aulas ({course.lessons.length})
        </button>
        {course.vocabulary && course.vocabulary.length > 0 && (
          <button
            type="button"
            className={`chip ${tab === 'vocab' ? 'active' : ''}`}
            onClick={() => setTab('vocab')}
          >
            <BookOpen size={13} style={{ display: 'inline', marginRight: 5 }} />
            Palavras novas ({course.vocabulary.length})
          </button>
        )}
        <button
          type="button"
          className={`chip ${tab === 'tips' ? 'active' : ''}`}
          onClick={() => setTab('tips')}
        >
          <Lightbulb size={13} style={{ display: 'inline', marginRight: 5 }} />
          Dicas ({course.quickTips.length})
        </button>
        <button
          type="button"
          className={`chip ${tab === 'practice' ? 'active' : ''}`}
          onClick={() => setTab('practice')}
        >
          <Timer size={13} style={{ display: 'inline', marginRight: 5 }} />
          Gerar atividade
        </button>
      </div>

      {tab === 'lessons' && (
        <div className="school-layout">
          {/* Lesson selector list */}
          <div className="panel school-playlist" style={{ marginBottom: 0 }}>
            <div className="panel-head" style={{ marginBottom: 8 }}>
              <h2>Aulas</h2>
              <div style={{ display: 'flex', gap: 4 }}>
                {(['all', 'pending', 'done'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={`chip ${lessonFilter === f ? 'active' : ''}`}
                    style={{ padding: '4px 8px', fontSize: 11 }}
                    onClick={() => setLessonFilter(f)}
                  >
                    {f === 'all' ? 'Todas' : f === 'pending' ? 'Faltam' : 'Feitas'}
                  </button>
                ))}
              </div>
            </div>
            <div className="school-lesson-list">
              {filteredLessons.length ? (
                filteredLessons.map((lesson) => {
                  const isDone = progress.some(
                    (p) =>
                      p.course_id === course.id &&
                      p.lesson_id === lesson.id &&
                      p.completed
                  );
                  const isActive = lesson.id === activeLesson.id;
                  return (
                    <button
                      key={lesson.id}
                      type="button"
                      className={`school-lesson-item ${isActive ? 'active' : ''}`}
                      onClick={() => setActiveLessonId(lesson.id)}
                    >
                      <span className={`prio-kind-dot ${isDone ? '' : 'prio-type'}`}>
                        {isDone ? '✓' : '▶'}
                      </span>
                      <div style={{ textAlign: 'left', minWidth: 0, flex: 1 }}>
                        <small
                          className="muted"
                          style={{ display: 'block', fontSize: 10.5 }}
                        >
                          {lesson.module}
                        </small>
                        <strong style={{ fontSize: 13, display: 'block' }}>
                          {lesson.title}
                        </strong>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="empty">Nenhuma aula neste filtro.</div>
              )}
            </div>
          </div>

          {/* Active Video, Checklist & Notes */}
          <div className="panel" style={{ marginBottom: 0, minWidth: 0 }}>
            <div className="panel-head" style={{ marginBottom: 10 }}>
              <div>
                <span
                  className="tag prio-ok"
                  style={{ marginBottom: 6, display: 'inline-block' }}
                >
                  {activeLesson.module}
                </span>
                <h2 style={{ fontSize: 17 }}>{activeLesson.title}</h2>
              </div>
              <button
                type="button"
                className={`btn small ${
                  currentProgress?.completed ? 'secondary' : ''
                }`}
                onClick={() => toggleLessonCompleted(activeLesson.id)}
              >
                <CheckCircle2 size={14} />
                {currentProgress?.completed ? 'Concluída' : 'Concluir aula'}
              </button>
            </div>

            <div className="school-video-wrap">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${activeLesson.youtubeId}`}
                title={activeLesson.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <a
                href={`https://www.youtube.com/watch?v=${activeLesson.youtubeId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="muted"
                style={{
                  fontSize: 12,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  textDecoration: 'none',
                }}
              >
                Abrir no YouTube <ExternalLink size={12} />
              </a>
            </div>

            {/* Interactive Checklist */}
            <div className="lab-detail" style={{ marginTop: 12 }}>
              <strong>Checklist prático desta aula</strong>
              {activeLesson.checklist.map((item) => {
                const checked = checkedItems.includes(item);
                return (
                  <label
                    key={item}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 12.5,
                      marginTop: 7,
                      cursor: 'pointer',
                      textDecoration: checked ? 'line-through' : 'none',
                      opacity: checked ? 0.65 : 1,
                    }}
                  >
                    <input
                      type="checkbox"
                      className="check"
                      checked={checked}
                      onChange={() => toggleChecklistItem(item)}
                    />
                    {item}
                  </label>
                );
              })}
            </div>

            <div className="lab-detail">
              <strong>Pontos-chave</strong>
              <ul
                style={{
                  margin: '6px 0 0',
                  paddingLeft: 18,
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                {activeLesson.summary.map((item) => (
                  <li key={item} style={{ marginBottom: 4 }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="lab-detail">
              <strong>Atividade do dia</strong>
              <p>{activeLesson.exercise}</p>
            </div>

            <div className="field" style={{ marginTop: 12, marginBottom: 8 }}>
              <label htmlFor="lessonNotes">Suas anotações desta aula</label>
              <textarea
                id="lessonNotes"
                rows={3}
                placeholder="Anote frases novas, insights ou pontos a melhorar..."
                value={lessonNotes}
                onChange={(e) =>
                  setDraftNotes((prev) => ({
                    ...prev,
                    [activeLesson.id]: e.target.value,
                  }))
                }
              />
            </div>
            <button
              type="button"
              className="btn secondary small"
              disabled={savingNotes}
              onClick={handleSaveNotes}
            >
              {savingNotes ? 'Salvando...' : 'Salvar anotações'}
            </button>
          </div>
        </div>
      )}

      {tab === 'vocab' && course.vocabulary && (
        <div className="lab-grid">
          {course.vocabulary.map((v) => (
            <div key={v.word} className="panel" style={{ marginBottom: 0 }}>
              <div className="panel-head" style={{ marginBottom: 6 }}>
                <h2 style={{ fontSize: 16, color: 'var(--accent)' }}>{v.word}</h2>
                <span className="tag prio-type">Troca: {v.replaces}</span>
              </div>
              <p style={{ margin: '0 0 8px', fontSize: 13, lineHeight: 1.55 }}>
                {v.meaning}
              </p>
              <div className="lab-detail" style={{ marginBottom: 0 }}>
                <strong>Exemplo para usar hoje</strong>
                <p>&ldquo;{v.example}&rdquo;</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'tips' && (
        <div className="lab-grid">
          {course.quickTips.map((tip) => (
            <div key={tip.id} className="panel" style={{ marginBottom: 0 }}>
              <span
                className="tag prio-ok"
                style={{ marginBottom: 8, display: 'inline-block' }}
              >
                {tip.category}
              </span>
              <h2 style={{ fontSize: 15, margin: '0 0 6px' }}>{tip.title}</h2>
              <p
                className="muted"
                style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}
              >
                {tip.description}
              </p>
            </div>
          ))}
        </div>
      )}

      {tab === 'practice' && (
        <div className="panel" style={{ maxWidth: 600 }}>
          <div className="panel-head">
            <div>
              <span
                className="tag prio-ok"
                style={{ marginBottom: 6, display: 'inline-block' }}
              >
                {activeActivity.area}
              </span>
              <h2>{activeActivity.title}</h2>
            </div>
            <button
              type="button"
              className="btn secondary small"
              onClick={generateNextActivity}
            >
              <Sparkles size={13} />
              Gerar outra atividade
            </button>
          </div>

          <div className="lab-detail" style={{ marginBottom: 14 }}>
            <strong>Passo a passo</strong>
            <ol
              style={{
                margin: '6px 0 0',
                paddingLeft: 18,
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              {activeActivity.steps.map((s) => (
                <li key={s} style={{ marginBottom: 4 }}>
                  {s}
                </li>
              ))}
            </ol>
          </div>

          <div className="school-timer-box">
            <strong>{practiceSeconds}s</strong>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn"
                onClick={() => setPracticeRunning((r) => !r)}
              >
                {practiceRunning ? 'Pausar' : 'Iniciar atividade'}
              </button>
              <button
                type="button"
                className="btn secondary"
                onClick={() => {
                  setPracticeRunning(false);
                  setPracticeSeconds(activeActivity.durationSec);
                }}
              >
                Reiniciar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
