'use client';

import { useState } from 'react';

export type FaqItem = {
  id: string;
  question: string;
  /** HTML de la respuesta (puede traer <a> a fichas de moto) — texto controlado por nosotros, no input de usuario. */
  answer: string;
};

/**
 * Acordeón de preguntas frecuentes. El texto de TODAS las respuestas queda
 * en el HTML desde el server render (no se monta/desmonta al abrir/cerrar) —
 * solo se oculta con CSS — para que siga siendo rastreable por buscadores
 * aunque el usuario nunca haga click.
 */
export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);

  return (
    <div className="faq-accordion">
      {items.map((item) => {
        const isOpen = item.id === openId;
        return (
          <div key={item.id} className="faq-accordion__item">
            <button
              type="button"
              className="faq-accordion__question"
              aria-expanded={isOpen}
              onClick={() => setOpenId(isOpen ? null : item.id)}
            >
              <span>{item.question}</span>
              <span className="faq-accordion__icon" aria-hidden="true">
                {isOpen ? '×' : '+'}
              </span>
            </button>
            <div className={'faq-accordion__answer' + (isOpen ? ' faq-accordion__answer--open' : '')}>
              <div className="faq-accordion__answer-inner">
                <p dangerouslySetInnerHTML={{ __html: item.answer }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
