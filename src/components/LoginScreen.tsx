'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BrandLogo } from './BrandLogo';

export function LoginScreen() {
  const router = useRouter();
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
          <div className="access-kicker">DOIS ADULTOS. MIL BOLETOS. UMA AGENDA.</div>
          <h1>
            A vida adulta
            <br />
            não veio com
            <br />
            manual.
          </h1>
          <p>
            Mas pelo menos agora tem uma agenda. Organize as tarefas, marque os
            compromissos e finja que está tudo sob controle — um dia de cada vez.
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
            <span>Café para começar</span>
          </div>
          <div className="preview-tile">
            <strong>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m5 12 4 4L19 6" />
              </svg>
            </strong>
            <span>Uma coisa de cada vez</span>
          </div>
          <div className="preview-tile">
            <strong>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 18h6M10 21h4M8.5 14.5a7 7 0 1 1 7 0c-.9.7-1.3 1.4-1.5 2.5h-4c-.2-1.1-.6-1.8-1.5-2.5Z" />
                <path d="M12 4v2M5.8 7l1.4 1M18.2 7l-1.4 1" />
              </svg>
            </strong>
            <span>Memória terceirizada</span>
          </div>
        </div>
        <div className="access-footer">
          MODO SOBREVIVÊNCIA · CENTRAL DE SOBREVIVÊNCIA
        </div>
      </section>

      <section className="access-form-side">
        <form className="access-form" onSubmit={handleSubmit}>
          <div className="eyebrow">CENTRAL DE COMANDO</div>
          <h2>Vamos sobreviver?</h2>
          <p className="intro">
            Digite seu nome e sua senha. A organização começa por algum lugar.
          </p>

          <div className="access-field">
            <label htmlFor="loginName">Seu nome</label>
            <input
              id="loginName"
              type="text"
              placeholder="Ex.: Leonardo ou Ana Gabriela"
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
            Cada um tem seu próprio espaço, suas tarefas e seus compromissos. Sem
            bisbilhotar a lista do outro.
          </div>
        </form>
      </section>
    </div>
  );
}

