// Maps times of an OLD timeline to the CURRENT one, through the source media of the dialogue audio (the user often
// re-cuts/reorders after captions or animations were made). A time maps if the same media frame is still in the edit.
// Usage: node remap.mjs <dump-old.json> <dump-agora.json> <in> <out>
//   <in> .srt  -> remapped .srt (captions whose start or end fell out of the edit are dropped and listed)
//   <in> .json -> spec.json of animacoes-texto: items[].start/dur remapped (items that fell out are dropped)
import fs from 'node:fs';

const [oldP, nowP, inP, outP] = process.argv.slice(2);
const rd = (f) => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, ''));
const oldD = rd(oldP), nowD = rd(nowP);
// by file name: the user moves/relinks the media folders between versions of the edit
const key = (m) => m.replace(/\\/g, '/').split('/').pop().toLowerCase();

// old time -> (media, source time) -> new time; eps lets a time on a cut belong to either side
function map(t, eps = 0.02) {
  const c = oldD.audio.find((a) => t >= a.start - eps && t <= a.end + eps);
  if (!c) return null;
  const src = c.in + (t - c.start);
  const n = nowD.audio.find((a) => key(a.media) === key(c.media) && src >= a.in - eps && src <= a.in + (a.end - a.start) + eps);
  return n ? n.start + (src - n.in) : null;
}
// an interval maps only if both ends land in the same new place (start/end move together)
function mapRange(s, e) {
  const ns = map(s), ne = map(e);
  if (ns == null || ne == null || ne <= ns || Math.abs((ne - ns) - (e - s)) > 0.05) return null;
  return [ns, ne];
}
const fmt = (t) => {
  const ms = Math.round(t * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`;
};
const parse = (x) => { const [h, m, s] = x.trim().replace(',', '.').split(':'); return +h * 3600 + +m * 60 + +s; };

if (inP.toLowerCase().endsWith('.srt')) {
  const blocks = fs.readFileSync(inP, 'utf8').replace(/^﻿/, '').trim().split(/\r?\n\r?\n/);
  const kept = [], lost = [];
  for (const b of blocks) {
    const l = b.split(/\r?\n/), [a, z] = l[1].split('-->').map(parse), r = mapRange(a, z);
    if (r) kept.push({s: r[0], e: r[1], text: l.slice(2)}); else lost.push(`${a.toFixed(2)}-${z.toFixed(2)} ${l.slice(2).join(' ').replace(/<[^>]+>/g, '')}`);
  }
  kept.sort((p, q) => p.s - q.s);
  fs.writeFileSync(outP, kept.map((k, i) => `${i + 1}\r\n${fmt(k.s)} --> ${fmt(k.e)}\r\n${k.text.join('\r\n')}`).join('\r\n\r\n') + '\r\n');
  console.log(`legendas: ${kept.length} mantidas, ${lost.length} fora da edição atual`);
  lost.forEach((x) => console.log('  fora: ' + x));
} else {
  const spec = rd(inP), items = [];
  for (const it of spec.items) {
    const r = mapRange(it.start, it.start + it.dur);
    if (r) items.push({...it, start: +r[0].toFixed(3), dur: +(r[1] - r[0]).toFixed(3), oldStart: it.oldStart ?? it.start});
    else console.log(`  fora da edição atual: ${it.id} (${it.start})`);
  }
  fs.writeFileSync(outP, JSON.stringify({...spec, items}, null, 1));
  items.forEach((it) => console.log(`${it.id}: ${it.oldStart} -> ${it.start} (${it.dur}s)`));
}
