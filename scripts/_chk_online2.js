const pages = ['https://www.valvetrix.com/products/diaphragm-valves/dv22a-mr8', 'https://www.valvetrix.com/services/custom-manufacturing', 'https://www.valvetrix.com/news'];
(async () => {
  for (const p of pages) {
    try {
      const h = await (await fetch(p, { cache: 'no-store' })).text();
      const tels = [...new Set((h.match(/tel:[^"']+/g) || []))];
      const title = (h.match(/<title>[^<]*/) || [''])[0];
      const ogLoc = (h.match(/og:locale" content="[^"]+"/) || [''])[0];
      console.log(p, '| title:', title, '| tel:', tels.join(','), '|', ogLoc);
    } catch (e) { console.log(p, 'ERR', e.message); }
  }
})();
