'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';
import { track } from '@/lib/analytics';

type Props = {
  amount: number;
  publicKey: string;
  maxInstallments: number;
  motorcycle: {
    id: string;
    brand: string;
    slug: string;
    name: string;
  };
};

type Buyer = { fullName: string; email: string; phone: string };

type BrickFormData = {
  token?: string;
  issuer_id?: string;
  payment_method_id?: string;
  transaction_amount?: number;
  installments?: number;
  payer?: {
    email?: string;
    identification?: { type?: string; number?: string };
  };
};

type BrickOnSubmitArg = {
  selectedPaymentMethod: string;
  formData: BrickFormData;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STORAGE_KEY = 'mp_buyer_v1';
let mpInitialized = false;

function isBuyerValid(b: Buyer): boolean {
  if (b.fullName.trim().length < 3) return false;
  if (!EMAIL_RE.test(b.email.trim())) return false;
  if (b.phone.replace(/\D/g, '').length < 10) return false;
  return true;
}

export function MercadoPagoCheckout({
  amount,
  publicKey,
  maxInstallments,
  motorcycle,
}: Props) {
  const router = useRouter();
  const [buyer, setBuyer] = useState<Buyer>({ fullName: '', email: '', phone: '' });
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Buyer>;
        setBuyer((prev) => ({
          fullName: parsed.fullName ?? prev.fullName,
          email: parsed.email ?? prev.email,
          phone: parsed.phone ?? prev.phone,
        }));
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!publicKey || mpInitialized) return;
    initMercadoPago(publicKey, { locale: 'es-MX' });
    mpInitialized = true;
  }, [publicKey]);

  const buyerValid = useMemo(() => isBuyerValid(buyer), [buyer]);

  const initialization = useMemo(
    () => ({
      amount,
      payer: { email: buyer.email },
    }),
    [amount, buyer.email]
  );

  const customization = useMemo(
    () => ({
      visual: { style: { theme: 'default' as const } },
      paymentMethods: {
        creditCard: 'all' as const,
        debitCard: 'all' as const,
        maxInstallments,
        minInstallments: 1,
      },
    }),
    [maxInstallments]
  );

  const onChange = (key: keyof Buyer) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setBuyer((prev) => {
      const next = { ...prev, [key]: e.target.value };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const onConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerValid) return;
    track('start_financing', {
      motorcycleId: motorcycle.id,
      provider: 'mercadopago',
      method: 'buyer_form_completed',
    });
    setConfirmed(true);
    setError(null);
  };

  if (!publicKey) {
    return (
      <div className="buyer-form-empty">
        <h3>Pago con Mercado Pago no disponible</h3>
        <p className="small muted">
          Falta configurar <code>NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY</code>. Define la
          credencial TEST-… en <code>.env.local</code> (o APP_USR-… en producción) y
          recarga la página.
        </p>
      </div>
    );
  }

  return (
    <div className="mp-checkout">
      {error ? (
        <div className="mp-checkout__error" role="alert">
          {error}
        </div>
      ) : null}

      {!confirmed ? (
        <form className="buyer-form" onSubmit={onConfirm} noValidate>
          <h3 className="buyer-form__title">Tus datos de contacto</h3>
          <p className="small muted buyer-form__hint">
            Uno de nuestros asesores te contactará para confirmar la compra y coordinar la entrega.
          </p>
          <label className="buyer-form__field">
            <span>Nombre completo</span>
            <input
              type="text"
              className="input"
              autoComplete="name"
              required
              minLength={3}
              value={buyer.fullName}
              onChange={onChange('fullName')}
              placeholder="Juan Pérez García"
            />
          </label>
          <label className="buyer-form__field">
            <span>Email</span>
            <input
              type="email"
              className="input"
              autoComplete="email"
              required
              value={buyer.email}
              onChange={onChange('email')}
              placeholder="tu@correo.com"
            />
          </label>
          <label className="buyer-form__field">
            <span>Teléfono / WhatsApp</span>
            <input
              type="tel"
              className="input"
              autoComplete="tel"
              required
              inputMode="numeric"
              value={buyer.phone}
              onChange={onChange('phone')}
              placeholder="55 1234 5678"
            />
          </label>
          <button
            type="submit"
            className="btn green full buyer-form__submit"
            disabled={!buyerValid}
          >
            Continuar al pago →
          </button>
        </form>
      ) : (
        <>
          <div className="buyer-summary">
            <div>
              <strong>{buyer.fullName}</strong>
              <span className="small muted">
                {buyer.email} · {buyer.phone}
              </span>
            </div>
            <button
              type="button"
              className="buyer-summary__edit"
              onClick={() => setConfirmed(false)}
            >
              Editar
            </button>
          </div>
          <Payment
            initialization={initialization}
            customization={customization}
            onSubmit={async ({ selectedPaymentMethod, formData }: BrickOnSubmitArg) => {
              setError(null);
              if (
                selectedPaymentMethod !== 'credit_card' &&
                selectedPaymentMethod !== 'debit_card'
              ) {
                const msg =
                  'Solo aceptamos tarjeta de crédito (hasta ' +
                  maxInstallments +
                  ' meses) o débito (1 pago).';
                setError(msg);
                throw new Error(msg);
              }

              track('start_financing', {
                motorcycleId: motorcycle.id,
                provider: 'mercadopago',
                method: selectedPaymentMethod,
                installments: formData.installments,
                amount,
              });

              const res = await fetch('/api/payments/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  formData,
                  selectedPaymentMethod,
                  motorcycle: { brand: motorcycle.brand, slug: motorcycle.slug },
                  buyer,
                }),
              });

              const json = (await res.json().catch(() => ({}))) as {
                ok?: boolean;
                id?: string | number;
                status?: string;
                status_detail?: string;
                error?: string;
              };

              if (!res.ok || !json.ok) {
                const msg = json.error || 'No pudimos procesar el pago. Intenta de nuevo.';
                setError(msg);
                throw new Error(msg);
              }

              const params = new URLSearchParams({
                payment_id: String(json.id ?? ''),
                status: String(json.status ?? ''),
                status_detail: String(json.status_detail ?? ''),
                motorcycle_id: motorcycle.id,
                motorcycle_brand: motorcycle.brand,
                motorcycle_slug: motorcycle.slug,
              });
              router.push(`/checkout/resultado?${params.toString()}`);
            }}
            onError={(err) => {
              console.error('[mercadopago] brick error:', err);
              setError(
                'Ocurrio un error con Mercado Pago. Verifica los datos e intenta otra vez.'
              );
            }}
            onReady={() => {
              track('view_product', { motorcycleId: motorcycle.id, brick: 'payment' });
            }}
          />
          <p className="small muted" style={{ marginTop: 12 }}>
            Aceptamos tarjeta de débito (1 pago) o crédito (hasta {maxInstallments} meses, con
            intereses fijados por tu banco). Procesado de forma segura por Mercado Pago.
          </p>
        </>
      )}
    </div>
  );
}
