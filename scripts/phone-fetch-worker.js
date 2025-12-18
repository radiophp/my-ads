#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const readline = require('readline');

let dotenv;
try {
  dotenv = require('dotenv');
} catch {
  dotenv = require(path.join(__dirname, '..', 'server', 'node_modules', 'dotenv'));
}

let axios;
try {
  axios = require('axios');
} catch {
  axios = require(path.join(__dirname, '..', 'server', 'node_modules', 'axios'));
}
if (axios && axios.default) {
  axios = axios.default;
}

const envFile = process.env.ENV_FILE || path.join(__dirname, 'fetch_divar_phones_worker.env');
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile });
}
dotenv.config();

const BASE_URL = process.env.BASE_URL || 'https://mahan.toncloud.observer/api';
const HEADERS_FILE = process.env.HEADERS_FILE || path.join(__dirname, 'jwt.txt');
const SLEEP_SEC = Number(process.env.SLEEP || 10);
const WORKER_ID = process.env.WORKER_ID || `worker-${process.pid}`;
const TOKEN = process.env.TOKEN;
let FETCH_METHOD = (process.env.FETCH_METHOD || 'playwright').toLowerCase();
const PW_BROWSER = (process.env.PW_BROWSER || 'firefox').toLowerCase();
const FIREFOX_USER_DIR = process.env.FIREFOX_USER_DIR;
const FIREFOX_EXECUTABLE = process.env.FIREFOX_EXECUTABLE;
const FIREFOX_PROFILE_DIR =
  FIREFOX_USER_DIR || process.env.FIREFOX_TEMP_PROFILE_DIR || path.join(__dirname, '.pw-firefox-profile');
if (!fs.existsSync(FIREFOX_PROFILE_DIR)) {
  fs.mkdirSync(FIREFOX_PROFILE_DIR, { recursive: true });
}
const profileNote = `Firefox profile dir: ${FIREFOX_PROFILE_DIR}`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const log = (...args) => console.log(`[${WORKER_ID}]`, ...args);
const warn = (...args) => console.warn(`[${WORKER_ID}]`, ...args);

const loadHeaders = (opts = { strict: true }) => {
  if (!fs.existsSync(HEADERS_FILE)) {
    if (opts.strict) {
      throw new Error(`Headers file not found: ${HEADERS_FILE}`);
    }
    warn(`Headers file not found: ${HEADERS_FILE} (continuing without headers)`);
    return null;
  }
  const lines = fs.readFileSync(HEADERS_FILE, 'utf8').split(/\r?\n/);
  const headers = {};
  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!key || !value) continue;
    if (['content-length', 'connection'].includes(key.toLowerCase())) continue;
    headers[key] = value;
  }
  if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`;
  return headers;
};

const ensurePlaywright = () => {
  try {
    return require('playwright');
  } catch (err1) {
    try {
      return require(path.join(__dirname, '..', 'server', 'node_modules', 'playwright'));
    } catch (err2) {
      warn('Playwright not found, attempting install (chromium only)...');
      const res = spawnSync('npx', ['playwright', 'install', 'chromium'], {
        stdio: 'inherit',
      });
      if (res.status !== 0) {
        throw new Error('Playwright install failed');
      }
      try {
        return require('playwright');
      } catch {
        return require(path.join(__dirname, '..', 'server', 'node_modules', 'playwright'));
      }
    }
  }
};

const installBrowser = (name) => {
  const res = spawnSync('npx', ['playwright', 'install', name], { stdio: 'inherit' });
  if (res.status !== 0) {
    throw new Error(`Playwright install ${name} failed`);
  }
};

let sharedContext = null;
let sharedBrowser = null;
let sharedProfileDir = FIREFOX_PROFILE_DIR;
let shuttingDown = false;

const clickContactButton = async (page) => {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  // Prefer the explicit button label if present
  const primary = page.getByRole('button', { name: /برو به اطلاعات تماس/ }).first();
  const fallback = page.getByRole('button', { name: /اطلاعات تماس/ }).first();
  const target = (await primary.count()) > 0 ? primary : fallback;
  await target.scrollIntoViewIfNeeded();
  try {
    await target.click({ timeout: 15000, force: true });
  } catch (err) {
    await page.evaluate(() => {
      const btn =
        Array.from(document.querySelectorAll('button')).find((b) =>
          b.innerText.includes('اطلاعات تماس'),
        ) || null;
      if (btn) {
        btn.scrollIntoView({ behavior: 'instant', block: 'center' });
        btn.click();
      }
    });
  }
};

const fetchPhoneWithPlaywright = async (externalId) => {
  const pw = ensurePlaywright();
  const launchFirefoxPersistent = async () => {
    const opts = {
      headless: false,
      viewport: { width: 1280, height: 720 },
    };
    if (FIREFOX_EXECUTABLE) {
      opts.executablePath = FIREFOX_EXECUTABLE;
    }
    const profileDir = sharedProfileDir;
    log(
      `Using Firefox profile ${profileDir}${
        FIREFOX_EXECUTABLE ? ` exec=${FIREFOX_EXECUTABLE}` : ''
      }`,
    );
    const context = await pw.firefox.launchPersistentContext(profileDir, opts);
    return context;
  };

  if (PW_BROWSER === 'firefox') {
    if (!sharedContext) {
      let context;
      try {
        context = await launchFirefoxPersistent();
      } catch (err) {
        if ((err.message || '').toLowerCase().includes('executable') || (err.message || '').toLowerCase().includes('profile')) {
          installBrowser('firefox');
          context = await pw.firefox.launchPersistentContext(sharedProfileDir, {
            headless: false,
            viewport: { width: 1280, height: 720 },
          });
        } else {
          throw err;
        }
      }
      sharedContext = context;
    }
    const page = sharedContext.pages()[0] || (await sharedContext.newPage());
    const myDivarBtn = page.locator('button.kt-button').filter({ hasText: 'دیوار من' }).first();
    if (await myDivarBtn.count()) {
      await myDivarBtn.click({ timeout: 15000 }).catch(() => undefined);
      const loginBtn = page.locator('button.kt-fullwidth-link').filter({ hasText: 'ورود' }).first();
      if (await loginBtn.count()) {
        await loginBtn.click({ timeout: 15000 }).catch(() => undefined);
        log('Waiting for manual login... looking for خروج to appear');
        await page.waitForSelector('button.kt-fullwidth-link:has-text("خروج")', {
          timeout: 180000,
        });
      }
    }
    await page.goto(`https://divar.ir/v/${externalId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await clickContactButton(page);
    await page.waitForSelector('.copyRow-l4byg9', { timeout: 10000 }).catch(() => undefined);
    const phone = await page.evaluate(() => {
      const direct = document.querySelector('.copyRow-l4byg9 a[href^="tel:"]');
      if (direct) {
        return direct.textContent.trim();
      }
      const text = document.body.innerText;
      const m = text.match(/09\d{9}/);
      if (m) return m[0];
      const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
      const p = text.match(/[۰-۹]{11}/);
      if (p) {
        return p[0].replace(/[۰-۹]/g, (d) => persianDigits.indexOf(d));
      }
      return null;
    });
    return phone;
  }

  const browserType = PW_BROWSER === 'firefox' ? pw.firefox : pw.chromium;
  let browser;
  try {
    const launchOpts = { headless: PW_BROWSER === 'firefox' ? false : true };
    if (FIREFOX_EXECUTABLE && PW_BROWSER === 'firefox') {
      launchOpts.executablePath = FIREFOX_EXECUTABLE;
      log(`Using system Firefox exec=${FIREFOX_EXECUTABLE} (non-headless)`);
    }
    if (sharedBrowser) {
      browser = sharedBrowser;
    } else {
      browser = await browserType.launch(launchOpts);
      sharedBrowser = browser;
    }
  } catch (err) {
    const msg = (err.message || '').toLowerCase();
    if (msg.includes('executable') || msg.includes('profile')) {
      installBrowser(PW_BROWSER === 'firefox' ? 'firefox' : 'chromium');
      browser = await browserType.launch({ headless: PW_BROWSER === 'firefox' ? false : true });
    } else {
      throw err;
    }
  }
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  try {
    await page.goto(`https://divar.ir/v/${externalId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await clickContactButton(page);
    await page.waitForTimeout(1000);
    const phone = await page.evaluate(() => {
      const text = document.body.innerText;
      const m = text.match(/09\d{9}/);
      if (m) return m[0];
      const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
      const p = text.match(/[۰-۹]{11}/);
      if (p) {
        return p[0].replace(/[۰-۹]/g, (d) => persianDigits.indexOf(d));
      }
      return null;
    });
    return phone;
  } finally {
    if (!sharedBrowser) {
      await browser.close();
    }
  }
};

const fetchPhoneWithApi = async (headers, externalId, contactUuid) => {
  const resp = await axios.post(
    `https://api.divar.ir/v8/postcontact/web/contact_info_v2/${externalId}`,
    { contact_uuid: contactUuid },
    { headers, validateStatus: () => true },
  );
  const bodySnippet =
    typeof resp.data === 'string'
      ? resp.data.slice(0, 300)
      : JSON.stringify(resp.data ?? {}).slice(0, 300);
  const widgetList = resp.data?.widget_list ?? [];
  const phone = widgetList
    .map((w) => w?.data?.action?.payload?.phone_number)
    .find((p) => !!p);
  return { phone, status: resp.status, bodySnippet };
};

const fetchBusinessTitle = async (headers, businessRef) => {
  const token = businessRef.includes('_') ? businessRef.split('_')[1] : businessRef;
  const url = `https://api.divar.ir/v8/premium-user/web/business/brand-landing/${token}`;
  const resp = await axios.post(
    url,
    {
      specification: { last_item_identifier: '' },
      request_data: { brand_token: token, tracker_session_id: '' },
    },
    {
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Accept-Encoding': 'identity',
        'User-Agent':
          headers['User-Agent'] ||
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0',
      },
      validateStatus: () => true,
    },
  );
  const title =
    resp.data?.header_widget_list
      ?.find((w) => w?.widget_type === 'LEGEND_TITLE_ROW')
      ?.data?.title ?? null;
  const bodySnippet =
    typeof resp.data === 'string'
      ? resp.data.slice(0, 300)
      : JSON.stringify(resp.data ?? {}).slice(0, 300);
  return { title, status: resp.status, bodySnippet };
};

const promptMethod = async () => {
  if (FETCH_METHOD) return;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise((resolve) => rl.question(q, resolve));
  const answer = await ask('Fetch method [playwright/curl] (default playwright): ');
  rl.close();
  FETCH_METHOD = (answer || 'playwright').toLowerCase();
};

const main = async () => {
  const cleanup = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    if (signal) {
      log(`Received ${signal}, closing browser and saving profile...`);
    }
    if (sharedContext) {
      try {
        await sharedContext.close();
      } catch {
        /* ignore */
      }
    }
    if (sharedBrowser) {
      try {
        await sharedBrowser.close();
      } catch {
        /* ignore */
      }
    }
    process.exit(0);
  };
  process.once('SIGINT', () => cleanup('SIGINT'));
  process.once('SIGTERM', () => cleanup('SIGTERM'));
  process.once('exit', () => cleanup('exit'));

  await promptMethod();
  const headers = FETCH_METHOD === 'curl' ? loadHeaders({ strict: true }) : loadHeaders({ strict: false });
  log(`Using BASE_URL=${BASE_URL}`);
  log(`Using method=${FETCH_METHOD}`);
  if (FETCH_METHOD === 'playwright' && PW_BROWSER === 'firefox') {
    log(profileNote);
  }

  while (true) {
    let lease;
    try {
      lease = await axios.post(
        `${BASE_URL}/phone-fetch/lease`,
        { workerId: WORKER_ID },
        { headers: { 'Content-Type': 'application/json' }, validateStatus: () => true },
      );
    } catch (error) {
      warn(`Lease request failed: ${(error.message || error).toString()}`);
      await sleep(SLEEP_SEC * 1000);
      continue;
    }

    if (lease.data?.status === 'empty') {
      await sleep(SLEEP_SEC * 1000);
      continue;
    }
    const leaseData = lease.data || {};
    const { leaseId, externalId, contactUuid, businessRef, needsBusinessTitle, postTitle } = leaseData;
    if (!leaseId || !externalId || !contactUuid) {
      warn(`Lease missing fields: ${JSON.stringify(leaseData)}`);
      await sleep(SLEEP_SEC * 1000);
      continue;
    }

    log(
      `Fetching phone for ${externalId} (lease ${leaseId}) -> https://divar.ir/v/${externalId} ${
        businessRef ? `[business=${businessRef} needsTitle=${needsBusinessTitle}]` : '[personal]'
      } "${postTitle || ''}"`,
    );

    if (headers) {
      try {
        await axios.get(`https://api.divar.ir/v8/posts/${externalId}`, {
          headers: { ...headers, 'Accept-Encoding': 'identity' },
          timeout: 10000,
          validateStatus: () => true,
        });
      } catch {
        /* ignore */
      }
      await sleep(2000);
    }

    let phoneRaw = null;
    let contactCode = 0;
    let contactBodySnip = '';
    let status = 'ok';
    let err = null;

    if (FETCH_METHOD === 'playwright') {
      try {
        phoneRaw = await fetchPhoneWithPlaywright(externalId);
        contactCode = phoneRaw ? 200 : 0;
        if (!phoneRaw) {
          status = 'error';
          err = 'playwright_no_phone';
        }
      } catch (error) {
        status = 'error';
        err = 'playwright_failed';
        warn(`Playwright failed for ${externalId}: ${error.message || error}`);
      }
    } else {
      const contact = await fetchPhoneWithApi(headers, externalId, contactUuid);
      phoneRaw = contact.phone;
      contactCode = contact.status;
      contactBodySnip = contact.bodySnippet;
      if (contactCode !== 200 || !phoneRaw) {
        status = 'error';
        err = `http=${contactCode}${!phoneRaw && contactCode === 200 ? ' phone_missing' : ''}`;
        warn(`Failed for ${externalId} (${err}) body="${contactBodySnip}"`);
      }
    }

    let phoneNorm = phoneRaw ? phoneRaw.replace(/[^\d۰۱۲۳۴۵۶۷۸۹]/g, '') : null;
    if (phoneNorm) {
      phoneNorm = phoneNorm.replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
    }

    let businessTitle = null;
    if (needsBusinessTitle && businessRef && headers) {
      const titleRes = await fetchBusinessTitle(headers, businessRef);
      businessTitle = titleRes.title;
      if (businessTitle) {
        log(`Business title fetched for ${businessRef} -> "${businessTitle}"`);
      } else {
        warn(
          `Business title not found (http ${titleRes.status}) for ${businessRef} body="${titleRes.bodySnippet}"`,
        );
      }
    } else if (needsBusinessTitle && businessRef && !headers) {
      warn('Skipping business title fetch (no headers available in playwright mode).');
    }

    const report = {
      leaseId,
      status: status || 'ok',
    };
    if (report.status === 'ok') {
      report.phoneNumber = phoneNorm;
      if (businessTitle) report.businessTitle = businessTitle;
    } else {
      report.error = err || 'unknown';
    }

    await axios.post(`${BASE_URL}/phone-fetch/report`, report, {
      headers: { 'Content-Type': 'application/json' },
      validateStatus: () => true,
    });

    await sleep(SLEEP_SEC * 1000);
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
