'use client';

import { useState } from 'react';
import { CreditApplicationShell } from '@/components/credit-application/CreditApplicationShell';
import { MercadoPagoCheckout } from '@/components/MercadoPagoCheckout';
import { track } from '@/lib/analytics';

type Tab = 'financing' | 'card';

type Props = {
  price: number;
  suggestedDownPayment: number;
  motorcycle: {
    id: string;
    brand: string;
    slug: string;
    name: string;
  };
  purchaseUrl?: string | null;
  /** Inyectados desde el servidor para que la UI no necesite leerlos. */
  mercadoPagoPublicKey: string;
  mercadoPagoMaxInstallments: number;
};

export function PurchaseModule({
  price,
  suggestedDownPayment,
  motorcycle,
  purchaseUrl,
  mercadoPagoPublicKey,
  mercadoPagoMaxInstallments,
}: Props) {
  const [tab, setTab] = useState<Tab>('financing');

  return (
    <div className="purchase-module">
      <header className="purchase-module__head">
        <span className="eyebrow">Compra tu moto</span>
        <h2 className="purchase-module__title">¿Cómo quieres pagar?</h2>
      </header>

      <div
        className="purchase-tabs"
        role="tablist"
        aria-label="Opciones de pago"
      >
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
        <CreditApplicationShell
          price={price}
          suggestedDownPayment={suggestedDownPayment}
          motorcycleId={motorcycle.id}
          motorcycleName={motorcycle.name}
          purchaseUrl={purchaseUrl}
        />
      </div>

      <div
        role="tabpanel"
        id="panel-card"
        aria-labelledby="tab-card"
        hidden={tab !== 'card'}
      >
        <div className="purchase-card-panel">
          <MercadoPagoCheckout
            amount={price}
            publicKey={mercadoPagoPublicKey}
            maxInstallments={mercadoPagoMaxInstallments}
            motorcycle={motorcycle}
          />
        </div>
      </div>
    </div>
  );
}
