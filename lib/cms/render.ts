/**
 * Transformación determinista JSON de bloques -> HTML. Este es el paso que en
 * la idea de Diego "el agente orquestador se encarga a partir de json en
 * transformarlo": el LLM produce bloques, y ESTA función (no el LLM) arma el
 * HTML final. Ventaja: el HTML publicado es predecible, versionable y seguro,
 * y el editor HTML manual muestra exactamente lo que se va a publicar.
 */
import type { CmsBlock, CmsPageDoc } from '@/types/cms';
import { sanitizeHtml } from '@/lib/cms/blocks';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderBlock(block: CmsBlock): string {
  switch (block.type) {
    case 'heading':
      return `<h${block.level}${block.id ? ` id="${esc(block.id)}"` : ''}>${esc(block.text)}</h${block.level}>`;
    case 'paragraph':
      return `<p>${sanitizeHtml(block.html)}</p>`;
    case 'image': {
      const widthMap: Record<string, string> = { small: '240px', medium: '420px', large: '640px', full: '100%', auto: '100%' };
      const maxW = widthMap[block.width ?? 'auto'] ?? '100%';
      const align = block.align ?? 'center';
      const figMargin = align === 'left' ? '1em auto 1em 0' : align === 'right' ? '1em 0 1em auto' : '1em auto';
      const figStyle = `max-width:${maxW};margin:${figMargin};`;
      const imgStyle =
        block.fit === 'cover'
          ? `width:100%;height:${block.height ? block.height + 'px' : '260px'};object-fit:cover;border-radius:12px;`
          : `width:100%;height:auto;object-fit:contain;border-radius:12px;`;
      return (
        `<figure class="cms-figure" style="${figStyle}">` +
        `<img src="${esc(block.url)}" alt="${esc(block.alt)}" loading="lazy" style="${imgStyle}" />` +
        (block.caption ? `<figcaption>${esc(block.caption)}</figcaption>` : '') +
        `</figure>`
      );
    }
    case 'button':
      return `<a class="btn btn--${block.variant ?? 'primary'}" href="${esc(block.href)}">${esc(block.label)}</a>`;
    case 'faq':
      return (
        `<div class="cms-faq">` +
        block.items
          .map(
            (it) =>
              `<details class="cms-faq__item"><summary>${esc(it.q)}</summary><div>${esc(it.a)}</div></details>`
          )
          .join('') +
        `</div>`
      );
    case 'input': {
      const id = 'f_' + block.name;
      const req = block.required ? ' required' : '';
      const ph = block.placeholder ? ` placeholder="${esc(block.placeholder)}"` : '';
      let control: string;
      if (block.inputType === 'textarea') {
        control = `<textarea id="${id}" name="${esc(block.name)}"${ph}${req}></textarea>`;
      } else if (block.inputType === 'select') {
        const opts = (block.options ?? []).map((o) => `<option value="${esc(o)}">${esc(o)}</option>`).join('');
        control = `<select id="${id}" name="${esc(block.name)}"${req}>${opts}</select>`;
      } else if (block.inputType === 'checkbox') {
        control = `<input type="checkbox" id="${id}" name="${esc(block.name)}"${req} />`;
      } else {
        control = `<input type="${esc(block.inputType)}" id="${id}" name="${esc(block.name)}"${ph}${req} />`;
      }
      return `<div class="cms-field cms-field--${esc(block.inputType)}"><label for="${id}">${esc(block.label)}${block.required ? ' *' : ''}</label>${control}</div>`;
    }
    case 'html':
      return `<div class="cms-raw">${sanitizeHtml(block.html)}</div>`;
    default:
      return '';
  }
}

/** Renderiza los bloques del doc a una cadena HTML (el "cuerpo" de la página). */
export function renderDocHtml(doc: CmsPageDoc): string {
  return doc.blocks.map(renderBlock).join('\n');
}
