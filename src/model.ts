export interface BossJob {
  id: string;
  security_id: string;
  lid: string;
  title: string;
  salary: string;
  company: string;
  city: string;
  district: string;
  experience: string;
  degree: string;
  skills: string[];
  company_size: string;
  company_stage: string;
  industry: string;
  boss_name: string;
  boss_title: string;
  job_url: string;
  jd: string | null;
  fetched_at: string;
  detail_code?: number | null;
  detail_message?: string;
}

export interface RawJob {
  encryptJobId?: string;
  securityId?: string;
  lid?: string;
  jobName?: string;
  salaryDesc?: string;
  salary?: string;
  brandName?: string;
  cityName?: string;
  areaDistrict?: string;
  businessDistrict?: string;
  jobExperience?: string;
  jobDegree?: string;
  skills?: string[];
  brandScaleName?: string;
  brandStageName?: string;
  industryName?: string;
  bossName?: string;
  bossTitle?: string;
}

export function buildBossJob(raw: RawJob): BossJob {
  return {
    id: raw.encryptJobId || '',
    security_id: raw.securityId || '',
    lid: raw.lid || '',
    title: raw.jobName || '',
    salary: raw.salaryDesc || raw.salary || '',
    company: raw.brandName || '',
    city: raw.cityName || '',
    district: [raw.areaDistrict, raw.businessDistrict].filter(Boolean).join(' '),
    experience: raw.jobExperience || '',
    degree: raw.jobDegree || '',
    skills: raw.skills || [],
    company_size: raw.brandScaleName || '',
    company_stage: raw.brandStageName || '',
    industry: raw.industryName || '',
    boss_name: raw.bossName || '',
    boss_title: raw.bossTitle || '',
    job_url: raw.encryptJobId ? `https://www.zhipin.com/job_detail/${raw.encryptJobId}.html` : '',
    jd: null,
    fetched_at: new Date().toISOString(),
  };
}
