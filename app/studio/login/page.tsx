'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/studio';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/cms/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'No se pudo iniciar sesión.');
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError('Error de red. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f7' }}>
      <form
        onSubmit={onSubmit}
        style={{ background: '#fff', padding: 32, borderRadius: 12, width: 340, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
      >
        <h1 style={{ fontSize: 18, marginBottom: 4 }}>Studio · MotoClick</h1>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 20 }}>Acceso para el equipo de marketing / edición de contenido.</p>

        <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: '100%', padding: '8px 10px', marginBottom: 12, border: '1px solid #ddd', borderRadius: 6 }}
        />

        <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Contraseña</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: '100%', padding: '8px 10px', marginBottom: 16, border: '1px solid #ddd', borderRadius: 6 }}
        />

        {error && <p style={{ color: '#c0392b', fontSize: 13, marginBottom: 12 }}>{error}</p>}

        <button
          type="submit"
          disabled={busy}
          style={{ width: '100%', padding: '10px 0', background: '#111', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
        >
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}

export default function StudioLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
