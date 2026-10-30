(function () {
  'use strict';
  const { Msg, toTree, collectStrings } = window.Proto;

  // ---------------------------------------------------------------- state
  const state = {
    SQL: null,
    source: null,        // { name, getFile(relPath) -> Promise<File|null> }
    convs: [],           // rows from conversation_summaries
    byId: new Map(),
    projects: [],
    currentId: null,
    currentSteps: null,
    filter: '',
    opts: loadOpts(),
    objectUrls: [],
  };

  const $ = sel => document.querySelector(sel);
  const el = (tag, attrs, ...kids) => {
    const n = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    }
    for (const k of kids.flat()) if (k != null && k !== false) n.append(k.nodeType ? k : String(k));
    return n;
  };

  function loadOpts() {
    const def = { thinking: true, tools: true, system: false, expand: false, validOnly: false };
    try { return Object.assign(def, JSON.parse(localStorage.getItem('agy-viewer-opts') || '{}')); }
    catch (e) { return def; }
  }
  function saveOpts() {
    try { localStorage.setItem('agy-viewer-opts', JSON.stringify(state.opts)); } catch (e) { /* ignore */ }
  }

  function setStatus(text, isError) {
    const s = $('#status');
    s.textContent = text || '';
    s.classList.toggle('error', !!isError);
  }

  // ---------------------------------------------------------------- sql.js
  async function getSQL() {
    if (state.SQL) return state.SQL;
    const bin = Uint8Array.from(atob(window.SQL_WASM_BASE64), c => c.charCodeAt(0));
    state.SQL = await initSqlJs({ wasmBinary: bin });
    return state.SQL;
  }

  async function openDb(relPath, storeHint) {
    const file = await state.source.getFile(relPath, storeHint);
    if (!file) return null;
    let bytes = new Uint8Array(await file.arrayBuffer());
    const wal = await state.source.getFile(relPath + '-wal', storeHint);
    if (wal && wal.size) bytes = applyWal(bytes, new Uint8Array(await wal.arrayBuffer()));
    if (bytes.length > 19 && bytes[18] === 2) { bytes = bytes.slice(); bytes[18] = 1; bytes[19] = 1; }
    const SQL = await getSQL();
    return new SQL.Database(bytes);
  }

  function queryAll(db, sql, params) {
    const st = db.prepare(sql);
    if (params) st.bind(params);
    const rows = [];
    while (st.step()) rows.push(st.getAsObject());
    st.free();
    return rows;
  }

  // ---------------------------------------------------------------- sources
  function fsaSource(rootHandle, stores) {
    const storeMap = new Map(stores.map(s => [s.name, s]));
    return {
      name: stores.length > 1 ? `${rootHandle.name} (${stores.map(s => s.name).join(' + ')})` : stores[0].name,
      stores,
      async getFile(rel, storeHint) {
        const searchStores = storeHint && storeMap.has(storeHint)
          ? [storeMap.get(storeHint), ...stores.filter(s => s.name !== storeHint)]
          : stores;
        for (const st of searchStores) {
          try {
            const parts = rel.split('/');
            let dir = st.handle;
            for (let i = 0; i < parts.length - 1; i++) dir = await dir.getDirectoryHandle(parts[i]);
            const fh = await dir.getFileHandle(parts[parts.length - 1]);
            const file = await fh.getFile();
            if (file) return file;
          } catch (e) { /* try next store */ }
        }
        return null;
      },
      async listConversationFiles() {
        const map = new Map(); // filename -> storeName
        for (const st of stores) {
          try {
            const dir = await st.handle.getDirectoryHandle('conversations');
            for await (const [name, h] of dir.entries()) {
              if (h.kind === 'file' && !map.has(name)) map.set(name, st.name);
            }
          } catch (e) { /* ignore */ }
        }
        return map;
      },
      async readSummaries(openDbFn) {
        const allRows = [];
        for (const st of stores) {
          try {
            const db = await openDbFn('conversation_summaries.db', st.name);
            if (!db) continue;
            const rows = queryAll(db, `SELECT conversation_id, title, preview, step_count, last_modified_time, workspace_uris,
                status, project_id, agent_name, parent_conversation_id, nesting_depth, killed, last_user_input_time, group_id, app_data_dir
              FROM conversation_summaries`);
            db.close();
            for (const r of rows) {
              r.storeName = st.name;
              const isCli = r.project_id === 'default-cli-project' || r.app_data_dir === 'antigravity-cli';
              r.sourceType = isCli ? 'CLI' : 'IDE';
              allRows.push(r);
            }
          } catch (e) {
            console.warn('Failed to read summaries from ' + st.name, e);
          }
        }
        return allRows;
      },
    };
  }

  function fileListSource(files) {
    const all = Array.from(files);
    const summaries = all.filter(f => /(^|\/)conversation_summaries\.db$/.test(f.webkitRelativePath));
    if (!summaries.length) return null;

    const stores = summaries.map(summaryFile => {
      const prefix = summaryFile.webkitRelativePath.slice(0, -'conversation_summaries.db'.length);
      const name = prefix.replace(/\/$/, '').split('/').pop() || 'antigravity';
      const type = /cli/i.test(name) ? 'CLI' : 'IDE';
      const map = new Map();
      for (const f of all) {
        if (f.webkitRelativePath.startsWith(prefix)) {
          map.set(f.webkitRelativePath.slice(prefix.length), f);
        }
      }
      return { name, type, prefix, map };
    });

    const storeMap = new Map(stores.map(s => [s.name, s]));
    return {
      name: stores.length > 1 ? stores.map(s => s.name).join(' + ') : stores[0].name,
      stores,
      async getFile(rel, storeHint) {
        const searchStores = storeHint && storeMap.has(storeHint)
          ? [storeMap.get(storeHint), ...stores.filter(s => s.name !== storeHint)]
          : stores;
        for (const st of searchStores) {
          const f = st.map.get(rel);
          if (f) return f;
        }
        return null;
      },
      async listConversationFiles() {
        const map = new Map();
        for (const st of stores) {
          for (const k of st.map.keys()) {
            if (k.startsWith('conversations/') && k.split('/').length === 2) {
              const fname = k.slice(14);
              if (!map.has(fname)) map.set(fname, st.name);
            }
          }
        }
        return map;
      },
      async readSummaries(openDbFn) {
        const allRows = [];
        for (const st of stores) {
          try {
            const db = await openDbFn('conversation_summaries.db', st.name);
            if (!db) continue;
            const rows = queryAll(db, `SELECT conversation_id, title, preview, step_count, last_modified_time, workspace_uris,
                status, project_id, agent_name, parent_conversation_id, nesting_depth, killed, last_user_input_time, group_id, app_data_dir
              FROM conversation_summaries`);
            db.close();
            for (const r of rows) {
              r.storeName = st.name;
              const isCli = r.project_id === 'default-cli-project' || r.app_data_dir === 'antigravity-cli';
              r.sourceType = isCli ? 'CLI' : 'IDE';
              allRows.push(r);
            }
          } catch (e) {
            console.warn('Failed to read summaries from ' + st.name, e);
          }
        }
        return allRows;
      },
    };
  }

  // IndexedDB persistence for the directory handle
  function idb() {
    return new Promise((res, rej) => {
      const r = indexedDB.open('agy-viewer', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  async function idbSet(k, v) {
    try {
      const db = await idb();
      await new Promise((res, rej) => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = res; t.onerror = () => rej(t.error); });
    } catch (e) { /* ignore */ }
  }
  async function idbGet(k) {
    try {
      const db = await idb();
      return await new Promise((res, rej) => { const r = db.transaction('kv').objectStore('kv').get(k); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    } catch (e) { return undefined; }
  }

  async function resolveStores(handle) {
    // 1. Direct check: handle itself contains conversation_summaries.db
    try {
      await handle.getFileHandle('conversation_summaries.db');
      const name = handle.name;
      return [{ name, type: /cli/i.test(name) ? 'CLI' : 'IDE', handle }];
    } catch (e) { /* try children */ }

    // 2. Look for known subdirectories (antigravity-cli, antigravity)
    const found = [];
    const known = ['antigravity-cli', 'antigravity'];
    for (const name of known) {
      try {
        const sub = await handle.getDirectoryHandle(name);
        await sub.getFileHandle('conversation_summaries.db');
        found.push({ name, type: /cli/i.test(name) ? 'CLI' : 'IDE', handle: sub });
      } catch (e) { /* ignore */ }
    }

    if (!found.length) {
      try {
        for await (const [name, entry] of handle.entries()) {
          if (entry.kind === 'directory' && !known.includes(name)) {
            try {
              await entry.getFileHandle('conversation_summaries.db');
              found.push({ name, type: /cli/i.test(name) ? 'CLI' : 'IDE', handle: entry });
            } catch (e) { /* ignore */ }
          }
        }
      } catch (e) { /* ignore */ }
    }

    return found;
  }

  async function pickDirectory() {
    if (!window.showDirectoryPicker) { $('#dirInput').click(); return; }
    let handle;
    try { handle = await window.showDirectoryPicker({ id: 'agy-root', mode: 'read' }); }
    catch (e) { if (e.name !== 'AbortError') $('#dirInput').click(); return; }
    const stores = await resolveStores(handle);
    if (!stores.length) {
      setStatus('该目录下没有找到 conversation_summaries.db，请选择 C:\\Users\\<用户>\\.gemini 或其下的 antigravity / antigravity-cli 目录', true);
      return;
    }
    await idbSet('root', handle);
    await useSource(fsaSource(handle, stores));
  }

  async function reopenLast() {
    const h = await idbGet('root');
    if (!h) { setStatus('没有记录上次的目录', true); return; }
    try {
      let p = await h.queryPermission({ mode: 'read' });
      if (p !== 'granted') p = await h.requestPermission({ mode: 'read' });
      if (p !== 'granted') { setStatus('未获得读取权限', true); return; }
      const stores = await resolveStores(h);
      if (!stores.length) { setStatus('未在上次的目录中找到会话数据库', true); return; }
      await useSource(fsaSource(h, stores));
    } catch (e) { setStatus('无法打开上次的目录：' + e.message, true); }
  }

  // ---------------------------------------------------------------- summaries
  function parseTime(s) {
    if (!s) return null;
    const m = String(s).match(/^(\d{4}-\d\d-\d\d)[ T](\d\d:\d\d:\d\d)(\.\d+)?(Z|[+-]\d\d:\d\d)?/);
    if (!m) return null;
    const d = new Date(`${m[1]}T${m[2]}${m[3] ? m[3].slice(0, 4) : ''}${m[4] || 'Z'}`);
    return isNaN(d) ? null : d;
  }
  function fmtTime(d) {
    if (!d) return '';
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }
  function uriToPath(u) {
    if (!u) return '';
    let s = u;
    try { s = decodeURIComponent(u); } catch (e) { /* keep */ }
    s = s.replace(/^file:\/\/\//i, '').replace(/\\/g, '/');
    if (/^[a-z]:/i.test(s)) s = s[0].toUpperCase() + s.slice(1);
    return s.replace(/\/+$/, '');
  }
  function parseWorkspaces(json) {
    try { return (JSON.parse(json) || []).map(uriToPath).filter(Boolean); } catch (e) { return []; }
  }

  async function useSource(src) {
    state.source = src;
    setStatus('正在读取数据库 …');
    let rows;
    try {
      rows = await src.readSummaries(openDb);
    } catch (e) {
      setStatus('读取失败：' + e.message, true);
      return;
    }
    if (!rows || !rows.length) {
      setStatus('没有找到会话数据', true);
      return;
    }

    // filename -> storeName
    const convFileMap = await src.listConversationFiles();

    // Deduplicate rows by conversation_id across stores.
    // If a conversation_id exists in multiple stores, prefer the store that actually has
    // its conversation database on disk (.db or .pb), then the more recently modified one.
    const deduped = new Map();
    for (const r of rows) {
      const id = r.conversation_id;
      const fileExt = convFileMap.has(id + '.db') ? 'db' : convFileMap.has(id + '.pb') ? 'pb' : '';
      const hasActualFile = !!fileExt && convFileMap.get(id + '.' + fileExt) === r.storeName;
      const modTime = parseTime(r.last_modified_time);

      if (!deduped.has(id)) {
        deduped.set(id, { row: r, hasActualFile, modTime });
      } else {
        const prev = deduped.get(id);
        if (!prev.hasActualFile && hasActualFile) {
          deduped.set(id, { row: r, hasActualFile, modTime });
        } else if (prev.hasActualFile === hasActualFile) {
          if ((modTime || 0) > (prev.modTime || 0)) {
            deduped.set(id, { row: r, hasActualFile, modTime });
          }
        }
      }
    }

    state.convs = [...deduped.values()].map(({ row: r }) => {
      const id = r.conversation_id;
      const dbStore = convFileMap.get(id + '.db');
      const pbStore = convFileMap.get(id + '.pb');
      const file = dbStore ? 'db' : pbStore ? 'pb' : '';
      const fileStore = dbStore || pbStore || r.storeName;
      return {
        id,
        title: r.title || '',
        preview: r.preview || '',
        steps: r.step_count,
        modified: parseTime(r.last_modified_time),
        lastInput: parseTime(r.last_user_input_time),
        workspaces: parseWorkspaces(r.workspace_uris),
        status: (r.status || '').replace('CASCADE_RUN_STATUS_', ''),
        projectId: r.project_id || '',
        agent: r.agent_name || '',
        parent: r.parent_conversation_id || '',
        depth: r.nesting_depth || 0,
        sourceType: r.sourceType || ((r.project_id === 'default-cli-project' || r.app_data_dir === 'antigravity-cli') ? 'CLI' : 'IDE'),
        storeName: fileStore,
        file,
        children: [],
      };
    });

    state.byId = new Map(state.convs.map(c => [c.id, c]));
    for (const c of state.convs) {
      const p = c.parent && state.byId.get(c.parent);
      if (p) p.children.push(c);
    }
    buildProjects();
    $('#welcome').hidden = true;
    $('#reloadBtn').hidden = false;
    setStatus(`${src.name}：${state.projects.length} 个工程，${state.convs.length} 个会话`);
    renderSidebar();
    const hashId = decodeURIComponent(location.hash.slice(1));
    if (hashId && state.byId.has(hashId)) openConversation(hashId);
    else if (state.currentId && state.byId.has(state.currentId)) openConversation(state.currentId);
  }

  function getEffectiveWorkspaces(c) {
    if (c.workspaces && c.workspaces.length) return c.workspaces;
    let curr = c;
    const visited = new Set([c.id]);
    while (curr.parent && state.byId.has(curr.parent)) {
      curr = state.byId.get(curr.parent);
      if (visited.has(curr.id)) break;
      visited.add(curr.id);
      if (curr.workspaces && curr.workspaces.length) return curr.workspaces;
    }
    return [];
  }

  function getProjectKey(c) {
    const ws = getEffectiveWorkspaces(c);
    if (ws.length) {
      return 'ws:' + [...new Set(ws.map(w => w.toLowerCase()))].sort().join('|');
    }
    if (c.projectId && c.projectId !== 'default-cli-project') {
      return 'proj:' + c.projectId;
    }
    return 'ws:none';
  }

  function disambiguateProjectNames(projects) {
    const byBase = new Map();
    for (const p of projects) {
      const base = p.workspaces.length
        ? [...new Set(p.workspaces.map(w => w.replace(/\/+$/, '').split('/').pop()))].join(' + ')
        : '(无工作区)';
      p.baseName = base;
      if (!byBase.has(base)) byBase.set(base, []);
      byBase.get(base).push(p);
    }

    for (const [base, list] of byBase.entries()) {
      if (list.length === 1 || base === '(无工作区)') {
        list[0].name = base;
        continue;
      }
      for (const p of list) {
        let depth = 2;
        let chosen = '';
        const allPaths = p.workspaces;
        while (depth <= 6) {
          const labels = allPaths.map(w => {
            const parts = w.replace(/\/+$/, '').split('/');
            return parts.slice(Math.max(0, parts.length - depth), parts.length - 1).join('/');
          }).filter(Boolean);
          const candidate = labels.length ? ` (${[...new Set(labels)].join(', ')})` : '';
          const matchesColliding = list.filter(other => other !== p && other.workspaces.some(ow => {
            const oparts = ow.replace(/\/+$/, '').split('/');
            const osub = oparts.slice(Math.max(0, oparts.length - depth), oparts.length - 1).join('/');
            return labels.includes(osub);
          }));
          if (!matchesColliding.length) {
            chosen = candidate;
            break;
          }
          depth++;
        }
        p.name = `${base}${chosen || ` (${p.workspaces.join(', ')})`}`;
      }
    }
  }

  function buildProjects() {
    const map = new Map();
    for (const c of state.convs) {
      const key = getProjectKey(c);
      const ws = getEffectiveWorkspaces(c);
      if (!map.has(key)) {
        map.set(key, { key, id: c.projectId, convs: [], workspaces: new Set() });
      }
      const p = map.get(key);
      p.convs.push(c);
      ws.forEach(w => p.workspaces.add(w));
    }
    const projectList = [...map.values()];
    for (const p of projectList) {
      p.workspaces = [...p.workspaces];
      p.modified = Math.max(0, ...p.convs.map(c => +(c.modified || 0)));
      p.convs.sort((a, b) => (b.modified || 0) - (a.modified || 0));
    }
    disambiguateProjectNames(projectList);
    state.projects = projectList.sort((a, b) => b.modified - a.modified);
  }

  const collapsed = new Set(JSON.parse(localStorageGet('agy-viewer-collapsed') || '[]'));
  function localStorageGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function saveCollapsed() { try { localStorage.setItem('agy-viewer-collapsed', JSON.stringify([...collapsed])); } catch (e) { /* ignore */ } }

  function convLabel(c) {
    return c.title || c.preview.split('\n')[0].slice(0, 80) || (c.agent ? `[${c.agent}]` : '(无标题)');
  }

  function matches(c, q) {
    if (!q) return true;
    return (c.title + '\n' + c.preview + '\n' + c.id + '\n' + (c.agent || '') + '\n' + (c.sourceType || '') + '\n' + c.workspaces.join('\n')).toLowerCase().includes(q);
  }

  function renderSidebar() {
    const box = $('#projects');
    box.textContent = '';
    const q = state.filter.trim().toLowerCase();
    let shown = 0;
    for (const p of state.projects) {
      // Top-level conversations of this project (parent is not in this project, or has no parent)
      const tops = p.convs.filter(c => !c.parent || !p.convs.some(k => k.id === c.parent));
      const visible = c => {
        if (state.opts.validOnly && !c.file && !c.children.some(visible)) return false;
        return matches(c, q) || c.children.some(visible);
      };
      const list = tops.filter(visible);
      const projMatch = q && (p.name.toLowerCase().includes(q) || p.workspaces.some(w => w.toLowerCase().includes(q)));
      if (!list.length && (!projMatch || (state.opts.validOnly && !p.convs.some(c => c.file)))) continue;
      const items = list.length ? list : tops;
      const isCollapsed = collapsed.has(p.key) && !q;
      const count = state.opts.validOnly ? p.convs.filter(c => c.file).length : p.convs.length;
      const head = el('div', {
        class: 'proj-head',
        title: (p.workspaces.length ? p.workspaces.join('\n') : '(无工作区)') + (p.id ? `\n工程 ID: ${p.id}` : ''),
        onclick: () => { collapsed.has(p.key) ? collapsed.delete(p.key) : collapsed.add(p.key); saveCollapsed(); renderSidebar(); }
      },
        el('span', { class: 'chev' + (isCollapsed ? '' : ' open') }, '▸'),
        el('span', { class: 'proj-name' }, p.name),
        el('span', { class: 'count' }, String(count)));
      const ul = el('div', { class: 'conv-list' });
      if (!isCollapsed) for (const c of items) ul.append(convItem(c, q, 0));
      box.append(el('div', { class: 'project' }, head, ul));
      shown += items.length;
    }
    if (!shown) box.append(el('div', { class: 'empty' }, q ? '没有匹配的会话' : (state.opts.validOnly ? '没有有效数据文件的会话' : '没有会话')));
    updateControls();
  }

  function allCollapsed() {
    return state.projects.length > 0 && state.projects.every(p => collapsed.has(p.key));
  }
  function updateControls() {
    updateFoldAllBtn();
    updateValidOnlyBtn();
  }
  function updateFoldAllBtn() {
    const btn = $('#foldAllBtn');
    if (!btn) return;
    btn.hidden = !state.projects.length;
    btn.textContent = allCollapsed() ? '全部展开' : '全部折叠';
  }
  function updateValidOnlyBtn() {
    const btn = $('#validOnlyBtn');
    if (!btn) return;
    btn.hidden = !state.projects.length;
    btn.classList.toggle('active', !!state.opts.validOnly);
    btn.textContent = state.opts.validOnly ? '显示全部' : '仅看有效';
  }
  function toggleValidOnly() {
    state.opts.validOnly = !state.opts.validOnly;
    saveOpts();
    updateValidOnlyBtn();
    renderSidebar();
  }
  function toggleAllProjects() {
    if (allCollapsed()) collapsed.clear();
    else state.projects.forEach(p => collapsed.add(p.key));
    saveCollapsed();
    renderSidebar();
    $('#projects').scrollTop = 0;
  }

  function convItem(c, q, level) {
    const wrap = el('div');
    const item = el('a', {
      class: 'conv' + (c.id === state.currentId ? ' active' : '') + (c.file === 'db' ? '' : ' nofile'),
      href: '#' + c.id, style: `padding-left:${12 + level * 16}px`,
      title: `${convLabel(c)}\n${c.id}\n${c.sourceType ? `[${c.sourceType}] ` : ''}${fmtTime(c.modified)} · ${c.steps} 步${c.file === 'pb' ? '\n(.pb 加密格式，无法读取)' : ''}`,
      onclick: e => { e.preventDefault(); openConversation(c.id); },
    },
      el('div', { class: 'conv-title' },
        c.sourceType ? el('span', { class: 'tag ' + c.sourceType.toLowerCase() }, c.sourceType) : null,
        c.agent ? el('span', { class: 'tag' }, c.agent) : null,
        convLabel(c)),
      el('div', { class: 'conv-meta' },
        fmtTime(c.modified), ` · ${c.steps} 步`,
        c.children.length ? ` · ${c.children.length} 子代理` : '',
        c.file === 'pb' ? ' · 加密' : c.file ? '' : ' · 缺文件'));
    wrap.append(item);
    const kids = c.children.filter(k => matches(k, q) || k.children.length).sort((a, b) => (a.modified || 0) - (b.modified || 0));
    for (const k of kids) wrap.append(convItem(k, q, level + 1));
    return wrap;
  }

  // ---------------------------------------------------------------- steps
  const STEP_NAMES = {
    5: '写入文件', 7: '搜索', 8: '查看文件', 9: '列目录', 14: '用户', 15: '助手', 17: '错误',
    21: '运行命令', 23: '检查点', 90: '系统提示', 91: '生成图片', 98: '会话开始', 101: '系统消息',
    127: '调用子代理', 132: '工具', 138: '提问',
  };

  function parseStep(row) {
    const m = new Msg(row.step_payload instanceof Uint8Array ? row.step_payload : new Uint8Array(0));
    const type = m.num(1) ?? row.step_type;
    const meta = m.msg(5) || new Msg(new Uint8Array(0));
    // the step body is the single field other than 1 (type), 4 (status), 5 (metadata)
    const bodies = m.fields.filter(x => ![1, 4, 5].includes(x.f) && x.v instanceof Uint8Array);
    const main = bodies.length ? bodies.reduce((a, b) => (b.v.length > a.v.length ? b : a)) : null;
    const step = {
      idx: row.idx, type, status: m.num(4) ?? row.status,
      time: meta.time(1),
      toolId: meta.str(4, 1), toolName: meta.str(4, 2), toolArgs: meta.str(4, 3),
      toolSummary: meta.str(30), toolAction: meta.str(31),
      bodyField: main ? main.f : null, body: main ? new Msg(main.v) : null,
      raw: m.buf,
    };
    return step;
  }

  async function openConversation(id) {
    const c = state.byId.get(id);
    if (!c) return;
    state.currentId = id;
    if (location.hash.slice(1) !== id) history.replaceState(null, '', '#' + id);
    renderSidebar();
    const active = document.querySelector('#projects .conv.active');
    if (active) active.scrollIntoView({ block: 'nearest' });
    const main = $('#conversation');
    main.textContent = '';
    main.append(convHeader(c));
    if (c.file === 'pb') {
      main.append(el('div', { class: 'notice' }, '这个会话是旧版 .pb 格式（内容已加密），无法在浏览器里解码。'));
      return;
    }
    if (!c.file) {
      main.append(el('div', { class: 'notice' }, `conversations 目录里找不到 ${id}.db`));
      return;
    }
    const loading = el('div', { class: 'notice' }, '加载中…');
    main.append(loading);
    let steps;
    try {
      const db = await openDb(`conversations/${id}.db`, c.storeName);
      if (!db) throw new Error(`未找到文件 conversations/${id}.db`);
      const rows = queryAll(db, 'SELECT idx, step_type, status, step_payload FROM steps ORDER BY idx');
      db.close();
      steps = rows.map(parseStep);
    } catch (e) {
      loading.textContent = '读取失败：' + e.message;
      return;
    }
    if (state.currentId !== id) return;
    state.currentSteps = { id, steps };
    loading.remove();
    renderSteps(main, steps);
    $('#main').scrollTop = 0;
  }

  function convHeader(c) {
    const parent = c.parent && state.byId.get(c.parent);
    return el('header', { class: 'conv-header' },
      el('h1', null, convLabel(c)),
      el('div', { class: 'meta-grid' },
        el('span', null, 'UUID'), el('code', { class: 'copy', title: '点击复制', onclick: e => copyText(c.id, e.target) }, c.id),
        el('span', null, '文件'), el('code', null, c.file ? `${c.storeName ? c.storeName + '/' : ''}conversations/${c.id}.${c.file}` : '—'),
        el('span', null, '工作区'), el('span', null, c.workspaces.join('，') || '—'),
        el('span', null, '更新时间'), el('span', null, `${fmtTime(c.modified)}  ·  ${c.steps} 步  ·  ${c.status || '—'}`),
        c.sourceType ? el('span', null, '来源') : null,
        c.sourceType ? el('span', null, c.sourceType === 'CLI' ? 'AGY CLI' : 'Antigravity IDE') : null,
        c.agent ? el('span', null, '代理') : null, c.agent ? el('span', null, c.agent) : null,
        parent ? el('span', null, '父会话') : null,
        parent ? el('a', { href: '#' + parent.id, onclick: e => { e.preventDefault(); openConversation(parent.id); } }, convLabel(parent)) : null,
        c.children.length ? el('span', null, '子代理') : null,
        c.children.length ? el('span', { class: 'links' }, c.children.map(k =>
          el('a', { href: '#' + k.id, onclick: e => { e.preventDefault(); openConversation(k.id); } }, convLabel(k)))) : null),
      c.preview && c.preview !== c.title ? el('details', { class: 'preview' }, el('summary', null, '摘要'), el('div', { class: 'pre' }, c.preview)) : null,
      el('div', { class: 'toolbar' },
        toggle('thinking', '思考过程'), toggle('tools', '工具调用'), toggle('system', '系统步骤'), toggle('expand', '展开工具输出'),
        el('button', { class: 'btn small', onclick: exportMarkdown }, '导出 Markdown')));
  }

  function toggle(key, label) {
    return el('label', { class: 'chk' },
      el('input', { type: 'checkbox', checked: state.opts[key], onchange: e => {
        state.opts[key] = e.target.checked; saveOpts();
        if (state.currentSteps) {
          const main = $('#conversation');
          main.querySelectorAll('.timeline').forEach(n => n.remove());
          renderSteps(main, state.currentSteps.steps);
        }
      } }), label);
  }

  function copyText(t, node) {
    navigator.clipboard && navigator.clipboard.writeText(t).then(() => {
      node.classList.add('copied'); setTimeout(() => node.classList.remove('copied'), 900);
    }, () => {});
  }

  // ---------------------------------------------------------------- markdown
  marked.use({ gfm: true, breaks: false, renderer: { html: (html) => escapeHtml(typeof html === 'string' ? html : html.text || '') } });
  function escapeHtml(s) { return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function md(text) {
    const div = el('div', { class: 'md' });
    try { div.innerHTML = marked.parse(text || ''); } catch (e) { div.textContent = text; }
    div.querySelectorAll('a[href]').forEach(a => {
      const h = a.getAttribute('href');
      if (/^\s*javascript:/i.test(h)) a.removeAttribute('href');
      else { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    });
    return div;
  }

  // ---------------------------------------------------------------- render
  function renderSteps(main, steps) {
    state.objectUrls.forEach(u => URL.revokeObjectURL(u));
    state.objectUrls = [];
    const shownToolIds = new Set(steps.filter(s => s.toolId && s.type !== 15).map(s => s.toolId));
    const tl = el('div', { class: 'timeline' });
    for (const s of steps) {
      let node = null;
      try { node = renderStep(s, shownToolIds); }
      catch (e) { node = card(s, 'err', `步骤 ${s.idx} 解析出错`, el('div', { class: 'pre' }, String(e && e.stack || e))); }
      if (node) tl.append(node);
    }
    if (!tl.children.length) tl.append(el('div', { class: 'notice' }, '没有可显示的步骤'));
    main.append(tl);
  }

  function rawToggle(s) {
    const d = el('details', { class: 'raw' }, el('summary', null, '原始数据'));
    d.addEventListener('toggle', () => {
      if (d.open && d.children.length === 1) d.append(el('pre', null, treeText(toTree(s.raw) || [], 0)));
    }, { once: false });
    return d;
  }
  function treeText(nodes, ind) {
    const pad = '  '.repeat(ind);
    return nodes.map(n => {
      if (n.type === 'message') return `${pad}${n.f} {\n${treeText(n.value, ind + 1)}\n${pad}}`;
      if (n.type === 'string') return `${pad}${n.f}: ${JSON.stringify(n.value.length > 4000 ? n.value.slice(0, 4000) + ` …(+${n.value.length - 4000})` : n.value)}`;
      if (n.type === 'bytes') return `${pad}${n.f}: <${n.value} bytes>`;
      return `${pad}${n.f}: ${n.value}`;
    }).join('\n');
  }

  function card(s, kind, title, ...content) {
    const time = s.time ? fmtTime(s.time).slice(11) : '';
    return el('section', { class: `step ${kind}`, 'data-idx': s.idx },
      el('div', { class: 'step-head' },
        el('span', { class: 'who' }, title),
        el('span', { class: 'idx' }, `#${s.idx}`),
        s.status !== 3 && s.status != null ? el('span', { class: 'badge' }, `status ${s.status}`) : null,
        el('span', { class: 'time', title: s.time ? fmtTime(s.time) : '' }, time)),
      ...content,
      rawToggle(s));
  }

  function pre(text, cls) { return el('div', { class: 'pre ' + (cls || '') }, text); }
  function collapsible(summary, body, open) {
    return el('details', { class: 'fold', open: open || null }, el('summary', null, summary), body);
  }

  function prettyArgs(json) {
    if (!json) return null;
    let obj;
    try { obj = JSON.parse(json); } catch (e) { return pre(json, 'args'); }
    if (obj && typeof obj === 'object') {
      delete obj.toolAction; delete obj.toolSummary;
      const keys = Object.keys(obj);
      if (!keys.length) return null;
      const dl = el('div', { class: 'args' });
      for (const k of keys) {
        const v = obj[k];
        const str = typeof v === 'string' ? v : JSON.stringify(v, null, 2);
        dl.append(el('div', { class: 'arg-k' }, k), str.includes('\n') || str.length > 160 ? pre(str) : el('div', { class: 'arg-v' }, str));
      }
      return dl;
    }
    return pre(json, 'args');
  }

  function renderStep(s, shownToolIds) {
    const b = s.body;
    switch (s.type) {
      case 14: { // user input
        const text = b ? b.str(2) || b.str(3, 1) : '';
        return card(s, 'user', '用户', md(text));
      }
      case 15: { // planner response
        const thinking = b ? b.str(3) : '';
        const text = b ? b.str(8) || b.str(1) : '';
        const calls = b ? b.msgs(7) : [];
        const missing = calls.filter(c => !shownToolIds.has(c.str(1)));
        if (!text && !(state.opts.thinking && thinking) && !(state.opts.tools && missing.length)) return null;
        return card(s, 'assistant', '助手',
          state.opts.thinking && thinking ? collapsible('思考过程', md(thinking), false) : null,
          text ? md(text) : null,
          state.opts.tools && missing.length ? el('div', { class: 'calls' }, missing.map(c =>
            collapsible(el('span', null, '调用 ', el('code', null, c.str(2))), prettyArgs(c.str(3)), state.opts.expand))) : null);
      }
      case 17: { // error
        if (!b) return null;
        const e = b.msg(3) || b;
        return card(s, 'err', '错误', pre(e.str(1) || e.str(2)), e.str(3) ? collapsible('详情', pre(e.str(3))) : null);
      }
      case 101: { // system message
        if (!state.opts.system) return null;
        return card(s, 'system', '系统消息', md(b ? b.str(2, 2) || b.str(1) : ''));
      }
      case 90: case 98: case 23: {
        if (!state.opts.system) return null;
        const text = b ? collectStrings(b.buf, [], 1).join('\n') : '';
        return card(s, 'system', STEP_NAMES[s.type] || `类型 ${s.type}`, text ? collapsible('内容', pre(text)) : null);
      }
      case 127: return renderSubagents(s);
      case 91: return renderImage(s);
      default:
        if (s.toolName || b) return renderTool(s);
        if (!state.opts.system) return null;
        return card(s, 'system', STEP_NAMES[s.type] || `类型 ${s.type}`);
    }
  }

  function toolOutput(s) {
    const b = s.body;
    if (!b) return null;
    switch (s.type) {
      case 21: { // run_command
        const out = b.str(21, 1) || b.str(26, 1);
        return el('div', null,
          el('div', { class: 'cmd' }, el('span', { class: 'prompt' }, (b.str(2) ? b.str(2) + ' ' : '') + '›'), ' ', b.str(23) || b.str(25)),
          out ? pre(out, 'output') : null);
      }
      case 132: return b.str(2, 1) ? pre(b.str(2, 1), 'output') : null;
      case 7: { // grep
        const out = b.str(3);
        return out ? pre(out, 'output') : null;
      }
      case 9: { // list_dir: 15.3 = entries {1 name, 2 isDir, 4 size}
        const entries = b.msgs(3);
        if (!entries.length) break;
        return pre(entries.map(e => e.num(2) ? e.str(1) + '/' : `${e.str(1)}  (${e.num(4) ?? 0} B)`).join('\n'), 'output');
      }
    }
    // generic: longest strings found in the body
    const strs = collectStrings(b.buf, [], 1).filter(x => !/^file:\/\/\//.test(x) || x.length > 300);
    if (!strs.length) return null;
    strs.sort((a, c) => c.length - a.length);
    return pre(strs[0], 'output');
  }

  function renderTool(s) {
    if (!state.opts.tools) return null;
    const name = s.toolName || STEP_NAMES[s.type] || `类型 ${s.type}`;
    const title = el('span', null, el('code', { class: 'tool-name' }, name), ' ', s.toolAction || s.toolSummary || '');
    const args = s.type === 21 ? null : prettyArgs(s.toolArgs);
    const out = toolOutput(s);
    return card(s, 'tool', '工具',
      collapsible(title, el('div', null, args, out || el('div', { class: 'muted' }, '(无输出)')), state.opts.expand));
  }

  function renderSubagents(s) {
    const b = s.body;
    const tasks = b ? b.msgs(9) : [];
    const runs = b ? b.msgs(10) : [];
    const list = el('div', { class: 'subagents' });
    tasks.forEach((t, i) => {
      const id = runs[i] && runs[i].str(1);
      const known = id && state.byId.get(id);
      list.append(el('div', { class: 'subagent' },
        el('div', null, el('span', { class: 'tag' }, t.str(1)), ' ', el('b', null, t.str(2)),
          id ? el('a', { href: '#' + id, class: 'open-sub', onclick: e => { e.preventDefault(); if (known) openConversation(id); } },
            known ? '打开会话 →' : id) : null),
        collapsible('任务描述', md(t.str(3)), false)));
    });
    return card(s, 'tool', '调用子代理', list);
  }

  function brainPath(uri) {
    // file:///C:/Users/x/.gemini/antigravity[-cli]/brain/... -> brain/...
    const p = uriToPath(uri);
    const m = p.match(/\/(?:antigravity(?:-cli)?)\/(brain\/.+)$/i);
    if (m) return m[1];
    const i = p.toLowerCase().indexOf('/brain/');
    return i >= 0 ? p.slice(i + 1) : null;
  }

  function renderImage(s) {
    const b = s.body;
    const prompt = b ? b.str(1) : '';
    const uri = b ? b.str(6, 5) : '';
    const holder = el('div', { class: 'image' }, el('div', { class: 'muted' }, uriToPath(uri)));
    const rel = uri && brainPath(uri);
    const storeHint = state.byId.get(state.currentId)?.storeName;
    if (rel) state.source.getFile(rel, storeHint).then(f => {
      if (!f) return;
      const url = URL.createObjectURL(f);
      state.objectUrls.push(url);
      holder.prepend(el('img', { src: url, alt: prompt.slice(0, 100) }));
    });
    return card(s, 'tool', '生成图片', collapsible('提示词', pre(prompt)), holder);
  }

  // ---------------------------------------------------------------- export
  function exportMarkdown() {
    const cur = state.currentSteps;
    if (!cur) return;
    const c = state.byId.get(cur.id);
    const lines = [`# ${convLabel(c)}`, '', `- UUID: ${c.id}`, `- 工作区: ${c.workspaces.join(', ')}`, `- 更新时间: ${fmtTime(c.modified)}`, ''];
    for (const s of cur.steps) {
      const b = s.body;
      if (s.type === 14 && b) lines.push('## 用户', '', b.str(2), '');
      else if (s.type === 15 && b) {
        const t = b.str(8) || b.str(1);
        if (state.opts.thinking && b.str(3)) lines.push('<details><summary>思考过程</summary>', '', b.str(3), '', '</details>', '');
        if (t) lines.push('## 助手', '', t, '');
      } else if (state.opts.tools && s.toolName) {
        lines.push(`> 工具 \`${s.toolName}\` ${s.toolAction || s.toolSummary || ''}`, '');
      }
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const a = el('a', { href: URL.createObjectURL(blob), download: `${convLabel(c).replace(/[\\/:*?"<>|]/g, '_').slice(0, 60)}.md` });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ---------------------------------------------------------------- init
  $('#pickBtn').addEventListener('click', pickDirectory);
  $('#pickBtn2').addEventListener('click', pickDirectory);
  $('#reloadBtn').addEventListener('click', () => state.source && useSource(state.source));
  $('#dirInput').addEventListener('change', e => {
    const src = fileListSource(e.target.files);
    if (!src) { setStatus('所选目录中没有 conversation_summaries.db', true); return; }
    useSource(src);
  });
  $('#validOnlyBtn').addEventListener('click', toggleValidOnly);
  $('#foldAllBtn').addEventListener('click', toggleAllProjects);
  $('#search').addEventListener('input', e => { state.filter = e.target.value; renderSidebar(); });
  window.addEventListener('hashchange', () => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (id && id !== state.currentId && state.byId.has(id)) openConversation(id);
  });

  (async () => {
    if (window.showDirectoryPicker && await idbGet('root')) $('#reopenBtn').hidden = false;
    $('#reopenBtn').addEventListener('click', reopenLast);
    getSQL().catch(e => setStatus('sql.js 初始化失败：' + e.message, true));
  })();
})();
