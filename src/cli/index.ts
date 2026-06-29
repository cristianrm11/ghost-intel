#!/usr/bin/env node
import pc from 'picocolors';
import { setup } from './commands/setup.js';
import { fetch } from './commands/fetch.js';
import { analyze } from './commands/analyze.js';
import { search } from './commands/search.js';

const [,, command, ...args] = process.argv;

const HELP = `
${pc.bold(pc.cyan('Ghost Intel'))} — Career Intelligence Pipeline
${pc.dim('Aggregate, normalize, and analyze job postings with AI')}

${pc.bold('Usage:')}
  ghost-intel ${pc.cyan('setup')}                  Configure API keys and search preferences
  ghost-intel ${pc.cyan('fetch')}                  Fetch new jobs from all sources
  ghost-intel ${pc.cyan('analyze')} [days]         Generate market report (default: last 30 days)
  ghost-intel ${pc.cyan('search')} [query]         Natural language job search

${pc.bold('Examples:')}
  ghost-intel setup
  ghost-intel fetch
  ghost-intel analyze 7
  ghost-intel search "senior remote TypeScript engineer"
  ghost-intel search "playwright automation $150k"
`;

async function main() {
  switch (command) {
    case 'setup':
      await setup();
      break;
    case 'fetch':
      await fetch();
      break;
    case 'analyze':
      await analyze(args[0]);
      break;
    case 'search':
      await search(args.join(' ') || undefined);
      break;
    default:
      console.log(HELP);
      if (command && command !== '--help' && command !== '-h') {
        console.error(pc.red(`Unknown command: ${command}`));
        process.exit(1);
      }
  }
}

main().catch((err) => {
  console.error(pc.red('Fatal error:'), (err as Error).message);
  process.exit(1);
});
