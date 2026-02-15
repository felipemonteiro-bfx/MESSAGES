import { NextResponse, type NextRequest } from 'next/server';

// ============================================================
// Proxy de imagens para notícias
// Evita problemas de CORS ao carregar imagens de fontes externas
// Cache de 1 hora para imagens
// Sempre retorna uma imagem (fallback se necessário)
// ============================================================

const IMAGE_CACHE = new Map<string, { data: ArrayBuffer; contentType: string; timestamp: number }>();
const IMAGE_CACHE_TTL = 60 * 60 * 1000; // 1 hora
const MAX_CACHE_SIZE = 200;

// Fallback: 1x1 pixel transparente PNG (para evitar redirect loops)
const TRANSPARENT_PIXEL = new Uint8Array([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
  0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x62, 0x00, 0x00, 0x00, 0x02,
  0x00, 0x01, 0xE5, 0x27, 0xDE, 0xFC, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
  0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82,
]).buffer;

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return new NextResponse(TRANSPARENT_PIXEL, {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=60' },
    });
  }

  // Validar URL
  try {
    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return new NextResponse(TRANSPARENT_PIXEL, {
        headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=60' },
      });
    }
  } catch {
    return new NextResponse(TRANSPARENT_PIXEL, {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=60' },
    });
  }

  // Verificar cache
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

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': new URL(url).origin + '/',
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'cross-site',
      },
      redirect: 'follow',
    });

    clearTimeout(timeout);

    if (!response.ok) {
      // Redirecionar para fallback do Unsplash
      return NextResponse.redirect(
        'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&auto=format&fit=crop&q=60',
        { status: 302, headers: { 'Cache-Control': 'public, max-age=300' } }
      );
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // Se não é imagem, retornar fallback
    if (!contentType.startsWith('image/') && !contentType.includes('octet-stream')) {
      return NextResponse.redirect(
        'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&auto=format&fit=crop&q=60',
        { status: 302, headers: { 'Cache-Control': 'public, max-age=300' } }
      );
    }

    const data = await response.arrayBuffer();

    // Limitar tamanho (máximo 5MB)
    if (data.byteLength > 5 * 1024 * 1024 || data.byteLength < 100) {
      return NextResponse.redirect(
        'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&auto=format&fit=crop&q=60',
        { status: 302, headers: { 'Cache-Control': 'public, max-age=300' } }
      );
    }

    // Limpar cache se necessário
    if (IMAGE_CACHE.size >= MAX_CACHE_SIZE) {
      const entries = Array.from(IMAGE_CACHE.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      for (const [key] of entries.slice(0, Math.floor(MAX_CACHE_SIZE / 4))) {
        IMAGE_CACHE.delete(key);
      }
    }

    IMAGE_CACHE.set(url, { data, contentType, timestamp: Date.now() });

    return new NextResponse(data, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'X-Cache': 'MISS',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    // Qualquer erro: retornar fallback
    return NextResponse.redirect(
      'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&auto=format&fit=crop&q=60',
      { status: 302, headers: { 'Cache-Control': 'public, max-age=300' } }
    );
  }
}
