export type JobSource = 'remoteok' | 'adzuna' | 'hn';
export type SeniorityLevel = 'junior' | 'mid' | 'senior' | 'staff' | 'principal' | 'unknown';

export interface RawJob {
  source: JobSource;
  sourceId: string;
  title: string;
  company: string;
  url: string;
  description: string;
  location: string;
  salary?: string;
  postedAt: string;
}

export interface NormalizedJob {
  id: string;
  source: JobSource;
  sourceId: string;
  title: string;
  company: string;
  url: string;
  location: string;
  remote: boolean;
  seniorityLevel: SeniorityLevel;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  techStack: string[];
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  yearsRequired: number;
  postedAt: string;
  fetchedAt: string;
}

export interface SkillTrend {
  skill: string;
  count: number;
  percentage: number;
}

export interface MarketReport {
  generatedAt: string;
  jobCount: number;
  sources: Record<JobSource, number>;
  topSkills: SkillTrend[];
  topCompanies: Array<{ company: string; count: number }>;
  remotePercentage: number;
  seniorityBreakdown: Record<SeniorityLevel, number>;
  salaryStats?: { min: number; max: number; median: number; currency: string };
  narrative: string;
  skillGaps: string[];
}

export interface SearchResult {
  job: NormalizedJob;
  relevance: string;
}

export interface UserProfile {
  currentTitle: string;
  skills: string[];
  yearsOfExperience: number;
  targetRoles: string[];
}

export interface IntelConfig {
  anthropicApiKey: string;
  adzunaAppId?: string;
  adzunaApiKey?: string;
  profile: UserProfile;
  search: {
    keywords: string[];
    maxJobsPerSource: number;
  };
}
