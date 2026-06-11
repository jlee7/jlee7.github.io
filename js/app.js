(() => {
  const REPO = 'jlee7/jlee7.github.io';

  const STAGE_LABELS = {
    group: '조별리그',
    ro32: '32강',
    ro16: '16강',
    qf: '8강',
    sf: '4강',
    third: '3·4위전',
    final: '결승'
  };

  const STAGE_ORDER = ['group', 'ro32', 'ro16', 'qf', 'sf', 'third', 'final'];

  let teams = null;       // { groups: { A: [...], ... } }
  let matchesData = null; // { matches: [...] }
  let tipsData = null;    // { users: {...} }

  async function loadData() {
    const [teamsRes, matchesRes, tipsRes] = await Promise.all([
      fetch('data/teams.json'),
      fetch('data/matches.json'),
      fetch('data/tips.json')
    ]);
    teams = await teamsRes.json();
    matchesData = await matchesRes.json();
    tipsData = await tipsRes.json();
  }

  function teamLabel(side) {
    if (!side) return '미정';
    return side.name_ko || side.name_en || side.id || '미정';
  }

  function teamCode(side) {
    return (side && side.id) ? side.id : '';
  }

  function formatDateTime(date, time) {
    const d = new Date(`${date}T${time || '00:00'}:00`);
    if (isNaN(d.getTime())) return `${date} ${time || ''}`;
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return `${d.getMonth() + 1}.${d.getDate()}(${days[d.getDay()]}) ${time || ''}`;
  }

  // ── Tabs ──────────────────────────────────────────────
  function initTabs() {
    document.querySelectorAll('.tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`view-${btn.dataset.view}`).classList.add('active');
      });
    });
  }

  // ── Shared: match row ────────────────────────────────
  function buildMatchRow(m) {
    const row = document.createElement('div');
    row.className = 'match-row';

    const meta = document.createElement('div');
    meta.className = 'match-meta';
    const badge = m.group ? `${m.group}조` : (STAGE_LABELS[m.stage] || m.stage);
    meta.innerHTML = `
      <span class="group-badge">${badge}</span>
      <span>${formatDateTime(m.date, m.time)}</span>
      <span>${[m.venue, m.city].filter(Boolean).join(' · ')}</span>
    `;

    const teamsEl = document.createElement('div');
    teamsEl.className = 'match-teams';
    teamsEl.innerHTML = `
      <span class="team home">${teamLabel(m.home)}${teamCode(m.home) ? ` <span class="team-code">${teamCode(m.home)}</span>` : ''}</span>
      <span class="vs-sep">vs</span>
      <span class="team away">${teamCode(m.away) ? `<span class="team-code">${teamCode(m.away)}</span> ` : ''}${teamLabel(m.away)}</span>
    `;

    const score = document.createElement('div');
    if (m.homeScore !== null && m.awayScore !== null) {
      score.className = 'match-score';
      score.textContent = `${m.homeScore} : ${m.awayScore}`;
    } else {
      score.className = 'match-score pending';
      score.textContent = '예정';
    }

    row.append(meta, teamsEl, score);
    return row;
  }

  // ── Home ──────────────────────────────────────────────
  function renderHome() {
    const totalTeams = Object.values(teams.groups).reduce((sum, list) => sum + list.length, 0);
    document.getElementById('stat-teams').textContent = totalTeams;
    document.getElementById('stat-groups').textContent = Object.keys(teams.groups).length;
    document.getElementById('stat-matches').textContent = matchesData.matches.length;
    document.getElementById('stat-players').textContent = Object.keys(tipsData.users || {}).length;

    const upcoming = matchesData.matches.filter(m => m.homeScore === null).slice(0, 5);
    const container = document.getElementById('upcoming-matches');
    container.innerHTML = '';
    if (upcoming.length === 0) {
      container.innerHTML = '<p class="empty-msg">모든 경기가 종료되었습니다.</p>';
      return;
    }
    upcoming.forEach(m => container.appendChild(buildMatchRow(m)));
  }

  // ── Schedule ─────────────────────────────────────────
  function populateGroupFilter() {
    const sel = document.getElementById('filter-group');
    Object.keys(teams.groups).sort().forEach(g => {
      const opt = document.createElement('option');
      opt.value = g;
      opt.textContent = `${g}조`;
      sel.appendChild(opt);
    });
  }

  function renderSchedule() {
    const groupFilter = document.getElementById('filter-group').value;
    const stageFilter = document.getElementById('filter-stage').value;
    const container = document.getElementById('schedule-list');
    container.innerHTML = '';

    const filtered = matchesData.matches.filter(m => {
      if (groupFilter !== 'all' && m.group !== groupFilter) return false;
      if (stageFilter !== 'all' && m.stage !== stageFilter) return false;
      return true;
    });

    if (filtered.length === 0) {
      container.innerHTML = '<p class="empty-msg">해당 조건의 경기가 없습니다.</p>';
      return;
    }

    filtered.forEach(m => container.appendChild(buildMatchRow(m)));
  }

  // ── Standings ────────────────────────────────────────
  function computeGroupStandings(group) {
    const teamList = teams.groups[group];
    const stats = {};
    teamList.forEach(t => {
      stats[t.id] = { team: t, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, Pts: 0 };
    });

    matchesData.matches
      .filter(m => m.stage === 'group' && m.group === group && m.homeScore !== null && m.awayScore !== null)
      .forEach(m => {
        const h = stats[m.home.id];
        const a = stats[m.away.id];
        if (!h || !a) return;
        h.P++; a.P++;
        h.GF += m.homeScore; h.GA += m.awayScore;
        a.GF += m.awayScore; a.GA += m.homeScore;
        if (m.homeScore > m.awayScore) { h.W++; h.Pts += 3; a.L++; }
        else if (m.homeScore < m.awayScore) { a.W++; a.Pts += 3; h.L++; }
        else { h.D++; a.D++; h.Pts += 1; a.Pts += 1; }
      });

    const rows = Object.values(stats);
    rows.forEach(r => { r.GD = r.GF - r.GA; });
    rows.sort((a, b) =>
      b.Pts - a.Pts ||
      b.GD - a.GD ||
      b.GF - a.GF ||
      a.team.name_ko.localeCompare(b.team.name_ko, 'ko')
    );
    return rows;
  }

  function renderStandings() {
    const grid = document.getElementById('standings-grid');
    grid.innerHTML = '';

    Object.keys(teams.groups).sort().forEach(group => {
      const rows = computeGroupStandings(group);

      const card = document.createElement('div');
      card.className = 'group-table-card';

      const heading = document.createElement('h4');
      heading.textContent = `${group}조`;

      const table = document.createElement('table');
      table.innerHTML = `
        <thead><tr>
          <th>#</th><th style="text-align:left">팀</th><th>경기</th><th>승</th><th>무</th><th>패</th>
          <th>득</th><th>실</th><th>차</th><th>승점</th>
        </tr></thead>
      `;
      const tbody = document.createElement('tbody');
      rows.forEach((r, i) => {
        const tr = document.createElement('tr');
        const gd = r.GD > 0 ? `+${r.GD}` : `${r.GD}`;
        tr.innerHTML = `
          <td>${i + 1}</td>
          <td class="team-name">${r.team.name_ko}</td>
          <td>${r.P}</td><td>${r.W}</td><td>${r.D}</td><td>${r.L}</td>
          <td>${r.GF}</td><td>${r.GA}</td><td>${gd}</td>
          <td><strong>${r.Pts}</strong></td>
        `;
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);

      card.append(heading, table);
      grid.appendChild(card);
    });
  }

  // ── Tips form ────────────────────────────────────────
  function getStoredNickname() {
    return localStorage.getItem('wc2026_nickname') || '';
  }

  function getStoredPredictions() {
    try {
      return JSON.parse(localStorage.getItem('wc2026_predictions') || '{}');
    } catch (e) {
      return {};
    }
  }

  function buildTipSection(title, matchList, predictions) {
    const section = document.createElement('div');
    section.className = 'group-section';

    const heading = document.createElement('h4');
    heading.textContent = title;
    section.appendChild(heading);

    matchList.forEach(m => {
      const pred = predictions[m.id] || {};
      const row = document.createElement('div');
      row.className = 'tip-row';
      row.innerHTML = `
        <div class="match-meta"><span>${formatDateTime(m.date, m.time)}</span></div>
        <span class="team-pick home">${teamLabel(m.home)}</span>
        <input type="number" min="0" max="20" class="score-input" data-match="${m.id}" data-side="home" value="${pred.home ?? ''}">
        <span class="vs-sep">:</span>
        <input type="number" min="0" max="20" class="score-input" data-match="${m.id}" data-side="away" value="${pred.away ?? ''}">
        <span class="team-pick away">${teamLabel(m.away)}</span>
      `;
      section.appendChild(row);
    });

    return section;
  }

  function renderTipsForm() {
    document.getElementById('nickname').value = getStoredNickname();
    const predictions = getStoredPredictions();

    const container = document.getElementById('tips-form');
    container.innerHTML = '';

    const isPredictable = m => m.home && m.away && m.home.id && m.away.id && m.homeScore === null;

    Object.keys(teams.groups).sort().forEach(group => {
      const groupMatches = matchesData.matches.filter(m => m.stage === 'group' && m.group === group && isPredictable(m));
      if (groupMatches.length === 0) return;
      container.appendChild(buildTipSection(`${group}조`, groupMatches, predictions));
    });

    STAGE_ORDER.filter(s => s !== 'group').forEach(stage => {
      const stageMatches = matchesData.matches.filter(m => m.stage === stage && isPredictable(m));
      if (stageMatches.length === 0) return;
      container.appendChild(buildTipSection(STAGE_LABELS[stage], stageMatches, predictions));
    });

    if (container.children.length === 0) {
      container.innerHTML = '<p class="empty-msg">현재 예측 가능한 경기가 없습니다.</p>';
    }
  }

  function collectPredictions() {
    const predictions = {};
    document.querySelectorAll('#tips-form .score-input').forEach(input => {
      if (input.value === '') return;
      const val = parseInt(input.value, 10);
      if (isNaN(val) || val < 0) return;
      const matchId = input.dataset.match;
      const side = input.dataset.side;
      predictions[matchId] = predictions[matchId] || {};
      predictions[matchId][side] = val;
    });
    Object.keys(predictions).forEach(id => {
      const p = predictions[id];
      if (p.home === undefined || p.away === undefined) delete predictions[id];
    });
    return predictions;
  }

  function setStatus(message, isError) {
    const status = document.getElementById('save-status');
    status.textContent = message;
    status.style.color = isError ? 'var(--red)' : 'var(--accent)';
  }

  function saveLocal() {
    const nickname = document.getElementById('nickname').value.trim();
    const predictions = collectPredictions();
    localStorage.setItem('wc2026_nickname', nickname);
    localStorage.setItem('wc2026_predictions', JSON.stringify(predictions));
    setStatus(`브라우저에 저장되었습니다. (${Object.keys(predictions).length}개 경기 예측)`, false);
  }

  function submitGithub() {
    const nickname = document.getElementById('nickname').value.trim();
    if (!nickname) {
      setStatus('닉네임을 입력해주세요.', true);
      return;
    }
    const predictions = collectPredictions();
    if (Object.keys(predictions).length === 0) {
      setStatus('예측을 1개 이상 입력해주세요.', true);
      return;
    }
    saveLocal();

    const params = new URLSearchParams({
      template: 'tip.yml',
      title: `[TIP] ${nickname}`,
      labels: 'tip-submission',
      nickname,
      predictions: JSON.stringify(predictions)
    });
    const url = `https://github.com/${REPO}/issues/new?${params.toString()}`;
    window.open(url, '_blank', 'noopener');
    setStatus('GitHub 이슈 작성 페이지를 새 탭에서 열었습니다. 내용을 확인하고 이슈를 제출(Submit new issue)하면 예측이 저장됩니다.', false);
  }

  // ── Leaderboard ──────────────────────────────────────
  function scorePrediction(pred, match) {
    if (match.homeScore === null || match.awayScore === null) return null;
    if (pred.home === match.homeScore && pred.away === match.awayScore) return 4;

    const predGD = pred.home - pred.away;
    const actGD = match.homeScore - match.awayScore;
    if (predGD === actGD) return 3;

    const sign = n => (n > 0 ? 1 : n < 0 ? -1 : 0);
    if (sign(predGD) === sign(actGD)) return 2;

    return 0;
  }

  function renderLeaderboard() {
    const matchesById = {};
    matchesData.matches.forEach(m => { matchesById[m.id] = m; });

    const users = tipsData.users || {};
    const rows = Object.entries(users).map(([key, u]) => {
      let total = 0, scored = 0, hits = 0;
      Object.entries(u.predictions || {}).forEach(([mid, pred]) => {
        const match = matchesById[mid];
        if (!match) return;
        const pts = scorePrediction(pred, match);
        if (pts === null) return;
        scored++;
        total += pts;
        if (pts > 0) hits++;
      });
      return { name: u.displayName || key, total, scored, hits };
    });

    rows.sort((a, b) => b.total - a.total || b.hits - a.hits || a.name.localeCompare(b.name, 'ko'));

    const tbody = document.querySelector('#leaderboard-table tbody');
    tbody.innerHTML = '';
    const empty = document.getElementById('leaderboard-empty');

    if (rows.length === 0) {
      empty.textContent = '아직 제출된 예측이 없습니다. "내 예측" 탭에서 첫 예측을 제출해보세요!';
      return;
    }
    empty.textContent = '';

    rows.forEach((r, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${i + 1}</td><td>${r.name}</td><td>${r.scored}</td><td>${r.hits}</td><td><strong>${r.total}</strong></td>`;
      tbody.appendChild(tr);
    });
  }

  // ── Init ─────────────────────────────────────────────
  async function init() {
    initTabs();
    await loadData();

    populateGroupFilter();
    renderHome();
    renderSchedule();
    renderStandings();
    renderTipsForm();
    renderLeaderboard();

    document.getElementById('filter-group').addEventListener('change', renderSchedule);
    document.getElementById('filter-stage').addEventListener('change', renderSchedule);
    document.getElementById('btn-save-local').addEventListener('click', saveLocal);
    document.getElementById('btn-submit-github').addEventListener('click', submitGithub);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
