/**
 * Imagens para notícias — SVG inline por categoria.
 * Data URI = zero requisições externas, sempre carrega.
 */

/** Cor de fundo por categoria (hex com #) — exportada para divs também */
export const CATEGORY_COLORS: Record<string, string> = {
  Brasil: '#0f766e',
  Mundo: '#1e40af',
  Tecnologia: '#7c3aed',
  Esportes: '#b91c1c',
  Saúde: '#047857',
  Economia: '#b45309',
  Entretenimento: '#9d174d',
  Política: '#1e3a8a',
  Ciência: '#4f46e5',
  Geral: '#334155',
  'Top Stories': '#1e293b',
};

/** SVG como data URI — funciona sem internet, sem CORS, sem bloqueios */
export function getImageByCategory(category?: string): string {
  const key = category && category in CATEGORY_COLORS ? category : 'Geral';
  const bg = CATEGORY_COLORS[key] ?? '#334155';
  const label = (category || 'News').replace(/"/g, "'").slice(0, 20);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><rect fill="${bg}" width="800" height="450"/><text x="400" y="230" font-family="system-ui,sans-serif" font-size="28" fill="rgba(255,255,255,0.9)" text-anchor="middle" dominant-baseline="middle">${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Mesmo que getImageByCategory — notícias usam imagem da categoria */
export function getImageForArticle(article: { id?: string; title?: string; category?: string }): string {
  return getImageByCategory(article.category);
}

/** URLs que o navegador pode carregar diretamente (sem proxy) */
const TRUSTED_ORIGINS = ['picsum.photos', 'placehold.co', 'images.unsplash.com'];

/** Verifica se a URL pode ser carregada diretamente — evita proxy que pode falhar */
export function isTrustedImageUrl(url: string): boolean {
  if (!url || !url.startsWith('http')) return false;
  if (url.startsWith('/') || url.startsWith('data:')) return true;
  if (typeof window !== 'undefined' && url.startsWith(window.location.origin)) return true;
  try {
    const host = new URL(url).hostname;
    return TRUSTED_ORIGINS.some((o) => host === o || host.endsWith('.' + o));
  } catch {
    return false;
  }
}
