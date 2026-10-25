/* Scarlet Lust mod menu - press F1 to open/close */
(function () {
  const HEALTH_RE = /health|\bhp\b|life|lives|vida|hearts?/i;
  const ATTACK_RE = /attack|ammo|energy|mana|stamina|charge|power|\bmp\b|\bsp\b/i;
  const ENEMY_RE = /scarlet|chara|boss|enemy|monster|target|foe|opponent/i;
  const state = { health: false, attack: false, ohk: false, locks: new Map(), kills: new Set() };
  const prev = new Map(); // locks: key -> {max}
  const peaks = new Map();
  const vm = () => window.scaffolding && window.scaffolding.vm;

  function allVars() {
    const v = vm(); if (!v || !v.runtime) return [];
    const out = [];
    for (const t of v.runtime.targets) {
      for (const id in t.variables) {
        const x = t.variables[id];
        if (x.type !== '' && x.type !== undefined) continue; // skip lists/broadcasts
        out.push({ key: t.id + ':' + id, name: x.name, ref: x, owner: t.isStage ? 'Global' : t.sprite.name });
      }
    }
    return out;
  }
  const num = (v) => (typeof v === 'number' ? v : (v !== '' && !isNaN(+v) ? +v : NaN));

  // keep locked variables at the highest value they have reached
  setInterval(() => {
    for (const v of allVars()) {
      // one-hit kill: any drop in a target's health sends it straight to 0
      const isKill = state.kills.has(v.key) || (state.ohk && HEALTH_RE.test(v.name) && ENEMY_RE.test(v.name + ' ' + v.owner));
      if (isKill) {
        const n0 = num(v.ref.value), p = prev.get(v.key);
        if (!isNaN(n0)) { if (p !== undefined && n0 < p && n0 > 0) v.ref.value = 0; prev.set(v.key, num(v.ref.value)); }
        continue;
      }
      const auto = (state.health && HEALTH_RE.test(v.name)) || (state.attack && ATTACK_RE.test(v.name));
      const lock = state.locks.has(v.key);
      if (!auto && !lock) continue;
      const n = num(v.ref.value); if (isNaN(n)) continue;
      let peak = lock && state.locks.get(v.key).fixed != null ? state.locks.get(v.key).fixed : (peaks.get(v.key) ?? n);
      if (n > peak) peak = n;
      peaks.set(v.key, peak);
      if (n < peak) v.ref.value = peak;
    }
  }, 16);

  // ---------- GUI ----------
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;top:20px;left:20px;z-index:2147483647;display:none;font:13px system-ui,sans-serif;';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `
  <style>
    .p{width:300px;background:#14060b;color:#f5dfe5;border:1px solid #c0144c;border-radius:10px;box-shadow:0 8px 30px #000a;overflow:hidden;user-select:none}
    .h{background:linear-gradient(90deg,#c0144c,#6d0a2a);padding:8px 12px;font-weight:700;cursor:move;display:flex;justify-content:space-between}
    .b{padding:10px 12px}
    .r{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #3a1420}
    .sw{width:38px;height:20px;border-radius:10px;background:#444;position:relative;cursor:pointer;transition:.15s}
    .sw::after{content:"";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:.15s}
    .sw.on{background:#c0144c}.sw.on::after{left:20px}
    input[type=text]{width:100%;box-sizing:border-box;margin:8px 0 4px;padding:5px 8px;background:#220b13;border:1px solid #4a1a2a;color:#fff;border-radius:6px}
    .l{max-height:170px;overflow:auto}
    .v{display:flex;align-items:center;gap:6px;padding:3px 0;font-size:12px}
    .v span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .v em{opacity:.5;font-style:normal}
    .v input[type=number]{width:60px;background:#220b13;border:1px solid #4a1a2a;color:#fff;border-radius:4px;padding:2px}
    .s{font-size:11px;opacity:.6;margin-top:6px}
    button{background:#c0144c;color:#fff;border:0;border-radius:4px;padding:2px 7px;cursor:pointer}
  </style>
  <div class="p"><div class="h" id="drag"><span>Scarlet Lust Mod Menu</span><span style="opacity:.7">F1</span></div>
  <div class="b">
    <div class="r"><span>Infinite Health</span><div class="sw" id="sh"></div></div>
    <div class="r"><span>Infinite Attack / Energy</span><div class="sw" id="sa"></div></div>
    <div class="r"><span>One-Hit Kill (Scarlet / boss)</span><div class="sw" id="so"></div></div>
    <input type="text" id="q" placeholder="Search variables (lock / set)...">
    <div class="l" id="list"></div>
    <div class="s">Tick = lock at highest value. K = one-hit kill (any damage sets it to 0). Search by sprite name, e.g. scarlet. Toggles auto-match names like health, hp, attack, energy.</div>
  </div></div>`;
  document.documentElement.appendChild(host);
  const $ = (id) => root.getElementById(id);

  $('sh').onclick = () => { state.health = !state.health; $('sh').classList.toggle('on', state.health); };
  $('so').onclick = () => { state.ohk = !state.ohk; $('so').classList.toggle('on', state.ohk); };
  $('sa').onclick = () => { state.attack = !state.attack; $('sa').classList.toggle('on', state.attack); };

  function render() {
    const q = $('q').value.toLowerCase();
    const list = $('list');
    if (root.activeElement && list.contains(root.activeElement)) return; // don't disturb typing
    list.innerHTML = '';
    for (const v of allVars().filter(v => (v.name + ' ' + v.owner).toLowerCase().includes(q) && !isNaN(num(v.ref.value))).slice(0, 60)) {
      const row = document.createElement('div'); row.className = 'v';
      const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = state.locks.has(v.key);
      cb.onchange = () => cb.checked ? state.locks.set(v.key, {}) : (state.locks.delete(v.key), peaks.delete(v.key));
      const nm = document.createElement('span'); nm.innerHTML = ''; nm.textContent = v.name + ' ';
      const ow = document.createElement('em'); ow.textContent = '(' + v.owner + ')'; nm.appendChild(ow);
      const inp = document.createElement('input'); inp.type = 'number'; inp.value = num(v.ref.value);
      const kb = document.createElement('button'); kb.textContent = 'K'; kb.title = 'One-hit kill: any damage sets this to 0';
      kb.style.background = state.kills.has(v.key) ? '#c0144c' : '#555';
      kb.onclick = () => { state.kills.has(v.key) ? state.kills.delete(v.key) : state.kills.add(v.key); kb.style.background = state.kills.has(v.key) ? '#c0144c' : '#555'; };
      const set = document.createElement('button'); set.textContent = 'Set';
      set.onclick = () => { v.ref.value = +inp.value; peaks.set(v.key, +inp.value); };
      row.append(cb, nm, inp, set, kb); list.appendChild(row);
    }
  }
  $('q').oninput = render;
  setInterval(() => { if (host.style.display !== 'none') render(); }, 800);
  $('q').addEventListener('keydown', e => e.stopPropagation());
  root.addEventListener('keydown', e => e.stopPropagation());

  // drag
  let d = null;
  $('drag').onmousedown = e => { d = [e.clientX - host.offsetLeft, e.clientY - host.offsetTop]; };
  window.addEventListener('mousemove', e => { if (d) { host.style.left = e.clientX - d[0] + 'px'; host.style.top = e.clientY - d[1] + 'px'; } });
  window.addEventListener('mouseup', () => { d = null; });

  window.addEventListener('keydown', e => {
    if (e.key === 'F1') { e.preventDefault(); e.stopPropagation();
      host.style.display = host.style.display === 'none' ? 'block' : 'none'; render(); }
  }, true);
})();
