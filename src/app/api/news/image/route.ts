import { NextResponse, type NextRequest } from 'next/server';

// ============================================================
// Proxy de imagens para notícias
// Evita bloqueio de hotlinking por portais de notícias
// Sempre retorna imagem válida (proxy ou fallback servido diretamente)
// ============================================================

const IMAGE_CACHE = new Map<string, { data: ArrayBuffer; contentType: string; timestamp: number }>();
const IMAGE_CACHE_TTL = 60 * 60 * 1000; // 1 hora
const MAX_CACHE_SIZE = 200;
const FALLBACK_URL = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&auto=format&fit=crop&q=60';

async function fetchImageAsBuffer(imgUrl: string, referer?: string): Promise<{ data: ArrayBuffer; contentType: string } | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
    };
    if (referer) headers['Referer'] = referer;
    const res = await fetch(imgUrl, { signal: controller.signal, headers, redirect: 'follow' });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || 'image/jpeg';
    if (!ct.startsWith('image/') && !ct.includes('octet-stream')) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 100 || buf.byteLength > 6 * 1024 * 1024) return null;
    return { data: buf, contentType: ct.split(';')[0].trim() };
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

async function getFallbackImage(): Promise<ArrayBuffer> {
  const res = await fetchImageAsBuffer(FALLBACK_URL);
  if (res) return res.data;
  // Fallback binário mínimo (1x1 PNG) se Unsplash falhar
  return new Uint8Array([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
    0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x62, 0x00, 0x00, 0x00, 0x02,
    0x00, 0x01, 0xE5, 0x27, 0xDE, 0xFC, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
    0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82,
  ]).buffer;
}

export async function GET(request: NextRequest) {
  let url = request.nextUrl.searchParams.get('url');

  if (!url || typeof url !== 'string') {
    const fallback = await getFallbackImage();
    return new NextResponse(fallback, {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=60' },
    });
  }

  try {
    url = decodeURIComponent(url);
  } catch {
    /* manter url original */
  }

  try {
    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      const fallback = await getFallbackImage();
      return new NextResponse(fallback, {
        headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=60' },
      });
    }
  } catch {
    const fallback = await getFallbackImage();
    return new NextResponse(fallback, {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=60' },
    });
  }

  const cached = IMAGE_CACHE.get(url);
  if (cached && Date.now() - cached.timestamp < IMAGE_CACHE_TTL) {
    return new NextResponse(cached.data, {
      headers: {
        'Content-Type': cached.contentType,
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'X-Cache': 'HIT',
      },
    });
  }

  const origin = new URL(url).origin + '/';
  let result = await fetchImageAsBuffer(url, origin);
  if (!result) result = await fetchImageAsBuffer(url); // retry sem Referer
  if (!result) {
    const fallback = await getFallbackImage();
    return new NextResponse(fallback, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=300',
        'X-Cache': 'FALLBACK',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  if (IMAGE_CACHE.size >= MAX_CACHE_SIZE) {
    const entries = Array.from(IMAGE_CACHE.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    for (const [key] of entries.slice(0, Math.floor(MAX_CACHE_SIZE / 4))) {
      IMAGE_CACHE.delete(key);
    }
  }
  IMAGE_CACHE.set(url, { data: result.data, contentType: result.contentType, timestamp: Date.now() });

  return new NextResponse(result.data, {
    headers: {
      'Content-Type': result.contentType,
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'X-Cache': 'MISS',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
