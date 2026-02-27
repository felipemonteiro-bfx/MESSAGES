/**
 * Imagens para notícias — URLs Unsplash por categoria + SVG fallback.
 */

/** Cor de fundo por categoria (hex com #) — exportada para divs também */
export const CATEGORY_COLORS: Record<string, string> = {
  Amazonas: '#059669',
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

/** Imagens reais do Unsplash por categoria - sempre carregam */
export const CATEGORY_IMAGES: Record<string, string> = {
  Amazonas: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=800&h=450&fit=crop&q=80',
  Brasil: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&h=450&fit=crop&q=80',
  Mundo: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=450&fit=crop&q=80',
  Tecnologia: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=450&fit=crop&q=80',
  Esportes: 'https://images.unsplash.com/photo-1461896836934-bc87a3b35f75?w=800&h=450&fit=crop&q=80',
  Saúde: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&h=450&fit=crop&q=80',
  Economia: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=450&fit=crop&q=80',
  Entretenimento: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=450&fit=crop&q=80',
  Política: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800&h=450&fit=crop&q=80',
  Ciência: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=800&h=450&fit=crop&q=80',
  Geral: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=450&fit=crop&q=80',
  'Top Stories': 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&h=450&fit=crop&q=80',
};

/** Retorna imagem Unsplash para a categoria */
export function getCategoryImage(category?: string): string {
  const key = category && category in CATEGORY_IMAGES ? category : 'Geral';
  return CATEGORY_IMAGES[key] ?? CATEGORY_IMAGES['Geral'];
}

/** SVG como data URI — funciona sem internet, sem CORS, sem bloqueios */
export function getImageByCategory(category?: string): string {
  const key = category && category in CATEGORY_COLORS ? category : 'Geral';
  const bg = CATEGORY_COLORS[key] ?? '#334155';
  const label = (category || 'News').replace(/"/g, "'").slice(0, 20);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><rect fill="${bg}" width="800" height="450"/><text x="400" y="230" font-family="system-ui,sans-serif" font-size="28" fill="rgba(255,255,255,0.9)" text-anchor="middle" dominant-baseline="middle">${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Retorna a imagem do artigo ou uma imagem Unsplash da categoria se não houver */
export function getImageForArticle(article: { id?: string; title?: string; category?: string; image?: string }): string {
  if (article.image && article.image.length > 10 && article.image.startsWith('http')) {
    return article.image;
  }
  return getCategoryImage(article.category);
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
