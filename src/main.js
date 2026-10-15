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

async function main() {
  const urls = ['https://example.com'];
  const out = [];
  for (const u of urls) {
    out.push(await auditSeoPage(u));
  }
  console.log(JSON.stringify(out, null, 2));
}

main();
