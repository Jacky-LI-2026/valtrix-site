const pages = [
  ['/', '首页'],
  ['/products', '产品列表'],
  ['/products/diaphragm-valves/dv22a-mr8', '产品详情'],
  ['/industries', '行业列表'],
  ['/industries/semiconductor', '行业详情'],
  ['/services', '服务列表'],
  ['/services/custom-manufacturing', '服务详情'],
  ['/resources', '资源列表'],
  ['/resources/manual', '资源详情'],
  ['/news', '新闻列表'],
  ['/about', '关于'],
  ['/about/profile', '公司简介'],
  ['/careers', '职位列表'],
  ['/contact', '联系我们'],
  ['/cases', '案例'],
  ['/faqs', 'FAQ'],
];
(async () => {
  for (const [p, name] of pages) {
    try {
      const h = await (await fetch('https://www.valvetrix.com' + p, { cache: 'no-store' })).text();
      const objCnt = (h.match(/\[object Object\]/g) || []).length;
      const emptyP = (h.match(/<p[^>]*>\s*<\/p>/g) || []).length;
      const emptySpan = (h.match(/<span[^>]*>\s*<\/span>/g) || []).length;
      const undefinedCnt = (h.match(/undefined/g) || []).length;
      const code = 200;
      console.log(p, '|', name, '| [obj]:' + objCnt, '| emptyP:' + emptyP, '| emptySpan:' + emptySpan, '| undefined:' + undefinedCnt);
    } catch (e) { console.log(p, '|', name, '| ERR', e.message); }
  }
})();
