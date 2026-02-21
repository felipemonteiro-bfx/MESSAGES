import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const cache = new Map<string, { data: LinkPreviewData; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 min

interface LinkPreviewData {
  title?: string;
  description?: string;
  image?: string;
  domain: string;
}

function extractMeta(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, 'i'),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m?.[1]?.trim() || null;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'url param required' }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  const cached = cache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data, {
      headers: { 'Cache-Control': 'public, max-age=1800' },
    });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LinkPreviewBot/1.0)',
        'Accept': 'text/html',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch URL' }, { status: 502 });
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      const domain = new URL(url).hostname.replace('www.', '');
      return NextResponse.json({ domain, title: domain } as LinkPreviewData);
    }

    const html = await res.text();
    const first10k = html.slice(0, 15000);

    const ogTitle = extractMeta(first10k, 'og:title');
    const ogDesc = extractMeta(first10k, 'og:description');
    const ogImage = extractMeta(first10k, 'og:image');
    const twitterTitle = extractMeta(first10k, 'twitter:title');
    const twitterDesc = extractMeta(first10k, 'twitter:description');
    const twitterImage = extractMeta(first10k, 'twitter:image');
    const metaDesc = extractMeta(first10k, 'description');
    const pageTitle = extractTitle(first10k);

    const domain = new URL(url).hostname.replace('www.', '');

    const data: LinkPreviewData = {
      title: ogTitle || twitterTitle || pageTitle || domain,
      description: (ogDesc || twitterDesc || metaDesc || '').slice(0, 200),
      image: ogImage || twitterImage || undefined,
      domain,
    };

    cache.set(url, { data, timestamp: Date.now() });

    if (cache.size > 500) {
      const oldest = [...cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
      for (let i = 0; i < 100; i++) cache.delete(oldest[i][0]);
    }

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=1800' },
    });
  } catch {
    const domain = new URL(url).hostname.replace('www.', '');
    return NextResponse.json({ domain, title: domain } as LinkPreviewData);
  }
}
