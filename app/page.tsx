import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { SearchBox } from '@/components/SearchBox';
import { HeroMotoRotator } from '@/components/HeroMotoRotator';
import { MotorcycleCard } from '@/components/MotorcycleCard';
import { getBrands, getMotorcycles } from '@/lib/catalog';
import { getCmsOverrideForRequest } from '@/lib/cms/overrides';
import { renderDocHtml, withoutLeadingTitleHeading } from '@/lib/cms/render';
import { HOME_DEFAULTS } from '@/lib/cms/component-defaults';
import { parseLines } from '@/lib/cms/component-values';
import { resolveSectionOrder } from '@/lib/cms/layout-sections';

export const revalidate = 120;

const BINDING_KEY = 'static:home';

export async function generateMetadata(): Promise<Metadata> {
  const { doc: override } = await getCmsOverrideForRequest(BINDING_KEY, false);
  if (!override) return {};
  return { title: override.title || undefined, description: override.description || undefined };
}

type Props = { searchParams: Promise<{ cmsPreview?: string }> };

export default async function HomePage({ searchParams }: Props) {
  const sp = searchParams ? await searchParams : {};
  const [all, brands, { doc: override, isPreview }] = await Promise.all([
    getMotorcycles(),
    getBrands(),
    getCmsOverrideForRequest(BINDING_KEY, sp.cmsPreview === '1'),
  ]);
  const featured = all.slice(0, 6);
  const heroSlides = all.filter((m) => m.imageUrl).slice(0, 8);
  // El h1 del hero ya usa override.title (= texto del primer bloque h1 en el
  // Studio); se omite ese bloque en la sección extra de abajo para no repetirlo.
  const extraHtml = override ? renderDocHtml(withoutLeadingTitleHeading(override)) : null;

  // Copy fijo editable (lib/cms/component-registry.ts, componentes
  // homeHero/homeFeatured/homeComoFunciona) — vacío en componentConfig =
  // se queda el texto real actual (HOME_DEFAULTS), igual que en las motos.
  const cfgHero = override?.componentConfig?.homeHero;
  const cfgFeatured = override?.componentConfig?.homeFeatured;
  const cfgComo = override?.componentConfig?.homeComoFunciona;
  const eyebrow = (cfgHero?.eyebrow as string) || HOME_DEFAULTS.eyebrow;
  const featuredHeading = (cfgFeatured?.heading as string) || HOME_DEFAULTS.featuredHeading;
  const featuredSubtitle = (cfgFeatured?.subtitle as string) || HOME_DEFAULTS.featuredSubtitle;
  const featuredCta = (cfgFeatured?.ctaLabel as string) || HOME_DEFAULTS.featuredCta;
  const comoHeading = (cfgComo?.heading as string) || HOME_DEFAULTS.comoHeading;
  const comoSteps = cfgComo?.steps ? parseLines(String(cfgComo.steps)) : [...HOME_DEFAULTS.comoSteps];
  const comoCta = (cfgComo?.ctaLabel as string) || HOME_DEFAULTS.comoCta;

  // Orden de secciones (lib/cms/layout-sections.ts, pestaña "Diseño" del
  // Studio) — marketing puede reordenar estos 4 bloques sin tocar código.
  // Cada página con layout movible arma este mismo patrón: un mapa
  // id -> JSX y renderizarlo iterando el orden resuelto.
  const sections: Record<string, ReactNode> = {
    hero: (
      <section className="hero" key="hero">
        <div className="container hero-grid">
          <div data-cms-region="homeHero">
            <span className="eyebrow">{eyebrow}</span>
            <h1>{override?.title || 'Encuentra tu moto y calcula cuánto pagarías al mes.'}</h1>
            <p>{override?.description || 'Explora motos por presupuesto, uso y marca. Inicia tu compra en minutos con opciones de financiamiento gestionadas por Finva.'}</p>
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
      </section>
    ),
    featured: (
      <section className="section" key="featured">
        <div className="container">
          <div className="section-head" data-cms-region="homeFeatured">
            <div><h2>{featuredHeading}</h2><p>{featuredSubtitle}</p></div>
            <Link className="btn" href="/motos">{featuredCta}</Link>
          </div>
          <div className="grid">{featured.map((moto) => <MotorcycleCard moto={moto} key={moto.id} />)}</div>
        </div>
      </section>
    ),
    'como-funciona': (
      <section id="como-funciona" className="section--como-fullpage" aria-labelledby="como-funciona-title" key="como-funciona">
        <div className="como-funciona-shell">
          <div className="hero-card hero-card--como-fullpage" data-cms-region="homeComoFunciona">
            <div className="como-funciona-body">
              <h3 id="como-funciona-title">{comoHeading}</h3>
              <div className="como-funciona-steps">
                {comoSteps.map((step, i) => (
                  <p key={i}><strong>{i + 1}.</strong> {step}</p>
                ))}
              </div>
            </div>
            <Link className="btn green full como-funciona-cta" href="/motos-a-credito">{comoCta}</Link>
          </div>
        </div>
      </section>
    ),
    'cms-extra': extraHtml ? (
      <section className="section" key="cms-extra">
        {/* Sección adicional editable por marketing (CMS), al final del home. HTML ya saneado. */}
        <div className="container cms-page-body" dangerouslySetInnerHTML={{ __html: extraHtml }} />
      </section>
    ) : null,
  };
  const order = resolveSectionOrder(BINDING_KEY, override?.sectionOrder);

  return (
    <main>
      {isPreview && (
        <div style={{ background: '#fff3e0', color: '#7a3b00', padding: '8px 16px', textAlign: 'center', fontSize: 13 }}>
          Vista previa del borrador — esto aún no está publicado.
        </div>
      )}
      {order.map((id) => sections[id] ?? null)}
    </main>
  );
}
