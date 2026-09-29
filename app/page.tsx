import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { SearchBox } from '@/components/SearchBox';
import { HeroMotoRotator } from '@/components/HeroMotoRotator';
import { MotorcycleCard } from '@/components/MotorcycleCard';
import { getBrands, getMotorcycles } from '@/lib/catalog';

export const revalidate = 120;

export const metadata: Metadata = {
  title: 'Elige tu moto. Nosotros buscamos quién te financie.',
  description:
    'Elige tu moto nueva y te conectamos con la financiera con más probabilidad de aprobarte. Yamaha, Suzuki, KTM, Bajaj y más. Aplica en línea.',
};

// Copy del home (migrado de la versión 40 de cms_page_versions, página "inicio").
const HERO_EYEBROW = 'Motos nuevas + Finva evalúa tu perfil y te asigna la financiera';
const HERO_TITLE = 'Elige tu moto. Nosotros buscamos quién te financie.';
const HERO_DESCRIPTION =
  'Elige tu moto nueva y te conectamos con la financiera con más probabilidad de aprobarte. Yamaha, Suzuki, KTM, Bajaj y más. Aplica en línea.';
const FEATURED_HEADING = 'Motos nuevas a crédito más buscadas';
const FEATURED_SUBTITLE = 'Las más elegidas para comprar a crédito, con mensualidad estimada.';
const FEATURED_CTA = 'Ver catálogo';
const COMO_HEADING = 'Así te conectamos con la financiera ideal';
const COMO_STEPS = [
  'Elige tu moto: Filtra por marca, uso y presupuesto.',
  'Evaluamos tu perfil: Finva revisa tu historial y capacidad de pago.',
  'Te conectamos con la financiera ideal: La que tiene más probabilidad de aprobarte.',
  'Estrena: Firmas con la financiera y la agencia te entrega tu moto.',
];
const COMO_CTA = 'Conoce más';

export default async function HomePage() {
  const [all, brands] = await Promise.all([getMotorcycles(), getBrands()]);
  const featured = all.slice(0, 6);
  const heroSlides = all.filter((m) => m.imageUrl).slice(0, 8);

  // Orden de secciones de la versión 40: hero, (cms-extra: vacío), cómo funciona, destacadas.
  const sections: ReactNode[] = [
      <section className="hero" key="hero">
        <div className="container hero-grid">
          <div>
            <span className="eyebrow">{HERO_EYEBROW}</span>
            <h1>{HERO_TITLE}</h1>
            <p>{HERO_DESCRIPTION}</p>
            <SearchBox brands={brands} />
          </div>
          <div className="hero-card">
            <HeroMotoRotator slides={heroSlides} />
            <div className="kpi-strip">
              <div className="kpi"><strong>1</strong><span className="small muted">Elige moto</span></div>
              <div className="kpi"><strong>2</strong><span className="small muted">Calcula pago</span></div>
              <div className="kpi"><strong>3</strong><span className="small muted">Inicia compra</span></div>
              <div className="kpi"><strong>4</strong><span className="small muted">Finva gestiona</span></div>
            </div>
          </div>
        </div>
      </section>,

      <section id="como-funciona" className="section--como-fullpage" aria-labelledby="como-funciona-title" key="como-funciona">
        <div className="como-funciona-shell">
          <div className="hero-card hero-card--como-fullpage">
            <div className="como-funciona-body">
              <h3 id="como-funciona-title">{COMO_HEADING}</h3>
              <div className="como-funciona-steps">
                {COMO_STEPS.map((step, i) => (
                  <p key={i}><strong>{i + 1}.</strong> {step}</p>
                ))}
              </div>
            </div>
            <Link className="btn green full como-funciona-cta" href="/motos-a-credito">{COMO_CTA}</Link>
          </div>
        </div>
      </section>,

      <section className="section" key="featured">
        <div className="container">
          <div className="section-head">
            <div><h2>{FEATURED_HEADING}</h2><p>{FEATURED_SUBTITLE}</p></div>
            <Link className="btn" href="/motos">{FEATURED_CTA}</Link>
          </div>
          <div className="grid">{featured.map((moto) => <MotorcycleCard moto={moto} key={moto.id} />)}</div>
        </div>
      </section>,
  ];

  return <main>{sections}</main>;
}
