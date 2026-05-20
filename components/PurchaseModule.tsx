'use client';

import { useState, type ReactNode } from 'react';
import { CreditApplicationShell } from '@/components/credit-application/CreditApplicationShell';
import { MercadoPagoCheckout } from '@/components/MercadoPagoCheckout';
import { formatMXN } from '@/lib/catalog-format';
import { track } from '@/lib/analytics';

type Tab = 'financing' | 'card';

type Props = {
  /** Precio de contado para mostrar en el calculador y `invoice_motorcycle_value`. */
  price: number;
  /** Precio cobrado al pagar con tarjeta (precio + comisión MP). Si null/undef → fallback a `price`. */
  cardPrice?: number | null;
  suggestedDownPayment: number;
  motorcycle: {
    id: string;
    brand: string;
    model: string;
    year: number;
    slug: string;
    name: string;
    finvaMotorcycleId: number | null;
  };
  purchaseUrl?: string | null;
  /** Inyectados desde el servidor para que la UI no necesite leerlos. */
  mercadoPagoPublicKey: string;
  mercadoPagoMaxInstallments: number;
  /** Slot opcional con el resumen (precio / desde / enganche) que se muestra dentro del tab de financiamiento. */
  financingSummary?: ReactNode;
};

export function PurchaseModule({
  price,
  cardPrice,
  suggestedDownPayment,
  motorcycle,
  purchaseUrl,
  mercadoPagoPublicKey,
  mercadoPagoMaxInstallments,
  financingSummary,
}: Props) {
  const [tab, setTab] = useState<Tab>('financing');
  const cardAmount = cardPrice && cardPrice > 0 ? cardPrice : price;

  return (
    <div className="purchase-module">
      <header className="purchase-module__head">
        <span className="eyebrow">Compra tu moto</span>
        <h2 className="purchase-module__title">¿Cómo quieres pagar?</h2>
      </header>

      <div className="purchase-tabs" role="tablist" aria-label="Opciones de pago">
        <button
          type="button"
          role="tab"
          id="tab-financing"
          aria-controls="panel-financing"
          aria-selected={tab === 'financing'}
          className="purchase-tabs__btn"
          onClick={() => {
            setTab('financing');
            track('view_product', { motorcycleId: motorcycle.id, tab: 'financing' });
          }}
        >
          <span className="purchase-tabs__btn-title">Financiamiento</span>
          <span className="purchase-tabs__btn-sub">A meses con Finva</span>
        </button>
        <button
          type="button"
          role="tab"
          id="tab-card"
          aria-controls="panel-card"
          aria-selected={tab === 'card'}
          className="purchase-tabs__btn"
          onClick={() => {
            setTab('card');
            track('view_product', { motorcycleId: motorcycle.id, tab: 'card' });
          }}
        >
          <span className="purchase-tabs__btn-title">Tarjeta de crédito o débito</span>
          <span className="purchase-tabs__btn-sub">
            Mercado Pago · hasta {mercadoPagoMaxInstallments} meses
          </span>
        </button>
      </div>

      <div
        role="tabpanel"
        id="panel-financing"
        aria-labelledby="tab-financing"
        hidden={tab !== 'financing'}
      >
        {financingSummary ? (
          <div className="purchase-financing-summary">{financingSummary}</div>
        ) : null}
        <CreditApplicationShell
          price={price}
          suggestedDownPayment={suggestedDownPayment}
          motorcycleId={motorcycle.id}
          motorcycleName={motorcycle.name}
          motorcycleBrand={motorcycle.brand}
          motorcycleModel={motorcycle.model}
          motorcycleYear={motorcycle.year}
          finvaMotorcycleId={motorcycle.finvaMotorcycleId}
          purchaseUrl={purchaseUrl}
        />
      </div>

      <div role="tabpanel" id="panel-card" aria-labelledby="tab-card" hidden={tab !== 'card'}>
        <div className="purchase-card-panel">
          <CardPaymentPanel
            amount={cardAmount}
            publicKey={mercadoPagoPublicKey}
            maxInstallments={mercadoPagoMaxInstallments}
            motorcycle={{
              id: motorcycle.id,
              brand: motorcycle.brand,
              slug: motorcycle.slug,
              name: motorcycle.name,
            }}
            visible={tab === 'card'}
          />
        </div>
      </div>
    </div>
  );
}

function CardPaymentPanel({
  amount,
  publicKey,
  maxInstallments,
  motorcycle,
  visible,
}: {
  amount: number;
  publicKey: string;
  maxInstallments: number;
  motorcycle: { id: string; brand: string; slug: string; name: string };
  visible: boolean;
}) {
  const [started, setStarted] = useState(false);

  if (!visible) return null;

  if (started) {
    return (
      <div className="card-pay">
        <button
          type="button"
          className="card-pay__back"
          onClick={() => setStarted(false)}
        >
          ← Volver a resumen
        </button>
        <MercadoPagoCheckout
          amount={amount}
          publicKey={publicKey}
          maxInstallments={maxInstallments}
          motorcycle={motorcycle}
        />
      </div>
    );
  }

  return (
    <div className="card-intro">
      <div className="card-intro__price">
        <span className="small muted">Precio con tarjeta</span>
        <strong>{formatMXN(amount)}</strong>
        <span className="small muted card-intro__price-note">
          Incluye comisión por procesamiento con tarjeta.
        </span>
      </div>

      <p className="card-intro__lead">
        Llévate tu moto hoy mismo pagando con tu tarjeta. Sin trámites, sin esperar
        aprobación de crédito.
      </p>

      <ul className="card-intro__list">
        <li>
          <strong>Cualquier tarjeta</strong> de crédito o débito (Visa, Mastercard,
          Amex).
        </li>
        <li>
          Hasta <strong>{maxInstallments} meses</strong> con tu tarjeta de crédito
          (intereses fijados por tu banco).
        </li>
        <li>
          Pago <strong>100% seguro</strong> procesado por Mercado Pago. Nosotros nunca
          vemos los datos de tu tarjeta.
        </li>
      </ul>

      <button
        type="button"
        className="btn green full"
        onClick={() => {
          track('start_financing', {
            motorcycleId: motorcycle.id,
            provider: 'mercadopago',
            method: 'card_intro_continue',
          });
          setStarted(true);
        }}
      >
        Pagar con tarjeta →
      </button>
    </div>
  );
}
