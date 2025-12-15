#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { spawnSync } = require('child_process');
const readline = require('readline');

const envFile = process.env.ENV_FILE || path.join(__dirname, 'fetch_divar_phones_worker.env');
if (fs.existsSync(envFile)) {
  require('dotenv').config({ path: envFile });
}
require('dotenv').config();

const BASE_URL = process.env.BASE_URL || 'https://mahan.toncloud.observer/api';
const HEADERS_FILE = process.env.HEADERS_FILE || path.join(__dirname, 'jwt.txt');
const SLEEP_SEC = Number(process.env.SLEEP || 10);
const WORKER_ID = process.env.WORKER_ID || `worker-${process.pid}`;
const TOKEN = process.env.TOKEN;
let FETCH_METHOD = (process.env.FETCH_METHOD || '').toLowerCase();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const log = (...args) => console.log(`[${WORKER_ID}]`, ...args);
const warn = (...args) => console.warn(`[${WORKER_ID}]`, ...args);

const loadHeaders = () => {
  if (!fs.existsSync(HEADERS_FILE)) {
    throw new Error(`Headers file not found: ${HEADERS_FILE}`);
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
  } catch (err) {
    warn('Playwright not found, attempting install (chromium only)...');
    const res = spawnSync('npx', ['playwright', 'install', 'chromium'], {
      stdio: 'inherit',
    });
    if (res.status !== 0) {
      throw new Error('Playwright install failed');
    }
    return require('playwright');
  }
};

const fetchPhoneWithPlaywright = async (externalId) => {
  const pw = ensurePlaywright();
  const browser = await pw.chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  try {
    await page.goto(`https://divar.ir/v/${externalId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    });
    const btn = page.getByText('اطلاعات تماس');
    await btn.click({ timeout: 10000 });
    await page.waitForTimeout(500);
    const phone = await page.evaluate(() => {
      const m = document.body.innerText.match(/09\d{9}/);
      return m ? m[0] : null;
    });
    return phone;
  } finally {
    await browser.close();
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
  await promptMethod();
  const headers = loadHeaders();
  log(`Using BASE_URL=${BASE_URL}`);
  log(`Using method=${FETCH_METHOD}`);

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
    if (needsBusinessTitle && businessRef) {
      const titleRes = await fetchBusinessTitle(headers, businessRef);
      businessTitle = titleRes.title;
      if (businessTitle) {
        log(`Business title fetched for ${businessRef} -> "${businessTitle}"`);
      } else {
        warn(
          `Business title not found (http ${titleRes.status}) for ${businessRef} body="${titleRes.bodySnippet}"`,
        );
      }
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
