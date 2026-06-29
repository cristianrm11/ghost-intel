import Anthropic from '@anthropic-ai/sdk';
import type { NormalizedJob } from '../shared/types.js';

interface SearchResult {
  job: NormalizedJob;
  relevanceScore: number;
  reasoning: string;
}

async function scoreRelevance(
  query: string,
  jobs: NormalizedJob[],
  apiKey: string,
): Promise<SearchResult[]> {
  const client = new Anthropic({ apiKey });

  const jobSummaries = jobs.map((j, i) => {
    const salary =
      j.salaryMin && j.salaryMax
        ? ` | $${Math.round(j.salaryMin / 1000)}k–$${Math.round(j.salaryMax / 1000)}k`
        : '';
    return `${i}. [${j.source}] ${j.title} @ ${j.company} | ${j.seniorityLevel} | ${j.remote ? 'Remote' : j.location}${salary} | Skills: ${j.requiredSkills.slice(0, 5).join(', ')}`;
  });

  const prompt = `A job seeker is searching for: "${query}"

Here are ${jobs.length} job postings (format: index. [source] title @ company | level | location | skills):

${jobSummaries.join('\n')}

Score each job 0–100 for relevance to the search query. Return ONLY a JSON array (no markdown) with objects:
[{"index": <number>, "score": <0-100>, "reasoning": "<one sentence>"}]

Only include jobs with score >= 40. Sort by score descending.`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const block = message.content[0];
  if (!block || block.type !== 'text') throw new Error('Search: unexpected Claude response');

  const jsonMatch = block.text.trim().match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  const scored = JSON.parse(jsonMatch[0]) as { index: number; score: number; reasoning: string }[];

  return scored
    .filter((s) => s.index >= 0 && s.index < jobs.length)
    .map((s) => ({
      job: jobs[s.index]!,
      relevanceScore: s.score,
      reasoning: s.reasoning,
    }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}

export async function searchJobs(
  query: string,
  jobs: NormalizedJob[],
  apiKey: string,
  limit = 10,
): Promise<SearchResult[]> {
  if (jobs.length === 0) return [];

  const BATCH_SIZE = 30;
  const allResults: SearchResult[] = [];

  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    const batch = jobs.slice(i, i + BATCH_SIZE);
    const results = await scoreRelevance(query, batch, apiKey);
    allResults.push(...results);
  }

  return allResults.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, limit);
}
