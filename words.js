// Страница «Мои слова»: список, поиск, воспроизведение UK/US, «проиграть всё», экспорт/импорт.
(() => {
  if (new URLSearchParams(location.search).has('popup')) document.body.classList.add('popup');

  const $ = (sel) => document.querySelector(sel);
  const listEl = $('#list');
  const countEl = $('#count');
  const searchEl = $('#search');
  const sortEl = $('#sort');
  const modeEl = $('#mode');
  const playAllBtn = $('#play-all');
  const statusEl = $('#status');

  let words = {};
  let visibleIds = [];

  // ---------- воспроизведение ----------
  let current = null; // { audio, finish }
  let runId = 0;      // увеличивается при остановке «проиграть всё»

  function stopAudio() {
    if (!current) return;
    const { audio, finish } = current;
    current = null;
    audio.pause();
    finish();
  }

  function play(url) {
    return new Promise((resolve) => {
      stopAudio();
      const audio = new Audio(url);
      const finish = () => resolve();
      current = { audio, finish };
      audio.addEventListener('ended', finish, { once: true });
      audio.addEventListener('error', finish, { once: true });
      audio.play().catch(finish);
    });
  }

  const urlOf = (a) => (a ? a.mp3 || a.ogg : null);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function markActive(id, accentKey) {
    for (const el of listEl.querySelectorAll('.playing')) el.classList.remove('playing');
    for (const el of listEl.querySelectorAll('.snd.active')) el.classList.remove('active');
    if (!id) return;
    const card = listEl.querySelector(`.card[data-id="${CSS.escape(id)}"]`);
    if (!card) return;
    card.classList.add('playing');
    card.querySelector(`.snd[data-accent="${accentKey}"]`)?.classList.add('active');
    card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  async function playOne(rec, key) {
    const url = urlOf(rec[key]);
    if (!url) return;
    markActive(rec.id, key);
    await play(url);
  }

  async function playAll() {
    if (playAllBtn.dataset.state === 'playing') { stopPlayAll(); return; }
    const mode = modeEl.value;
    const keys = mode === 'both' ? ['uk', 'us'] : [mode];
    const my = ++runId;
    playAllBtn.dataset.state = 'playing';
    playAllBtn.textContent = '■ Стоп';

    for (const id of [...visibleIds]) {
      for (const key of keys) {
        if (my !== runId) return;
        const rec = words[id];
        if (!rec) continue;
        await playOne(rec, key);
        if (my !== runId) return;
        await sleep(450);
      }
      await sleep(450);
    }
    if (my === runId) stopPlayAll();
  }

  function stopPlayAll() {
    runId++;
    stopAudio();
    markActive(null);
    playAllBtn.dataset.state = '';
    playAllBtn.textContent = '▶ Проиграть всё';
  }

  // ---------- отрисовка ----------
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function soundButton(rec, key, label) {
    const a = rec[key];
    if (!urlOf(a)) return null;
    const b = el('button', 'snd');
    b.type = 'button';
    b.dataset.accent = key;
    b.title = `Произношение ${label}`;
    b.append(el('span', null, '▶'), el('span', 'tag', label), el('span', null, a.phon || ''));
    b.addEventListener('click', () => {
      if (playAllBtn.dataset.state === 'playing') stopPlayAll();
      playOne(rec, key).then(() => markActive(null));
    });
    return b;
  }

  function card(rec) {
    const c = el('article', 'card');
    c.dataset.id = rec.id;

    const head = el('div', 'card-head');
    head.append(el('h2', 'word', rec.word));
    if (rec.pos) head.append(el('span', 'pos', rec.pos));
    head.append(el('span', 'spacer'));
    const del = el('button', 'del', '✕');
    del.type = 'button';
    del.title = 'Удалить из списка';
    del.addEventListener('click', () => OxStore.remove(rec.id));
    head.append(del);
    c.append(head);

    const sounds = el('div', 'sounds');
    for (const b of [soundButton(rec, 'uk', 'UK'), soundButton(rec, 'us', 'US')]) if (b) sounds.append(b);
    if (sounds.children.length) c.append(sounds);

    if (rec.definition) c.append(el('p', 'def', rec.definition));
    if (rec.example) c.append(el('p', 'ex', rec.example));

    if (rec.url) {
      const a = el('a', 'src', 'Открыть в словаре ↗');
      a.href = rec.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      c.append(a);
    }
    return c;
  }

  function render() {
    const q = searchEl.value.trim().toLowerCase();
    let items = Object.values(words);
    if (q) items = items.filter((w) => w.word.toLowerCase().includes(q) || (w.definition || '').toLowerCase().includes(q));

    const sort = sortEl.value;
    items.sort((a, b) =>
      sort === 'az' ? a.word.localeCompare(b.word, 'en') :
      sort === 'old' ? a.savedAt - b.savedAt :
      b.savedAt - a.savedAt);

    visibleIds = items.map((w) => w.id);
    const total = Object.keys(words).length;
    countEl.textContent = total ? `· ${q ? items.length + ' из ' : ''}${total}` : '';
    playAllBtn.disabled = !items.length;

    listEl.replaceChildren();
    if (!items.length) {
      listEl.append(el('div', 'empty', total
        ? 'Ничего не найдено.'
        : 'Пока пусто. Откройте слово на oxfordlearnersdictionaries.com и нажмите «☆ Сохранить».'));
      return;
    }
    for (const rec of items) listEl.append(card(rec));
  }

  // ---------- экспорт / импорт ----------
  function setStatus(msg) {
    statusEl.textContent = msg;
    if (msg) setTimeout(() => { if (statusEl.textContent === msg) statusEl.textContent = ''; }, 5000);
  }

  $('#export').addEventListener('click', () => {
    const payload = { app: 'oxford-word-saver', version: 1, exportedAt: new Date().toISOString(), words: Object.values(words) };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `oxford-words-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setStatus(`Экспортировано: ${payload.words.length}`);
  });

  $('#import').addEventListener('click', () => $('#import-file').click());
  $('#import-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const list = Array.isArray(data) ? data : Array.isArray(data.words) ? data.words : Object.values(data.words || data);
      const map = {};
      for (const rec of list) if (rec && rec.id && rec.word) map[rec.id] = rec;
      const added = await OxStore.merge(map);
      setStatus(`Добавлено новых слов: ${added}`);
    } catch {
      setStatus('Не удалось прочитать файл');
    }
  });

  // ---------- запуск ----------
  $('#open-full').addEventListener('click', () => {
    ext.tabs.create({ url: ext.runtime.getURL('words.html') });
    window.close();
  });
  playAllBtn.addEventListener('click', playAll);
  searchEl.addEventListener('input', render);
  sortEl.addEventListener('change', render);

  OxStore.onChange((next) => { words = next; render(); });
  OxStore.all().then((all) => { words = all; render(); });
})();
