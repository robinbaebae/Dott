/**
 * Sanitize HTML – strip dangerous elements and event handlers.
 * Works in both server (Node) and client (browser) environments.
 *
 * Removes: script, iframe, object, embed, form, input, link, style tags
 * Removes: on* event handler attributes, javascript: URLs
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  // If DOMParser is available (browser / Electron renderer), use it for robust parsing
  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc
      .querySelectorAll('script,iframe,object,embed,form,input,link,style')
      .forEach((el) => el.remove());
    doc.querySelectorAll('*').forEach((el) => {
      for (const attr of Array.from(el.attributes)) {
        if (
          attr.name.startsWith('on') ||
          attr.value.trim().toLowerCase().startsWith('javascript:')
        ) {
          el.removeAttribute(attr.name);
        }
      }
    });
    return doc.body.innerHTML;
  }

  // Fallback: regex-based stripping for server-side (Next.js RSC / Node)
  let safe = html;
  // Remove dangerous tags and their content
  const dangerousTags = ['script', 'iframe', 'object', 'embed', 'form', 'input', 'link', 'style'];
  for (const tag of dangerousTags) {
    safe = safe.replace(new RegExp(`<${tag}[^>]*>[\\s\\S]*?</${tag}>`, 'gi'), '');
    safe = safe.replace(new RegExp(`<${tag}[^>]*/?>`, 'gi'), '');
  }
  // Remove on* event handlers and javascript: URLs from attributes
  safe = safe.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  safe = safe.replace(/href\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, '');
  safe = safe.replace(/src\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, '');

  return safe;
}
