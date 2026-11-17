// 等最新一次「建置安裝檔」工作流程結束，印出各工作結果（GITHUB_TOKEN 由環境變數提供）。
const REPO = 'achir1015/xiaoke-tray';
const headers = { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'xiaoke-tray-ci' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const get = async (u) => (await fetch(`https://api.github.com/repos/${REPO}/${u}`, { headers })).json();

const end = Date.now() + 50 * 60_000;
let run;
while (Date.now() < end) {
  const runs = await get('actions/workflows/build.yml/runs?per_page=1');
  run = runs.workflow_runs?.[0];
  if (run && run.status === 'completed') break;
  await sleep(30_000);
}
console.log('run', run?.id, run?.head_sha?.slice(0, 7), run?.status, run?.conclusion);
const jobs = await get(`actions/runs/${run.id}/jobs`);
for (const j of jobs.jobs ?? []) console.log(' ', j.name, j.conclusion);
const rel = await get('releases/latest');
console.log('latest release', rel.tag_name);
for (const a of rel.assets ?? []) console.log('  ', a.name, a.size);
