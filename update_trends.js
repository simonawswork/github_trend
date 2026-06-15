#!/usr/bin/env node

/**
 * update_trends.js
 * 抓取 GitHub Trending 並更新 data/trends.json
 * 邏輯：
 *   - 已存在的 repo → counter+1，更新 stars、descriptionEn、lastSeen
 *   - 新 repo → 加入，counter=1，設定 firstSeen & lastSeen
 *   - descriptionZhtw 由 cron job (Kira) 負責翻譯填入
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'trends.json');
const TODAY = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

// ── 抓 GitHub Trending HTML ──────────────────────────────────────────────────
function fetchTrending() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'github.com',
      path: '/trending',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; github-trend-tracker/1.0)',
        'Accept': 'text/html',
      },
    };
    https.get(options, res => {
      let body = '';
      res.on('data', chunk => (body += chunk));
      res.on('end', () => resolve(body));
    }).on('error', reject);
  });
}

// ── 用 GitHub API 抓 stars ────────────────────────────────────────────────────
function fetchStars(repoName) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${repoName}`,
      headers: {
        'User-Agent': 'github-trend-tracker/1.0',
        'Accept': 'application/vnd.github+json',
      },
    };
    https.get(options, res => {
      let body = '';
      res.on('data', chunk => (body += chunk));
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve(data.stargazers_count || 0);
        } catch {
          resolve(0);
        }
      });
    }).on('error', () => resolve(0));
  });
}

// ── 解析 HTML，回傳 repo 陣列 ────────────────────────────────────────────────
function parseTrending(html) {
  const repos = [];

  const articleRegex = /<article[^>]*class="Box-row"[^>]*>([\s\S]*?)<\/article>/g;
  let articleMatch;

  while ((articleMatch = articleRegex.exec(html)) !== null) {
    const block = articleMatch[1];

    // name: 從 h2 > a 的 href 抓 owner/repo
    const nameMatch = block.match(/href="\/([\w.-]+\/[\w.-]+)"[^>]*data-view-component/);
    const rawName = nameMatch ? nameMatch[1].trim() : null;
    if (!rawName) continue;
    // 排除 sponsors/ apps/ 等非 repo 路徑
    if (/^(sponsors|apps|login|organizations|topics|trending)/.test(rawName)) continue;

    const name = rawName;
    const url = `https://github.com/${name}`;

    // description (英文原文)
    const descMatch = block.match(/<p[^>]*class="[^"]*col-9[^"]*"[^>]*>([\s\S]*?)<\/p>/);
    const descriptionEn = descMatch
      ? descMatch[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim()
      : '';

    repos.push({ name, url, descriptionEn });
  }

  return repos;
}

// ── 主流程 ───────────────────────────────────────────────────────────────────
async function main() {
  console.log(`[${new Date().toISOString()}] 開始抓取 GitHub Trending...`);

  // 讀現有資料
  let existing = { lastUpdate: '', repos: [] };
  if (fs.existsSync(DATA_FILE)) {
    try {
      existing = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (e) {
      console.warn('無法解析既有 JSON，從空白開始');
    }
  }

  const existingMap = new Map(existing.repos.map(r => [r.name, r]));

  // 抓趨勢
  const html = await fetchTrending();
  const fetched = parseTrending(html);

  if (fetched.length === 0) {
    console.error('解析失敗，沒有抓到任何 repo，請檢查 HTML 結構');
    process.exit(1);
  }

  console.log(`抓到 ${fetched.length} 個 trending repos，正在查詢 stars...`);

  // 逐一查詢 stars（避免 rate limit，間隔 300ms）
  for (let i = 0; i < fetched.length; i++) {
    fetched[i].stars = await fetchStars(fetched[i].name);
    if (i < fetched.length - 1) await new Promise(r => setTimeout(r, 300));
  }

  console.log('Stars 查詢完畢');

  // 合併
  for (const r of fetched) {
    if (existingMap.has(r.name)) {
      const old = existingMap.get(r.name);
      old.counter = (old.counter || 1) + 1;
      old.stars = r.stars;
      old.descriptionEn = r.descriptionEn || old.descriptionEn;
      old.lastSeen = TODAY;
      // descriptionZhtw 保留現有翻譯，新上榜由 cron job 補譯
    } else {
      existingMap.set(r.name, {
        name: r.name,
        url: r.url,
        descriptionZhtw: '', // 由 cron job (Kira) 翻譯填入
        descriptionEn: r.descriptionEn,
        counter: 1,
        stars: r.stars,
        firstSeen: TODAY,
        lastSeen: TODAY,
      });
    }
  }

  const result = {
    lastUpdate: new Date().toISOString(),
    repos: Array.from(existingMap.values()),
  };

  fs.writeFileSync(DATA_FILE, JSON.stringify(result, null, 2), 'utf8');
  console.log(`✅ 已更新 ${DATA_FILE}，共 ${result.repos.length} 個 repos`);
}

main().catch(err => {
  console.error('❌ 發生錯誤：', err);
  process.exit(1);
});
