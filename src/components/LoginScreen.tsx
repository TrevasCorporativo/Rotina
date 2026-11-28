'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { BrandLogo } from './BrandLogo';

export function LoginScreen() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Não foi possível entrar.');
        setLoading(false);
        return;
      }

      router.refresh();
    } catch {
      setError('Erro de conexão. Tente novamente.');
      setLoading(false);
    }
  }

  return (
    <div className="access-screen">
      <section className="access-showcase">
        <div className="access-brand">
          <BrandLogo variant="light" size={38} /> Modo Sobrevivência
        </div>
        <div className="access-message">
          <div className="access-kicker">ESPAÇO PESSOAL DE LEONARDO</div>
          <h1>
            Disciplina no secreto.
            <br />
            Clareza na mente.
            <br />
            Fé na caminhada.
          </h1>
          <p>
            Seu centro diário para organizar a rotina, fortalecer o caráter, estudar
            a Palavra e construir um dia de cada vez com propósito.
          </p>
        </div>
        <div className="access-preview">
          <div className="preview-tile">
            <strong>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 8h12v8a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8Z" />
                <path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 4v2M12 3v3M16 4v2" />
              </svg>
            </strong>
            <span>Constância diária</span>
          </div>
          <div className="preview-tile">
            <strong>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m5 12 4 4L19 6" />
              </svg>
            </strong>
            <span>Mente limpa e firme</span>
          </div>
          <div className="preview-tile">
            <strong>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 18h6M10 21h4M8.5 14.5a7 7 0 1 1 7 0c-.9.7-1.3 1.4-1.5 2.5h-4c-.2-1.1-.6-1.8-1.5-2.5Z" />
                <path d="M12 4v2M5.8 7l1.4 1M18.2 7l-1.4 1" />
              </svg>
            </strong>
            <span>Propósito e direção</span>
          </div>
        </div>
        <div className="access-footer">
          LEONARDO · ROTINA, FÉ E DOMÍNIO PRÓPRIO
        </div>
      </section>

      <section className="access-form-side">
        <button
          type="button"
          className="theme-toggle access-theme-btn"
          onClick={toggleTheme}
          aria-label="Alternar tema"
        >
          {theme === 'dark' ? (
            <>
              <Sun size={15} strokeWidth={2.1} /> Claro
            </>
          ) : (
            <>
              <Moon size={15} strokeWidth={2.1} /> Escuro
            </>
          )}
        </button>
        <form className="access-form" onSubmit={handleSubmit}>
          <div className="eyebrow">BEM-VINDO DE VOLTA</div>
          <h2>Pronto para vencer hoje?</h2>
          <p className="intro">
            Entre no seu espaço pessoal. Cada escolha de hoje constrói o homem que você
            quer ser.
          </p>

          <div className="access-field">
            <label htmlFor="loginName">Seu nome</label>
            <input
              id="loginName"
              type="text"
              placeholder="Ex.: Leonardo"
              autoComplete="username"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="access-field">
            <label htmlFor="loginPassword">Sua senha</label>
            <div className="password-wrap">
              <input
                id="loginPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="Digite sua senha"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                className="show-pass"
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label="Mostrar senha"
              >
                {showPassword ? '◎' : '◉'}
              </button>
            </div>
          </div>

          <button className="access-submit" type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'} <span style={{ marginLeft: 7 }}>→</span>
          </button>

          <div className="access-error" role="alert">
            {error}
          </div>

          <div className="access-hint">
            &ldquo;Tudo o que fizerem, façam de todo o coração, como para o Senhor.&rdquo;
            — Colossenses 3:23
          </div>
        </form>
      </section>
    </div>
  );
}

