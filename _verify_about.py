import urllib.request, json
req = urllib.request.Request("https://valvetrix.com/api/public/about")
with urllib.request.urlopen(req, timeout=15) as r:
    d = json.loads(r.read().decode('utf-8'))
data = d if isinstance(d, list) else d.get('data', d)
if isinstance(data, list):
    for item in data[:4]:
        print(f"id={item.get('id')} slug={item.get('slug')} title={item.get('title')}")
        c = item.get('content', [])
        if isinstance(c, list) and c:
            paras = c[0].get('paragraphs', [])
            print(f"  heading: {c[0].get('heading','')}")
            if paras:
                print(f"  para1: {paras[0][:120]}")
else:
    print(json.dumps(data, ensure_ascii=False)[:500])
