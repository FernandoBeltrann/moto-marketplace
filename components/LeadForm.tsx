'use client';

import { useState } from 'react';
import { track } from '@/lib/analytics';

const cities = ['CDMX', 'Estado de México', 'Toluca', 'Puebla', 'Querétaro', 'Cuernavaca', 'Otra ciudad'];

export function LeadForm({ motorcycleId, motorcycleName }: { motorcycleId: string; motorcycleName: string }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('loading');
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    track('submit_lead', { motorcycleId, motorcycleName });
    const res = await fetch('/api/leads', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, motorcycleId, motorcycleName, path: window.location.pathname, utm: Object.fromEntries(new URLSearchParams(window.location.search)) })
    });
    setStatus(res.ok ? 'sent' : 'error');
  }

  if (status === 'sent') return <div className="notice">Listo. Recibimos tu solicitud en el CRM de Finva. Un agente te contactará para validar disponibilidad y opciones de financiamiento.</div>;

  return (
    <form className="lead-form" onSubmit={submit}>
      <input className="input" required name="name" placeholder="Nombre" />
      <input className="input" required name="phone" placeholder="WhatsApp" />
      <select className="select" name="city" defaultValue="">
        <option value="" disabled>Ciudad</option>
        {cities.map((city) => <option key={city}>{city}</option>)}
      </select>
      <select className="select" name="purchaseTiming" defaultValue="">
        <option value="" disabled>¿Cuándo quieres comprar?</option>
        <option>Esta semana</option><option>Este mes</option><option>Estoy comparando</option>
      </select>
      <button className="btn green full" disabled={status === 'loading'}>{status === 'loading' ? 'Enviando...' : 'Iniciar compra con un agente'}</button>
      {status === 'error' && <p className="small" style={{ color: 'crimson' }}>No se pudo enviar. Inténtalo otra vez.</p>}
    </form>
  );
}
