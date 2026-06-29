import Anthropic from '@anthropic-ai/sdk';
import crypto from 'crypto';
import type { RawJob, NormalizedJob } from '../shared/types.js';

const PROMPT = (job: RawJob) => `Extract structured data from this job posting. Return ONLY valid JSON — no markdown, no explanation.

Source: ${job.source}
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Salary: ${job.salary ?? 'not stated'}
Description (first 2000 chars):
${job.description.slice(0, 2000)}

Return exactly this shape:
{
  "title": "<clean job title, no seniority prefix>",
  "remote": <true if fully remote, false otherwise>,
  "seniorityLevel": "<junior|mid|senior|staff|principal|unknown>",
  "requiredSkills": ["<skill>"],
  "niceToHaveSkills": ["<skill>"],
  "techStack": ["<technology>"],
  "salaryMin": <number in USD/yr or null>,
  "salaryMax": <number in USD/yr or null>,
  "salaryCurrency": "<USD|EUR|GBP|null>",
  "yearsRequired": <number, 0 if not stated>
}`;

async function normalizeOne(
  client: Anthropic,
  raw: RawJob,
): Promise<NormalizedJob> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{ role: 'user', content: PROMPT(raw) }],
  });

  const block = message.content[0];
  if (!block || block.type !== 'text') {
    throw new Error('Normalizer: unexpected response from Claude');
  }

  const jsonMatch = block.text.trim().match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Normalizer: no JSON in response for "${raw.title}"`);

  const parsed = JSON.parse(jsonMatch[0]) as Omit<
    NormalizedJob,
    'id' | 'source' | 'sourceId' | 'company' | 'url' | 'location' | 'postedAt' | 'fetchedAt'
  >;

  return {
    id: crypto.createHash('sha1').update(`${raw.source}:${raw.sourceId}`).digest('hex').slice(0, 16),
    source: raw.source,
    sourceId: raw.sourceId,
    company: raw.company,
    url: raw.url,
    location: raw.location,
    postedAt: raw.postedAt,
    fetchedAt: new Date().toISOString(),
    ...parsed,
    // Coerce types Claude might return as strings
    salaryMin: parsed.salaryMin ? Number(parsed.salaryMin) : undefined,
    salaryMax: parsed.salaryMax ? Number(parsed.salaryMax) : undefined,
    yearsRequired: Number(parsed.yearsRequired) || 0,
  };
}

export async function normalizeBatch(
  rawJobs: RawJob[],
  apiKey: string,
  onProgress?: (done: number, total: number) => void,
): Promise<NormalizedJob[]> {
  const client = new Anthropic({ apiKey });
  const results: NormalizedJob[] = [];
  const BATCH_SIZE = 5;
  const DELAY_MS = 500;

  for (let i = 0; i < rawJobs.length; i += BATCH_SIZE) {
    const batch = rawJobs.slice(i, i + BATCH_SIZE);

    const settled = await Promise.allSettled(
      batch.map((raw) => normalizeOne(client, raw)),
    );

    for (const result of settled) {
      if (result.status === 'fulfilled') results.push(result.value);
    }

    onProgress?.(Math.min(i + BATCH_SIZE, rawJobs.length), rawJobs.length);

    if (i + BATCH_SIZE < rawJobs.length) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  return results;
}
