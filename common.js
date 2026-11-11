// Общий слой хранения. Работает и в Firefox/Zen (browser.*), и в Chrome (chrome.*, MV3 — промисы).
const ext = globalThis.browser ?? globalThis.chrome;

const OxStore = {
  KEY: 'words',

  async all() {
    const data = await ext.storage.local.get(this.KEY);
    return data[this.KEY] || {};
  },

  async has(id) {
    return id in (await this.all());
  },

  async put(record) {
    const words = await this.all();
    words[record.id] = record;
    await ext.storage.local.set({ [this.KEY]: words });
  },

  async remove(id) {
    const words = await this.all();
    delete words[id];
    await ext.storage.local.set({ [this.KEY]: words });
  },

  // Слияние импортированных слов: уже существующие не затираем
  async merge(imported) {
    const words = await this.all();
    let added = 0;
    for (const rec of Object.values(imported)) {
      if (!rec || !rec.id || !rec.word) continue;
      if (!(rec.id in words)) { words[rec.id] = rec; added++; }
    }
    await ext.storage.local.set({ [this.KEY]: words });
    return added;
  },

  onChange(callback) {
    ext.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes[this.KEY]) callback(changes[this.KEY].newValue || {});
    });
  },
};
