const fs = require('fs');
const R = 'D:/阀门网站/';
const f = 'app/contact/page.tsx';
let s = fs.readFileSync(R + f, 'utf8');
const oldStr = `                        <div className="text-dark font-medium">
                          {/^[+\\d][\\d\\s\\-()]*$/.test(String(item.value)) ? (
                            <span dir="ltr" className="inline-block">{item.value}</span>
                          ) : (
                            item.value
                          )}
                        </div>`;
const newStr = `                        {item.value && item.value !== item.label ? (
                          <div className="text-dark font-medium">
                            {/^[+\\d][\\d\\s\\-()]*$/.test(String(item.value)) ? (
                              <span dir="ltr" className="inline-block">{item.value}</span>
                            ) : (
                              item.value
                            )}
                          </div>
                        ) : null}`;
if (!s.includes(oldStr)) { console.log('MISS'); process.exit(1); }
s = s.replace(oldStr, newStr);
fs.writeFileSync(R + f, s);
console.log('contact value 去重 OK');
