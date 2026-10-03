// End-to-end happy path against the Firebase emulators:
// landing → sign-up → verify email → profile → create project →
// second account applies → owner accepts → team chat.
// Run via `npm run test:e2e` (starts the emulators and a dev server).
import puppeteer from 'puppeteer-core';
const BASE = process.env.BASE ?? 'http://localhost:5174';
const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const AUTH = 'http://127.0.0.1:9099/emulator/v1/projects/demo-teamup';
const OUT = process.env.E2E_SCREENSHOTS;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const consoleErrors = [];
let step = 'start';
const log = (m) => console.log(`✔ ${m}`);

async function newUser(tag) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(`[${tag}] ${m.text()}`));
  page.on('pageerror', (e) => consoleErrors.push(`[${tag}] pageerror ${e.message}`));
  await page.setViewport({ width: 390, height: 900 });
  return page;
}
const clickText = async (page, text, sel = 'button, a') => {
  const ok = await page.evaluate((text, sel) => {
    const el = [...document.querySelectorAll(sel)].find((e) => e.textContent.trim().startsWith(text) && !e.disabled);
    if (el) el.click();
    return !!el;
  }, text, sel);
  if (!ok) throw new Error(`no clickable "${text}"`);
};
const waitText = (page, text, timeout = 20000) => page.waitForFunction((t) => document.body.innerText.includes(t), { timeout }, text);
const type = async (page, selector, value) => { await page.waitForSelector(selector); await page.click(selector, { clickCount: 3 }); await page.type(selector, value); };
const pick = async (page, k) => {
  await page.evaluate((k) => document.querySelectorAll('div.space-y-1\\.5.rounded-xl.border')[k].querySelector('button').click(), k);
  await sleep(200);
  await page.evaluate((k) => document.querySelectorAll('div.space-y-1\\.5.rounded-xl.border')[k].querySelector('div.flex.flex-wrap button').click(), k);
};

async function signUp(page, email, name) {
  step = `${name}: landing`;
  await page.goto(BASE + '/', { waitUntil: 'networkidle2' });
  await waitText(page, 'Найди команду');
  await clickText(page, 'Создать аккаунт бесплатно');
  step = `${name}: sign up`;
  await page.waitForSelector('input[name="email"]');
  await type(page, 'input[name="email"]', email);
  await type(page, 'input[name="password"]', 'secret123');
  await page.evaluate(() => { const c = document.querySelector('input[type="checkbox"]'); if (c && !c.checked) c.click(); });
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => location.pathname === '/complete-profile', { timeout: 20000 });
  log(`${name}: signed up`);

  step = `${name}: verify email`;
  let code;
  for (let i = 0; i < 20 && !code; i++) {
    const codes = await (await fetch(`${AUTH}/oobCodes`)).json();
    code = codes.oobCodes.filter((c) => c.email === email && c.requestType === 'VERIFY_EMAIL').pop();
    if (!code) await sleep(500);
  }
  if (!code) throw new Error('no verification email sent');
  await fetch(code.oobLink);
  log(`${name}: email verified in emulator`);

  step = `${name}: complete profile`;
  await type(page, 'input[name="name"]', name);
  await type(page, 'input[name="age"]', '16');
  await type(page, 'input[name="city"]', 'Алматы');
  await pick(page, 0); // skills
  await pick(page, 1); // interests
  await type(page, 'input[name="telegram"]', '@' + name.toLowerCase());
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => location.pathname === '/feed', { timeout: 25000 });
  log(`${name}: profile complete (completeProfile function)`);

  step = `${name}: "I verified" refresh`;
  await waitText(page, 'Я подтвердил');
  await clickText(page, 'Я подтвердил');
  await page.waitForFunction(() => !document.body.innerText.includes('Я подтвердил'), { timeout: 15000 });
  log(`${name}: verification banner gone after token refresh`);
}

try {
  const alice = await newUser('alice');
  await signUp(alice, 'alice@e2e.test', 'Alice');

  step = 'alice: create project';
  await alice.goto(BASE + '/projects/new', { waitUntil: 'networkidle2' });
  await type(alice, 'input[name="title"]', 'Чат-бот для школы');
  await type(alice, 'textarea[name="description"]', 'Делаем чат-бота с расписанием для нашей школы.');
  await pick(alice, 0); // interests
  await type(alice, 'input[name="roles.0.title"]', 'Frontend');
  await pick(alice, 1); // role skills
  await clickText(alice, 'Опубликовать');
  await alice.waitForFunction(() => /^\/projects\/[^/]+$/.test(location.pathname) && !location.pathname.endsWith('/new'), { timeout: 20000 });
  const projectUrl = alice.url();
  log('alice: project published ' + projectUrl);

  const bob = await newUser('bob');
  await signUp(bob, 'bob@e2e.test', 'Bob');
  step = 'bob: apply';
  await bob.goto(projectUrl, { waitUntil: 'networkidle2' });
  await waitText(bob, 'Чат-бот для школы');
  await clickText(bob, 'Подать заявку');
  await type(bob, 'textarea[name="message"]', 'Хочу делать фронтенд!');
  await bob.click('form button[type="submit"]');
  await sleep(1500);
  log('bob: applied');

  step = 'bob: no contacts before joining';
  const aliceProfile = await bob.evaluate(() => [...document.querySelectorAll('a[href^="/users/"]')].find((a) => a.textContent.includes('Alice'))?.getAttribute('href'));
  await bob.goto(BASE + aliceProfile, { waitUntil: 'networkidle2' });
  await waitText(bob, 'Alice');
  await sleep(1500);
  if (await bob.evaluate(() => document.body.innerText.includes('@alice'))) throw new Error('contacts visible before joining');
  log('bob: Alice\'s contacts hidden before joining');

  step = 'alice: accept';
  await alice.goto(projectUrl, { waitUntil: 'networkidle2' });
  await waitText(alice, 'Bob');
  await clickText(alice, 'Принять');
  await waitText(alice, 'теперь в команде');
  log('alice: accepted Bob (acceptApplication function)');

  step = 'chat';
  await alice.reload({ waitUntil: 'networkidle2' });
  const sendIn = async (page, text) => {
    await page.waitForFunction(() => [...document.querySelectorAll('textarea, input')].some((e) => /сообщ/i.test(e.placeholder)), { timeout: 20000 });
    const handle = await page.evaluateHandle(() => [...document.querySelectorAll('textarea, input')].find((e) => /сообщ/i.test(e.placeholder)));
    await handle.type(text);
    await page.keyboard.press('Enter');
  };
  await sendIn(alice, 'Привет, Bob!');
  await bob.goto(projectUrl, { waitUntil: 'networkidle2' });
  await waitText(bob, 'Привет, Bob!');
  await sendIn(bob, 'Привет! Уже в деле');
  await waitText(alice, 'Привет! Уже в деле');
  log('chat: both see each other\'s messages');
  // Contacts open up via the syncContactVisibility trigger, a moment after accepting.
  step = 'alice: sees new teammate contacts';
  let seen = false;
  for (let i = 0; i < 10 && !seen; i++) {
    await alice.reload({ waitUntil: 'networkidle2' });
    seen = await alice.evaluate(() => document.body.innerText.includes('@bob'));
    if (!seen) await sleep(2000);
  }
  if (!seen) throw new Error('@bob not visible to the team lead');
  log('alice: sees Bob\'s contacts once he joined');
  console.log('E2E PASSED');
  process.exitCode = 0;
} catch (e) {
  console.log(`E2E FAILED at "${step}": ${e.message}`);
  // Workflow-command lines become annotations on the CI run.
  if (process.env.CI) {
    console.log(`::error title=E2E failed::${step}: ${e.message}`.replace(/\n/g, ' '));
    for (const c of consoleErrors.slice(0, 8)) console.log(`::warning title=Browser console::${c.replace(/\n/g, ' ').slice(0, 400)}`);
    const pages = (await Promise.all(browser.browserContexts().map((c) => c.pages()))).flat();
    for (const p of pages) {
      const text = await p.evaluate(() => location.pathname + ' | ' + document.body.innerText.replace(/\s+/g, ' ').slice(0, 300)).catch(() => '');
      console.log(`::warning title=Page state::${text}`);
    }
  }
  process.exitCode = 1;
  const pages = (await Promise.all(browser.browserContexts().map((c) => c.pages()))).flat();
  for (const [i, p] of pages.entries()) if (OUT) await p.screenshot({ path: `${OUT}/e2e-fail-${i}.png`, fullPage: true }).catch(() => {});
} finally {
  console.log('console errors:', JSON.stringify(consoleErrors.slice(0, 15), null, 1));
  await browser.close();
}
