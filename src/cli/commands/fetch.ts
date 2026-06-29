import * as p from '@clack/prompts';
import pc from 'picocolors';
import { loadConfig } from '../../shared/config.js';
import { storage } from '../../pipeline/storage.js';
import { fetchRemoteOK } from '../../sources/remoteok.js';
import { fetchAdzuna } from '../../sources/adzuna.js';
import { fetchHNHiring } from '../../sources/hn.js';
import { normalizeBatch } from '../../pipeline/normalizer.js';
import type { RawJob } from '../../shared/types.js';

export async function fetch(): Promise<void> {
  let config;
  try { config = loadConfig(); } catch {
    p.log.error('No config found. Run: ghost-intel setup');
    process.exit(1);
  }

  p.intro(pc.cyan('Ghost Intel — Fetch Jobs'));

  const { keywords, maxJobsPerSource } = config.search;
  p.log.info(`Keywords: ${keywords.join(', ')} | Max per source: ${maxJobsPerSource}`);

  const rawJobs: RawJob[] = [];

  // RemoteOK
  const remoteOKSpinner = p.spinner();
  remoteOKSpinner.start('Fetching RemoteOK...');
  try {
    const jobs = await fetchRemoteOK(keywords, maxJobsPerSource);
    rawJobs.push(...jobs);
    remoteOKSpinner.stop(pc.green(`RemoteOK: ${jobs.length} jobs found`));
  } catch (err) {
    remoteOKSpinner.stop(pc.yellow(`RemoteOK: ${(err as Error).message}`));
  }

  // Adzuna (if configured)
  if (config.adzunaAppId && config.adzunaApiKey) {
    const adzunaSpinner = p.spinner();
    adzunaSpinner.start('Fetching Adzuna...');
    try {
      const jobs = await fetchAdzuna(keywords, maxJobsPerSource, config.adzunaAppId, config.adzunaApiKey);
      rawJobs.push(...jobs);
      adzunaSpinner.stop(pc.green(`Adzuna: ${jobs.length} jobs found`));
    } catch (err) {
      adzunaSpinner.stop(pc.yellow(`Adzuna: ${(err as Error).message}`));
    }
  }

  // HN Who's Hiring
  const hnSpinner = p.spinner();
  hnSpinner.start('Fetching HN Who\'s Hiring...');
  try {
    const jobs = await fetchHNHiring(keywords, maxJobsPerSource);
    rawJobs.push(...jobs);
    hnSpinner.stop(pc.green(`HN: ${jobs.length} jobs found`));
  } catch (err) {
    hnSpinner.stop(pc.yellow(`HN: ${(err as Error).message}`));
  }

  if (rawJobs.length === 0) {
    p.outro(pc.yellow('No jobs found. Try broader keywords.'));
    return;
  }

  // Deduplicate against seen
  const newJobs = rawJobs.filter((j) => !storage.hasSeen(j.source, j.sourceId));
  p.log.info(`${rawJobs.length} total | ${rawJobs.length - newJobs.length} already seen | ${newJobs.length} new`);

  if (newJobs.length === 0) {
    p.outro(pc.green('Nothing new since last fetch.'));
    return;
  }

  // Normalize via Claude
  const normalizeSpinner = p.spinner();
  normalizeSpinner.start(`Normalizing ${newJobs.length} jobs with Claude...`);

  const normalized = await normalizeBatch(
    newJobs,
    config.anthropicApiKey,
    (done, total) => normalizeSpinner.message(`Normalizing... ${done}/${total}`),
  );

  normalizeSpinner.stop(pc.green(`Normalized ${normalized.length}/${newJobs.length} jobs`));

  // Save and mark seen
  storage.saveMany(normalized);
  for (const job of newJobs) {
    storage.markSeen(job.source, job.sourceId);
  }

  p.outro(
    pc.green(`Done! ${normalized.length} jobs saved. Total in store: ${storage.count()}`),
  );
}
