import type { RawJob } from '../shared/types.js';

interface AdzunaJob {
  id: string;
  title: string;
  company: { display_name: string };
  redirect_url: string;
  description: string;
  location: { display_name: string };
  salary_min?: number;
  salary_max?: number;
  created: string;
}

interface AdzunaResponse {
  results: AdzunaJob[];
}

export async function fetchAdzuna(
  keywords: string[],
  limit: number,
  appId: string,
  apiKey: string,
): Promise<RawJob[]> {
  const perPage = Math.min(limit, 50);
  const query = encodeURIComponent(keywords.join(' '));
  const url = `https://api.adzuna.com/v1/api/jobs/us/search/1` +
    `?app_id=${appId}&app_key=${apiKey}` +
    `&what=${query}&results_per_page=${perPage}&content-type=application/json`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Adzuna API error: ${res.status}`);

  const data = (await res.json()) as AdzunaResponse;
  if (!Array.isArray(data.results)) throw new Error('Adzuna returned unexpected response shape');

  return data.results.map((job) => ({
    source: 'adzuna' as const,
    sourceId: job.id,
    title: job.title,
    company: job.company.display_name,
    url: job.redirect_url,
    description: job.description,
    location: job.location.display_name,
    salary: job.salary_min && job.salary_max
      ? `$${Math.round(job.salary_min / 1000)}k–$${Math.round(job.salary_max / 1000)}k`
      : undefined,
    postedAt: job.created,
  }));
}
