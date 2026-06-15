# GitHub Trending Tracker

每天早上自動抓取 GitHub Trending 熱門 repo，以前端網頁方式呈現，並追蹤每個 repo 的上榜歷史。

🌐 **Live Site:** https://simonawswork.github.io/github_trend/

---

## 功能

- 📊 每日自動更新 GitHub Trending 前 10 名
- 🔥 追蹤每個 repo 的累計上榜次數
- ⭐ 顯示 Stars 數量（透過 GitHub API 即時查詢）
- 🔍 支援搜尋（名稱 / 描述）
- 📅 記錄首次與最後上榜時間
- 🗂️ 支援多欄位排序

## 資料結構

資料存放於 `data/trends.json`：

```json
{
  "lastUpdate": "2026-06-15T10:00:00+08:00",
  "repos": [
    {
      "name": "owner/repo",
      "url": "https://github.com/owner/repo",
      "description": "repo 用途說明",
      "counter": 3,
      "stars": 12345,
      "firstSeen": "2026-06-13",
      "lastSeen": "2026-06-15"
    }
  ]
}
```

| 欄位 | 說明 |
|------|------|
| `name` | owner/repo 格式 |
| `url` | GitHub 連結 |
| `description` | repo 描述 |
| `counter` | 累計上榜次數 |
| `stars` | 目前 Star 數 |
| `firstSeen` | 第一次出現在 trending 的日期 |
| `lastSeen` | 最後一次出現在 trending 的日期 |

## 自動化流程

```
每天 10:00 (Asia/Taipei)
    ↓
update_trends.js 爬取 github.com/trending
    ↓
對比現有 trends.json
  - 已有 repo → counter+1，更新 stars / description / lastSeen
  - 新 repo   → 新增，counter=1，設定 firstSeen & lastSeen
    ↓
git commit & push to main
    ↓
GitHub Actions 自動 deploy 到 GitHub Pages
```

## 本地開發

```bash
# Clone
git clone git@github.com:simonawswork/github_trend.git
cd github_trend

# 手動更新資料
node update_trends.js

# 直接用瀏覽器開啟（或起一個 local server）
npx serve .
```

## 技術棧

- **前端：** 純 HTML / CSS / JavaScript（無框架）
- **資料：** JSON flat file
- **部署：** GitHub Pages
- **CI/CD：** GitHub Actions
- **排程：** OpenClaw cron（每日 10:00 Asia/Taipei）
