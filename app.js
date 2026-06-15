let allRepos = [];

async function loadData() {
  const res = await fetch('data/trends.json');
  const data = await res.json();

  allRepos = data.repos || [];

  const lastUpdate = document.getElementById('last-update');
  lastUpdate.textContent = data.lastUpdate
    ? `最後更新：${new Date(data.lastUpdate).toLocaleString('zh-TW')}`
    : '尚無資料';

  render();
}

function render() {
  const query = document.getElementById('search').value.toLowerCase();
  const sortBy = document.getElementById('sort').value;

  let repos = allRepos.filter(r =>
    r.name.toLowerCase().includes(query) ||
    (r.description || '').toLowerCase().includes(query)
  );

  repos.sort((a, b) => {
    if (sortBy === 'stars') return (b.stars || 0) - (a.stars || 0);
    if (sortBy === 'counter') return (b.counter || 0) - (a.counter || 0);
    if (sortBy === 'firstSeen') return new Date(b.firstSeen) - new Date(a.firstSeen);
    // default: lastSeen
    return new Date(b.lastSeen) - new Date(a.lastSeen);
  });

  const container = document.getElementById('repo-list');

  if (repos.length === 0) {
    container.innerHTML = '<div class="empty-state">找不到符合的 repo</div>';
    return;
  }

  container.innerHTML = repos.map(r => `
    <div class="repo-card">
      <div class="repo-card-header">
        <div class="repo-name">
          <a href="${r.url}" target="_blank" rel="noopener">${r.name}</a>
        </div>
        <div class="repo-badges">
          <span class="badge badge-stars">⭐ ${(r.stars || 0).toLocaleString()}</span>
          <span class="badge badge-counter">🔥 上榜 ${r.counter || 1} 次</span>
        </div>
      </div>
      <div class="repo-description">${r.description || '（無描述）'}</div>
      <div class="repo-meta">
        <span>📅 首次上榜：${r.firstSeen || '-'}</span>
        <span>🕐 最後上榜：${r.lastSeen || '-'}</span>
      </div>
    </div>
  `).join('');
}

document.getElementById('search').addEventListener('input', render);
document.getElementById('sort').addEventListener('change', render);

loadData();
