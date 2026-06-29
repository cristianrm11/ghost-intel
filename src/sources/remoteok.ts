import type { RawJob } from '../shared/types.js';

interface RemoteOKJob {
  id: string;
  position: string;
  company: string;
  url: string;
  description: string;
  location: string;
  salary_min?: number;
  salary_max?: number;
  date: string;
  tags?: string[];
}

function matchesKeywords(job: RemoteOKJob, keywords: string[]): boolean {
  const text = `${job.position} ${job.description} ${(job.tags ?? []).join(' ')}`.toLowerCase();
  return keywords.some((kw) => text.includes(kw.toLowerCase()));
}

export async function fetchRemoteOK(keywords: string[], limit: number): Promise<RawJob[]> {
  const res = await fetch('https://remoteok.com/api', {
    headers: { 'User-Agent': 'ghost-intel/0.1.0 (career intelligence pipeline)' },
  });

  if (!res.ok) throw new Error(`RemoteOK API error: ${res.status}`);

  const raw = (await res.json()) as unknown[];
  // First element is metadata, rest are jobs
  const jobs = raw.slice(1).filter((item): item is RemoteOKJob =>
    typeof item === 'object' && item !== null && 'position' in item,
  );

  return jobs
    .filter((job) => matchesKeywords(job, keywords))
    .slice(0, limit)
    .map((job) => ({
      source: 'remoteok' as const,
      sourceId: String(job.id),
      title: job.position,
      company: job.company,
      url: job.url,
      description: job.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
      location: job.location || 'Remote',
      salary: job.salary_min && job.salary_max
        ? `$${job.salary_min}–$${job.salary_max}`
        : undefined,
      postedAt: job.date,
    }));
}
