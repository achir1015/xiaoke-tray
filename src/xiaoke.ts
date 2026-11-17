// 小柯機器人3D托盤生成器：桌面版橋接、語音動態教學、版本更新。
import { getLang } from './i18n';

export const APP_NAME = '小柯機器人3D托盤生成器';

export interface UpdateInfo {
  current: string;
  latest: string;
  newer: boolean;
  notes: string;
  page: string;
  canInstall: boolean;
  flavor: string;
}

/** Electron preload 提供的介面；線上版沒有。 */
export interface DesktopBridge {
  bambu: {
    open(name: string, data: ArrayBuffer): Promise<{ ok: boolean; path?: string; exe?: string; error?: string }>;
    find(): Promise<string | null>;
    pick(): Promise<string | null>;
  };
  update: {
    check(): Promise<UpdateInfo>;
    download(): Promise<string>;
    install(file: string): Promise<{ quitting?: boolean; manual?: boolean; path?: string }>;
    openPage(): Promise<void>;
    onProgress(fn: (d: { got: number; total: number }) => void): () => void;
  };
  version: string;
}

export interface AppHook {
  select(id: string): void;
  home(): void;
  current(): string;
  atHome(): boolean;
  setParams(values: Record<string, unknown>): void;
  loadTemplate(name: string): void;
  openGroup(group: string, open?: boolean): HTMLDetailsElement | null;
  fit(): void;
  t(key: string, vars?: Record<string, string | number>): string;
}

declare global {
  interface Window {
    xk?: DesktopBridge;
    xkApp: AppHook;
  }
}

export const desktop = (): DesktopBridge | undefined => window.xk;

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// --- 語音動態教學 ----------------------------------------------------------------

interface Step {
  /** 要框起來的元素（找不到就置中顯示）。 */
  target?: () => HTMLElement | null;
  zh: string;
  en: string;
  /** 說話前先做的示範動作。 */
  before?: () => void | Promise<void>;
  /** 說話途中的動畫示範。 */
  demo?: () => Promise<void>;
  /** 線上版改用的說明。 */
  web?: { zh: string; en: string };
}

const app = () => window.xkApp;
const inApp = async (id = 'tray') => {
  if (app().atHome() || app().current() !== id) app().select(id);
  await sleep(350);
};
const group = (g: string) => () => {
  const d = app().openGroup(g, true);
  return d;
};

const STEPS: Step[] = [
  {
    before: () => app().home(),
    zh: '你好，我是小柯機器人！歡迎使用小柯機器人3D托盤生成器。我會一步一步帶你做出一個可以直接列印的分格托盤。',
    en: 'Hi, I am Xiaoke the robot! Welcome to the 3D tray generator. I will show you, step by step, how to make a tray ready to print.',
  },
  {
    before: () => app().home(),
    target: () => $('#tools button'),
    zh: '首頁列出所有產生器。第一個「便當托盤」就是托盤生成器，另外還有抽屜收納盒、Gridfinity、電子外殼、齒輪等等。我們點便當托盤開始。',
    en: 'The start page lists every generator. The first one, Bento tray, is the tray generator. Let us open it.',
  },
  {
    before: async () => {
      await inApp('tray');
      app().loadTemplate('basic');
    },
    target: () => $('#viewer'),
    zh: '右邊是 3D 預覽。用滑鼠左鍵拖曳可以旋轉，右鍵拖曳可以平移，滾輪可以放大縮小。模型會在你的電腦上即時計算，不會上傳。',
    en: 'On the right is the 3D preview: drag to rotate, right-drag to pan, scroll to zoom. Everything is computed on your computer.',
  },
  {
    before: () => {
      app().openGroup('size', true);
    },
    target: group('size'),
    zh: '在「尺寸」區設定托盤的寬度、深度、高度、壁厚和圓角。看，我把寬度改成一百六十公釐，預覽馬上跟著變化。',
    en: 'In Size you set width, depth, height, wall thickness and fillet. Watch: I set the width to 160 mm and the preview follows.',
    demo: async () => {
      for (const w of [115, 130, 145, 160]) {
        app().setParams({ width: w });
        await sleep(700);
      }
    },
  },
  {
    before: () => {
      app().openGroup('partition', true);
    },
    target: group('partition'),
    zh: '「分格隔板」可以平均分格，也可以用比例自訂，例如二比一。現在示範三欄兩列，一共六格，還能調整隔板高度和厚度。',
    en: 'Partitions: an equal grid or custom ratios like 2 : 1. Here are three columns and two rows, six compartments.',
    demo: async () => {
      app().setParams({ columns: 3 });
      await sleep(1200);
      app().setParams({ rows: 2 });
    },
  },
  {
    before: () => {
      app().openGroup('stack', true);
    },
    target: group('stack'),
    zh: '「堆疊」選可堆疊，托盤底部會多一圈底腳，剛好插進下一個托盤的開口，好幾個托盤就能疊在一起。',
    en: 'Stacking adds a foot under the tray that fits into the opening of the one below.',
    demo: async () => {
      app().setParams({ stack: 'stackable' });
    },
  },
  {
    before: () => {
      app().openGroup('extras', true);
    },
    target: group('extras'),
    zh: '「加值功能」有指扣缺口、後壁標籤斜台，還有底板鏤空花紋，像圓孔或蜂巢，可以排水也比較省線材。',
    en: 'Extras: finger pulls, a label ledge and floor patterns such as holes or honeycomb.',
    demo: async () => {
      app().setParams({ fingerPull: 'front' });
      await sleep(1200);
      app().setParams({ pattern: 'hex' });
    },
  },
  {
    target: () => $('#template'),
    zh: '懶得自己調？這裡有內建範本：便當盒、螺絲收納盤、肥皂盤、串珠盒等等，選一個就套用。',
    en: 'Built-in templates: bento boxes, screw trays, soap dish and more – pick one to apply it.',
    demo: async () => {
      app().loadTemplate('bento3');
    },
  },
  {
    target: () => $('#export'),
    zh: '做好後按這裡匯出。STL 最通用，3MF 每個零件分開，STEP 可以在 CAD 軟體繼續編輯。',
    en: 'Export here: STL is universal, 3MF keeps parts separate, STEP can be edited in CAD software.',
  },
  {
    target: () => $('#send-bambu'),
    zh: '最方便的是這顆「送到 Bambu Studio」：按一下，托盤會直接在拓竹 Bambu Studio 裡打開，接著切片就能列印。',
    en: 'Most convenient: Send to Bambu Studio opens the tray directly in Bambu Studio, ready to slice and print.',
    // 線上版不能直接啟動 Bambu Studio：改成下載 3MF
    web: {
      zh: '這顆綠色按鈕會下載 3MF 檔，用拓竹 Bambu Studio 打開就能切片列印。想要一鍵直接送進 Bambu Studio，可以安裝首頁的桌面版。',
      en: 'The green button downloads a 3MF file to open in Bambu Studio. The desktop version can send it there in one click.',
    },
  },
  {
    before: () => {
      const d = $<HTMLDetailsElement>('#project');
      if (d) d.open = true;
    },
    target: () => $('#project'),
    zh: '「專案與範本」可以把目前的設定存成自己的範本、存成專案檔，或複製連結分享給朋友。',
    en: 'Project and templates: save your own template, a project file, or copy a link to share.',
  },
  {
    before: () => {
      const d = $<HTMLDetailsElement>('#project');
      if (d) d.open = false;
    },
    target: () => $('#app .settings-open'),
    zh: '齒輪是設定：可以換語言、長度單位、深色外觀、列印床大小，還有配合公差。',
    en: 'The gear opens the settings: language, unit, appearance, print bed size and fit allowance.',
  },
  {
    target: () => $('#app .xk-update') ?? $('.xk-update'),
    zh: '這顆按鈕會檢查新版本，有更新就能直接下載安裝。教學到這裡結束，祝你列印順利！想再聽一次，按小柯機器人的教學按鈕就可以了。',
    en: 'This button checks for updates. That is the end of the guide – happy printing!',
  },
];

let running = false;
/** 立刻結束目前這句話（有些語音引擎 cancel 後不會觸發 onend）。 */
let cutSpeech: (() => void) | null = null;
let stopRequested = false;

function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = speechSynthesis.getVoices();
  const zh = getLang() === 'zh';
  const want = zh ? [/zh[-_]TW/i, /Hanhan|Yating|Zhiwei|HsiaoChen|HsiaoYu|Mei-Jia/i, /zh[-_]HK/i, /zh/i] : [/en[-_]US/i, /en/i];
  for (const re of want) {
    const v = voices.find((x) => re.test(x.lang) || re.test(x.name));
    if (v) return v;
  }
  return undefined;
}

function speak(text: string, mouth: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      setTimeout(resolve, Math.max(2500, text.length * 180));
      return;
    }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice();
    if (v) u.voice = v;
    u.lang = v?.lang ?? (getLang() === 'zh' ? 'zh-TW' : 'en-US');
    u.rate = 1.02;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      cutSpeech = null;
      mouth.classList.remove('talk');
      resolve();
    };
    cutSpeech = finish;
    u.onstart = () => mouth.classList.add('talk');
    u.onend = finish;
    u.onerror = finish;
    // 有些環境沒有語音，或不會觸發 onend：依字數估一個保底時間
    setTimeout(finish, Math.max(4000, text.length * 260) + 1500);
    speechSynthesis.speak(u);
  });
}

const ROBOT_SVG = `<svg viewBox="0 0 120 120" aria-hidden="true">
  <line x1="60" y1="8" x2="60" y2="22" stroke="#5a6478" stroke-width="4"/>
  <circle cx="60" cy="8" r="7" fill="#ffc428"/>
  <rect x="6" y="50" width="12" height="32" rx="5" fill="#2878dc"/>
  <rect x="102" y="50" width="12" height="32" rx="5" fill="#2878dc"/>
  <circle cx="60" cy="66" r="48" fill="#4696f0"/>
  <circle cx="60" cy="66" r="44" fill="#f0f6ff"/>
  <rect x="25" y="44" width="70" height="42" rx="20" fill="#182440"/>
  <path class="eye" d="M36 62 q9 -10 18 0" stroke="#5ae6ff" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path class="eye" d="M66 62 q9 -10 18 0" stroke="#5ae6ff" stroke-width="5" fill="none" stroke-linecap="round"/>
  <ellipse class="mouth" cx="60" cy="75" rx="9" ry="3" fill="#5ae6ff"/>
  <circle cx="32" cy="80" r="5" fill="#ff8ca0" opacity=".8"/>
  <circle cx="88" cy="80" r="5" fill="#ff8ca0" opacity=".8"/>
</svg>`;

export async function startGuide() {
  if (running) return;
  running = true;
  stopRequested = false;
  let index = 0;
  let jump: number | null = null;
  let paused = false;

  const layer = document.createElement('div');
  layer.className = 'xk-guide';
  layer.innerHTML = `
    <div class="xk-spot"></div>
    <div class="xk-bubble" role="dialog" aria-live="polite">
      <div class="xk-robot">${ROBOT_SVG}</div>
      <div class="xk-body">
        <p class="xk-text"></p>
        <div class="xk-bar"><span class="xk-count"></span>
          <button type="button" class="ghost xk-prev">◀</button>
          <button type="button" class="ghost xk-pause">⏸</button>
          <button type="button" class="ghost xk-next">▶</button>
          <button type="button" class="ghost xk-close">✕</button>
        </div>
      </div>
    </div>`;
  document.body.append(layer);
  const spot = layer.querySelector<HTMLElement>('.xk-spot')!;
  const bubble = layer.querySelector<HTMLElement>('.xk-bubble')!;
  const text = layer.querySelector<HTMLElement>('.xk-text')!;
  const count = layer.querySelector<HTMLElement>('.xk-count')!;
  const robot = layer.querySelector<HTMLElement>('.xk-robot')!;
  const pauseBtn = layer.querySelector<HTMLButtonElement>('.xk-pause')!;
  let wake: (() => void) | null = null;
  const interrupt = () => {
    speechSynthesis?.cancel();
    cutSpeech?.();
    wake?.();
  };
  layer.querySelector('.xk-prev')!.addEventListener('click', () => {
    jump = Math.max(0, index - 1);
    interrupt();
  });
  layer.querySelector('.xk-next')!.addEventListener('click', () => {
    jump = index + 1;
    interrupt();
  });
  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    pauseBtn.textContent = paused ? '▶︎ ' + (getLang() === 'zh' ? '繼續' : 'Go') : '⏸';
    if (paused) speechSynthesis?.pause();
    else {
      speechSynthesis?.resume();
      wake?.();
    }
  });
  layer.querySelector('.xk-close')!.addEventListener('click', () => {
    stopRequested = true;
    interrupt();
  });
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      stopRequested = true;
      interrupt();
    }
  };
  document.addEventListener('keydown', onKey);

  const scrolled = new WeakSet<HTMLElement>();
  const place = (target: HTMLElement | null) => {
    if (!target || target.offsetParent === null) {
      spot.classList.add('none');
      bubble.style.left = '50%';
      bubble.style.top = '50%';
      bubble.style.transform = 'translate(-50%, -50%)';
      return;
    }
    const form = target.closest('#params');
    if (form && !scrolled.has(target)) {
      scrolled.add(target);
      target.scrollIntoView({ block: 'start', behavior: 'smooth' });
    } else if (!form) target.scrollIntoView({ block: 'nearest' });
    // 在表單裡的元素只框可見的部分
    const full = target.getBoundingClientRect();
    const clip = form?.getBoundingClientRect();
    const r = clip
      ? { left: full.left, right: full.right, width: full.width, top: Math.max(full.top, clip.top), bottom: Math.min(full.bottom, clip.bottom), height: 0 }
      : { left: full.left, right: full.right, width: full.width, top: full.top, bottom: full.bottom, height: full.height };
    r.height = Math.max(0, r.bottom - r.top);
    const pad = 6;
    spot.classList.remove('none');
    Object.assign(spot.style, { left: `${r.left - pad}px`, top: `${r.top - pad}px`, width: `${r.width + 2 * pad}px`, height: `${r.height + 2 * pad}px` });
    const bw = Math.min(460, window.innerWidth - 24);
    const bh = bubble.offsetHeight || 160;
    let left = r.right + 18;
    let top = r.top;
    if (left + bw > window.innerWidth - 12) left = r.left - bw - 18;
    if (left < 12) {
      left = Math.max(12, Math.min(window.innerWidth - bw - 12, r.left + r.width / 2 - bw / 2));
      top = r.bottom + 18;
      if (top + bh > window.innerHeight - 12) top = r.top - bh - 18;
    }
    top = Math.max(12, Math.min(window.innerHeight - bh - 12, top));
    Object.assign(bubble.style, { left: `${left}px`, top: `${top}px`, transform: 'none' });
  };

  try {
    while (index < STEPS.length && !stopRequested) {
      const step = STEPS[index];
      jump = null;
      count.textContent = `${index + 1} / ${STEPS.length}`;
      await step.before?.();
      await sleep(250);
      if (stopRequested) break;
      if (jump !== null) {
        index = jump;
        continue;
      }
      const said = !desktop() && step.web ? step.web : step;
      const line = getLang() === 'zh' ? said.zh : said.en;
      text.textContent = line;
      robot.classList.remove('pop');
      void robot.offsetWidth;
      robot.classList.add('pop');
      const target = step.target?.() ?? null;
      place(target);
      const follow = setInterval(() => place(step.target?.() ?? null), 400);
      await Promise.all([speak(line, robot), step.demo?.().then(() => sleep(500)).then(() => app().fit())]);
      clearInterval(follow);
      while (paused && !stopRequested && jump === null) await new Promise<void>((r) => (wake = r));
      wake = null;
      if (jump === null && !stopRequested) await sleep(600);
      index = jump ?? index + 1;
    }
  } finally {
    speechSynthesis?.cancel();
    document.removeEventListener('keydown', onKey);
    layer.remove();
    running = false;
    try {
      localStorage.setItem('xiaoke-tray:guided', '1');
    } catch {
      // 無痕模式等情況：下次再自動播放也無妨
    }
  }
}

/** 第一次開啟時自動播放教學。 */
export function guideOnFirstRun() {
  let seen = '1';
  try {
    seen = localStorage.getItem('xiaoke-tray:guided') ?? '';
  } catch {
    seen = '1';
  }
  if (!seen && !/[?&]noguide/.test(location.search)) setTimeout(() => void startGuide(), 1200);
}

// --- 版本更新 ---------------------------------------------------------------------

const UPDATE_REPO = 'achir1015/xiaoke-tray';

function cmpVer(a: string, b: string) {
  const pa = a.replace(/^v/, '').split('.').map((x) => parseInt(x, 10) || 0);
  const pb = b.replace(/^v/, '').split('.').map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  return 0;
}

function dialog(html: string): HTMLDialogElement {
  const d = document.createElement('dialog');
  d.className = 'xk-dialog';
  d.innerHTML = `<form method="dialog">${html}</form>`;
  document.body.append(d);
  d.addEventListener('close', () => d.remove());
  d.showModal();
  return d;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

export async function checkUpdate(current: string, quiet = false) {
  const xk = desktop();
  try {
    let info: UpdateInfo;
    if (xk) info = await xk.update.check();
    else {
      // 線上版：比對 version.json，有新版就重新整理頁面（略過快取）
      const res = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
      const j = (await res.json()) as { version: string; notes?: string };
      info = { current, latest: j.version, newer: cmpVer(j.version, current) > 0, notes: j.notes ?? '', page: `https://github.com/${UPDATE_REPO}/releases/latest`, canInstall: true, flavor: 'web' };
    }
    if (!info.newer) {
      if (!quiet) dialog(`<h2>已是最新版</h2><p>目前版本 v${esc(info.current)} 就是最新版。</p><button class="ghost">關閉</button>`);
      return;
    }
    const d = dialog(`<h2>有新版本 v${esc(info.latest)}</h2><p>目前版本 v${esc(info.current)}</p>
      ${info.notes ? `<pre class="xk-notes">${esc(info.notes)}</pre>` : ''}
      <progress hidden max="1" value="0"></progress><p class="xk-msg"></p>
      <div class="xk-row"><button type="button" class="xk-go">${info.canInstall ? (xk ? '下載並安裝' : '立即更新') : '開啟下載頁'}</button><button class="ghost">稍後</button></div>`);
    const go = d.querySelector<HTMLButtonElement>('.xk-go')!;
    const bar = d.querySelector<HTMLProgressElement>('progress')!;
    const msg = d.querySelector<HTMLElement>('.xk-msg')!;
    go.addEventListener('click', async () => {
      if (!xk) {
        location.reload();
        return;
      }
      if (!info.canInstall) {
        await xk.update.openPage();
        return;
      }
      go.disabled = true;
      bar.hidden = false;
      const off = xk.update.onProgress(({ got, total }) => {
        if (total) bar.value = got / total;
        msg.textContent = `下載中 ${(got / 1048576).toFixed(1)} MB${total ? ` / ${(total / 1048576).toFixed(1)} MB` : ''}`;
      });
      try {
        const file = await xk.update.download();
        msg.textContent = '下載完成，正在安裝，程式會自動重新開啟…';
        const r = await xk.update.install(file);
        if (r.manual) msg.textContent = `已下載到 ${r.path}，請手動開啟安裝。`;
      } catch (e) {
        msg.textContent = `更新失敗：${(e as Error).message}`;
        go.disabled = false;
      } finally {
        off();
      }
    });
  } catch (e) {
    if (!quiet) dialog(`<h2>無法檢查更新</h2><p>${esc((e as Error).message)}</p><button class="ghost">關閉</button>`);
  }
}

// --- 頁首按鈕 ---------------------------------------------------------------------

const GUIDE_ICON = '<svg viewBox="0 0 24 24"><rect x="5" y="7" width="14" height="11" rx="5"/><path d="M12 3v4M9.5 12h.01M14.5 12h.01M10 15h4"/></svg>';
const UPDATE_ICON = '<svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 17v3h16v-3"/></svg>';

export function installChrome(version: string) {
  for (const header of document.querySelectorAll('#home > header, #app .panel > header')) {
    const gear = header.querySelector('.settings-open');
    const guide = document.createElement('button');
    guide.type = 'button';
    guide.className = 'ghost icon xk-guide-btn';
    guide.innerHTML = GUIDE_ICON;
    guide.title = guide.ariaLabel = '語音教學';
    guide.addEventListener('click', () => void startGuide());
    const upd = document.createElement('button');
    upd.type = 'button';
    upd.className = 'ghost icon xk-update';
    upd.innerHTML = UPDATE_ICON;
    upd.title = upd.ariaLabel = '檢查更新';
    upd.addEventListener('click', () => void checkUpdate(version));
    header.insertBefore(guide, gear);
    header.insertBefore(upd, gear);
  }
  // 線上版：首頁加上桌面版下載連結（桌面版才能一鍵送到 Bambu Studio）
  if (!desktop()) {
    const link = document.createElement('a');
    link.className = 'xk-desktop-link';
    link.href = `https://github.com/${UPDATE_REPO}/releases/latest`;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = '⬇ 下載桌面版（Windows／Mac，可一鍵送到 Bambu Studio）';
    document.querySelector('#home-version')?.before(link);
  }
  // 啟動後安靜地檢查一次
  setTimeout(() => void checkUpdate(version, true), 4000);
}
