import fs from 'fs';
import path from 'path';
import os from 'os';
import type { NormalizedJob, JobSource } from '../shared/types.js';

const STORE_DIR = path.join(os.homedir(), '.ghost-intel');
const JOBS_PATH = path.join(STORE_DIR, 'jobs.json');
const SEEN_PATH = path.join(STORE_DIR, 'seen.json');

interface JobStore {
  jobs: Record<string, NormalizedJob>;
  updatedAt: string;
}

interface SeenStore {
  ids: Record<string, string>; // sourceKey → fetchedAt
}

function readJobs(): JobStore {
  fs.mkdirSync(STORE_DIR, { recursive: true });
  if (!fs.existsSync(JOBS_PATH)) return { jobs: {}, updatedAt: new Date().toISOString() };
  try {
    return JSON.parse(fs.readFileSync(JOBS_PATH, 'utf8')) as JobStore;
  } catch {
    return { jobs: {}, updatedAt: new Date().toISOString() };
  }
}

function writeJobs(store: JobStore): void {
  fs.mkdirSync(STORE_DIR, { recursive: true });
  const tmp = `${JOBS_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2));
  fs.renameSync(tmp, JOBS_PATH);
}

function readSeen(): SeenStore {
  fs.mkdirSync(STORE_DIR, { recursive: true });
  if (!fs.existsSync(SEEN_PATH)) return { ids: {} };
  try {
    return JSON.parse(fs.readFileSync(SEEN_PATH, 'utf8')) as SeenStore;
  } catch {
    return { ids: {} };
  }
}

function writeSeen(store: SeenStore): void {
  const tmp = `${SEEN_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2));
  fs.renameSync(tmp, SEEN_PATH);
}

function seenKey(source: JobSource, sourceId: string): string {
  return `${source}:${sourceId}`;
}

export const storage = {
  hasSeen(source: JobSource, sourceId: string): boolean {
    return seenKey(source, sourceId) in readSeen().ids;
  },

  markSeen(source: JobSource, sourceId: string): void {
    const seen = readSeen();
    seen.ids[seenKey(source, sourceId)] = new Date().toISOString();
    writeSeen(seen);
  },

  save(job: NormalizedJob): void {
    const store = readJobs();
    store.jobs[job.id] = job;
    store.updatedAt = new Date().toISOString();
    writeJobs(store);
  },

  saveMany(jobs: NormalizedJob[]): void {
    const store = readJobs();
    for (const job of jobs) {
      store.jobs[job.id] = job;
    }
    store.updatedAt = new Date().toISOString();
    writeJobs(store);
  },

  getAll(): NormalizedJob[] {
    return Object.values(readJobs().jobs);
  },

  getBySource(source: JobSource): NormalizedJob[] {
    return Object.values(readJobs().jobs).filter((j) => j.source === source);
  },

  getSince(daysAgo: number): NormalizedJob[] {
    const cutoff = Date.now() - daysAgo * 24 * 60 * 60 * 1000;
    return Object.values(readJobs().jobs).filter(
      (j) => new Date(j.fetchedAt).getTime() >= cutoff,
    );
  },

  count(): number {
    return Object.keys(readJobs().jobs).length;
  },

  clear(): void {
    writeJobs({ jobs: {}, updatedAt: new Date().toISOString() });
    writeSeen({ ids: {} });
  },
};
