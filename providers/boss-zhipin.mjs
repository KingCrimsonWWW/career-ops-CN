// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */

// BOSS直聘 (Boss Zhipin) provider — fetches job listings from the BOSS直聘
// platform. Browser-first strategy for stable scraping:
//   1. Primary: Playwright browser scraping (stable, bypasses anti-bot)
//   2. Fallback: direct HTTP API call (fast but often blocked)
//
// First-time setup: run `node boss-zhipin-login.mjs` to authenticate.
//
// First-time setup: run `node boss-zhipin-login.mjs` to authenticate.
//
// Configuration via portals.yml:
//   provider: boss-zhipin
//   boss_zhipin:
//     query: "前端工程师"
//     city: "101010100"        # Beijing
//     experience: "105"        # 3-5 years
//     salary: "405"            # 20-50K
//     page: 1
//     pagesize: 30
//
// City codes follow BOSS直聘's geocode system:
//   101010100 = Beijing, 101020100 = Shanghai,
//   101280100 = Guangzhou, 101280600 = Shenzhen,
//   101210100 = Hangzhou, 101270100 = Chengdu, etc.
//
// Experience codes:
//   不限=100, 1年以内=101, 1-3年=102, 3-5年=105, 5-10年=106, 10年以上=107
//
// Salary codes:
//   不限=400, 3K以下=401, 3-5K=402, 5-10K=403, 10-20K=404,
//   20-50K=405, 50K以上=406

const BOSS_ZHIPIN_HOST = 'www.zhipin.com';

const ALLOWED_HOSTS = new Set([
  'www.zhipin.com',
  'zhipin.com',
]);

/**
 * Build the BOSS直聘 web API URL for job search.
 * Uses the same API that the BOSS直聘 website calls internally.
 */
function buildApiUrl(entry) {
  const params = entry.boss_zhipin || {};
  const query = params.query || entry.name || '';
  const city = params.city || '101010100'; // default: Beijing
  const experience = params.experience || '';
  const salary = params.salary || '';
  const page = params.page || 1;
  const pagesize = params.pagesize || 30;

  const url = new URL(`https://${BOSS_ZHIPIN_HOST}/wapi/zpgeek/search/joblist.json`);
  url.searchParams.set('query', query);
  url.searchParams.set('city', city);
  url.searchParams.set('page', String(page));
  url.searchParams.set('pageSize', String(pagesize));

  if (experience) url.searchParams.set('experience', experience);
  if (salary) url.searchParams.set('salary', salary);

  return url.toString();
}

function assertAllowedUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`boss-zhipin: invalid URL: ${url}`);
  }
  if (parsed.protocol !== 'https:') {
    throw new Error(`boss-zhipin: URL must use HTTPS: ${url}`);
  }
  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    throw new Error(`boss-zhipin: untrusted hostname "${parsed.hostname}"`);
  }
  return url;
}

/**
 * Normalize a BOSS直聘 job item to Career-Ops Job format.
 * Handles both the API response format and scraped data.
 */
function normalizeJob(jobData, entry) {
  const title = jobData.jobName || jobData.title || '';
  const company = jobData.brandName || jobData.company || entry.name || '';
  const city = jobData.cityName || '';
  const areaDistrict = jobData.areaDistrict || '';
  const location = [city, areaDistrict].filter(Boolean).join(' ');

  // Build the job detail URL
  const encryptJobId = jobData.encryptJobId || jobData.jobId || '';
  const lid = jobData.lid || '';
  let url = '';
  if (encryptJobId) {
    url = `https://${BOSS_ZHIPIN_HOST}/job_detail/${encryptJobId}.html`;
    if (lid) url += `?lid=${lid}`;
  }

  // Extract salary info for metadata
  const salaryDesc = jobData.salaryDesc || jobData.salary || '';

  return {
    title: title.trim(),
    url,
    company: company.trim(),
    location: location.trim(),
    // Extra metadata (not part of standard Job interface, but useful for
    // downstream filtering and Chinese market evaluation)
    _meta: {
      salary: salaryDesc,
      experience: jobData.jobExperience || '',
      degree: jobData.jobDegree || '',
      skills: (jobData.skills || []).join(', '),
      bossTitle: jobData.bossTitle || '',
      bossOnline: jobData.bossOnline || false,
      welfare: (jobData.welfareList || []).join(', '),
    },
  };
}

/** @type {Provider} */
export default {
  id: 'boss-zhipin',

  detect(entry) {
    // Auto-detect from careers_url
    const url = entry.careers_url || '';
    if (url.includes('zhipin.com') || url.includes('boss.zhipin.com')) {
      return { url };
    }
    // Detect from explicit provider config
    if (entry.boss_zhipin) {
      return { url: buildApiUrl(entry) };
    }
    return null;
  },

  async fetch(entry, ctx) {
    // ── 主路径：Playwright 浏览器抓取（稳定，绕过反爬）──────────────
    try {
      const { scrapeJobs } = await import('./_boss-zhipin-browser.mjs');
      const jobs = await scrapeJobs(entry);
      if (jobs.length > 0) return jobs;
      console.warn(`boss-zhipin: browser returned 0 jobs for "${entry.name}", trying API fallback...`);
    } catch (browserErr) {
      const msg = browserErr.message || String(browserErr);
      if (msg.includes('未找到登录状态')) {
        throw new Error(
          `boss-zhipin: 请先登录:\n  npm run boss:login`
        );
      }
      console.warn(`boss-zhipin: browser failed for "${entry.name}": ${msg}`);
      console.warn('boss-zhipin: trying API fallback...');
    }

    // ── 备用路径：HTTP API ──────────────────────────────────────
    const apiUrl = buildApiUrl(entry);
    assertAllowedUrl(apiUrl);

    try {
      const json = await ctx.fetchJson(apiUrl, {
        redirect: 'error',
        headers: {
          'Accept': 'application/json',
          'Referer': `https://${BOSS_ZHIPIN_HOST}/`,
        },
        timeoutMs: 15_000,
      });

      const jobList = json?.zpData?.jobList
        || json?.data?.jobList
        || (Array.isArray(json) ? json : []);

      if (Array.isArray(jobList) && jobList.length > 0) {
        return jobList
          .map(j => normalizeJob(j, entry))
          .filter(j => j.title && j.url);
      }
    } catch {
      // API also failed
    }

    return [];
  },
};
