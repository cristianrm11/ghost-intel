import Anthropic from '@anthropic-ai/sdk';
import type { NormalizedJob, MarketReport, SeniorityLevel, JobSource, SkillTrend } from '../shared/types.js';

function topNSkills(items: string[], n: number, total: number): SkillTrend[] {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([skill, count]) => ({ skill, count, percentage: total > 0 ? Math.round((count / total) * 100) : 0 }));
}

function topNCompanies(items: string[], n: number): { company: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([company, count]) => ({ company, count }));
}

function computeStats(jobs: NormalizedJob[]) {
  const allSkills = jobs.flatMap((j) => j.requiredSkills);
  const allTech = jobs.flatMap((j) => j.techStack);
  const topSkills = topNSkills(allSkills, 20, jobs.length);
  const topTech = topNSkills(allTech, 10, jobs.length);
  void topTech; // available for future use
  const topCompanies = topNCompanies(jobs.map((j) => j.company), 10);

  const remoteCount = jobs.filter((j) => j.remote).length;
  const remotePercentage = jobs.length > 0 ? Math.round((remoteCount / jobs.length) * 100) : 0;

  const seniorityBreakdown = Object.fromEntries(
    (['junior', 'mid', 'senior', 'staff', 'principal', 'unknown'] as SeniorityLevel[]).map(
      (level) => [level, jobs.filter((j) => j.seniorityLevel === level).length],
    ),
  ) as Record<SeniorityLevel, number>;

  const jobsWithSalary = jobs.filter((j) => j.salaryMin && j.salaryMax);
  const salaryStats =
    jobsWithSalary.length > 0
      ? {
          min: Math.min(...jobsWithSalary.map((j) => j.salaryMin!)),
          max: Math.max(...jobsWithSalary.map((j) => j.salaryMax!)),
          median: jobsWithSalary
            .map((j) => (j.salaryMin! + j.salaryMax!) / 2)
            .sort((a, b) => a - b)[Math.floor(jobsWithSalary.length / 2)]!,
          currency: jobsWithSalary[0]?.salaryCurrency ?? 'USD',
        }
      : undefined;

  return { topSkills, topCompanies, remotePercentage, seniorityBreakdown, salaryStats };
}

async function generateNarrative(
  jobs: NormalizedJob[],
  stats: ReturnType<typeof computeStats>,
  apiKey: string,
): Promise<string> {
  const client = new Anthropic({ apiKey });

  const prompt = `You are a senior talent market analyst. Write a 3-paragraph executive summary of current software engineering job market conditions based on this data. Be specific and actionable.

Data summary:
- Total jobs analyzed: ${jobs.length}
- Sources: ${[...new Set(jobs.map((j) => j.source))].join(', ')}
- Remote percentage: ${stats.remotePercentage}%
- Top required skills: ${stats.topSkills
    .slice(0, 10)
    .map((s) => `${s.skill} (${s.count})`)
    .join(', ')}
- Seniority breakdown: ${JSON.stringify(stats.seniorityBreakdown)}
${stats.salaryStats ? `- Salary range: $${Math.round(stats.salaryStats.min / 1000)}k–$${Math.round(stats.salaryStats.max / 1000)}k (median $${Math.round(stats.salaryStats.median / 1000)}k)` : '- Salary data: limited'}

Paragraph 1: Current market conditions and demand signals.
Paragraph 2: Skill and technology trends that candidates should prioritize.
Paragraph 3: Actionable advice for job seekers targeting this market.`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  });

  const block = message.content[0];
  if (!block || block.type !== 'text') throw new Error('Trends: unexpected Claude response');
  return block.text.trim();
}

export async function generateReport(
  jobs: NormalizedJob[],
  apiKey: string,
): Promise<MarketReport> {
  const stats = computeStats(jobs);
  const narrative = await generateNarrative(jobs, stats, apiKey);

  const sourceBreakdown = Object.fromEntries(
    (['remoteok', 'adzuna', 'hn'] as JobSource[]).map((s) => [
      s,
      jobs.filter((j) => j.source === s).length,
    ]),
  ) as Record<JobSource, number>;

  return {
    generatedAt: new Date().toISOString(),
    jobCount: jobs.length,
    sources: sourceBreakdown,
    topSkills: stats.topSkills,
    topCompanies: stats.topCompanies,
    remotePercentage: stats.remotePercentage,
    seniorityBreakdown: stats.seniorityBreakdown,
    salaryStats: stats.salaryStats,
    narrative,
    skillGaps: stats.topSkills.slice(0, 15).map((s) => s.skill),
  };
}
