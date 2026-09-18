fetch('https://www.valvetrix.com/', { cache: 'no-store' }).then(r => r.text()).then(h => {
  const t = h.match(/tel:[^"']+/g) || [];
  console.log('tel-hrefs:', [...new Set(t)].join(' | '));
  const t2 = h.match(/<title>[^<]*/);
  console.log('title:', t2 && t2[0]);
  const schema = h.match(/"email":"[^"]+"/);
  console.log('schema-email:', schema && schema[0]);
  const schemaTel = h.match(/"telephone":"[^"]+"/);
  console.log('schema-tel:', schemaTel && schemaTel[0]);
}).catch(e => console.log('ERR', e.message));
