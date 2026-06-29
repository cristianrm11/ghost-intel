import * as p from '@clack/prompts';
import pc from 'picocolors';
import { loadConfig } from '../../shared/config.js';
import { storage } from '../../pipeline/storage.js';
import { generateReport } from '../../analysis/trends.js';

export async function analyze(daysArg?: string): Promise<void> {
  let config;
  try { config = loadConfig(); } catch {
    p.log.error('No config found. Run: ghost-intel setup');
    process.exit(1);
  }

  p.intro(pc.cyan('Ghost Intel — Market Analysis'));

  const days = daysArg ? parseInt(daysArg, 10) : 30;
  if (isNaN(days) || days < 1) {
    p.log.error('Invalid days argument. Example: ghost-intel analyze 7');
    process.exit(1);
  }

  const jobs = days === 0 ? storage.getAll() : storage.getSince(days);

  if (jobs.length === 0) {
    p.outro(pc.yellow(`No jobs in the last ${days} days. Run: ghost-intel fetch`));
    return;
  }

  p.log.info(`Analyzing ${jobs.length} jobs from the last ${days} days...`);

  const spinner = p.spinner();
  spinner.start('Generating report with Claude Sonnet...');

  const report = await generateReport(jobs, config.anthropicApiKey);
  spinner.stop(pc.green('Report generated'));

  // Display report
  console.log('\n' + pc.bold(pc.cyan('═══ GHOST INTEL MARKET REPORT ═══')));
  console.log(pc.dim(`Generated: ${new Date(report.generatedAt).toLocaleString()}`));
  console.log(pc.dim(`Jobs analyzed: ${report.jobCount} | Sources: ${Object.keys(report.sources).join(', ')}`));

  console.log('\n' + pc.bold('Market Overview'));
  console.log(report.narrative);

  console.log('\n' + pc.bold('Top Required Skills'));
  const maxCount = report.topSkills[0]?.count ?? 1;
  for (const skill of report.topSkills.slice(0, 10)) {
    const bar = '█'.repeat(Math.round((skill.count / maxCount) * 20));
    console.log(`  ${skill.skill.padEnd(25)} ${bar} ${skill.count}`);
  }

  console.log('\n' + pc.bold('Top Hiring Companies'));
  report.topCompanies.slice(0, 5).forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.company} (${c.count} openings)`);
  });

  console.log('\n' + pc.bold('Seniority Breakdown'));
  const levels = Object.entries(report.seniorityBreakdown).filter(([, v]) => v > 0);
  for (const [level, count] of levels) {
    const pct = Math.round((count / report.jobCount) * 100);
    console.log(`  ${level.padEnd(12)} ${pct}% (${count} jobs)`);
  }

  console.log('\n' + pc.bold('Remote Work'));
  console.log(`  ${report.remotePercentage}% of roles are fully remote`);

  if (report.salaryStats) {
    console.log('\n' + pc.bold('Salary Range'));
    console.log(
      `  $${Math.round(report.salaryStats.min / 1000)}k – $${Math.round(report.salaryStats.max / 1000)}k ` +
        `(median $${Math.round(report.salaryStats.median / 1000)}k ${report.salaryStats.currency})`,
    );
  }

  console.log('\n' + pc.dim('═══════════════════════════════════'));
  p.outro(pc.green('Done. Use: ghost-intel search "<query>" to find specific roles.'));
}
