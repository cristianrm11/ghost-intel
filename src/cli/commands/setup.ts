import * as p from '@clack/prompts';
import pc from 'picocolors';
import { loadConfig, saveConfig } from '../../shared/config.js';
import type { IntelConfig } from '../../shared/types.js';

export async function setup(): Promise<void> {
  p.intro(pc.cyan('Ghost Intel — Setup'));

  let existing: IntelConfig | undefined;
  try { existing = loadConfig(); } catch { /* first-run */ }

  const anthropicKey = await p.text({
    message: 'Anthropic API key',
    placeholder: 'sk-ant-...',
    initialValue: existing?.anthropicApiKey ?? '',
    validate: (v) => (!v.trim() ? 'Required' : undefined),
  });
  if (p.isCancel(anthropicKey)) { p.cancel('Setup cancelled'); process.exit(0); }

  p.note(
    'Adzuna provides 50+ job sources. Free plan: 1000 req/month.\nSkip to use only RemoteOK + HN.',
    'Adzuna (optional)',
  );

  const useAdzuna = await p.confirm({ message: 'Configure Adzuna?' });
  if (p.isCancel(useAdzuna)) { p.cancel('Setup cancelled'); process.exit(0); }

  let adzunaAppId: string | undefined;
  let adzunaApiKey: string | undefined;

  if (useAdzuna) {
    const appId = await p.text({ message: 'Adzuna App ID', validate: (v) => (!v.trim() ? 'Required' : undefined) });
    if (p.isCancel(appId)) { p.cancel('Setup cancelled'); process.exit(0); }
    const apiKey = await p.text({ message: 'Adzuna API Key', validate: (v) => (!v.trim() ? 'Required' : undefined) });
    if (p.isCancel(apiKey)) { p.cancel('Setup cancelled'); process.exit(0); }
    adzunaAppId = appId as string;
    adzunaApiKey = apiKey as string;
  }

  const keywordsRaw = await p.text({
    message: 'Search keywords (comma-separated)',
    placeholder: 'browser automation, playwright, puppeteer',
    initialValue: existing?.search.keywords.join(', ') ?? '',
    validate: (v) => (!v.trim() ? 'Required' : undefined),
  });
  if (p.isCancel(keywordsRaw)) { p.cancel('Setup cancelled'); process.exit(0); }

  const maxJobs = await p.text({
    message: 'Max jobs per source per fetch',
    placeholder: '50',
    initialValue: String(existing?.search.maxJobsPerSource ?? 50),
    validate: (v) => (isNaN(Number(v)) ? 'Must be a number' : undefined),
  });
  if (p.isCancel(maxJobs)) { p.cancel('Setup cancelled'); process.exit(0); }

  const config: IntelConfig = {
    anthropicApiKey: anthropicKey as string,
    adzunaAppId,
    adzunaApiKey,
    profile: existing?.profile ?? { currentTitle: '', skills: [], yearsOfExperience: 0, targetRoles: [] },
    search: {
      keywords: (keywordsRaw as string).split(',').map((k) => k.trim()).filter(Boolean),
      maxJobsPerSource: Number(maxJobs),
    },
  };

  saveConfig(config);
  p.outro(pc.green('Config saved to ~/.ghost-intel/config.json'));
}
