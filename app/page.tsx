import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { SearchBox } from '@/components/SearchBox';
import { HeroMotoRotator } from '@/components/HeroMotoRotator';
import { HomeStepsLinks } from '@/components/HomeStepsLinks';
import { VideoModalCard } from '@/components/VideoModalCard';
import { MotorcycleCard } from '@/components/MotorcycleCard';
import { getBrands, getMotorcycles } from '@/lib/catalog';
import { toApplyCreditMoto } from '@/lib/catalog-format';

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
/** Short del hero "Cómo funciona MotoClick" (https://youtu.be/RlHX_EdgMkI, vertical 9:16). */
const HERO_VIDEO_ID = 'RlHX_EdgMkI';

export default async function HomePage() {
  const [all, brands] = await Promise.all([getMotorcycles(), getBrands()]);
  const featured = all.slice(0, 6);
  const heroSlides = all.filter((m) => m.imageUrl).slice(0, 8);
  // Catálogo para el "Aplica ahora" del modal del video (selector marca/moto → modal de Finva).
  const applyMotos = all.map(toApplyCreditMoto);

  // Secciones del home: hero y destacadas (el bloque "Cómo funciona" se quitó; ahora vive en su página dedicada).
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
            <VideoModalCard
              thumbnail={<HeroMotoRotator slides={heroSlides} interactive={false} />}
              location="home_hero"
              videoId={HERO_VIDEO_ID}
              applyMotos={applyMotos}
            />
            <HomeStepsLinks />
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
