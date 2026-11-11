// Кнопка «Сохранить» на странице слова: сохраняет слово + произношение UK/US.
(() => {
  const id = location.pathname.replace(/^\/definition\//, '').replace(/\/+$/, '');
  const entry = document.querySelector('#entryContent .entry') || document;
  const webtop = entry.querySelector('.webtop');
  if (!webtop || !webtop.querySelector('.headword')) return;

  const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');

  // UK: .phons_br, US: .phons_n_am
  function accent(selector) {
    const box = webtop.querySelector(selector);
    if (!box) return null;
    const sound = box.querySelector('.sound');
    const mp3 = sound && sound.getAttribute('data-src-mp3');
    const ogg = sound && sound.getAttribute('data-src-ogg');
    if (!mp3 && !ogg) return null;
    return { phon: text(box.querySelector('.phon')), mp3: mp3 || null, ogg: ogg || null };
  }

  function extract() {
    const sense = entry.querySelector('li.sense');
    return {
      id,
      word: text(webtop.querySelector('.headword')),
      pos: text(webtop.querySelector('.pos')),
      uk: accent('.phons_br'),
      us: accent('.phons_n_am'),
      definition: text(sense && sense.querySelector('.def')),
      example: text(sense && sense.querySelector('.x')),
      url: location.href,
      savedAt: Date.now(),
    };
  }

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'oxs-btn';

  function render(saved) {
    btn.classList.toggle('oxs-saved', saved);
    btn.textContent = saved ? '★ Сохранено' : '☆ Сохранить';
    btn.title = saved ? 'Нажмите, чтобы убрать из списка' : 'Сохранить слово с произношением';
  }

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    try {
      if (await OxStore.has(id)) await OxStore.remove(id);
      else await OxStore.put(extract());
    } finally {
      btn.disabled = false;
    }
  });

  OxStore.onChange((words) => render(id in words));
  OxStore.has(id).then(render);

  webtop.appendChild(btn);
})();
