import * as p from '@clack/prompts';
import pc from 'picocolors';
import { loadConfig } from '../../shared/config.js';
import { storage } from '../../pipeline/storage.js';
import { searchJobs } from '../../analysis/search.js';

export async function search(query?: string): Promise<void> {
  let config;
  try { config = loadConfig(); } catch {
    p.log.error('No config found. Run: ghost-intel setup');
    process.exit(1);
  }

  p.intro(pc.cyan('Ghost Intel — Natural Language Search'));

  let searchQuery = query?.trim();

  if (!searchQuery) {
    const input = await p.text({
      message: 'What are you looking for?',
      placeholder: 'senior remote Playwright engineer with TypeScript, $150k+',
      validate: (v) => (!v.trim() ? 'Please enter a search query' : undefined),
    });
    if (p.isCancel(input)) { p.cancel('Cancelled'); process.exit(0); }
    searchQuery = input as string;
  }

  const jobs = storage.getAll();
  if (jobs.length === 0) {
    p.outro(pc.yellow('No jobs stored yet. Run: ghost-intel fetch'));
    return;
  }

  const spinner = p.spinner();
  spinner.start(`Searching ${jobs.length} jobs with Claude...`);

  const results = await searchJobs(searchQuery, jobs, config.anthropicApiKey, 10);
  spinner.stop(pc.green(`Found ${results.length} matching jobs`));

  if (results.length === 0) {
    p.outro(pc.yellow('No matches. Try different terms or run ghost-intel fetch for more data.'));
    return;
  }

  console.log('\n' + pc.bold(`Results for: "${searchQuery}"`));
  console.log(pc.dim('─'.repeat(60)));

  for (let i = 0; i < results.length; i++) {
    const { job, relevanceScore, reasoning } = results[i]!;
    const score = relevanceScore >= 80 ? pc.green(`${relevanceScore}%`) : relevanceScore >= 60 ? pc.yellow(`${relevanceScore}%`) : pc.dim(`${relevanceScore}%`);
    const remote = job.remote ? pc.green('Remote') : pc.dim(job.location);
    const salary =
      job.salaryMin && job.salaryMax
        ? pc.cyan(` | $${Math.round(job.salaryMin / 1000)}k–$${Math.round(job.salaryMax / 1000)}k`)
        : '';

    console.log(`\n${pc.bold(`${i + 1}. ${job.title}`)} @ ${pc.bold(job.company)}`);
    console.log(`   ${score} match | ${remote} | ${job.seniorityLevel}${salary}`);
    console.log(`   ${pc.dim(reasoning)}`);
    console.log(`   ${pc.blue(job.url)}`);

    if (job.requiredSkills.length > 0) {
      console.log(`   Skills: ${job.requiredSkills.slice(0, 6).join(', ')}`);
    }
  }

  console.log('\n' + pc.dim('─'.repeat(60)));
  p.outro(pc.green(`Showing top ${results.length} of ${jobs.length} stored jobs`));
}
