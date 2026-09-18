/**
 * VALTRIX 六语种数据补译脚本（DeepSeek AI 通道）
 * 覆盖 5 类数据：jobs / services.process / home_config.banners / products(fittings featuresAr) / industries+news(zh 恢复+重译)
 * 用法: node scripts/fix-multilang-data-20260909.js
 */
const { PrismaClient } = require('D:/阀门网站/lib/generated/prisma');
const prisma = new PrismaClient();

const API_KEY = 'sk-3bc3a3f0c06b476fa6fcc9b82c817fa8';
const BASE = 'https://api.deepseek.com/v1/chat/completions';
const MODEL = 'deepseek-chat';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const LANG_META = {
  zh: { name: '简体中文', suffix: '' },
  en: { name: '英语', suffix: 'En' },
  ja: { name: '日语（使用日语汉字，如 製品/技術/製造）', suffix: 'Ja' },
  ko: { name: '韩语（标准韩语）', suffix: 'Ko' },
  fr: { name: '法语', suffix: 'Fr' },
  ar: { name: '阿拉伯语', suffix: 'Ar' },
};

const SYSTEM_PROMPT = `你是专业的技术翻译，擅长工业阀门/超高纯流体控制领域。将用户提供的JSON对象中的所有文本值翻译为目标语言。
要求：
1. 保持JSON键结构完全不变，只翻译值；返回合法的JSON对象（不要markdown代码块、不要多余文字）
2. 专业术语对照：diaphragm valve=隔膜阀, pressure reducer=减压阀, VCR fitting=VCR接头/面密封接头, filter=过滤器, check valve=单向阀, ball valve=球阀, butterfly valve=蝶阀, gate valve=闸阀, fitting=接头, gasket=垫片, weld=焊接, flange=法兰, bellows=波纹管, needle valve=针阀
3. 公司名 VALTRIX 与产品型号/代号（316L、VCR、DV、PRE、CV、FT、GN、GJ、GJS、GG、IE、IT、IC、BE、BT、ID、IV、OJ、OR、CF、GP、HP、UHP、Ra、ISO 等）一律保留原文不翻译
4. "系列"：日=シリーズ, 韩=시리즈, 法=série, 阿=سلسلة
5. 数字、单位、规格（如 1/4"、12-20K、3-5年、Ra5μin、ISO Class 4/5、100%、1x10-9、stdcm³/s）保留原文，仅翻译自然语言部分
6. 若文本含HTML标签（如<p>、<strong>、<br>），必须原样保留标签，只翻译标签内的文字
7. 人名/地名按目标语言习惯翻译（温州=Wenzhou 等）`;

async function deepseekTranslate(segments, targetLang) {
  // segments: {key: text} -> 返回 {key: translatedText}
  const payload = {};
  for (const k of Object.keys(segments)) {
    const v = segments[k];
    if (v !== null && v !== undefined && String(v).trim() !== '') {
      payload[k] = String(v);
    }
  }
  const keys = Object.keys(payload);
  if (keys.length === 0) return {};
  const langName = LANG_META[targetLang].name;

  const body = {
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `将以下JSON对象中的文本值翻译为${langName}，返回与输入完全相同的键结构、只有值被翻译的JSON对象：\n${JSON.stringify(payload)}` },
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' },
  };

  let lastErr = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const c = new AbortController();
    const timer = setTimeout(() => c.abort(), 90000);
    try {
      const r = await fetch(BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
        body: JSON.stringify(body),
        signal: c.signal,
      });
      clearTimeout(timer);
      if (!r.ok) {
        const errText = await r.text();
        lastErr = `HTTP ${r.status}: ${errText.slice(0, 200)}`;
        await sleep(2000 * (attempt + 1));
        continue;
      }
      const data = await r.json();
      const content = data.choices?.[0]?.message?.content || '';
      let parsed = null;
      try {
        parsed = JSON.parse(content);
      } catch (e) {
        // 尝试提取 ```json ... ```
        const m = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (m) {
          try { parsed = JSON.parse(m[1]); } catch (e2) { /* ignore */ }
        }
      }
      if (!parsed || typeof parsed !== 'object') {
        lastErr = `JSON parse failed: ${content.slice(0, 150)}`;
        await sleep(1500);
        continue;
      }
      // 校验键完整性：缺失键用原文补齐
      for (const k of keys) {
        if (!(k in parsed) || parsed[k] === null || parsed[k] === undefined || String(parsed[k]).trim() === '') {
          parsed[k] = payload[k];
        }
      }
      return parsed;
    } catch (e) {
      clearTimeout(timer);
      lastErr = e.message;
      await sleep(2000 * (attempt + 1));
    }
  }
  console.warn(`  [deepseek] 翻译失败 (${targetLang}): ${lastErr}`);
  return null;
}

// ================= 通用工具 =================
// 将数组逐项翻译为对象再还原数组
async function translateArrayItems(arr, targetLang) {
  if (!Array.isArray(arr) || arr.length === 0) return arr;
  const seg = {};
  arr.forEach((item, i) => { seg['k' + i] = item; });
  const res = await deepseekTranslate(seg, targetLang);
  if (!res) return null;
  return arr.map((item, i) => (res['k' + i] !== undefined ? res['k' + i] : item));
}

// 将对象数组（如 [{title,desc}]）逐项翻译
async function translateObjectArray(arr, targetLang, fields) {
  if (!Array.isArray(arr) || arr.length === 0) return arr;
  const seg = {};
  arr.forEach((item, i) => {
    for (const f of fields) {
      if (item[f] && String(item[f]).trim() !== '') seg[`${i}_${f}`] = String(item[f]);
    }
  });
  const res = await deepseekTranslate(seg, targetLang);
  if (!res) return null;
  return arr.map((item, i) => {
    const out = { ...item };
    for (const f of fields) {
      const v = res[`${i}_${f}`];
      if (v !== undefined && String(v).trim() !== '') out[f] = v;
    }
    return out;
  });
}

// ================= 1. jobs =================
async function fixJobs() {
  console.log('\n===== [1/5] jobs 六语种补全 =====');
  const jobs = await prisma.job.findMany({ orderBy: { id: 'asc' } });
  let totalWritten = 0;
  for (const job of jobs) {
    for (const lang of ['ja', 'ko', 'fr', 'ar']) {
      const sfx = LANG_META[lang].suffix;
      // 标量字段
      const scalarSeg = {};
      const scalarFields = ['title', 'department', 'location', 'type', 'salary', 'experience', 'education'];
      for (const f of scalarFields) {
        const src = job[f];
        if (src && String(src).trim() !== '') scalarSeg[f] = String(src);
      }
      // 数组字段（jsonb）
      const arrFields = ['tags', 'description', 'responsibilities', 'requirements', 'benefits'];
      const arrSeg = {};
      for (const f of arrFields) {
        const v = job[f];
        if (v === null || v === undefined) continue;
        if (Array.isArray(v)) {
          v.forEach((item, i) => {
            if (item && String(item).trim() !== '') arrSeg[`${f}[${i}]`] = String(item);
          });
        } else if (typeof v === 'string' || typeof v === 'object') {
          const s = typeof v === 'string' ? v : JSON.stringify(v);
          if (s && s.trim() !== '') arrSeg[f] = s;
        }
      }

      const resScalar = await deepseekTranslate(scalarSeg, lang);
      const resArr = await deepseekTranslate(arrSeg, lang);

      const data = {};
      if (resScalar) {
        for (const f of scalarFields) {
          const v = resScalar[f];
          if (v !== undefined && String(v).trim() !== '') data[f + sfx] = v;
        }
      }
      if (resArr) {
        for (const f of arrFields) {
          const src = job[f];
          if (src === null || src === undefined) continue;
          if (Array.isArray(src)) {
            const outArr = src.map((item, i) => {
              const v = resArr[`${f}[${i}]`];
              return v !== undefined && String(v).trim() !== '' ? v : item;
            });
            data[f + sfx] = outArr;
          } else if (typeof src === 'string') {
            const v = resArr[f];
            if (v !== undefined && String(v).trim() !== '') data[f + sfx] = v;
          } else {
            // 对象类型（罕见）保持 JSON 字符串
            const v = resArr[f];
            if (v !== undefined && String(v).trim() !== '') data[f + sfx] = v;
          }
        }
      }
      if (Object.keys(data).length > 0) {
        await prisma.job.update({ where: { id: job.id }, data });
        totalWritten++;
        console.log(`  job#${job.id} ${job.slug} -> ${lang} 已写入 ${Object.keys(data).length} 个字段`);
      }
    }
  }
  // 验证
  const verify = await prisma.job.findMany({ orderBy: { id: 'asc' } });
  let empty = 0;
  for (const j of verify) {
    for (const lang of ['ja', 'ko', 'fr', 'ar']) {
      const sfx = LANG_META[lang].suffix;
      if (!j['title' + sfx]) { empty++; console.log(`  [验证失败] job#${j.id} title${sfx} 为空`); }
    }
  }
  console.log(`  jobs 验证完成：${verify.length} 条，空字段 ${empty}`);
  return totalWritten;
}

// ================= 2. services.process =================
async function fixServices() {
  console.log('\n===== [2/5] services.process 六语种补全 =====');
  const services = await prisma.service.findMany({ orderBy: { id: 'asc' } });
  let totalWritten = 0;
  for (const svc of services) {
    const process = Array.isArray(svc.process) ? svc.process : [];
    if (process.length === 0) continue;
    const newProcess = [...process];
    for (const lang of ['ja', 'ko', 'fr', 'ar']) {
      const sfx = LANG_META[lang].suffix;
      // 翻译每项 title/desc
      const seg = {};
      newProcess.forEach((step, i) => {
        if (step.title && String(step.title).trim() !== '') seg[`${i}_title`] = String(step.title);
        if (step.desc && String(step.desc).trim() !== '') seg[`${i}_desc`] = String(step.desc);
      });
      const res = await deepseekTranslate(seg, lang);
      if (!res) { console.log(`  service#${svc.id} ${svc.slug} -> ${lang} 翻译失败，跳过`); continue; }
      newProcess.forEach((step, i) => {
        const t = res[`${i}_title`];
        const d = res[`${i}_desc`];
        if (t !== undefined && String(t).trim() !== '') step['title' + sfx] = t;
        if (d !== undefined && String(d).trim() !== '') step['desc' + sfx] = d;
      });
    }
    // 写回 process + processXxx 列
    const data = { process: newProcess };
    for (const lang of ['ja', 'ko', 'fr', 'ar']) {
      const sfx = LANG_META[lang].suffix;
      const colArr = newProcess.map((step) => ({
        title: step['title' + sfx] || step.title || '',
        desc: step['desc' + sfx] || step.desc || '',
      }));
      data['process' + sfx] = colArr;
    }
    await prisma.service.update({ where: { id: svc.id }, data });
    totalWritten++;
    console.log(`  service#${svc.id} ${svc.slug} 已写入 4 语种 process（每项含 titleXxx/descXxx）`);
  }
  // 验证
  const verify = await prisma.service.findMany({ orderBy: { id: 'asc' } });
  let empty = 0;
  for (const s of verify) {
    const proc = Array.isArray(s.process) ? s.process : [];
    for (const lang of ['ja', 'ko', 'fr', 'ar']) {
      const sfx = LANG_META[lang].suffix;
      const col = s['process' + sfx];
      if (!Array.isArray(col) || col.length === 0 || proc.some((p) => !p['title' + sfx])) {
        empty++;
        console.log(`  [验证失败] service#${s.id} ${s.slug} process${sfx} 不完整`);
      }
    }
  }
  console.log(`  services 验证完成：${verify.length} 条，问题字段 ${empty}`);
  return totalWritten;
}

// ================= 3. home_config banners =================
async function fixBanners() {
  console.log('\n===== [3/5] home_config banners 六语种补全 =====');
  const hc = await prisma.homeConfig.findFirst({ where: { id: 1 } });
  if (!hc || !Array.isArray(hc.banners)) { console.log('  home_config id=1 无 banners'); return 0; }
  const banners = JSON.parse(JSON.stringify(hc.banners));
  const textFields = ['badge', 'title', 'subtitle', 'ctaText', 'description'];
  let totalWritten = 0;
  for (const lang of ['zh', 'ja', 'ko', 'fr', 'ar']) {
    // 对每个 banner 的每个文本字段，源 = 现有 en 值（若 en 为空则用其他非空语种值）
    const seg = {};
    banners.forEach((b, bi) => {
      for (const f of textFields) {
        const obj = b[f];
        if (!obj || typeof obj !== 'object') continue;
        const src = obj.en || obj.zh || obj.ja || obj.ko || obj.fr || obj.ar;
        if (src && String(src).trim() !== '') seg[`${bi}_${f}`] = String(src);
      }
    });
    const res = await deepseekTranslate(seg, lang);
    if (!res) { console.log(`  banners -> ${lang} 翻译失败，跳过`); continue; }
    banners.forEach((b, bi) => {
      for (const f of textFields) {
        const obj = b[f];
        if (!obj || typeof obj !== 'object') continue;
        const v = res[`${bi}_${f}`];
        if (v !== undefined && String(v).trim() !== '') obj[lang] = v;
      }
    });
    totalWritten++;
    console.log(`  banners -> ${lang} 已写入（${banners.length} 个 banner × ${textFields.length} 字段）`);
  }
  await prisma.homeConfig.update({ where: { id: 1 }, data: { banners } });
  // 验证
  const verify = await prisma.homeConfig.findFirst({ where: { id: 1 } });
  let empty = 0;
  for (const b of verify.banners) {
    for (const f of textFields) {
      const obj = b[f];
      if (!obj || typeof obj !== 'object') continue;
      for (const lang of ['zh', 'en', 'ja', 'ko', 'fr', 'ar']) {
        if (!obj[lang] || String(obj[lang]).trim() === '') {
          empty++;
          console.log(`  [验证失败] banner ${b.id} ${f}.${lang} 为空`);
        }
      }
    }
  }
  console.log(`  banners 验证完成：${verify.banners.length} 个 banner，空槽位 ${empty}`);
  return totalWritten;
}

// ================= 4. products (fittings featuresAr) =================
async function fixProducts() {
  console.log('\n===== [4/5] products fittings 类 featuresAr 补全 =====');
  // 任务点名的 fittings 产品（vcr-fittings + welded-fittings tab），当前 name/summary/description/subtitle 已全，
  // 仅 id 9-16 的 featuresAr 为空。这里做完整性兜底：全部 fittings 产品若有任何语种空缺则补。
  const tabs = await prisma.productTab.findMany({ where: { slug: { in: ['vcr-fittings', 'welded-fittings'] } } });
  const tabIds = tabs.map((t) => t.id);
  const products = await prisma.product.findMany({ where: { tabId: { in: tabIds } }, orderBy: { id: 'asc' } });
  console.log(`  fittings 类产品 ${products.length} 个`);
  let totalWritten = 0;
  for (const p of products) {
    // 补 featuresAr（若空）
    if ((!p.featuresAr || p.featuresAr.length === 0) && Array.isArray(p.features) && p.features.length > 0) {
      const translated = await translateArrayItems(p.features, 'ar');
      if (translated) {
        await prisma.product.update({ where: { id: p.id }, data: { featuresAr: translated } });
        totalWritten++;
        console.log(`  product#${p.id} ${p.slug} featuresAr 已写入 ${translated.length} 项`);
      } else {
        console.log(`  product#${p.id} ${p.slug} featuresAr 翻译失败`);
      }
    }
    // 兜底：name/summary/description 若低语种缺失则补（当前全齐，一般不触发）
    for (const lang of ['ja', 'ko', 'fr', 'ar']) {
      const sfx = LANG_META[lang].suffix;
      const need = {};
      if ((!p['name' + sfx] || !String(p['name' + sfx]).trim()) && p.name) need.name = p.name;
      if ((!p['summary' + sfx] || !String(p['summary' + sfx]).trim()) && p.summary) need.summary = p.summary;
      if ((!p['description' + sfx] || !String(p['description' + sfx]).trim()) && p.description) need.description = p.description;
      if (Object.keys(need).length > 0) {
        const res = await deepseekTranslate(need, lang);
        if (res) {
          const data = {};
          for (const f of Object.keys(need)) {
            if (res[f] !== undefined && String(res[f]).trim() !== '') data[f + sfx] = res[f];
          }
          if (Object.keys(data).length > 0) {
            await prisma.product.update({ where: { id: p.id }, data });
            totalWritten++;
            console.log(`  product#${p.id} ${p.slug} -> ${lang} 兜底补全 ${Object.keys(data).length} 字段`);
          }
        }
      }
    }
  }
  // 验证
  const verify = await prisma.product.findMany({ where: { tabId: { in: tabIds } }, orderBy: { id: 'asc' } });
  let empty = 0;
  for (const p of verify) {
    if (!Array.isArray(p.featuresAr) || p.featuresAr.length === 0) { empty++; console.log(`  [验证失败] product#${p.id} featuresAr 为空`); }
    for (const lang of ['ja', 'ko', 'fr', 'ar']) {
      const sfx = LANG_META[lang].suffix;
      if (!p['name' + sfx] || !String(p['name' + sfx]).trim()) { empty++; console.log(`  [验证失败] product#${p.id} name${sfx} 为空`); }
      if (!p['summary' + sfx] || !String(p['summary' + sfx]).trim()) { empty++; console.log(`  [验证失败] product#${p.id} summary${sfx} 为空`); }
      if (!p['description' + sfx] || !String(p['description' + sfx]).trim()) { empty++; console.log(`  [验证失败] product#${p.id} description${sfx} 为空`); }
    }
  }
  console.log(`  products 验证完成：${verify.length} 个，空字段 ${empty}`);
  return totalWritten;
}

// ================= 5. industries + news（zh 恢复 + 重译） =================
// 先英->中写入 zh 基础字段，再以中文为源翻译 ja/ko/fr/ar（en 保留）
async function translateIndustryRow(ind) {
  const sfxAll = ['', 'Ja', 'Ko', 'Fr', 'Ar'];
  // 1) 英->中：源取现有 en 字段（若 en 缺失则跳过）
  const zhSource = {};
  const scalarZhFields = ['name', 'tagline', 'description'];
  for (const f of scalarZhFields) {
    const src = ind[f + 'En'] || ind[f];
    if (src && String(src).trim() !== '') zhSource[f] = String(src);
  }
  // jsonb 数组字段
  const arrZhFields = ['challenges', 'solutions', 'products', 'cases'];
  const jsonSeg = {};
  for (const f of arrZhFields) {
    const v = ind[f];
    if (!v) continue;
    const list = Array.isArray(v) ? v : [v];
    list.forEach((item, i) => {
      if (typeof item === 'string') {
        if (item.trim() !== '') jsonSeg[`${f}[${i}]`] = item;
      } else if (item && typeof item === 'object') {
        for (const k of ['title', 'desc']) {
          if (item[k] && String(item[k]).trim() !== '') jsonSeg[`${f}[${i}].${k}`] = String(item[k]);
        }
      }
    });
  }
  const resZh = await deepseekTranslate({ ...zhSource, ...jsonSeg }, 'zh');
  if (!resZh) { console.log(`  industry#${ind.id} ${ind.slug} 英->中失败`); return 0; }

  // 组装中文版基础字段
  const zhData = {};
  for (const f of scalarZhFields) {
    if (resZh[f] !== undefined && String(resZh[f]).trim() !== '') zhData[f] = resZh[f];
  }
  for (const f of arrZhFields) {
    const src = ind[f];
    if (!src) continue;
    const list = Array.isArray(src) ? src : [src];
    const out = list.map((item, i) => {
      if (typeof item === 'string') return resZh[`${f}[${i}]`] || item;
      const o = { ...item };
      for (const k of ['title', 'desc']) {
        const v = resZh[`${f}[${i}].${k}`];
        if (v !== undefined && String(v).trim() !== '') o[k] = v;
      }
      return o;
    });
    zhData[f] = out;
  }
  await prisma.industry.update({ where: { id: ind.id }, data: zhData });
  console.log(`  industry#${ind.id} ${ind.slug} zh 基础字段已恢复中文（${Object.keys(zhData).length} 字段）`);

  // 2) 中->ja/ko/fr/ar（以新中文为源，覆盖旧值）
  let written = 1;
  for (const lang of ['ja', 'ko', 'fr', 'ar']) {
    const sfx = LANG_META[lang].suffix;
    const seg = {};
    for (const f of scalarZhFields) {
      const src = zhData[f];
      if (src && String(src).trim() !== '') seg[f] = String(src);
    }
    for (const f of arrZhFields) {
      const list = zhData[f];
      if (!Array.isArray(list)) continue;
      list.forEach((item, i) => {
        if (typeof item === 'string') {
          if (item.trim() !== '') seg[`${f}[${i}]`] = item;
        } else if (item && typeof item === 'object') {
          for (const k of ['title', 'desc']) {
            if (item[k] && String(item[k]).trim() !== '') seg[`${f}[${i}].${k}`] = String(item[k]);
          }
        }
      });
    }
    const res = await deepseekTranslate(seg, lang);
    if (!res) { console.log(`  industry#${ind.id} ${ind.slug} -> ${lang} 失败`); continue; }
    const data = {};
    for (const f of scalarZhFields) {
      const v = res[f];
      if (v !== undefined && String(v).trim() !== '') data[f + sfx] = v;
    }
    for (const f of arrZhFields) {
      const list = zhData[f];
      if (!Array.isArray(list)) continue;
      const out = list.map((item, i) => {
        if (typeof item === 'string') return res[`${f}[${i}]`] || item;
        const o = { ...item };
        for (const k of ['title', 'desc']) {
          const v = res[`${f}[${i}].${k}`];
          if (v !== undefined && String(v).trim() !== '') o[k] = v;
        }
        return o;
      });
      data[f + sfx] = out;
    }
    if (Object.keys(data).length > 0) {
      await prisma.industry.update({ where: { id: ind.id }, data });
      written++;
      console.log(`  industry#${ind.id} ${ind.slug} -> ${lang} 已写入 ${Object.keys(data).length} 字段`);
    }
  }
  return written;
}

async function translateNewsRow(n) {
  // 1) 英->中：title/summary/content
  const seg = {};
  if (n.titleEn || n.title) seg.title = String(n.titleEn || n.title);
  if (n.summaryEn || n.summary) seg.summary = String(n.summaryEn || n.summary);
  if (n.contentEn || n.content) seg.content = String(n.contentEn || n.content);
  const resZh = await deepseekTranslate(seg, 'zh');
  if (!resZh) { console.log(`  news#${n.id} ${n.slug} 英->中失败`); return 0; }
  const zhData = {};
  if (resZh.title !== undefined && String(resZh.title).trim() !== '') zhData.title = resZh.title;
  if (resZh.summary !== undefined && String(resZh.summary).trim() !== '') zhData.summary = resZh.summary;
  if (resZh.content !== undefined && String(resZh.content).trim() !== '') zhData.content = resZh.content;
  await prisma.news.update({ where: { id: n.id }, data: zhData });
  console.log(`  news#${n.id} ${n.slug} zh 基础字段已恢复中文（${Object.keys(zhData).length} 字段）`);

  // 2) 中->ja/ko/fr/ar
  let written = 1;
  for (const lang of ['ja', 'ko', 'fr', 'ar']) {
    const sfx = LANG_META[lang].suffix;
    const s2 = {};
    for (const f of ['title', 'summary', 'content']) {
      const src = zhData[f];
      if (src && String(src).trim() !== '') s2[f] = String(src);
    }
    const res = await deepseekTranslate(s2, lang);
    if (!res) { console.log(`  news#${n.id} ${n.slug} -> ${lang} 失败`); continue; }
    const data = {};
    for (const f of ['title', 'summary', 'content']) {
      const v = res[f];
      if (v !== undefined && String(v).trim() !== '') data[f + sfx] = v;
    }
    if (Object.keys(data).length > 0) {
      await prisma.news.update({ where: { id: n.id }, data });
      written++;
      console.log(`  news#${n.id} ${n.slug} -> ${lang} 已写入 ${Object.keys(data).length} 字段`);
    }
  }
  return written;
}

async function fixIndustriesNews() {
  console.log('\n===== [5/5] industries + news zh 恢复 & 重译 =====');
  const industries = await prisma.industry.findMany({ orderBy: { id: 'asc' } });
  let iWritten = 0;
  for (const ind of industries) {
    iWritten += await translateIndustryRow(ind);
  }
  const newsList = await prisma.news.findMany({ orderBy: { id: 'asc' } });
  let nWritten = 0;
  for (const n of newsList) {
    nWritten += await translateNewsRow(n);
  }
  // 验证
  const iv = await prisma.industry.findMany({ orderBy: { id: 'asc' } });
  let iEmpty = 0;
  for (const ind of iv) {
    // zh 基础字段必须是中文（含 CJK）
    const isCJK = (s) => /[\u4e00-\u9fff]/.test(String(s || ''));
    if (!isCJK(ind.name)) { iEmpty++; console.log(`  [验证失败] industry#${ind.id} name(zh) 非中文: ${String(ind.name).slice(0, 40)}`); }
    for (const lang of ['ja', 'ko', 'fr', 'ar']) {
      const sfx = LANG_META[lang].suffix;
      if (!ind['name' + sfx] || !String(ind['name' + sfx]).trim()) { iEmpty++; console.log(`  [验证失败] industry#${ind.id} name${sfx} 为空`); }
      if (!ind['description' + sfx] || !String(ind['description' + sfx]).trim()) { iEmpty++; console.log(`  [验证失败] industry#${ind.id} description${sfx} 为空`); }
      if (!Array.isArray(ind['challenges' + sfx]) || ind['challenges' + sfx].length === 0) { iEmpty++; console.log(`  [验证失败] industry#${ind.id} challenges${sfx} 为空`); }
    }
  }
  console.log(`  industries 验证完成：${iv.length} 条，问题 ${iEmpty}`);
  const nv = await prisma.news.findMany({ orderBy: { id: 'asc' } });
  let nEmpty = 0;
  for (const n of nv) {
    if (!/[\u4e00-\u9fff]/.test(String(n.title || ''))) { nEmpty++; console.log(`  [验证失败] news#${n.id} title(zh) 非中文: ${String(n.title).slice(0, 40)}`); }
    for (const lang of ['ja', 'ko', 'fr', 'ar']) {
      const sfx = LANG_META[lang].suffix;
      if (!n['title' + sfx] || !String(n['title' + sfx]).trim()) { nEmpty++; console.log(`  [验证失败] news#${n.id} title${sfx} 为空`); }
      if (!n['summary' + sfx] || !String(n['summary' + sfx]).trim()) { nEmpty++; console.log(`  [验证失败] news#${n.id} summary${sfx} 为空`); }
      if (!n['content' + sfx] || !String(n['content' + sfx]).trim()) { nEmpty++; console.log(`  [验证失败] news#${n.id} content${sfx} 为空`); }
    }
  }
  console.log(`  news 验证完成：${nv.length} 条，问题 ${nEmpty}`);
  return iWritten + nWritten;
}

// ================= main =================
(async () => {
  const start = Date.now();
  const report = {};
  try {
    report.jobs = await fixJobs();
    report.services = await fixServices();
    report.banners = await fixBanners();
    report.products = await fixProducts();
    report.industriesNews = await fixIndustriesNews();
  } catch (e) {
    console.error('脚本异常:', e);
  } finally {
    await prisma.$disconnect();
  }
  console.log('\n========== 翻译完成汇总 ==========');
  console.log(JSON.stringify(report, null, 2));
  console.log('耗时', ((Date.now() - start) / 1000).toFixed(1), 's');
})();
