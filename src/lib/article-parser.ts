import { load } from 'cheerio';

export interface ArticleContent {
  content_text: string;
  content_html: string;
  og_image: string;
}

const CONTENT_SELECTORS = [
  'article',
  '[role="main"]',
  '.post-content',
  '.entry-content',
  '.article-body',
  '.article-content',
  '.post-body',
  'main',
];

const REMOVE_SELECTORS = [
  'script',
  'style',
  'noscript',
  'iframe',
  'nav',
  'footer',
  'aside',
  'header',
  '.ad',
  '.ads',
  '.advertisement',
  '.social-share',
  '.social-buttons',
  '.share-buttons',
  '.related-posts',
  '.comments',
  '.comment-section',
  '.sidebar',
  '.newsletter-signup',
  '.popup',
  '.modal',
  '[role="navigation"]',
  '[role="banner"]',
  '[role="complementary"]',
];

async function resolveGoogleNewsUrl(url: string): Promise<string> {
  if (!url.includes('news.google.com')) return url;

  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(5000),
    });
    return res.url || url;
  } catch {
    // Try GET with manual redirect follow
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(5000),
      });
      return res.url || url;
    } catch {
      return url;
    }
  }
}

export async function fetchArticleContent(url: string): Promise<ArticleContent> {
  const empty: ArticleContent = { content_text: '', content_html: '', og_image: '' };

  try {
    // Resolve Google News redirects
    const resolvedUrl = await resolveGoogleNewsUrl(url);

    const res = await fetch(resolvedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return empty;

    const html = await res.text();
    const $ = load(html);

    // Extract OG image
    const og_image =
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      '';

    // Remove unwanted elements
    $(REMOVE_SELECTORS.join(', ')).remove();

    // Find content container
    let $content = $('____nonexistent');

    for (const selector of CONTENT_SELECTORS) {
      const $el = $(selector);
      if ($el.length > 0 && ($el.text().trim().length > 100)) {
        $content = $el.first();
        break;
      }
    }

    // Fallback to body if no content container found
    if ($content.length === 0) {
      $content = $('body');
    }

    if ($content.length === 0) return { ...empty, og_image };

    // Clean up the content further
    $content.find('img').each((_, el) => {
      const $img = $(el);
      const src = $img.attr('src') || $img.attr('data-src') || '';
      if (src) {
        $img.attr('src', src);
      }
      $img.removeAttr('srcset').removeAttr('sizes').removeAttr('loading');
    });

    // Extract text and HTML
    const content_text = $content.text().replace(/\s+/g, ' ').trim();
    const content_html = $content.html()?.trim() || '';

    // If content is too short, it's likely not the real article
    if (content_text.length < 50) return { ...empty, og_image };

    // Truncate extremely long content
    const maxTextLen = 50000;
    const maxHtmlLen = 200000;

    return {
      content_text: content_text.length > maxTextLen ? content_text.slice(0, maxTextLen) : content_text,
      content_html: content_html.length > maxHtmlLen ? content_html.slice(0, maxHtmlLen) : content_html,
      og_image,
    };
  } catch (err) {
    console.error('Article parse error:', err);
    return empty;
  }
}
