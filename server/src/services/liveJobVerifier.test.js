const test = require('node:test');
const assert = require('node:assert/strict');
const cheerio = require('cheerio');

const {
  fetchGreenhouseCandidates,
  findApplyDestination,
  getCanonicalRolePageUrl,
  isLikelyGenericJobLandingUrl,
  isRecognizedRoleDetailUrl,
  isRoleSpecificApplicationUrl
} = require('./liveJobVerifier');

test('does not downgrade an HTTPS role URL from insecure canonical metadata', () => {
  const $ = cheerio.load('<link rel="canonical" href="http://job-boards.eu.greenhouse.io/heatgeek/jobs/4935247101">');
  assert.equal(
    getCanonicalRolePageUrl($, 'https://job-boards.eu.greenhouse.io/heatgeek/jobs/4935247101'),
    'https://job-boards.eu.greenhouse.io/heatgeek/jobs/4935247101'
  );
});

test('recognises exact role detail URLs from supported job sources', () => {
  const exactUrls = [
    'https://uk.indeed.com/viewjob?jk=abc123def4567890',
    'https://uk.linkedin.com/jobs/view/software-engineer-at-example-4395275333',
    'https://www.gradcracker.com/hub/691/reply/graduate-job/81722/graduate-ai-software-developer',
    'https://harri.com/North-12898/job/2757585-restaurant-general-manager',
    'https://www.forcesfamiliesjobs.co.uk/jobs/ebpr-operational-liaison-officer-leeds-ls10-united-kingdom/2840476-1/',
    'https://salutemyjob.com/jobs/team-leader-sowerby-bridge-yorkshire/2926617725-2/',
    'https://www.yorkshire.com/askham-bryan/jobs/technology/java-lead-engineer-teksystems-5841744665',
    'https://www.synack.com/careers/?gh_jid=8060268',
    'https://blackrock.tal.net/vx/lang-en-GB/mobile-0/brand-3/user-1568344/xf-540b78165d34/candidate/so/pm/1/pl/1/opp/12219-2027-Full-Time-Analyst-Program-EMEA/en-GB',
    'https://career5.successfactors.eu/career?company=C0004534147P&career%5fjob%5freq%5fid=10440&career%5fns=job%5flisting',
    'https://www.ratemyplacement.co.uk/jobs/43102/rsm/graduate-opportunities',
    'https://higherin.com/jobs/43102/rsm/register-your-interest-graduate-opportunities-2027',
    'https://boards.greenhouse.io/example/jobs/1234567',
    'https://apply.workable.com/example/j/ABC123DEF/',
    'https://www.amazon.jobs/en/jobs/10410760/software-development-engineer',
    'https://pfizer.wd1.myworkdayjobs.com/en-US/PfizerCareers/details/QC-Microbiology-Analyst_4962187-1',
    'https://www.sthree.com/en-gb/job-detail/frontend-developer/er000042/',
    'https://www.balticapprenticeships.com/vacancy/j-014496/',
    'https://recruitment.evalu-8.com/public/recruitment_post?id=WDFoVGRjaTJ2UlhNcEFtNnNyTFBEUT09&org_id=ZWVRWUNZbW9SdTBxRXRKRnNuNGhGQT09',
    'https://envevo.careers.hibob.com/jobs/be372c9b-a5bd-4261-9acc-d9a4369d01b1/apply',
    'https://oxford.topcountycareers.co.uk/jobs/senior-heritage-consultant-leeds-manchester-or-newcastle-leeds/2931632631-2/',
    'https://www.cv-library.co.uk/job/225509412/quantity-surveyor'
  ];

  exactUrls.forEach((url) => {
    assert.equal(isRecognizedRoleDetailUrl(url), true, url);
    assert.equal(isLikelyGenericJobLandingUrl(url), false, url);
  });
});

test('rejects search, careers, company-job, and listing URLs', () => {
  const genericUrls = [
    'https://uk.indeed.com/jobs?q=software+engineer&l=London',
    'https://uk.indeed.com/View-Job-jobs',
    'https://uk.linkedin.com/jobs/search?keywords=software%20engineer',
    'https://www.linkedin.com/jobs/collections/recommended/',
    'https://www.gradcracker.com/hub/691/reply/search/engineering-graduate-jobs',
    'https://www.ratemyplacement.co.uk/search-jobs?keywords=engineering',
    'https://higherin.com/company-profile/1270/rsm/jobs',
    'https://careers.example.com/jobs/search?keywords=engineer',
    'https://www.amazon.jobs/en/jobs',
    'https://careers.google.com/jobs/results/',
    'https://jobs.careers.microsoft.com/global/en/search?jobtypes=FullTime',
    'https://www.ibm.com/careers/search?query=software%20developer',
    'https://www.pwc.com/careers',
    'https://search.jobs.barclays.com/jobs/search',
    'https://careers.unilever.com/',
    'https://kpmg.com/careers'
  ];

  genericUrls.forEach((url) => {
    assert.equal(isLikelyGenericJobLandingUrl(url), true, url);
  });
});

test('chooses the role-specific Apply destination and ignores search links', () => {
  const roleUrl = 'https://www.gradcracker.com/hub/691/reply/graduate-job/81722/graduate-ai-software-developer';
  const $ = cheerio.load(`
    <nav><a href="/search/engineering-graduate-jobs">Apply filters</a></nav>
    <main>
      <h1>Graduate AI Software Developer</h1>
      <a aria-label="Apply online now" href="https://apply.workable.com/reply/j/ABC123DEF/">Apply online now</a>
    </main>
  `);

  assert.equal(
    findApplyDestination($, roleUrl, 'https://careers.example.com/jobs/search?keywords=ai'),
    'https://apply.workable.com/reply/j/ABC123DEF/'
  );
});

test('extracts an embedded external application URL from a role page', () => {
  const roleUrl = 'https://uk.linkedin.com/jobs/view/example-role-4395275333';
  const rawHtml = '<button>Apply now</button><script>window.job = {"externalApplyUrl":"https:\\/\\/jobs.example.com\\/positions\\/REQ-48291"};</script>';
  const $ = cheerio.load(rawHtml);
  $('script').remove();

  const result = findApplyDestination($, roleUrl, '', rawHtml);
  assert.equal(result, 'https://jobs.example.com/positions/REQ-48291');
  assert.equal(isRoleSpecificApplicationUrl(result), true);
});

test('collects diverse published Greenhouse roles and excludes expired or duplicate URLs', async () => {
  const boards = [
    { token: 'alpha', name: 'Alpha Health' },
    { token: 'beta', name: 'Beta Labs' }
  ];
  const httpClient = {
    get: async (url) => ({
      data: {
        jobs: url.includes('/alpha/') ? [
          {
            title: 'Clinical Data Analyst',
            location: { name: 'London, UK' },
            absolute_url: 'https://boards.greenhouse.io/alpha/jobs/1234567',
            updated_at: '2026-08-18T10:00:00Z'
          },
          {
            title: 'Expired Health Analyst',
            location: { name: 'London, UK' },
            absolute_url: 'https://boards.greenhouse.io/alpha/jobs/1234568',
            application_deadline: '2020-01-01'
          }
        ] : [
          {
            title: 'Healthcare Software Engineer',
            location: { name: 'London, UK' },
            absolute_url: 'https://boards.greenhouse.io/beta/jobs/7654321',
            updated_at: '2026-08-17T10:00:00Z'
          },
          {
            title: 'Sales Manager',
            location: { name: 'New York, US' },
            absolute_url: 'https://boards.greenhouse.io/beta/jobs/7654322'
          }
        ]
      }
    })
  };

  const jobs = await fetchGreenhouseCandidates({
    query: 'health technology jobs with actual apply links',
    location: 'London',
    count: 10,
    excludedUrls: ['https://boards.greenhouse.io/alpha/jobs/9999999'],
    boards,
    httpClient
  });

  assert.deepEqual(jobs.map((job) => job.companyName), ['Alpha Health', 'Beta Labs']);
  assert.equal(jobs.every((job) => job.source === job.applicationLink), true);
  assert.equal(jobs.every((job) => job.source.includes('/jobs/')), true);
});

test('maps an embedded Greenhouse board to its stable company role URL', async () => {
  const jobs = await fetchGreenhouseCandidates({
    count: 1,
    boards: [{
      token: 'embedded',
      name: 'Embedded Co',
      roleUrlTemplate: 'https://careers.example.com/openings/?gh_jid={id}'
    }],
    httpClient: {
      get: async () => ({
        data: {
          jobs: [{
            id: 8060268,
            title: 'Software Engineer, AI',
            location: { name: 'Remote, UK' },
            absolute_url: 'https://job-boards.greenhouse.io/embedded/jobs/8060268'
          }]
        }
      })
    }
  });

  assert.equal(jobs[0].source, 'https://careers.example.com/openings/?gh_jid=8060268');
  assert.equal(jobs[0].applicationLink, jobs[0].source);
});
