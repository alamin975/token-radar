// Token Radar dashboard: renders window.RADAR (written by main.ts) with no network.
// Board, detail view, filters and the already-launched list. Deep links via the hash:
// #detail=<slug> opens a protocol, #cat=<category> / #chain=<chain> / #q=<text> filter,
// #tab=live shows the launched list, #sort=<key> sorts the board.
(function () {
  var R = window.RADAR;
  var app = document.getElementById('app');
  var rows = R.rows;
  var live = R.live;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function money(v) {
    if (v == null) return '—';
    if (v >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
    if (v >= 1e6) return '$' + (v / 1e6).toFixed(1) + 'M';
    if (v >= 1e3) return '$' + (v / 1e3).toFixed(1) + 'K';
    return '$' + Math.round(v);
  }
  function pct(v) {
    if (v == null) return '—';
    var cls = v > 0 ? 'up' : v < 0 ? 'down' : '';
    return '<span class="' + cls + '">' + (v > 0 ? '+' : '') + v.toFixed(1) + '%</span>';
  }
  function age(v) {
    if (v == null) return 'unknown';
    if (v < 30) return v + 'd';
    if (v < 365) return Math.round(v / 30) + 'mo';
    return (v / 365).toFixed(1) + 'y';
  }
  function bySlug(slug) {
    for (var i = 0; i < rows.length; i++) if (rows[i].slug === slug) return rows[i];
    return null;
  }

  var state = { tab: 'board', q: '', cat: '', chain: '', mintvl: 0, sort: 'rank', dir: 1, detail: null };
  function readHash() {
    var h = location.hash.replace(/^#/, '');
    h.split('&').forEach(function (part) {
      var kv = part.split('=');
      var k = decodeURIComponent(kv[0] || ''), v = decodeURIComponent(kv[1] || '');
      if (k === 'tab' && (v === 'board' || v === 'live')) state.tab = v;
      if (k === 'q') state.q = v;
      if (k === 'cat') state.cat = v;
      if (k === 'chain') state.chain = v;
      if (k === 'mintvl') state.mintvl = Number(v) || 0;
      if (k === 'sort') state.sort = v;
      if (k === 'detail') state.detail = v || null;
    });
  }
  function writeHash() {
    var parts = [];
    if (state.tab !== 'board') parts.push('tab=' + state.tab);
    if (state.q) parts.push('q=' + encodeURIComponent(state.q));
    if (state.cat) parts.push('cat=' + encodeURIComponent(state.cat));
    if (state.chain) parts.push('chain=' + encodeURIComponent(state.chain));
    if (state.mintvl) parts.push('mintvl=' + state.mintvl);
    if (state.sort !== 'rank') parts.push('sort=' + state.sort);
    if (state.detail) parts.push('detail=' + state.detail);
    history.replaceState(null, '', parts.length ? '#' + parts.join('&') : location.pathname);
  }

  var cats = [], chains = [];
  rows.forEach(function (r) {
    if (r.category && cats.indexOf(r.category) < 0) cats.push(r.category);
    r.chains.forEach(function (c) { if (chains.indexOf(c) < 0) chains.push(c); });
  });
  cats.sort(); chains.sort();

  function filtered() {
    var q = state.q.trim().toLowerCase();
    var list = rows.filter(function (r) {
      if (state.cat && r.category !== state.cat) return false;
      if (state.chain && r.chains.indexOf(state.chain) < 0) return false;
      if (r.tvl_usd < state.mintvl) return false;
      if (q && (r.name + ' ' + r.slug + ' ' + (r.category || '')).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    var key = state.sort;
    list.sort(function (a, b) {
      var d = 0;
      if (key === 'rank') d = a.rank - b.rank;
      else if (key === 'name') d = a.name.localeCompare(b.name);
      else if (key === 'tvl') d = b.tvl_usd - a.tvl_usd;
      else if (key === 'growth') d = (b.change_7d || 0) - (a.change_7d || 0);
      else if (key === 'age') d = (b.age_days || 0) - (a.age_days || 0);
      else d = b.implied_value_usd - a.implied_value_usd;
      return d * state.dir;
    });
    return list;
  }

  function sortHead(label, key, cls) {
    var arrow = state.sort === key ? (state.dir === 1 ? ' ▲' : ' ▼') : '';
    return '<th class="sort ' + (cls || '') + '" data-sort="' + key + '">' + label + arrow + '</th>';
  }

  function boardTable(list) {
    if (!list.length) return '<div class="empty">No protocols match these filters.</div>';
    var h = '<table><thead><tr>' + sortHead('#', 'rank') + sortHead('Protocol', 'name') + '<th>Category</th><th>Chains</th>' +
      sortHead('TVL', 'tvl', 'num') + sortHead('7d', 'growth', 'num') + sortHead('Age', 'age', 'num') +
      sortHead('Implied value', 'implied', 'num') + '</tr></thead><tbody>';
    list.forEach(function (r) {
      h += '<tr class="row' + (state.detail === r.slug ? ' sel' : '') + '" data-slug="' + esc(r.slug) + '"><td>' + r.rank + '</td>' +
        '<td class="name"><b>' + esc(r.name) + '</b><small>' + esc(r.slug) + '</small></td>' +
        '<td>' + esc(r.category || '—') + '</td><td>' + esc(r.chains.slice(0, 2).join(', ')) + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td><td class="num">' + pct(r.change_7d) + '</td>' +
        '<td class="num">' + age(r.age_days) + '</td><td class="num val">' + money(r.implied_value_usd) + '</td></tr>';
    });
    return h + '</tbody></table>';
  }

  function liveTable() {
    var h = '<table><thead><tr><th>Protocol</th><th>Category</th><th>Chains</th><th class="num">TVL</th><th class="num">Market cap</th><th class="num">7d</th></tr></thead><tbody>';
    live.forEach(function (r) {
      h += '<tr><td class="name"><b>' + esc(r.name) + '</b><small>' + esc(r.slug) + '</small></td>' +
        '<td>' + esc(r.category || '—') + '</td><td>' + esc(r.chains.slice(0, 2).join(', ')) + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td><td class="num">' + money(r.mcap_usd) + '</td>' +
        '<td class="num">' + pct(r.change_7d) + '</td></tr>';
    });
    return h + '</tbody></table>';
  }

  function detailHtml(r) {
    var m = r.model;
    var steps = r.farm_steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
    return '<section class="card" id="detail"><h2>#' + r.rank + ' — ' + esc(r.name) + '</h2>' +
      '<p class="note">' + esc(r.slug) + ' · ' + esc(r.category || 'No category') + ' · ' + esc(r.chains.join(', ') || 'no chain listed') +
      ' · Listed ' + (r.listed_at ? esc(r.listed_at) : 'date unknown') + ' · Records no token.</p>' +
      '<div class="kv"><div><label>Implied value</label><b class="val">' + money(r.implied_value_usd) + '</b></div>' +
      '<div><label>TVL</label><b>' + money(r.tvl_usd) + '</b></div>' +
      '<div><label>7-day TVL change</label><b>' + (r.change_7d == null ? '—' : (r.change_7d > 0 ? '+' : '') + r.change_7d.toFixed(1) + '%') + '</b></div>' +
      '<div><label>Age with no token</label><b>' + age(r.age_days) + '</b></div></div>' +
      '<h3>How the value is scored</h3>' +
      '<div class="kv"><div><label>Base — √TVL</label><b>' + money(m.base_usd) + '</b></div>' +
      '<div><label>Growth — ' + m.growth_pct + '% / 7d</label><b>×' + m.growth_multiplier.toFixed(2) + '</b></div>' +
      '<div><label>Maturity — ' + (m.age_days == null ? 'age unknown' : m.age_days + ' days') + '</label><b>×' + m.maturity_multiplier.toFixed(2) + '</b></div></div>' +
      '<p class="note">Base × growth × maturity = ' + money(m.base_usd) + ' × ' + m.growth_multiplier.toFixed(2) + ' × ' + m.maturity_multiplier.toFixed(2) +
      ' ≈ ' + money(r.implied_value_usd) + '. Full formula in “How value is scored” below.</p>' +
      '<h3>Farm plan — how to farm it</h3><ol class="steps">' + steps + '</ol></section>';
  }

  function methodHtml() {
    return '<section class="card"><h2>How value is scored</h2>' +
      '<p>Implied value is this radar\u2019s own claim, built only from the snapshot\u2019s figures — TVL, seven-day TVL growth and how long the protocol has run with no token recorded. No protocol name is ever special-cased.</p>' +
      '<div class="formula">base     = $1,000,000 × √(TVL / $1,000,000)\n' +
      'growth   = clamp(7d change, −50%, +100%)\n' +
      'growth × = 1 + 0.8 × growth / 100\n' +
      'maturity × = 0.75 + 0.25 × min(age, 1095) / 1095   (age unknown: ×0.875)\n' +
      'implied  = round(base × growth × × maturity ×)</div>' +
      '<p class="note">TVL is on a square-root scale on purpose: the biggest rankable protocol holds about 550× the TVL of the smallest, but only about 23× the base value, so a fast-growing young protocol can outrank a large stagnant one. Growth is clamped so one hot week cannot dominate the board. “Records no token” means the snapshot lists no market cap, CoinGecko id or symbol for the protocol — DefiLlama\u2019s record, not proof it has none.</p>' +
      '<h3>What the board covers</h3><p class="note">Every protocol the snapshot\u2019s watchlist names (TVL at or above $50,000,000, no token recorded, not a wrapped, staked or bridged product, not a versioned pool, not named after an exchange) plus every other protocol the same rule keeps, however small. Protocols whose token already trades are set aside in “Already launched” and are never ranked.</p></section>';
  }

  function render() {
    var list = filtered();
    var sel = state.cat ? '<option value="' + esc(state.cat) + '" selected>' + esc(state.cat) + '</option>' : '';
    var chsel = state.chain ? '<option value="' + esc(state.chain) + '" selected>' + esc(state.chain) + '</option>' : '';
    var h = '<header><h1>Token <span>Radar</span></h1>' +
      '<p class="sub">Which pre-token protocol is worth farming next, and what to do about it. Ranked by implied launch value from the sealed snapshot — not by TVL alone.</p>' +
      '<div class="chips"><span class="chip"><b>' + R.board_size + '</b> ranked</span>' +
      '<span class="chip"><b>' + R.watchlist_size + '</b> on the watchlist</span>' +
      '<span class="chip"><b>' + R.live_size + '</b> already launched</span>' +
      '<span class="chip">Snapshot <b>' + esc(R.as_of) + '</b></span>' +
      '<span class="chip">Model <b>' + esc(R.model_version) + '</b></span></div></header>' +
      '<div class="tabs"><button class="tab' + (state.tab === 'board' ? ' on' : '') + '" data-tab="board">Ranked board</button>' +
      '<button class="tab' + (state.tab === 'live' ? ' on' : '') + '" data-tab="live">Already launched — not ranked</button></div>';
    if (state.tab === 'board') {
      h += '<div class="controls"><input id="q" type="search" placeholder="Search name, slug or category…" value="' + esc(state.q) + '">' +
        '<select id="cat"><option value="">All categories</option>' + sel + cats.map(function (c) { return '<option' + (state.cat === c ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select>' +
        '<select id="chain"><option value="">All chains</option>' + chsel + chains.map(function (c) { return '<option' + (state.chain === c ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select>' +
        '<select id="mintvl"><option value="0">Any TVL</option>' +
        [[50000000, 'TVL ≥ $50M'], [100000000, 'TVL ≥ $100M'], [500000000, 'TVL ≥ $500M'], [1000000000, 'TVL ≥ $1B']].map(function (o) {
          return '<option value="' + o[0] + '"' + (state.mintvl === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
        }).join('') + '</select>' +
        '<select id="sort"><option value="rank">Sort: rank</option>' +
        [['implied', 'Sort: implied value'], ['tvl', 'Sort: TVL'], ['growth', 'Sort: 7d growth'], ['age', 'Sort: age'], ['name', 'Sort: name']].map(function (o) {
          return '<option value="' + o[0] + '"' + (state.sort === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
        }).join('') + '</select></div>' +
        '<p class="count">Showing ' + list.length + ' of ' + rows.length + ' ranked protocols. Click a row for its detail and farm plan.</p>';
      var d = state.detail ? bySlug(state.detail) : null;
      if (d) h += detailHtml(d);
      h += boardTable(list);
    } else {
      h += '<p class="count">These protocols already have a token trading, so the board shows the market\u2019s own value for them and never ranks them.</p>' + liveTable();
    }
    h += methodHtml();
    h += '<footer>Token Radar · data: DefiLlama protocol snapshot, ' + esc(R.as_of) + ' · Implied values are this radar\u2019s own claim, never a promise of a launch. Entry for the make.fun bounty — make.fun/bounty/token-radar-01</footer>';
    app.innerHTML = h;
    app.setAttribute('aria-busy', 'false');
    bind();
  }

  function bind() {
    app.querySelectorAll('[data-tab]').forEach(function (b) {
      b.addEventListener('click', function () { state.tab = b.getAttribute('data-tab'); state.detail = null; writeHash(); render(); });
    });
    var q = document.getElementById('q');
    if (q) q.addEventListener('input', function () { state.q = q.value; writeHash(); render(); var nq = document.getElementById('q'); nq.focus(); nq.setSelectionRange(nq.value.length, nq.value.length); });
    var cat = document.getElementById('cat');
    if (cat) cat.addEventListener('change', function () { state.cat = cat.value; writeHash(); render(); });
    var chain = document.getElementById('chain');
    if (chain) chain.addEventListener('change', function () { state.chain = chain.value; writeHash(); render(); });
    var mintvl = document.getElementById('mintvl');
    if (mintvl) mintvl.addEventListener('change', function () { state.mintvl = Number(mintvl.value) || 0; writeHash(); render(); });
    var sort = document.getElementById('sort');
    if (sort) sort.addEventListener('change', function () { state.sort = sort.value; state.dir = 1; writeHash(); render(); });
    app.querySelectorAll('th.sort').forEach(function (th) {
      th.addEventListener('click', function () {
        var k = th.getAttribute('data-sort');
        if (state.sort === k) state.dir = -state.dir; else { state.sort = k; state.dir = 1; }
        writeHash(); render();
      });
    });
    app.querySelectorAll('tr.row').forEach(function (tr) {
      tr.addEventListener('click', function () {
        state.detail = state.detail === tr.getAttribute('data-slug') ? null : tr.getAttribute('data-slug');
        writeHash(); render();
        if (state.detail) { var d = document.getElementById('detail'); if (d) d.scrollIntoView(); }
      });
    });
  }

  readHash();
  render();
})();
