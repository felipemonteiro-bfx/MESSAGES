import { NextResponse, type NextRequest } from 'next/server';

// ============================================================
// API de Agregação de Notícias Reais
// Faz scraping de RSS feeds de múltiplas fontes mundiais
// Cache server-side de 5 minutos
// ============================================================

interface NewsArticle {
  id: string;
  title: string;
  description: string;
  source: string;
  sourceUrl: string;
  url: string;
  image: string;
  category: string;
  publishedAt: string;
  timeAgo: string;
}

interface RSSFeed {
  name: string;
  url: string;
  category: string;
  language: string;
}

// ============================================================
// Fontes RSS — Brasileiras e Internacionais
// ============================================================
const RSS_FEEDS: RSSFeed[] = [
  // === BRASIL ===
  { name: 'G1', url: 'https://g1.globo.com/rss/g1/', category: 'Brasil', language: 'pt' },
  { name: 'G1 Tecnologia', url: 'https://g1.globo.com/rss/g1/tecnologia/', category: 'Tecnologia', language: 'pt' },
  { name: 'G1 Economia', url: 'https://g1.globo.com/rss/g1/economia/', category: 'Economia', language: 'pt' },
  { name: 'G1 Ciência', url: 'https://g1.globo.com/rss/g1/ciencia-e-saude/', category: 'Ciência', language: 'pt' },
  { name: 'UOL Notícias', url: 'https://rss.uol.com.br/feed/noticias.xml', category: 'Brasil', language: 'pt' },
  { name: 'UOL Tecnologia', url: 'https://rss.uol.com.br/feed/tecnologia.xml', category: 'Tecnologia', language: 'pt' },
  { name: 'Folha de S.Paulo', url: 'https://feeds.folha.uol.com.br/emcimadahora/rss091.xml', category: 'Brasil', language: 'pt' },
  { name: 'Estadão', url: 'https://www.estadao.com.br/arc/outboundfeeds/rss/?outputType=xml', category: 'Brasil', language: 'pt' },
  { name: 'R7', url: 'https://noticias.r7.com/feed.xml', category: 'Brasil', language: 'pt' },
  { name: 'GE Esportes', url: 'https://ge.globo.com/rss/ge/', category: 'Esportes', language: 'pt' },
  
  // === INTERNACIONAIS ===
  { name: 'BBC News', url: 'https://feeds.bbci.co.uk/news/rss.xml', category: 'Mundo', language: 'en' },
  { name: 'BBC Technology', url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', category: 'Tecnologia', language: 'en' },
  { name: 'BBC Science', url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', category: 'Ciência', language: 'en' },
  { name: 'BBC Health', url: 'https://feeds.bbci.co.uk/news/health/rss.xml', category: 'Saúde', language: 'en' },
  { name: 'BBC Entertainment', url: 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml', category: 'Entretenimento', language: 'en' },
  { name: 'Reuters World', url: 'https://www.reutersagency.com/feed/?taxonomy=best-sectors&post_type=best', category: 'Mundo', language: 'en' },
  { name: 'CNN Top Stories', url: 'http://rss.cnn.com/rss/edition.rss', category: 'Mundo', language: 'en' },
  { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml', category: 'Mundo', language: 'en' },
  { name: 'The Guardian', url: 'https://www.theguardian.com/world/rss', category: 'Mundo', language: 'en' },
  { name: 'The Guardian Tech', url: 'https://www.theguardian.com/uk/technology/rss', category: 'Tecnologia', language: 'en' },
  { name: 'The Guardian Sport', url: 'https://www.theguardian.com/uk/sport/rss', category: 'Esportes', language: 'en' },
  { name: 'NY Times', url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml', category: 'Mundo', language: 'en' },
  { name: 'ESPN', url: 'https://www.espn.com/espn/rss/news', category: 'Esportes', language: 'en' },
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', category: 'Tecnologia', language: 'en' },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', category: 'Tecnologia', language: 'en' },
  { name: 'Nature News', url: 'https://www.nature.com/nature.rss', category: 'Ciência', language: 'en' },
  
  // === ESPANHOL ===
  { name: 'El País', url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada', category: 'Mundo', language: 'es' },
  
  // === ECONOMIA ===
  { name: 'Bloomberg', url: 'https://feeds.bloomberg.com/markets/news.rss', category: 'Economia', language: 'en' },
  { name: 'CNBC', url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114', category: 'Economia', language: 'en' },
  
  // === POLÍTICA ===
  { name: 'Poder360', url: 'https://www.poder360.com.br/feed/', category: 'Política', language: 'pt' },
  { name: 'Congresso em Foco', url: 'https://congressoemfoco.uol.com.br/feed/', category: 'Política', language: 'pt' },
];

// ============================================================
// Cache server-side (em memória, 5 minutos)
// ============================================================
interface CacheEntry {
  articles: NewsArticle[];
  timestamp: number;
}

const CACHE_TTL = 10 * 60 * 1000; // 10 minutos (mais cache = resposta mais rápida)
const newsCache = new Map<string, CacheEntry>();

// Feeds prioritários para "Top Stories" — menos feeds = carregamento mais rápido
const TOP_STORIES_FEED_NAMES = ['G1', 'UOL Notícias', 'Folha de S.Paulo', 'BBC News', 'Reuters World', 'TechCrunch'];

// ============================================================
// Parser de RSS simples (sem dependências externas)
// ============================================================
function parseRSSItem(itemXml: string, feedName: string, feedCategory: string): NewsArticle | null {
  try {
    const getTag = (xml: string, tag: string): string => {
      // Tenta com CDATA primeiro
      const cdataRegex = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, 'i');
      const cdataMatch = xml.match(cdataRegex);
      if (cdataMatch) return cdataMatch[1].trim();
      
      // Tenta tag normal
      const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
      const match = xml.match(regex);
      return match ? match[1].trim() : '';
    };

    const getAttr = (xml: string, tag: string, attr: string): string => {
      const regex = new RegExp(`<${tag}[^>]*${attr}=["']([^"']+)["']`, 'i');
      const match = xml.match(regex);
      return match ? match[1].trim() : '';
    };

    const title = decodeHtmlEntities(stripHtml(getTag(itemXml, 'title')));
    const link = getTag(itemXml, 'link') || getAttr(itemXml, 'link', 'href');
    const description = decodeHtmlEntities(
      stripHtml(getTag(itemXml, 'description') || getTag(itemXml, 'summary') || getTag(itemXml, 'content:encoded'))
    );
    const pubDate = getTag(itemXml, 'pubDate') || getTag(itemXml, 'published') || getTag(itemXml, 'dc:date') || getTag(itemXml, 'updated');
    
    // Extrair imagem de várias fontes possíveis (ordem de prioridade)
    let image = '';
    // 1. media:content ou media:thumbnail (mais comum em RSS de notícias)
    image = getAttr(itemXml, 'media:content', 'url') || getAttr(itemXml, 'media:thumbnail', 'url');
    // 2. media:group > media:content
    if (!image) {
      const mediaGroupMatch = itemXml.match(/<media:group[\s>]([\s\S]*?)<\/media:group>/i);
      if (mediaGroupMatch) {
        image = getAttr(mediaGroupMatch[1], 'media:content', 'url');
      }
    }
    // 3. enclosure com tipo imagem
    if (!image) {
      const enclosureMatch = itemXml.match(/<enclosure[^>]*type=["']image[^"']*["'][^>]*url=["']([^"']+)["']/i);
      if (enclosureMatch) image = enclosureMatch[1];
      if (!image) {
        const enclosureMatch2 = itemXml.match(/<enclosure[^>]*url=["']([^"']+)["'][^>]*type=["']image/i);
        if (enclosureMatch2) image = enclosureMatch2[1];
      }
      // Fallback: qualquer enclosure com URL
      if (!image) image = getAttr(itemXml, 'enclosure', 'url');
    }
    // 4. <img> tag dentro da description/content
    if (!image) {
      const imgMatch = itemXml.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch) image = imgMatch[1];
    }
    // 5. image tag direta
    if (!image) {
      const imageUrl = getTag(itemXml, 'image');
      if (imageUrl && imageUrl.startsWith('http')) image = imageUrl;
    }
    // 6. content:encoded com imagem
    if (!image) {
      const contentEncoded = getTag(itemXml, 'content:encoded');
      if (contentEncoded) {
        const imgMatch = contentEncoded.match(/src=["']([^"']+\.(?:jpg|jpeg|png|webp|gif)[^"']*)/i);
        if (imgMatch) image = imgMatch[1];
      }
    }
    // Limpar URL da imagem
    if (image) {
      image = decodeHtmlEntities(image).trim();
      // Remover parâmetros de tracking desnecessários
      try { image = new URL(image).href; } catch { /* manter como está */ }
    }

    if (!title || !link) return null;

    // Filtrar títulos inválidos
    if (title.length < 10 || title === '[Removed]') return null;

    const publishedDate = pubDate ? new Date(pubDate) : new Date();
    const timeAgo = getTimeAgo(publishedDate);

    return {
      id: `${feedName}-${hashString(link)}`,
      title: title.substring(0, 200),
      description: description.substring(0, 300) || title,
      source: feedName,
      sourceUrl: new URL(link).origin,
      url: link,
      image: image || '',
      category: feedCategory,
      publishedAt: publishedDate.toISOString(),
      timeAgo,
    };
  } catch {
    return null;
  }
}

function decodeHtmlEntities(text: string): string {
  const namedEntities: Record<string, string> = {
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&nbsp;': '\u00A0',
    '&aacute;': 'á', '&eacute;': 'é', '&iacute;': 'í', '&oacute;': 'ó', '&uacute;': 'ú',
    '&agrave;': 'à', '&egrave;': 'è', '&igrave;': 'ì', '&ograve;': 'ò', '&ugrave;': 'ù',
    '&acirc;': 'â', '&ecirc;': 'ê', '&ocirc;': 'ô', '&atilde;': 'ã', '&otilde;': 'õ',
    '&ccedil;': 'ç', '&ntilde;': 'ñ', '&uuml;': 'ü', '&Ccedil;': 'Ç',
    '&Aacute;': 'Á', '&Eacute;': 'É', '&Iacute;': 'Í', '&Oacute;': 'Ó', '&Uacute;': 'Ú',
    '&Agrave;': 'À', '&Atilde;': 'Ã', '&Otilde;': 'Õ', '&Acirc;': 'Â', '&Ecirc;': 'Ê', '&Ocirc;': 'Ô',
  };
  let out = text;
  for (const [ent, char] of Object.entries(namedEntities)) {
    out = out.replace(new RegExp(ent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), char);
  }
  return out
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
    .replace(/&#x([a-fA-F0-9]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 0) return 'Agora';
  if (diffMins < 1) return 'Agora';
  if (diffMins < 60) return `${diffMins}min atrás`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h atrás`;
  return `${Math.floor(diffMins / 1440)}d atrás`;
}

// ============================================================
// Fetch e parse de um feed RSS individual
// ============================================================
async function fetchFeed(feed: RSSFeed): Promise<NewsArticle[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout por feed

    const response = await fetch(feed.url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StealthNews/1.0; +https://stealthnews.app)',
        'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) return [];

    // Decodificar com encoding correto para evitar problemas com acentuação (ex: término, Xamã)
    const buffer = await response.arrayBuffer();
    const ct = response.headers.get('content-type') || '';
    let charset = (ct.match(/charset=["']?([^"'\s;]+)/i) || [])[1] || '';
    if (!charset) {
      const preambleUtf8 = new TextDecoder('utf-8', { fatal: false }).decode(buffer.slice(0, 1000));
      const encMatch = preambleUtf8.match(/encoding=["']([^"']+)["']/i);
      charset = encMatch ? encMatch[1].trim().toLowerCase() : '';
    }
    // Feeds brasileiros (.com.br, uol, folha) frequentemente usam ISO-8859-1
    const isBrazilianFeed = feed.language === 'pt' || feed.url.includes('.com.br') || feed.url.includes('folha.uol') || feed.url.includes('uol.com.br');
    let encoding = ['utf-8', 'utf8'].includes(charset) ? 'utf-8'
      : ['iso-8859-1', 'latin1'].includes(charset) ? 'iso-8859-1'
      : ['windows-1252', 'cp1252'].includes(charset) ? 'windows-1252'
      : charset ? 'utf-8' : (isBrazilianFeed ? 'iso-8859-1' : 'utf-8');
    let xml = new TextDecoder(encoding).decode(buffer);
    // Se detectar caracteres de substituição (), tentar ISO-8859-1 (comum em feeds BR)
    if (encoding === 'utf-8' && isBrazilianFeed && xml.includes('\uFFFD')) {
      xml = new TextDecoder('iso-8859-1').decode(buffer);
    }

    // Extrair items do RSS/Atom
    const items: string[] = [];
    
    // RSS 2.0 items
    const rssItemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
    let match;
    while ((match = rssItemRegex.exec(xml)) !== null) {
      items.push(match[0]);
    }

    // Atom entries
    if (items.length === 0) {
      const atomEntryRegex = /<entry[\s>]([\s\S]*?)<\/entry>/gi;
      while ((match = atomEntryRegex.exec(xml)) !== null) {
        items.push(match[0]);
      }
    }

    // Parse cada item (máximo 15 por feed)
    const articles: NewsArticle[] = [];
    for (const item of items.slice(0, 10)) {
      const article = parseRSSItem(item, feed.name, feed.category);
      if (article) {
        articles.push(article);
      }
    }

    return articles;
  } catch {
    // Silently ignore feed errors (timeout, network, etc.)
    return [];
  }
}

// ============================================================
// Buscar todas as notícias de todas as fontes
// ============================================================
async function fetchAllNews(category?: string): Promise<NewsArticle[]> {
  let feeds = RSS_FEEDS;
  if (category === 'Top Stories' || category === 'all' || !category) {
    feeds = RSS_FEEDS.filter(f => TOP_STORIES_FEED_NAMES.includes(f.name));
    if (feeds.length < 4) feeds = RSS_FEEDS.slice(0, 8);
  } else if (category) {
    const categoryMap: Record<string, string[]> = {
      'Brasil': ['Brasil'],
      'Mundo': ['Mundo'],
      'Tecnologia': ['Tecnologia'],
      'Esportes': ['Esportes'],
      'Saúde': ['Saúde'],
      'Economia': ['Economia'],
      'Entretenimento': ['Entretenimento'],
      'Política': ['Política'],
      'Ciência': ['Ciência'],
    };
    const cats = categoryMap[category];
    if (cats) {
      feeds = RSS_FEEDS.filter(f => cats.includes(f.category));
    }
    // Se poucos feeds para a categoria, incluir também Top Stories
    if (feeds.length < 3) {
      feeds = [...feeds, ...RSS_FEEDS.filter(f => f.category === 'Brasil' || f.category === 'Mundo').slice(0, 3)];
    }
  }

  const BATCH_SIZE = 10;
  const allArticles: NewsArticle[] = [];

  for (let i = 0; i < feeds.length; i += BATCH_SIZE) {
    const batch = feeds.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(batch.map(feed => fetchFeed(feed)));
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allArticles.push(...result.value);
      }
    }
  }

  // Deduplicar por URL
  const seen = new Map<string, NewsArticle>();
  for (const article of allArticles) {
    const key = article.url;
    if (!seen.has(key)) {
      seen.set(key, article);
    }
  }

  // Ordenar por data (mais recentes primeiro)
  const unique = Array.from(seen.values());
  unique.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  return unique;
}

// ============================================================
// Imagens fallback por categoria
// ============================================================
const FALLBACK_IMAGES: Record<string, string> = {
  'Brasil': 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=600&auto=format&fit=crop&q=60',
  'Mundo': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=60',
  'Tecnologia': 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=60',
  'Esportes': 'https://images.unsplash.com/photo-1461896836934-bd45ba8b0e28?w=600&auto=format&fit=crop&q=60',
  'Saúde': 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&auto=format&fit=crop&q=60',
  'Economia': 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&auto=format&fit=crop&q=60',
  'Entretenimento': 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&auto=format&fit=crop&q=60',
  'Política': 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=600&auto=format&fit=crop&q=60',
  'Ciência': 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=600&auto=format&fit=crop&q=60',
  'default': 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&auto=format&fit=crop&q=60',
};

// ============================================================
// GET /api/news?category=Top+Stories
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const category = request.nextUrl.searchParams.get('category') || 'Top Stories';
    const cacheKey = `news:${category}`;

    // Verificar cache
    const cached = newsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(
      {
        articles: cached.articles,
        cached: true,
        cachedAt: new Date(cached.timestamp).toISOString(),
        expiresAt: new Date(cached.timestamp + CACHE_TTL).toISOString(),
        count: cached.articles.length,
      },
      {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=300, s-maxage=300',
          'X-Cache': 'HIT',
        },
      }
    );
    }

    // Buscar notícias frescas
    const articles = await fetchAllNews(category);

    // Garantir que todas as notícias tenham imagem (fallback)
    const articlesWithImages = articles.map(article => ({
      ...article,
      image: article.image || FALLBACK_IMAGES[article.category] || FALLBACK_IMAGES['default'],
    }));

    const limited = articlesWithImages.slice(0, 40);

    // Salvar no cache
    newsCache.set(cacheKey, {
      articles: limited,
      timestamp: Date.now(),
    });

    return NextResponse.json(
      {
        articles: limited,
        cached: false,
        cachedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + CACHE_TTL).toISOString(),
        count: limited.length,
      },
      {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=300, s-maxage=300',
          'X-Cache': 'MISS',
        },
      }
    );
  } catch (err) {
    console.error('Error in /api/news:', err);
    return NextResponse.json({ 
      articles: [], 
      error: 'Failed to fetch news',
      count: 0 
    }, { status: 500 });
  }
}
