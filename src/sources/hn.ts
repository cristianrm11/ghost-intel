import type { RawJob } from '../shared/types.js';

interface AlgoliaHit {
  objectID: string;
  title: string;
  points: number;
  num_comments: number;
}

interface AlgoliaSearchResult {
  hits: AlgoliaHit[];
}

interface HNItem {
  id: number;
  title: string;
  children?: HNComment[];
}

interface HNComment {
  id: number;
  text?: string;
  author?: string;
  created_at: string;
  children?: HNComment[];
}

function parseJobFromComment(comment: HNComment): Partial<RawJob> | null {
  const text = comment.text ?? '';
  if (!text || text.length < 50) return null;

  // Strip HTML
  const plain = text.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ').trim();

  // HN job format is often: "Company | Role | Location | ..."
  const parts = plain.split(/\s*[|•·]\s*/);
  const company = parts[0]?.trim() ?? 'Unknown';
  const title = parts[1]?.trim() ?? parts[0]?.trim() ?? 'Software Engineer';

  return {
    source: 'hn' as const,
    sourceId: String(comment.id),
    title,
    company,
    url: `https://news.ycombinator.com/item?id=${comment.id}`,
    description: plain.slice(0, 3000),
    location: parts.find((p) => /remote|onsite|hybrid|US|EU|UK|CA/i.test(p))?.trim() ?? 'Unknown',
    postedAt: comment.created_at,
  };
}

function matchesKeywords(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

export async function fetchHNHiring(keywords: string[], limit: number): Promise<RawJob[]> {
  // Find the latest "Ask HN: Who is hiring?" post
  const searchRes = await fetch(
    'https://hn.algolia.com/api/v1/search?query=Ask+HN%3A+Who+is+hiring%3F&tags=ask_hn&hitsPerPage=1',
  );
  if (!searchRes.ok) throw new Error(`HN Algolia search error: ${searchRes.status}`);

  const searchData = (await searchRes.json()) as AlgoliaSearchResult;
  const hit = searchData.hits[0];
  if (!hit) throw new Error('No HN hiring post found');

  // Fetch the post with all comments
  const itemRes = await fetch(`https://hn.algolia.com/api/v1/items/${hit.objectID}`);
  if (!itemRes.ok) throw new Error(`HN item fetch error: ${itemRes.status}`);

  const item = (await itemRes.json()) as HNItem;
  const comments = item.children ?? [];

  const jobs: RawJob[] = [];

  for (const comment of comments) {
    if (jobs.length >= limit) break;
    const text = (comment.text ?? '').replace(/<[^>]*>/g, ' ');
    if (!matchesKeywords(text, keywords)) continue;

    const parsed = parseJobFromComment(comment);
    if (!parsed || !parsed.sourceId) continue;

    jobs.push(parsed as RawJob);
  }

  return jobs;
}
