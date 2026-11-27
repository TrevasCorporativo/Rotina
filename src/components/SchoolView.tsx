'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Lightbulb,
  PlayCircle,
  Timer,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { COURSES } from '@/lib/courses-data';
import type { CourseProgress } from '@/lib/types';

interface SchoolViewProps {
  userId: string;
  progress: CourseProgress[];
  onProgressChange: React.Dispatch<React.SetStateAction<CourseProgress[]>>;
  onToast: (msg: string) => void;
}

const PRACTICE_PROMPTS = [
  'Explique em 1 minuto por que o seu trabalho gera valor (use PREP).',
  'Conte uma história rápida de algo que você aprendeu recentemente.',
  'Apresente-se com firmeza como se estivesse entrando em uma reunião importante.',
  'Defenda uma ideia difícil com calma, pausas e sem dizer "né" ou "tipo".',
];

export function SchoolView({
  userId,
  progress,
  onProgressChange,
  onToast,
}: SchoolViewProps) {
  const supabase = createClient();
  const [courseId] = useState(COURSES[0].id);
  const course = useMemo(
    () => COURSES.find((c) => c.id === courseId) ?? COURSES[0],
    [courseId]
  );

  const [tab, setTab] = useState<'lessons' | 'tips' | 'practice'>('lessons');
  const [activeLessonId, setActiveLessonId] = useState(course.lessons[0].id);
  const activeLesson =
    course.lessons.find((l) => l.id === activeLessonId) ?? course.lessons[0];

  const currentProgress = progress.find(
    (p) => p.course_id === course.id && p.lesson_id === activeLesson.id
  );
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
  const lessonNotes = draftNotes[activeLesson.id] ?? currentProgress?.notes ?? '';
  const [savingNotes, setSavingNotes] = useState(false);

  // Practice timer
  const [practiceDuration, setPracticeDuration] = useState(60);
  const [practiceSeconds, setPracticeSeconds] = useState(60);
  const [practiceRunning, setPracticeRunning] = useState(false);
  const [promptIdx, setPromptIdx] = useState(0);

  useEffect(() => {
    if (!practiceRunning) return;
    const id = setInterval(() => {
      setPracticeSeconds((prev) => {
        if (prev <= 1) {
          setPracticeRunning(false);
          onToast('Treino concluído! Avalie suas pausas e clareza.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [practiceRunning, onToast]);

  const completedCount = course.lessons.filter((l) =>
    progress.some(
      (p) => p.course_id === course.id && p.lesson_id === l.id && p.completed
    )
  ).length;
  const pct = Math.round((completedCount / course.lessons.length) * 100);

  async function toggleLessonCompleted(lessonId: string) {
    const existing = progress.find(
      (p) => p.course_id === course.id && p.lesson_id === lessonId
    );
    const nextCompleted = !(existing?.completed ?? false);

    const { data, error } = await supabase
      .from('course_progress')
      .upsert(
        {
          user_id: userId,
          course_id: course.id,
          lesson_id: lessonId,
          completed: nextCompleted,
          notes: existing?.notes ?? '',
        },
        { onConflict: 'user_id,course_id,lesson_id' }
      )
      .select('*')
      .single();

    if (error || !data) {
      onToast('Erro ao salvar progresso da aula.');
      return;
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
    onToast(nextCompleted ? 'Aula concluída!' : 'Aula marcada como pendente.');
  }

  async function handleSaveNotes() {
    setSavingNotes(true);
    try {
      const existing = progress.find(
        (p) => p.course_id === course.id && p.lesson_id === activeLesson.id
      );
      const { data, error } = await supabase
        .from('course_progress')
        .upsert(
          {
            user_id: userId,
            course_id: course.id,
            lesson_id: activeLesson.id,
            completed: existing?.completed ?? false,
            notes: lessonNotes.trim(),
          },
          { onConflict: 'user_id,course_id,lesson_id' }
        )
        .select('*')
        .single();

      if (error || !data) {
        onToast('Erro ao salvar anotações da aula.');
        return;
      }
      const row = data as CourseProgress;
      onProgressChange((prev) => {
        const idx = prev.findIndex(
          (p) => p.course_id === course.id && p.lesson_id === activeLesson.id
        );
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = row;
          return copy;
        }
        return [...prev, row];
      });
      onToast('Anotações da aula salvas!');
    } finally {
      setSavingNotes(false);
    }
  }

  return (
    <section className="school-page">
      <div className="page-head">
        <div>
          <div className="eyebrow">DESENVOLVIMENTO PESSOAL</div>
          <h1>Escola</h1>
          <p className="subtitle">{course.title}</p>
        </div>
        <div className="school-progress-pill">
          <span>
            {completedCount}/{course.lessons.length} aulas
          </span>
          <strong>{pct}%</strong>
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
          Aulas em vídeo
        </button>
        <button
          type="button"
          className={`chip ${tab === 'tips' ? 'active' : ''}`}
          onClick={() => setTab('tips')}
        >
          <Lightbulb size={13} style={{ display: 'inline', marginRight: 5 }} />
          Dicas rápidas
        </button>
        <button
          type="button"
          className={`chip ${tab === 'practice' ? 'active' : ''}`}
          onClick={() => setTab('practice')}
        >
          <Timer size={13} style={{ display: 'inline', marginRight: 5 }} />
          Treino cronometrado
        </button>
      </div>

      {tab === 'lessons' && (
        <div className="school-layout">
          {/* Lesson selector list */}
          <div className="panel school-playlist" style={{ marginBottom: 0 }}>
            <div className="panel-head" style={{ marginBottom: 10 }}>
              <h2>Trilha do curso</h2>
              <BookOpen size={15} style={{ color: 'var(--accent)' }} />
            </div>
            <div className="school-lesson-list">
              {course.lessons.map((lesson) => {
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
                      <small className="muted" style={{ display: 'block', fontSize: 10.5 }}>
                        {lesson.module}
                      </small>
                      <strong style={{ fontSize: 13, display: 'block' }}>
                        {lesson.title}
                      </strong>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Video & Notes */}
          <div className="panel" style={{ marginBottom: 0, minWidth: 0 }}>
            <div className="panel-head" style={{ marginBottom: 10 }}>
              <div>
                <span className="tag prio-ok" style={{ marginBottom: 6, display: 'inline-block' }}>
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

            <div className="lab-detail" style={{ marginTop: 12 }}>
              <strong>Pontos-chave da aula</strong>
              <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 13, lineHeight: 1.6 }}>
                {activeLesson.summary.map((item) => (
                  <li key={item} style={{ marginBottom: 4 }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="lab-detail">
              <strong>Exercício prático</strong>
              <p>{activeLesson.exercise}</p>
            </div>

            <div className="field" style={{ marginTop: 12, marginBottom: 8 }}>
              <label htmlFor="lessonNotes">Suas anotações desta aula</label>
              <textarea
                id="lessonNotes"
                rows={3}
                placeholder="Anote insights, frases para treinar ou pontos a melhorar..."
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

      {tab === 'tips' && (
        <div className="lab-grid">
          {course.quickTips.map((tip) => (
            <div key={tip.id} className="panel" style={{ marginBottom: 0 }}>
              <span className="tag prio-ok" style={{ marginBottom: 8, display: 'inline-block' }}>
                {tip.category}
              </span>
              <h2 style={{ fontSize: 15, margin: '0 0 6px' }}>{tip.title}</h2>
              <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>
                {tip.description}
              </p>
            </div>
          ))}
        </div>
      )}

      {tab === 'practice' && (
        <div className="panel" style={{ maxWidth: 580 }}>
          <div className="panel-head">
            <h2>Treino de fala em voz alta</h2>
            <button
              type="button"
              className="btn secondary small"
              onClick={() => setPromptIdx((i) => (i + 1) % PRACTICE_PROMPTS.length)}
            >
              Outro tema
            </button>
          </div>

          <div className="lab-detail" style={{ marginBottom: 14 }}>
            <strong>Desafio de agora</strong>
            <p>{PRACTICE_PROMPTS[promptIdx]}</p>
          </div>

          <div className="school-timer-box">
            <strong>{practiceSeconds}s</strong>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[30, 60, 120].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  className={`chip ${practiceDuration === sec ? 'active' : ''}`}
                  onClick={() => {
                    setPracticeRunning(false);
                    setPracticeDuration(sec);
                    setPracticeSeconds(sec);
                  }}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              type="button"
              className="btn"
              onClick={() => setPracticeRunning((r) => !r)}
            >
              {practiceRunning ? 'Pausar' : 'Iniciar fala'}
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                setPracticeRunning(false);
                setPracticeSeconds(practiceDuration);
              }}
            >
              Reiniciar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
