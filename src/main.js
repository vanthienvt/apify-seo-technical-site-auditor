import { Actor } from 'apify';

export async function auditSeoPage(url) {
  const start = Date.now();
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AgencySeoAuditor/1.0)' },
  });
  const html = await res.text();
  const loadTimeMs = Date.now() - start;

  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || null;
  const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1]?.trim() || null;
  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i)?.[1]?.trim() || null;
  const h1Count = [...html.matchAll(/<h1\b[^>]*>/gi)].length;
  const imgWithoutAlt = [...html.matchAll(/<img\b(?![^>]*\balt=["'][^"']+["'])[^>]*>/gi)].length;
  const hasJsonLd = /application\/ld\+json/i.test(html);

  const issues = [];
  if (!title) issues.push('MISSING_TITLE');
  else if (title.length < 15 || title.length > 65) issues.push('SUBOPTIMAL_TITLE_LENGTH');
  if (!metaDesc) issues.push('MISSING_META_DESCRIPTION');
  if (h1Count === 0) issues.push('MISSING_H1');
  if (h1Count > 1) issues.push('MULTIPLE_H1_TAGS');
  if (!canonical) issues.push('MISSING_CANONICAL_TAG');
  if (imgWithoutAlt > 0) issues.push(`IMAGES_MISSING_ALT_${imgWithoutAlt}`);

  const score = Math.max(0, 100 - issues.length * 14);

  return {
    url,
    httpStatus: res.status,
    loadTimeMs,
    seoScore: score,
    title,
    metaDescription: metaDesc,
    canonicalUrl: canonical,
    h1Count,
    imagesMissingAlt: imgWithoutAlt,
    hasJsonLdSchema: hasJsonLd,
    issues,
    auditedAt: new Date().toISOString(),
  };
}

await Actor.init();
const input = (await Actor.getInput()) || {};
const urls = Array.isArray(input.urls) && input.urls.length > 0 ? input.urls : ['https://example.com'];

const results = [];
for (const u of urls) {
  try {
    results.push(await auditSeoPage(u));
  } catch (e) {
    results.push({ url: u, error: e.message, auditedAt: new Date().toISOString() });
  }
}

await Actor.pushData(results);
console.log('Pushed', results.length, 'SEO audit records to Apify Dataset.');
await Actor.exit();
