'use client';

import { useMemo, useRef, useState } from 'react';
import { ImagePlus, Pin, Search, Trash2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { compressImageFile } from '@/lib/image-utils';
import type { Note } from '@/lib/types';

interface NotesViewProps {
  userId: string;
  notes: Note[];
  onNotesChange: React.Dispatch<React.SetStateAction<Note[]>>;
  onToast: (msg: string) => void;
}

const NOTE_CATEGORIES = ['Geral', 'Trabalho', 'Ideias', 'Compras', 'Pessoal'];

export function NotesView({
  userId,
  notes,
  onNotesChange,
  onToast,
}: NotesViewProps) {
  const supabase = createClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('Todas');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ title: string; url: string } | null>(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Geral');
  const [pinned, setPinned] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...notes]
      .filter((n) => {
        if (categoryFilter === 'Fixadas' && !n.pinned) return false;
        if (
          categoryFilter !== 'Todas' &&
          categoryFilter !== 'Fixadas' &&
          n.category !== categoryFilter
        ) {
          return false;
        }
        if (!q) return true;
        return (
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.category.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return b.created_at.localeCompare(a.created_at);
      });
  }, [notes, search, categoryFilter]);

  function openCreate() {
    setEditingNote(null);
    setTitle('');
    setContent('');
    setCategory('Geral');
    setPinned(false);
    setImageUrl(null);
    setModalOpen(true);
  }

  function openEdit(note: Note) {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content);
    setCategory(note.category || 'Geral');
    setPinned(note.pinned);
    setImageUrl(note.image_url);
    setModalOpen(true);
  }

  async function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      setImageUrl(compressed);
    } catch {
      onToast('Não foi possível carregar essa imagem.');
    } finally {
      e.target.value = '';
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const cleanTitle = title.trim() || (imageUrl ? 'Anotação com foto' : '');
    if (!cleanTitle) {
      onToast('Digite um título ou conteúdo para a anotação.');
      return;
    }
    setSaving(true);
    try {
      if (editingNote) {
        const { data, error } = await supabase
          .from('notes')
          .update({
            title: cleanTitle,
            content: content.trim(),
            category,
            pinned,
            image_url: imageUrl,
          })
          .eq('id', editingNote.id)
          .select('*')
          .single();

        if (error || !data) {
          onToast('Erro ao atualizar anotação.');
          return;
        }
        onNotesChange((prev) =>
          prev.map((n) => (n.id === editingNote.id ? (data as Note) : n))
        );
        onToast('Anotação atualizada!');
      } else {
        const { data, error } = await supabase
          .from('notes')
          .insert({
            user_id: userId,
            title: cleanTitle,
            content: content.trim(),
            category,
            pinned,
            image_url: imageUrl,
          })
          .select('*')
          .single();

        if (error || !data) {
          onToast('Erro ao salvar anotação. Verifique se a tabela notes existe no banco.');
          return;
        }
        onNotesChange((prev) => [data as Note, ...prev]);
        onToast('Anotação salva!');
      }
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function togglePin(note: Note) {
    const nextPinned = !note.pinned;
    onNotesChange((prev) =>
      prev.map((n) => (n.id === note.id ? { ...n, pinned: nextPinned } : n))
    );
    const { error } = await supabase
      .from('notes')
      .update({ pinned: nextPinned })
      .eq('id', note.id);
    if (error) {
      onNotesChange((prev) =>
        prev.map((n) => (n.id === note.id ? { ...n, pinned: !nextPinned } : n))
      );
      onToast('Erro ao fixar anotação.');
    }
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) {
      onToast('Erro ao excluir anotação.');
      return;
    }
    onNotesChange((prev) => prev.filter((n) => n.id !== id));
    onToast('Anotação excluída');
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <div className="eyebrow">IDEIAS, RECORTES E LEMBRETES</div>
          <h1>Anotações</h1>
          <p className="subtitle">
            Guarde notas rápidas, listas e fotos importantes em um só lugar.
          </p>
        </div>
        <button className="btn dashboard-head-btn" onClick={openCreate}>
          ＋ Nova anotação
        </button>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
            background: 'var(--bg-elev)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '8px 12px',
          }}
        >
          <Search size={15} className="muted" />
          <input
            type="text"
            placeholder="Buscar nas anotações..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              width: '100%',
              color: 'var(--text)',
              fontSize: 13,
            }}
          />
        </div>

        <div className="filter-row" style={{ marginBottom: 0 }}>
          {['Todas', 'Fixadas', ...NOTE_CATEGORIES].map((cat) => (
            <button
              key={cat}
              type="button"
              className={`chip ${categoryFilter === cat ? 'active' : ''}`}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {filteredNotes.length ? (
        <div className="notes-grid">
          {filteredNotes.map((note) => (
            <div key={note.id} className={`panel note-card ${note.pinned ? 'pinned' : ''}`}>
              <div className="note-card-head">
                <span className="tag medium">{note.category}</span>
                <div className="note-card-actions">
                  <button
                    type="button"
                    className={`icon-mini-btn ${note.pinned ? 'active' : ''}`}
                    title={note.pinned ? 'Desafixar' : 'Fixar'}
                    onClick={() => togglePin(note)}
                  >
                    <Pin size={14} />
                  </button>
                  <button
                    type="button"
                    className="icon-mini-btn"
                    title="Editar"
                    onClick={() => openEdit(note)}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className="icon-mini-btn"
                    title="Excluir"
                    onClick={() => handleDelete(note.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <h3 className="note-title" onClick={() => openEdit(note)}>
                {note.title}
              </h3>

              {note.content && (
                <p className="note-content" onClick={() => openEdit(note)}>
                  {note.content}
                </p>
              )}

              {note.image_url && (
                <button
                  type="button"
                  className="note-photo-btn"
                  onClick={() =>
                    setLightboxImage({ title: note.title, url: note.image_url! })
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={note.image_url} alt={note.title} className="note-photo-img" />
                </button>
              )}

              <div className="note-footer">
                {new Date(note.created_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="panel">
          <div className="empty">
            Nenhuma anotação por aqui. Crie uma nova ou peça para o Severino anotar!
          </div>
        </div>
      )}

      {modalOpen && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div className="modal">
            <div className="modal-head">
              <h2>{editingNote ? 'Editar anotação' : 'Nova anotação'}</h2>
              <button
                type="button"
                className="close"
                onClick={() => setModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSave}>
              <label>
                Título
                <input
                  type="text"
                  placeholder="Ex: Lista de compras, Ideia pro projeto..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>

              <label>
                Conteúdo
                <textarea
                  rows={4}
                  placeholder="Escreva os detalhes aqui..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  style={{
                    width: '100%',
                    resize: 'vertical',
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-elev)',
                    color: 'var(--text)',
                    fontFamily: 'inherit',
                    fontSize: 13,
                    marginTop: 6,
                  }}
                />
              </label>

              <div className="form-row">
                <label>
                  Categoria
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {NOTE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 22,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    className="check"
                    checked={pinned}
                    onChange={(e) => setPinned(e.target.checked)}
                  />
                  Fixar no topo
                </label>
              </div>

              <div style={{ marginTop: 12 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleImagePick}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    type="button"
                    className="btn secondary small"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImagePlus size={14} style={{ marginRight: 6 }} />
                    {imageUrl ? 'Trocar foto' : 'Anexar foto'}
                  </button>
                  {imageUrl && (
                    <button
                      type="button"
                      className="btn secondary small"
                      onClick={() => setImageUrl(null)}
                    >
                      <X size={14} style={{ marginRight: 4 }} />
                      Remover foto
                    </button>
                  )}
                </div>
                {imageUrl && (
                  <div style={{ marginTop: 10 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt="Pré-visualização"
                      style={{
                        maxHeight: 180,
                        width: '100%',
                        objectFit: 'cover',
                        borderRadius: 12,
                        border: '1px solid var(--border)',
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn" disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar anotação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {lightboxImage && (
        <div
          className="modal-backdrop"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="modal"
            style={{ maxWidth: 640, padding: 14 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head" style={{ marginBottom: 10 }}>
              <h2 style={{ fontSize: 15 }}>{lightboxImage.title}</h2>
              <button
                type="button"
                className="close"
                onClick={() => setLightboxImage(null)}
              >
                ✕
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxImage.url}
              alt={lightboxImage.title}
              style={{
                width: '100%',
                maxHeight: '75vh',
                objectFit: 'contain',
                borderRadius: 12,
              }}
            />
          </div>
        </div>
      )}
    </section>
  );
}

