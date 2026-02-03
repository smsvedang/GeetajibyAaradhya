(() => {
  const LANG_KEY = 'lang';
  const DEFAULT_LANG = 'en';

  function getLang() {
    const stored = localStorage.getItem(LANG_KEY);
    return stored === 'hi' ? 'hi' : DEFAULT_LANG;
  }

  function setLang(lang) {
    localStorage.setItem(LANG_KEY, lang === 'hi' ? 'hi' : DEFAULT_LANG);
  }

  async function loadDict(lang) {
    try {
      const r = await fetch(`/api/i18n?lang=${lang}`);
      if (!r.ok) return {};
      return await r.json();
    } catch {
      return {};
    }
  }

  function applyDict(dict) {
    window.__I18N__ = dict || {};
    document.documentElement.lang = (window.__I18N__._lang || DEFAULT_LANG);

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key && dict[key]) el.textContent = dict[key];
    });

    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      if (key && dict[key]) el.innerHTML = dict[key];
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key && dict[key]) el.setAttribute('placeholder', dict[key]);
    });

    window.dispatchEvent(new CustomEvent('i18n:changed', { detail: window.__I18N__ }));
  }

  function updateToggles(lang) {
    const nextLabel = lang === 'hi' ? 'English' : 'हिंदी';
    document.querySelectorAll('[data-lang-toggle]').forEach(btn => {
      btn.textContent = nextLabel;
      btn.setAttribute('aria-label', lang === 'hi' ? 'Switch to English' : 'Switch to Hindi');
    });
  }

  async function init() {
    let lang = getLang();
    updateToggles(lang);
    const dict = await loadDict(lang);
    applyDict(dict);

    document.querySelectorAll('[data-lang-toggle]').forEach(btn => {
      btn.addEventListener('click', async () => {
        lang = lang === 'hi' ? 'en' : 'hi';
        setLang(lang);
        updateToggles(lang);
        const newDict = await loadDict(lang);
        applyDict(newDict);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
