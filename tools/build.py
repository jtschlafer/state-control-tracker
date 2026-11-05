#!/usr/bin/env python3
"""Build the standalone tracker page (index.html) from src/ and data/.

Usage: python3 tools/build.py
The output is one self-contained HTML file: data, styles and scripts inline,
no network requests, so it works from GitHub Pages or opened as a local file.
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
page = (ROOT / "src/page.html").read_text()
xl = (ROOT / "src/xl.js").read_text()
data = json.loads((ROOT / "data/state_control_2026.json").read_text())

THEME = """<style>
:root{--font-anthropic-sans:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;--font-anthropic-serif:Georgia,"Times New Roman",serif;
--cds-font-size-title:1.6rem;--cds-font-size-heading:1.1rem;--cds-font-size-body:.95rem;--cds-font-size-caption:.8rem;--cds-font-weight-medium:500;
--cds-gap-xs:4px;--cds-gap-sm:8px;--cds-gap-md:12px;--cds-gap-lg:20px;--cds-radius:8px;--cds-pad-md:12px;--cds-pad-lg:18px;
--color-fg:#1f1f1f;--color-fg-muted:#6b6b6b;--color-bg:#f7f7f5;--color-panel:#ffffff;--color-border-line:#e3e3df;--color-warn:#a15c00;color-scheme:light}
@media (prefers-color-scheme: dark){:root{--color-fg:#ececec;--color-fg-muted:#a3a3a3;--color-bg:#191919;--color-panel:#232323;--color-border-line:#3a3a3a;--color-warn:#e0a040;color-scheme:dark}}
html,body{margin:0;background:var(--color-bg);color:var(--color-fg)}
.sct-page{max-width:1400px;margin:0 auto;padding:24px 20px 40px}
.sct-foot{font-family:var(--font-anthropic-sans);font-size:var(--cds-font-size-caption);color:var(--color-fg-muted);margin-top:var(--cds-gap-lg)}
</style>"""

SHIM = """<script>
window.dash = (() => {
  const DATA = {states: __DATA__};
  const calcs = {}, draws = {}, cache = {};
  const data = (id) => {
    if (DATA[id]) return {status: 'ok', data: DATA[id], columns: Object.keys(DATA[id][0] || {}), meta: []};
    const c = calcs[id];
    if (c) {
      if (!(id in cache)) cache[id] = c.fn(...c.inputs.map((i) => data(i).data));
      return {status: 'ok', data: cache[id], meta: []};
    }
    return {status: 'missing', data: [], meta: []};
  };
  const run = (name) => document.querySelectorAll('[data-draw="' + name + '"]').forEach((el) => draws[name](el));
  return {
    data,
    calc: (id, o) => { calcs[id] = o; },
    draw: (name, fn) => { if (typeof fn === 'function') draws[name] = fn; else if (draws[name]) run(name); },
    onData: (fn) => fn(),
    _runAll: () => Object.keys(draws).forEach(run),
  };
})();
</script>""".replace("__DATA__", json.dumps(data, ensure_ascii=False).replace("</", "<\\/"))

body = page.replace('<meta name="dash-one-writer">\n', "")
body = body.replace('<script src="xl.js"></script>', "<script>\n" + xl + "</script>")
assert "<script>\n" + xl in body, "xl.js was not inlined"
# run every drawing once, at the end of the page's own script
last = body.rfind("</script>")
body = body[:last] + "dash._runAll();\n" + body[last:]

FOOT = ('<p class="sct-foot">Unofficial results compiled from AP and network projections and state news outlets; '
        'every figure can change until certification. Shared as a snapshot: the time at the top says how current it is.</p>')
body = body.replace("\n</section>\n</div>\n", "\n</section>\n" + FOOT + "\n</div>\n", 1)

html = ("<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n"
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n"
        "<title>2026 state government control tracker</title>\n" + THEME + "\n" + SHIM +
        "\n</head>\n<body>\n<div class=\"sct-page\">\n" + body + "</div>\n</body>\n</html>\n")
(ROOT / "index.html").write_text(html)
print("wrote index.html", len(html), "bytes,", len(data), "states")
