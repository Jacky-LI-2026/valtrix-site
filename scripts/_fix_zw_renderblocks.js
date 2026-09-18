const fs = require('fs');
const f = 'D:/企业网站/app/about/[section]/AboutSectionClient.tsx';
let s = fs.readFileSync(f, 'utf8');
const oldRB = `const renderBlocks = (blocks: any[]) => blocks.map((block: any, i: number) => (
                  <div key={i}>
                    <h2 className="text-2xl font-bold text-dark mb-4">{block.heading}</h2>
                    <div className="space-y-4">
                      {(block.paragraphs || []).map((p: string, j: number) => (
                        <p key={j} className="text-dark-600 leading-relaxed">{p}</p>
                      ))}
                    </div>
                  </div>
                ));`;
const newRB = `const renderBlocks = (blocks: any[]) => blocks.map((block: any, i: number) => {
                  // 兼容硬编码 fallback 结构（lib/about.ts）：heading/paragraphs + headingEn/Ja/Ko/Fr/Ar + paragraphsEn/Ja/Ko/Fr/Ar
                  const sfx = locale === "zh" ? "" : locale.charAt(0).toUpperCase() + locale.slice(1);
                  const heading = (sfx && block["heading" + sfx]) || block.heading || "";
                  const paras = (sfx && block["paragraphs" + sfx]) || block.paragraphs || [];
                  return (
                    <div key={i}>
                      <h2 className="text-2xl font-bold text-dark mb-4">{heading}</h2>
                      <div className="space-y-4">
                        {(paras || []).map((p: string, j: number) => (
                          <p key={j} className="text-dark-600 leading-relaxed">{p}</p>
                        ))}
                      </div>
                    </div>
                  );
                });`;
if (!s.includes(oldRB)) { console.log('NOT FOUND oldRB'); process.exit(1); }
s = s.replace(oldRB, newRB);
fs.writeFileSync(f, s);
console.log('renderBlocks 替换 OK');
