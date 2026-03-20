export function buildBossJob(raw) {
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
