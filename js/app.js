(function () {
  'use strict';
  const { Msg, toTree, collectStrings } = window.Proto;

  // ---------------------------------------------------------------- i18n
  const I18N = {
    zh: {
      appTitle: 'Antigravity 会话查看器',
      brand: 'Antigravity 会话',
      chooseDir: '选择目录',
      openLastDir: '打开上次目录',
      reload: '刷新',
      reloadTitle: '重新读取数据库',
      searchPlaceholder: '搜索标题 / 摘要 / UUID',
      collapseAll: '全部折叠',
      expandAll: '全部展开',
      foldAllBtnTitle: '折叠 / 展开所有工程',
      resizerTitle: '左右拖动调整侧边栏宽度，双击恢复默认宽度',
      langBtnTitle: '切换为英文 / Switch to English',
      langBtnText: 'EN',
      welcomeTitle: 'Antigravity 会话查看器',
      welcomeP1: '纯本地运行，数据不会离开浏览器。点击下面的按钮，选择 Antigravity / AGY CLI 的数据目录：',
      welcomePathTip: '<code>C:\\Users\\&lt;你的用户名&gt;\\.gemini</code>（选 <code>.gemini</code> 可自动聚合 IDE 与 CLI；也可单选其下的 <code>antigravity</code> 或 <code>antigravity-cli</code>）',
      hint1: '按工程工作区目录独立归类（不论是 Antigravity IDE 还是 AGY CLI，每个工程独立成一个目录）；点击会话后可查看完整记录及关联子代理。',
      hint2: '点击会话后，按 UUID 读取 <code>conversations/&lt;UUID&gt;.db</code> 中的 <code>steps</code> 表并解码。',
      hint3: '会自动合并 <code>.db-wal</code> 中尚未写回的数据；旧版 <code>.pb</code> 文件是加密的，无法读取。',
      hint4: '推荐使用 Chrome / Edge，可记住目录；其他浏览器会退回到文件夹上传方式。',
      // Status
      readingDb: '正在读取数据库 …',
      readFailed: msg => '读取失败：' + msg,
      noConvData: '没有找到会话数据',
      noConvDbInDir: '该目录下没有找到 conversation_summaries.db，请选择 C:\\Users\\<用户>\\.gemini 或其下的 antigravity / antigravity-cli 目录',
      noRecordedLastDir: '没有记录上次的目录',
      noReadPermission: '未获得读取权限',
      noDbInLastDir: '未在上次的目录中找到会话数据库',
      openLastDirFailed: msg => '无法打开上次的目录：' + msg,
      noSummariesInFiles: '所选目录中没有 conversation_summaries.db',
      statusCounts: (srcName, projCount, convCount) => `${srcName}：${projCount} 个工程，${convCount} 个会话`,
      sqlInitFailed: msg => 'sql.js 初始化失败：' + msg,
      // Projects & convs
      noWorkspace: '(无工作区)',
      projIdTitle: id => `\n工程 ID: ${id}`,
      untitled: '(无标题)',
      noMatchingConvs: '没有匹配的会话',
      noValidConvs: '没有有效数据文件的会话',
      stepsCount: n => `${n} 步`,
      subagentsCount: n => ` · ${n} 子代理`,
      encryptedTag: ' · 加密',
      encryptedTooltip: '(.pb 加密格式，无法读取)',
      encryptedNoticePb: '这个会话是旧版 .pb 格式（内容已加密），无法在浏览器里解码。',
      fileNotFoundNotice: id => `conversations 目录里找不到 ${id}.db`,
      loading: '加载中…',
      fileNotFound: id => `未找到文件 conversations/${id}.db`,
      // Metadata
      uuid: 'UUID',
      file: '文件',
      workspace: '工作区',
      updated: '更新时间',
      source: '来源',
      agent: '代理',
      parentConv: '父会话',
      subagents: '子代理',
      summary: '摘要',
      clickToCopy: '点击复制',
      copied: '已复制',
      // Toggles
      thinking: '思考过程',
      tools: '工具调用',
      systemSteps: '系统步骤',
      expandOutput: '展开工具输出',
      exportMd: '导出 Markdown',
      // Steps
      noSteps: '没有可显示的步骤',
      rawProto: '原始数据',
      stepParseError: idx => `步骤 ${idx} 解析出错`,
      details: '详情',
      content: '内容',
      noOutput: '(无输出)',
      callTool: '调用 ',
      taskDesc: '任务描述',
      prompt: '提示词',
      openConvLink: '打开会话 →',
      user: '用户',
      assistant: '助手',
      error: '错误',
      systemMsg: '系统消息',
      invokeSubagent: '调用子代理',
      generateImage: '生成图片',
      tool: '工具',
      stepType: type => `类型 ${type}`,
      stepNames: {
        5: '写入文件', 7: '搜索', 8: '查看文件', 9: '列目录', 14: '用户', 15: '助手', 17: '错误',
        21: '运行命令', 23: '检查点', 90: '系统提示', 91: '生成图片', 98: '会话开始', 101: '系统消息',
        127: '调用子代理', 132: '工具', 138: '提问',
      },
      exportWorkspace: '工作区',
      exportUpdated: '更新时间',
      exportThinking: '思考过程',
      exportTool: '工具',
    },
    en: {
      appTitle: 'Antigravity Session Viewer',
      brand: 'Antigravity Sessions',
      chooseDir: 'Choose Folder',
      openLastDir: 'Open Last Folder',
      reload: 'Reload',
      reloadTitle: 'Reload database',
      searchPlaceholder: 'Search title / preview / UUID',
      collapseAll: 'Collapse All',
      expandAll: 'Expand All',
      foldAllBtnTitle: 'Collapse / expand all projects',
      resizerTitle: 'Drag to resize sidebar, double-click to reset',
      langBtnTitle: '切换为中文 / Switch to Chinese',
      langBtnText: '中文',
      welcomeTitle: 'Antigravity Session Viewer',
      welcomeP1: 'Runs entirely locally — your data never leaves the browser. Click below to select the Antigravity / AGY CLI data directory:',
      welcomePathTip: '<code>C:\\Users\\&lt;username&gt;\\.gemini</code> (select <code>.gemini</code> to aggregate IDE &amp; CLI; or select <code>antigravity</code> / <code>antigravity-cli</code> directly)',
      hint1: 'Cleanly grouped by project workspace directory (for both Antigravity IDE and AGY CLI); click a conversation to view full transcripts and linked subagents.',
      hint2: 'Clicking a conversation decodes the <code>steps</code> table from <code>conversations/&lt;UUID&gt;.db</code>.',
      hint3: 'Automatically merges unflushed WAL data from <code>.db-wal</code>; legacy encrypted <code>.pb</code> files cannot be read.',
      hint4: 'Chrome / Edge recommended to remember directory; other browsers fall back to folder upload.',
      // Status
      readingDb: 'Reading database …',
      readFailed: msg => 'Failed to read: ' + msg,
      noConvData: 'No conversation data found',
      noConvDbInDir: 'No conversation_summaries.db found in this directory. Please choose C:\\Users\\<username>\\.gemini or its antigravity / antigravity-cli subdirectory',
      noRecordedLastDir: 'No previous directory recorded',
      noReadPermission: 'Read permission not granted',
      noDbInLastDir: 'No conversation database found in previous directory',
      openLastDirFailed: msg => 'Failed to open previous directory: ' + msg,
      noSummariesInFiles: 'No conversation_summaries.db found in selected files',
      statusCounts: (srcName, projCount, convCount) => `${srcName}: ${projCount} project${projCount === 1 ? '' : 's'}, ${convCount} conversation${convCount === 1 ? '' : 's'}`,
      sqlInitFailed: msg => 'sql.js initialization failed: ' + msg,
      // Projects & convs
      noWorkspace: '(No workspace)',
      projIdTitle: id => `\nProject ID: ${id}`,
      untitled: '(Untitled)',
      noMatchingConvs: 'No matching conversations',
      noValidConvs: 'No conversations with valid data files',
      stepsCount: n => `${n} step${n === 1 ? '' : 's'}`,
      subagentsCount: n => ` · ${n} subagent${n === 1 ? '' : 's'}`,
      encryptedTag: ' · Encrypted',
      encryptedTooltip: '(.pb encrypted format, unreadable)',
      encryptedNoticePb: 'This conversation is in legacy .pb format (encrypted) and cannot be decoded in browser.',
      fileNotFoundNotice: id => `Cannot find ${id}.db in conversations directory`,
      loading: 'Loading…',
      fileNotFound: id => `File conversations/${id}.db not found`,
      // Metadata
      uuid: 'UUID',
      file: 'File',
      workspace: 'Workspace',
      updated: 'Updated',
      source: 'Source',
      agent: 'Agent',
      parentConv: 'Parent conversation',
      subagents: 'Subagents',
      summary: 'Summary',
      clickToCopy: 'Click to copy',
      copied: 'Copied',
      // Toggles
      thinking: 'Thinking',
      tools: 'Tool calls',
      systemSteps: 'System steps',
      expandOutput: 'Expand tool output',
      exportMd: 'Export Markdown',
      // Steps
      noSteps: 'No steps to display',
      rawProto: 'Raw data',
      stepParseError: idx => `Step ${idx} parse error`,
      details: 'Details',
      content: 'Content',
      noOutput: '(No output)',
      callTool: 'Call ',
      taskDesc: 'Task description',
      prompt: 'Prompt',
      openConvLink: 'Open conversation →',
      user: 'User',
      assistant: 'Assistant',
      error: 'Error',
      systemMsg: 'System message',
      invokeSubagent: 'Invoke Subagent',
      generateImage: 'Generate Image',
      tool: 'Tool',
      stepType: type => `Type ${type}`,
      stepNames: {
        5: 'Write File', 7: 'Search', 8: 'Read File', 9: 'List Directory', 14: 'User', 15: 'Assistant', 17: 'Error',
        21: 'Run Command', 23: 'Checkpoint', 90: 'System Prompt', 91: 'Generate Image', 98: 'Session Start', 101: 'System Message',
        127: 'Invoke Subagent', 132: 'Tool', 138: 'Ask Question',
      },
      exportWorkspace: 'Workspace',
      exportUpdated: 'Updated',
      exportThinking: 'Thinking',
      exportTool: 'Tool',
    }
  };

  function detectInitialLang() {
    try {
      const saved = localStorage.getItem('agy-viewer-lang');
      if (saved === 'zh' || saved === 'en') return saved;
    } catch (e) {}
    const sys = (navigator.languages && navigator.languages[0]) || navigator.language || navigator.userLanguage || '';
    return /^zh\b/i.test(sys) ? 'zh' : 'en';
  }

  function t(key, ...args) {
    const dict = I18N[state.lang] || I18N.en;
    const val = dict[key] !== undefined ? dict[key] : (I18N.en[key] !== undefined ? I18N.en[key] : key);
    return typeof val === 'function' ? val(...args) : val;
  }

  function getStepName(type) {
    const dict = I18N[state.lang] || I18N.en;
    return (dict.stepNames && dict.stepNames[type]) || dict.stepType(type);
  }

  // ---------------------------------------------------------------- state
  const state = {
    lang: detectInitialLang(),
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
    const def = { thinking: true, tools: true, system: false, expand: false };
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

  function updateStatusCounts() {
    if (!state.source || !state.projects.length) return;
    const activeProjects = state.projects.filter(p => p.convs.some(c => !c.parent && hasValidFile(c)));
    const topCount = state.convs.filter(c => !c.parent && hasValidFile(c)).length;
    setStatus(t('statusCounts', state.source.name, activeProjects.length, topCount));
  }

  function applyI18n() {
    document.title = t('appTitle');
    $('#brand').textContent = t('brand');
    $('#pickBtn').textContent = t('chooseDir');
    $('#reopenBtn').textContent = t('openLastDir');
    $('#reloadBtn').textContent = t('reload');
    $('#reloadBtn').title = t('reloadTitle');
    $('#search').placeholder = t('searchPlaceholder');
    $('#resizer').title = t('resizerTitle');
    $('#langBtn').textContent = t('langBtnText');
    $('#langBtn').title = t('langBtnTitle');

    const wTitle = $('#welcomeTitle');
    if (wTitle) wTitle.textContent = t('welcomeTitle');
    const wP1 = $('#welcomeP1');
    if (wP1) wP1.textContent = t('welcomeP1');
    const wPath = $('#welcomePath');
    if (wPath) wPath.innerHTML = t('welcomePathTip');
    const pickBtn2 = $('#pickBtn2');
    if (pickBtn2) pickBtn2.textContent = t('chooseDir');
    const hints = document.querySelectorAll('#welcomeHints li');
    if (hints[0]) hints[0].innerHTML = t('hint1');
    if (hints[1]) hints[1].innerHTML = t('hint2');
    if (hints[2]) hints[2].innerHTML = t('hint3');
    if (hints[3]) hints[3].innerHTML = t('hint4');

    updateFoldAllBtn();
  }

  function toggleLang() {
    setLang(state.lang === 'zh' ? 'en' : 'zh');
  }

  function setLang(lang) {
    state.lang = lang;
    try { localStorage.setItem('agy-viewer-lang', lang); } catch (e) {}
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    applyI18n();
    if (state.projects.length) {
      disambiguateProjectNames(state.projects);
      renderSidebar();
      updateStatusCounts();
    }
    if (state.currentId) {
      openConversation(state.currentId);
    }
  }

  // ---------------------------------------------------------------- sql.js
  async function getSQL() {
    if (state.SQL) return state.SQL;
    state.SQL = await window.initSqlJs({
      locateFile: () => 'data:application/wasm;base64,' + window.SQL_WASM_BASE64,
    });
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

  function queryAll(db, sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const out = [];
    while (stmt.step()) out.push(stmt.getAsObject());
    stmt.free();
    return out;
  }

  // ---------------------------------------------------------------- sources
  function fsaSource(rootHandle, stores) {
    const storeMap = new Map(stores.map(s => [s.name, s]));
    return {
      rootHandle,
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
    const pickerOpts = { id: 'agy-root', mode: 'read' };
    const startHandle = state.source?.rootHandle || await idbGet('root');
    if (startHandle) pickerOpts.startIn = startHandle;
    let handle;
    try {
      handle = await window.showDirectoryPicker(pickerOpts);
    } catch (e) {
      if (e.name === 'AbortError') return;
      if (pickerOpts.startIn) {
        try {
          handle = await window.showDirectoryPicker({ id: 'agy-root', mode: 'read' });
        } catch (e2) {
          if (e2.name !== 'AbortError') $('#dirInput').click();
          return;
        }
      } else {
        $('#dirInput').click();
        return;
      }
    }
    const stores = await resolveStores(handle);
    if (!stores.length) {
      setStatus(t('noConvDbInDir'), true);
      return;
    }
    await idbSet('root', handle);
    $('#reopenBtn').hidden = false;
    await useSource(fsaSource(handle, stores));
  }

  async function reopenLast() {
    try {
      const h = await idbGet('root');
      if (!h) { setStatus(t('noRecordedLastDir'), true); return; }
      const p = await h.requestPermission({ mode: 'read' });
      if (p !== 'granted') { setStatus(t('noReadPermission'), true); return; }
      const stores = await resolveStores(h);
      if (!stores.length) { setStatus(t('noDbInLastDir'), true); return; }
      await useSource(fsaSource(h, stores));
    } catch (e) { setStatus(t('openLastDirFailed', e.message), true); }
  }

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
    setStatus(t('readingDb'));
    let rows;
    try {
      rows = await src.readSummaries(openDb);
    } catch (e) {
      setStatus(t('readFailed', e.message), true);
      return;
    }
    if (!rows || !rows.length) {
      setStatus(t('noConvData'), true);
      return;
    }

    // filename -> storeName
    const convFileMap = await src.listConversationFiles();

    // Deduplicate rows by conversation_id across stores.
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
    updateStatusCounts();
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
        : '';
      p.baseName = base;
      if (!byBase.has(base)) byBase.set(base, []);
      byBase.get(base).push(p);
    }

    for (const [base, list] of byBase.entries()) {
      if (!base) {
        for (const p of list) p.name = t('noWorkspace');
        continue;
      }
      if (list.length === 1) {
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
    return c.title || c.preview.split('\n')[0].slice(0, 80) || (c.agent ? `[${c.agent}]` : t('untitled'));
  }

  function matches(c, q) {
    if (!q) return true;
    return (c.title + '\n' + c.preview + '\n' + c.id + '\n' + (c.agent || '') + '\n' + (c.sourceType || '') + '\n' + c.workspaces.join('\n')).toLowerCase().includes(q);
  }

  function hasValidFile(c) {
    return !!c.file || c.children.some(hasValidFile);
  }

  function renderSidebar() {
    const box = $('#projects');
    box.textContent = '';
    const q = state.filter.trim().toLowerCase();
    let shown = 0;
    for (const p of state.projects) {
      // Top-level valid conversations of this project (no subagents)
      const tops = p.convs.filter(c => !c.parent && hasValidFile(c));
      const matchesWithKids = c => matches(c, q) || c.children.some(matchesWithKids);
      const list = tops.filter(matchesWithKids);
      const projMatch = q && (p.name.toLowerCase().includes(q) || p.workspaces.some(w => w.toLowerCase().includes(q)));
      if (!list.length && (!projMatch || !tops.length)) continue;
      const items = list.length ? list : tops;
      const isCollapsed = collapsed.has(p.key) && !q;
      const count = tops.length;
      const head = el('div', {
        class: 'proj-head',
        title: (p.workspaces.length ? p.workspaces.join('\n') : t('noWorkspace')) + (p.id ? t('projIdTitle', p.id) : ''),
        onclick: () => { collapsed.has(p.key) ? collapsed.delete(p.key) : collapsed.add(p.key); saveCollapsed(); renderSidebar(); }
      },
        el('span', { class: 'chev' + (isCollapsed ? '' : ' open') }, '▸'),
        el('span', { class: 'proj-name' }, p.name),
        el('span', { class: 'count' }, String(count)));
      const ul = el('div', { class: 'conv-list' });
      if (!isCollapsed) for (const c of items) ul.append(convItem(c, q));
      box.append(el('div', { class: 'project' }, head, ul));
      shown += items.length;
    }
    if (!shown) box.append(el('div', { class: 'empty' }, q ? t('noMatchingConvs') : t('noValidConvs')));
    updateControls();
  }

  function allCollapsed() {
    return state.projects.length > 0 && state.projects.every(p => collapsed.has(p.key));
  }
  function updateControls() {
    updateFoldAllBtn();
  }
  function updateFoldAllBtn() {
    const btn = $('#foldAllBtn');
    if (!btn) return;
    btn.hidden = !state.projects.length;
    btn.textContent = allCollapsed() ? t('expandAll') : t('collapseAll');
    btn.title = t('foldAllBtnTitle');
  }
  function toggleAllProjects() {
    if (allCollapsed()) collapsed.clear();
    else state.projects.forEach(p => collapsed.add(p.key));
    saveCollapsed();
    renderSidebar();
    $('#projects').scrollTop = 0;
  }

  function convItem(c, q) {
    const isChildActive = k => k.id === state.currentId || k.children.some(isChildActive);
    const isActive = c.id === state.currentId || c.children.some(isChildActive);
    const validKidsCount = c.children.filter(hasValidFile).length;
    return el('a', {
      class: 'conv' + (isActive ? ' active' : '') + (c.file === 'db' ? '' : ' nofile'),
      href: '#' + c.id,
      title: `${convLabel(c)}\n${c.id}\n${c.sourceType ? `[${c.sourceType}] ` : ''}${fmtTime(c.modified)} · ${t('stepsCount', c.steps)}${c.file === 'pb' ? `\n${t('encryptedTooltip')}` : ''}`,
      onclick: e => { e.preventDefault(); openConversation(c.id); },
    },
      el('div', { class: 'conv-title' },
        c.sourceType ? el('span', { class: 'tag ' + c.sourceType.toLowerCase() }, c.sourceType) : null,
        c.agent ? el('span', { class: 'tag' }, c.agent) : null,
        convLabel(c)),
      el('div', { class: 'conv-meta' },
        fmtTime(c.modified), ` · ${t('stepsCount', c.steps)}`,
        validKidsCount ? t('subagentsCount', validKidsCount) : '',
        c.file === 'pb' ? t('encryptedTag') : ''));
  }

  // ---------------------------------------------------------------- steps
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
      main.append(el('div', { class: 'notice' }, t('encryptedNoticePb')));
      return;
    }
    if (!c.file) {
      main.append(el('div', { class: 'notice' }, t('fileNotFoundNotice', id)));
      return;
    }
    const loading = el('div', { class: 'notice' }, t('loading'));
    main.append(loading);
    let steps;
    try {
      const db = await openDb(`conversations/${id}.db`, c.storeName);
      if (!db) throw new Error(t('fileNotFound', id));
      const rows = queryAll(db, 'SELECT idx, step_type, status, step_payload FROM steps ORDER BY idx');
      db.close();
      steps = rows.map(parseStep);
    } catch (e) {
      loading.textContent = t('readFailed', e.message);
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
        el('span', null, t('uuid')), el('code', { class: 'copy', title: t('clickToCopy'), onclick: e => copyText(c.id, e.target) }, c.id),
        el('span', null, t('file')), el('code', null, c.file ? `${c.storeName ? c.storeName + '/' : ''}conversations/${c.id}.${c.file}` : '—'),
        el('span', null, t('workspace')), el('span', null, c.workspaces.join(', ') || '—'),
        el('span', null, t('updated')), el('span', null, `${fmtTime(c.modified)}  ·  ${t('stepsCount', c.steps)}  ·  ${c.status || '—'}`),
        c.sourceType ? el('span', null, t('source')) : null,
        c.sourceType ? el('span', null, c.sourceType === 'CLI' ? 'AGY CLI' : 'Antigravity IDE') : null,
        c.agent ? el('span', null, t('agent')) : null, c.agent ? el('span', null, c.agent) : null,
        parent ? el('span', null, t('parentConv')) : null,
        parent ? el('a', { href: '#' + parent.id, onclick: e => { e.preventDefault(); openConversation(parent.id); } }, convLabel(parent)) : null,
        c.children.length ? el('span', null, t('subagents')) : null,
        c.children.length ? el('span', { class: 'links' }, c.children.map(k =>
          el('a', { href: '#' + k.id, onclick: e => { e.preventDefault(); openConversation(k.id); } }, convLabel(k)))) : null),
      c.preview && c.preview !== c.title ? el('details', { class: 'preview' }, el('summary', null, t('summary')), el('div', { class: 'pre' }, c.preview)) : null,
      el('div', { class: 'toolbar' },
        toggle('thinking', t('thinking')), toggle('tools', t('tools')), toggle('system', t('systemSteps')), toggle('expand', t('expandOutput')),
        el('button', { class: 'btn small', onclick: exportMarkdown }, t('exportMd'))));
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

  function copyText(txt, node) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(txt).then(() => {
        node.classList.add('copied');
        const origTitle = node.title;
        node.title = t('copied');
        setTimeout(() => {
          node.classList.remove('copied');
          node.title = origTitle;
        }, 1200);
      }, () => {});
    }
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
      catch (e) { node = card(s, 'err', t('stepParseError', s.idx), el('div', { class: 'pre' }, String(e && e.stack || e))); }
      if (node) tl.append(node);
    }
    if (!tl.children.length) tl.append(el('div', { class: 'notice' }, t('noSteps')));
    main.append(tl);
  }

  function rawToggle(s) {
    const d = el('details', { class: 'raw' }, el('summary', null, t('rawProto')));
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
        return card(s, 'user', t('user'), md(text));
      }
      case 15: { // planner response
        const thinking = b ? b.str(3) : '';
        const text = b ? b.str(8) || b.str(1) : '';
        const calls = b ? b.msgs(7) : [];
        const missing = calls.filter(c => !shownToolIds.has(c.str(1)));
        if (!text && !(state.opts.thinking && thinking) && !(state.opts.tools && missing.length)) return null;
        return card(s, 'assistant', t('assistant'),
          state.opts.thinking && thinking ? collapsible(t('thinking'), md(thinking), false) : null,
          text ? md(text) : null,
          state.opts.tools && missing.length ? el('div', { class: 'calls' }, missing.map(c =>
            collapsible(el('span', null, t('callTool'), el('code', null, c.str(2))), prettyArgs(c.str(3)), state.opts.expand))) : null);
      }
      case 17: { // error
        if (!b) return null;
        const e = b.msg(3) || b;
        return card(s, 'err', t('error'), pre(e.str(1) || e.str(2)), e.str(3) ? collapsible(t('details'), pre(e.str(3))) : null);
      }
      case 101: { // system message
        if (!state.opts.system) return null;
        return card(s, 'system', t('systemMsg'), md(b ? b.str(2, 2) || b.str(1) : ''));
      }
      case 90: case 98: case 23: {
        if (!state.opts.system) return null;
        const text = b ? collectStrings(b.buf, [], 1).join('\n') : '';
        return card(s, 'system', getStepName(s.type), text ? collapsible(t('content'), pre(text)) : null);
      }
      case 127: return renderSubagents(s);
      case 91: return renderImage(s);
      default:
        if (s.toolName || b) return renderTool(s);
        if (!state.opts.system) return null;
        return card(s, 'system', getStepName(s.type));
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
    const name = s.toolName || getStepName(s.type);
    const title = el('span', null, el('code', { class: 'tool-name' }, name), ' ', s.toolAction || s.toolSummary || '');
    const args = s.type === 21 ? null : prettyArgs(s.toolArgs);
    const out = toolOutput(s);
    return card(s, 'tool', t('tool'),
      collapsible(title, el('div', null, args, out || el('div', { class: 'muted' }, t('noOutput'))), state.opts.expand));
  }

  function renderSubagents(s) {
    const b = s.body;
    const tasks = b ? b.msgs(9) : [];
    const runs = b ? b.msgs(10) : [];
    const list = el('div', { class: 'subagents' });
    tasks.forEach((tSub, i) => {
      const id = runs[i] && runs[i].str(1);
      const known = id && state.byId.get(id);
      list.append(el('div', { class: 'subagent' },
        el('div', null, el('span', { class: 'tag' }, tSub.str(1)), ' ', el('b', null, tSub.str(2)),
          id ? el('a', { href: '#' + id, class: 'open-sub', onclick: e => { e.preventDefault(); if (known) openConversation(id); } },
            known ? t('openConvLink') : id) : null),
        collapsible(t('taskDesc'), md(tSub.str(3)), false)));
    });
    return card(s, 'tool', t('invokeSubagent'), list);
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
    return card(s, 'tool', t('generateImage'), collapsible(t('prompt'), pre(prompt)), holder);
  }

  // ---------------------------------------------------------------- export
  function exportMarkdown() {
    const cur = state.currentSteps;
    if (!cur) return;
    const c = state.byId.get(cur.id);
    const lines = [`# ${convLabel(c)}`, '', `- UUID: ${c.id}`, `- ${t('exportWorkspace')}: ${c.workspaces.join(', ')}`, `- ${t('exportUpdated')}: ${fmtTime(c.modified)}`, ''];
    for (const s of cur.steps) {
      const b = s.body;
      if (s.type === 14 && b) lines.push(`## ${t('user')}`, '', b.str(2), '');
      else if (s.type === 15 && b) {
        const text = b.str(8) || b.str(1);
        if (state.opts.thinking && b.str(3)) lines.push(`<details><summary>${t('exportThinking')}</summary>`, '', b.str(3), '', '</details>', '');
        if (text) lines.push(`## ${t('assistant')}`, '', text, '');
      } else if (state.opts.tools && s.toolName) {
        lines.push(`> ${t('exportTool')} \`${s.toolName}\` ${s.toolAction || s.toolSummary || ''}`, '');
      }
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const a = el('a', { href: URL.createObjectURL(blob), download: `${convLabel(c).replace(/[\\/:*?"<>|]/g, '_').slice(0, 60)}.md` });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ---------------------------------------------------------------- resizer
  function initResizer() {
    const sidebar = $('#sidebar');
    const resizer = $('#resizer');
    if (!resizer || !sidebar) return;

    try {
      const savedWidth = localStorage.getItem('agy-viewer-sidebar-width');
      if (savedWidth) {
        const w = parseInt(savedWidth, 10);
        if (w >= 180 && w <= 800) sidebar.style.width = w + 'px';
      }
    } catch (e) {}

    let isDragging = false;
    let startX = 0;
    let startW = 0;

    resizer.addEventListener('mousedown', e => {
      isDragging = true;
      startX = e.clientX;
      startW = sidebar.getBoundingClientRect().width;
      resizer.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });

    window.addEventListener('mousemove', e => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const newW = Math.max(180, Math.min(800, startW + dx));
      sidebar.style.width = newW + 'px';
    });

    window.addEventListener('mouseup', () => {
      if (!isDragging) return;
      isDragging = false;
      resizer.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      try {
        localStorage.setItem('agy-viewer-sidebar-width', String(parseInt(sidebar.style.width, 10)));
      } catch (e) {}
    });

    resizer.addEventListener('dblclick', () => {
      sidebar.style.width = '320px';
      try { localStorage.setItem('agy-viewer-sidebar-width', '320'); } catch (e) {}
    });
  }

  // ---------------------------------------------------------------- init
  initResizer();
  applyI18n();
  $('#langBtn').addEventListener('click', toggleLang);
  $('#pickBtn').addEventListener('click', pickDirectory);
  $('#pickBtn2').addEventListener('click', pickDirectory);
  $('#reloadBtn').addEventListener('click', () => state.source && useSource(state.source));
  $('#dirInput').addEventListener('change', e => {
    const src = fileListSource(e.target.files);
    if (!src) { setStatus(t('noSummariesInFiles'), true); return; }
    useSource(src);
  });
  $('#foldAllBtn').addEventListener('click', toggleAllProjects);
  $('#search').addEventListener('input', e => { state.filter = e.target.value; renderSidebar(); });
  window.addEventListener('hashchange', () => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (id && id !== state.currentId && state.byId.has(id)) openConversation(id);
  });

  (async () => {
    if (window.showDirectoryPicker && await idbGet('root')) $('#reopenBtn').hidden = false;
    $('#reopenBtn').addEventListener('click', reopenLast);
    getSQL().catch(e => setStatus(t('sqlInitFailed', e.message), true));
  })();
})();
