window.SCTXL = (() => {
  const XL = {};
  XL.esc = (s) => String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const T = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; T[n] = c >>> 0; }
  const crc = (b) => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = T[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  XL.zip = (files) => {
    const enc = new TextEncoder(), parts = [], cent = [];
    let off = 0;
    for (const [name, text] of files) {
      const nb = enc.encode(name), db = enc.encode(text), k = crc(db);
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true);
      h.setUint16(12, 0x21, true); h.setUint32(14, k, true); h.setUint32(18, db.length, true); h.setUint32(22, db.length, true);
      h.setUint16(26, nb.length, true);
      parts.push(new Uint8Array(h.buffer), nb, db);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
      c.setUint16(14, 0x21, true); c.setUint32(16, k, true); c.setUint32(20, db.length, true); c.setUint32(24, db.length, true);
      c.setUint16(28, nb.length, true); c.setUint32(42, off, true);
      cent.push(new Uint8Array(c.buffer), nb);
      off += 30 + nb.length + db.length;
    }
    const size = cent.reduce((a, p) => a + p.length, 0);
    const e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
    e.setUint32(12, size, true); e.setUint32(16, off, true);
    return new Blob([...parts, ...cent, new Uint8Array(e.buffer)]);
  };
  const FONTS = ['', '<b/>', '<color rgb="FF2C6FBF"/>', '<color rgb="FFC0392B"/>', '<color rgb="FFFFFFFF"/>', '<b/><color rgb="FF2C6FBF"/>', '<b/><color rgb="FFC0392B"/>', '<b/><color rgb="FFFFFFFF"/>', '<b/><sz val="14"/>', '<color rgb="FF6B6B6B"/>']
    .map((f) => '<font>' + f + (f.includes('<sz') ? '' : '<sz val="11"/>') + '<name val="Calibri"/></font>').join('');
  const solid = (rgb) => '<fill><patternFill patternType="solid"><fgColor rgb="' + rgb + '"/><bgColor indexed="64"/></patternFill></fill>';
  const FILLS = '<fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' + solid('FF1F5FA8') + solid('FFA32D2D') + solid('FFEDEDED');
  const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  XL.build = (rows, o) => {
    const xfs = [[0, 0, 0]], xmap = {'0-0-0': 0};
    const st = (f, fl = 0, w = 0) => { const k = f + '-' + fl + '-' + w; if (!(k in xmap)) { xmap[k] = xfs.length; xfs.push([f, fl, w]); } return xmap[k]; };
    const mark = (s) => s === 'leading' ? '*' : s === 'not_up' ? '†' : s === 'expected' ? '°' : '';
    const party = (val, prev, status, bold) => {
      const v = val || '';
      if (v !== 'Dem' && v !== 'Rep') return {v: v + mark(status), s: st(9)};
      const ch = v !== prev;
      const f = ch ? (bold ? 7 : 4) : (v === 'Dem' ? (bold ? 5 : 2) : (bold ? 6 : 3));
      return {v: v + mark(status), s: st(f, ch ? (v === 'Dem' ? 2 : 3) : 0)};
    };
    const shift = (t, n, s) => ({v: (t || '—') + (s === 'prelim' ? '*' : ''), s: st(n > 0 ? 2 : n < 0 ? 3 : 9)});
    const cols = [
      {f: 'state', w: 16, cell: (r) => {
        const t = r.trifecta;
        if (t !== 'Dem' && t !== 'Rep') return {v: r.state, s: st(0)};
        const nw = t !== r.trifecta_prev;
        return {v: r.state, s: st(nw ? 4 : (t === 'Dem' ? 2 : 3), nw ? (t === 'Dem' ? 2 : 3) : 0)};
      }},
      {f: 'gov', w: 11, cell: (r) => party(r.gov, r.gov_prev, r.gov_status, false)},
      {f: 'house', w: 12, cell: (r) => party(r.house, r.house_prev, r.house_status, r.house_sm)},
      {f: 'senate', w: 12, cell: (r) => party(r.senate, r.senate_prev, r.senate_status, r.senate_sm)},
      {f: 'house_shift', w: 13, sh: 1, cell: (r) => shift(r.house_shift, r.house_shift_n, r.house_shift_status)},
      {f: 'senate_shift', w: 13, sh: 1, cell: (r) => shift(r.senate_shift, r.senate_shift_n, r.senate_shift_status)},
      {f: 'supermaj', w: 30, sm: 1, cell: (r) => { const t = r.supermaj || 'None'; return {v: t + (r.supermaj_status === 'expected' ? '°' : ''), s: st(t === 'None' ? 9 : 0)}; }},
      {f: 'changes', w: 10, cell: (r) => ({v: Number(r.chg) || 0, num: 1, s: st(r.chg ? 0 : 9)})},
      {f: 'note', w: 90, cell: (r) => ({v: r.note || '', s: st(0, 0, 1)})},
    ].filter((c) => !(c.sh && o.hideSh) && !(c.sm && o.hideSm));
    const H = 5;
    const grid = [[{v: o.title, s: st(8)}], [{v: o.asof, s: st(9)}], [{v: o.view, s: st(0)}], [],
      cols.map((c) => ({v: o.label[c.f] || c.f, s: st(1, 4)}))];
    rows.forEach((r) => grid.push(cols.map((c) => c.cell(r))));
    grid.push([]);
    (o.key || []).forEach((k) => grid.push([{v: k, s: st(9)}]));
    const L = (i) => String.fromCharCode(65 + i), last = L(cols.length - 1), end = H + rows.length;
    let sh = HEAD + '<worksheet xmlns="' + NS + '"><sheetViews><sheetView workbookViewId="0"><pane ySplit="' + H + '" topLeftCell="A' + (H + 1) + '" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>' +
      cols.map((c, i) => '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + c.w + '" customWidth="1"/>').join('') + '</cols><sheetData>';
    grid.forEach((row, ri) => {
      sh += '<row r="' + (ri + 1) + '">';
      row.forEach((c, ci) => {
        if (!c) return;
        const ref = L(ci) + (ri + 1), s = c.s ? ' s="' + c.s + '"' : '';
        sh += c.num ? '<c r="' + ref + '"' + s + '><v>' + c.v + '</v></c>' : '<c r="' + ref + '"' + s + ' t="inlineStr"><is><t xml:space="preserve">' + XL.esc(c.v) + '</t></is></c>';
      });
      sh += '</row>';
    });
    sh += '</sheetData><autoFilter ref="A' + H + ':' + last + end + '"/></worksheet>';
    const styles = HEAD + '<styleSheet xmlns="' + NS + '"><fonts count="10">' + FONTS + '</fonts><fills count="5">' + FILLS +
      '</fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="' + xfs.length + '">' +
      xfs.map(([f, fl, w]) => '<xf numFmtId="0" fontId="' + f + '" fillId="' + fl + '" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="top"' + (w ? ' wrapText="1"' : '') + '/></xf>').join('') +
      '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
    const wb = HEAD + '<workbook xmlns="' + NS + '" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Tracker" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">Tracker!$A$' + H + ':$' + last + '$' + end + '</definedName></definedNames></workbook>';
    const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
    const PR = 'http://schemas.openxmlformats.org/package/2006/relationships';
    const CT = 'application/vnd.openxmlformats-officedocument.spreadsheetml.';
    return XL.zip([
      ['[Content_Types].xml', HEAD + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="' + CT + 'sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="' + CT + 'worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="' + CT + 'styles+xml"/></Types>'],
      ['_rels/.rels', HEAD + '<Relationships xmlns="' + PR + '"><Relationship Id="rId1" Type="' + R + '/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
      ['xl/workbook.xml', wb],
      ['xl/_rels/workbook.xml.rels', HEAD + '<Relationships xmlns="' + PR + '"><Relationship Id="rId1" Type="' + R + '/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="' + R + '/styles" Target="styles.xml"/></Relationships>'],
      ['xl/worksheets/sheet1.xml', sh],
      ['xl/styles.xml', styles],
    ]);
  };
  return XL;
})();
