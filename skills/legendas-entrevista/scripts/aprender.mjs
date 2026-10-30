// Compara a legenda final do usuário com a do Premiere / do agente / do Whisper e gera um relatório do estilo dele.
// node aprender.mjs --final <srt> [--premiere <srt>] [--agente <srt>] [--words words.csv] [--dump dump.json] --out <pasta>
// Saída: <pasta>/relatorio.md (números + trocas de texto) e <pasta>/lado-a-lado.txt (cada legenda final x Premiere).
import fs from 'node:fs';
import path from 'node:path';

const args = {};
for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
if (!args.final || !args.out) { console.error('uso: --final <srt> --out <pasta> [--premiere] [--agente] [--words] [--dump]'); process.exit(1); }
fs.mkdirSync(args.out, { recursive: true });

// ---------- leitura
const read = p => fs.readFileSync(p, 'utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n');
const toSec = tc => { const [h, m, s, ms] = tc.trim().split(/[:,.]/).map(Number); return h * 3600 + m * 60 + s + ms / 1000; };
const tc = x => { const ms = Math.round(x * 1000); const p = (n, w = 2) => String(n).padStart(w, '0'); return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`; };
function parseSrt(p) {
  return read(p).trim().split(/\n\s*\n/).map(b => {
    const L = b.split('\n'); const t = L[1].split(' --> ');
    const raw = L.slice(2).join('\n');
    const color = (raw.match(/<font color=(#[0-9A-Fa-f]{6,8})/) || [])[1]?.toUpperCase() || null;
    const text = raw.replace(/<\/?font[^>]*>/g, '').trim();
    return { s: toSec(t[0]), e: toSec(t[1]), text, color, lines: text.split('\n').length };
  });
}
const norm = w => w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9$%]/g, '');
// tokens: {raw, n, cap} — "R$15" e "15000 R$" viram tokens separados para alinhar bem
function tokens(caps) {
  const out = [];
  caps.forEach((c, ci) => c.text.split(/\s+/).filter(Boolean).forEach((raw, k) => {
    const parts = raw.split(/(R\$)/).filter(Boolean);
    parts.forEach(pt => { const n = norm(pt); if (n) out.push({ raw: pt, n, cap: ci, first: k === 0 }); });
  }));
  return out;
}

// ---------- alinhamento (edit distance) -> lista de operações
function align(a, b) {
  const n = a.length, m = b.length, W = m + 1, d = new Int32Array((n + 1) * W);
  for (let i = 0; i <= n; i++) d[i * W] = i; for (let j = 0; j <= m; j++) d[j] = j;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
    const c = a[i - 1].n === b[j - 1].n ? 0 : 1;
    d[i * W + j] = Math.min(d[(i - 1) * W + j] + 1, d[i * W + j - 1] + 1, d[(i - 1) * W + j - 1] + c);
  }
  const ops = []; let i = n, j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && d[i * W + j] === d[(i - 1) * W + j - 1] + (a[i - 1].n === b[j - 1].n ? 0 : 1)) { ops.push([i - 1, j - 1]); i--; j--; }
    else if (i > 0 && d[i * W + j] === d[(i - 1) * W + j] + 1) { ops.push([i - 1, -1]); i--; }
    else { ops.push([-1, j - 1]); j--; }
  }
  return ops.reverse();
}
// agrupa trechos diferentes consecutivos: "15000 R$" -> "R$ 15 mil"
function changes(a, b, ops) {
  const groups = []; let cur = null;
  for (const [i, j] of ops) {
    const eq = i >= 0 && j >= 0 && a[i].n === b[j].n;
    if (eq) { if (cur) { groups.push(cur); cur = null; } continue; }
    if (!cur) cur = { from: [], to: [], capB: j >= 0 ? b[j].cap : null };
    if (i >= 0) cur.from.push(a[i].raw); if (j >= 0) { cur.to.push(b[j].raw); if (cur.capB === null) cur.capB = b[j].cap; }
  }
  if (cur) groups.push(cur);
  const agg = new Map();
  for (const g of groups) { const k = `${g.from.join(' ') || '∅'} → ${g.to.join(' ') || '∅'}`; const e = agg.get(k) || { k, n: 0, caps: [] }; e.n++; if (g.capB !== null) e.caps.push(g.capB + 1); agg.set(k, e); }
  return [...agg.values()].sort((x, y) => y.n - x.n || x.k.localeCompare(y.k));
}

// ---------- estatística
const pct = (arr, q) => { if (!arr.length) return NaN; const s = [...arr].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const f2 = x => Number.isFinite(x) ? x.toFixed(2) : '-';
const dist = arr => `mediana ${f2(pct(arr, .5))} · p10 ${f2(pct(arr, .1))} · p90 ${f2(pct(arr, .9))} · máx ${f2(Math.max(...arr))}`;
const hist = (arr, lab = x => x) => { const m = new Map(); arr.forEach(x => m.set(x, (m.get(x) || 0) + 1)); return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `\`${lab(k)}\` ${v} (${Math.round(100 * v / arr.length)}%)`).join(' · '); };
function shape(caps) {
  const words = caps.map(c => c.text.split(/\s+/).filter(Boolean).length);
  return { n: caps.length, words, chars: caps.map(c => c.text.replace(/\n/g, ' ').length), dur: caps.map(c => c.e - c.s) };
}

const fin = parseSrt(args.final), finT = tokens(fin);
const pre = args.premiere ? parseSrt(args.premiere) : null, preT = pre && tokens(pre);
const age = args.agente ? parseSrt(args.agente) : null, ageT = age && tokens(age);
let wt = null;
if (args.words) {
  wt = [];
  read(args.words).split('\n').slice(1).filter(Boolean).forEach(l => {
    const m = l.match(/^(\d+),(\d+),"?(.*?)"?$/); if (!m) return;
    m[3].split(/\s+/).forEach(raw => { const n = norm(raw); if (n) wt.push({ raw, n, s: +m[1] / 1000, e: +m[2] / 1000, cap: -1 }); });
  });
}
const dump = args.dump ? JSON.parse(read(args.dump)) : null;
// o usuário costuma mexer nos cortes depois de exportar: leva os tempos da timeline antiga (--dump) para a atual
// (--dump-agora) passando pelo tempo da mídia; o que caiu num trecho cortado fica de fora (null)
const dumpNow = args['dump-agora'] ? JSON.parse(read(args['dump-agora'])) : null;
if (dump && dumpNow) {
  const remap = t => {
    const c = dump.audio.find(a => t >= a.start - 1e-6 && t < a.end); if (!c) return null;
    const mt = c.in + (t - c.start);
    const n = dumpNow.audio.find(a => a.media === c.media && mt >= a.in - 1e-6 && mt < a.in + (a.end - a.start));
    return n ? n.start + (mt - n.in) : null;
  };
  for (const list of [pre, age, wt]) if (list) list.forEach(x => { x.sNow = remap(x.s); x.eNow = x.sNow === null ? null : x.sNow + (x.e - x.s); });
} else for (const list of [pre, age, wt]) if (list) list.forEach(x => { x.sNow = x.s; x.eNow = x.e; });

const R = [];
const h = s => R.push('', `## ${s}`, '');
R.push(`# Estilo de legenda — ${path.basename(args.final)}`, '', `Gerado por aprender.mjs em ${new Date().toISOString().slice(0, 10)}.`);

// --- formato
h('Tamanho e divisão');
const sf = shape(fin);
R.push(`| | legendas | palavras/legenda | caracteres/legenda | duração (s) |`, `|---|---|---|---|---|`);
R.push(`| **final (usuário)** | ${sf.n} | ${dist(sf.words)} | ${dist(sf.chars)} | ${dist(sf.dur)} |`);
for (const [lab, caps] of [['Premiere', pre], ['agente', age]]) if (caps) { const s = shape(caps); R.push(`| ${lab} | ${s.n} | ${dist(s.words)} | ${dist(s.chars)} | ${dist(s.dur)} |`); }
R.push('', `Palavras por legenda (final): ${hist(sf.words)}`);
R.push(`Legendas com mais de 1 linha (final): ${fin.filter(c => c.lines > 1).length}`);
const firstW = fin.map(c => norm(c.text.split(/\s+/)[0] || '')), lastW = fin.map(c => norm(c.text.split(/\s+/).pop() || ''));
R.push('', `Primeira palavra mais comum: ${hist(firstW).split(' · ').slice(0, 15).join(' · ')}`);
R.push(`Última palavra mais comum: ${hist(lastW).split(' · ').slice(0, 15).join(' · ')}`);

if (pre) {
  // fronteiras de legenda medidas em posição de palavra no alinhamento Premiere -> final
  const ops = align(preT, finT);
  const preB = new Set(), finB = new Set(); let pos = 0; const pairAt = [];
  for (const [i, j] of ops) { if (i >= 0 && j >= 0) { pairAt.push([i, j]); } }
  // posição j do final -> i do premiere (só pares iguais/subst)
  const j2i = new Map(pairAt.map(([i, j]) => [j, i]));
  for (let j = 1; j < finT.length; j++) if (finT[j].cap !== finT[j - 1].cap) finB.add(j);
  let kept = 0, added = 0, removed = 0; const addEx = [], remEx = [];
  for (const j of finB) { const i = j2i.get(j); if (i !== undefined && i > 0 && preT[i].cap !== preT[i - 1].cap) kept++; else { added++; if (addEx.length < 12) addEx.push(`…${finT.slice(Math.max(0, j - 3), j).map(t => t.raw).join(' ')} | ${finT.slice(j, j + 3).map(t => t.raw).join(' ')}…`); } }
  for (let j = 1; j < finT.length; j++) { const i = j2i.get(j); if (i !== undefined && i > 0 && preT[i].cap !== preT[i - 1].cap && !finB.has(j)) { removed++; if (remEx.length < 20) remEx.push(`${finT.slice(Math.max(0, j - 3), j).map(t => t.raw).join(' ')} ⟷ ${finT.slice(j, j + 3).map(t => t.raw).join(' ')}`); } }
  R.push('', `**Fronteiras vs Premiere:** mantidas ${kept} · juntou (tirou corte do Premiere) ${removed} · separou (corte novo) ${added}.`);
  R.push('', 'Exemplos de onde o usuário JUNTOU legendas do Premiere (⟷ = corte que ele tirou):', ...remEx.map(x => `- ${x}`));
  R.push('', 'Exemplos de onde o usuário criou corte NOVO (| = corte dele):', ...addEx.map(x => `- ${x}`));
}

// --- escrita
h('Pontuação, maiúsculas e números');
const endCh = fin.map(c => { const m = c.text.trim().match(/[.!?,;:…]+$/); return m ? m[0] : '(nada)'; });
R.push(`Fim da legenda: ${hist(endCh)}`);
const startCase = fin.map(c => { const ch = c.text.trim()[0] || ''; return /\d|R/.test(ch) && /^R\$|^\d/.test(c.text.trim()) ? 'número' : ch === ch.toUpperCase() && ch !== ch.toLowerCase() ? 'Maiúscula' : 'minúscula'; });
R.push(`Início da legenda: ${hist(startCase)}`);
const afterEnd = { '!?.': [], 'outro': [] };
for (let i = 1; i < fin.length; i++) (/[.!?]$/.test(fin[i - 1].text.trim()) ? afterEnd['!?.'] : afterEnd.outro).push(startCase[i]);
R.push(`Início depois de legenda terminada em . ! ?: ${hist(afterEnd['!?.'])}`);
R.push(`Início depois de legenda sem ponto final: ${hist(afterEnd.outro)}`);
const inner = fin.flatMap(c => [...c.text.trim().replace(/[.!?,;:…]+$/, '').matchAll(/[.!?,;:…]/g)].map(m => m[0]));
R.push(`Pontuação no meio da legenda: ${inner.length ? hist(inner) : 'nenhuma'}`);
const nums = fin.flatMap(c => c.text.match(/R\$\s?[\d.,]+(?:\s?(?:mil|milhões|milhão|bilhões|bilhão))?|\d[\d.,]*\s?(?:%|mil|milhões|milhão|bilhões|bilhão|R\$)?/g) || []);
R.push(`Números como o usuário escreve: ${[...new Set(nums)].slice(0, 40).map(x => `\`${x}\``).join(' ')}`);
const colors = fin.map(c => c.color || '(sem cor no SRT)');
R.push(`Cores no SRT final: ${hist(colors)}`);

// --- texto
for (const [lab, T] of [['Premiere', preT], ['agente', ageT], ['Whisper', wt]]) {
  if (!T) continue;
  const ch = changes(T, finT, align(T, finT));
  h(`Trocas de texto: ${lab} → final (${ch.reduce((a, c) => a + c.n, 0)})`);
  R.push(`Formato: \`${lab}\` → \`usuário\` ×vezes (legendas finais). ∅ = nada.`, '');
  ch.slice(0, 150).forEach(c => R.push(`- ${c.k}${c.n > 1 ? ` ×${c.n}` : ''} (${c.caps.slice(0, 6).join(', ')})`));
  if (ch.length > 150) R.push(`- … +${ch.length - 150}`);
}

// --- tempo
h('Tempo');
const gaps = []; for (let i = 1; i < fin.length; i++) gaps.push(+(fin[i].s - fin[i - 1].e).toFixed(3));
R.push(`Intervalo entre legendas (início − fim anterior, s): ${hist(gaps.map(g => Math.abs(g) < 0.005 ? 0 : g > 1 ? '>1 s' : g.toFixed(2))).split(' · ').slice(0, 8).join(' · ')}`);
// início do usuário x início da legenda do Premiere/agente que começa na mesma palavra (corte que ele manteve)
for (const [lab, caps, T] of [['Premiere', pre, preT], ['agente', age, ageT]]) {
  if (!caps) continue;
  const ops = align(finT, T); const d = []; let lastCap = -1;
  for (const [i, j] of ops) {
    if (i < 0 || j < 0 || finT[i].n !== T[j].n || finT[i].cap === lastCap) continue;
    lastCap = finT[i].cap;
    if (finT[i].first && T[j].first && caps[T[j].cap].sNow != null) d.push(fin[finT[i].cap].s - caps[T[j].cap].sNow);
  }
  if (d.length) R.push(`Início do usuário − início do ${lab} (mesma palavra abrindo a legenda, ${d.length} casos): ${dist(d)} · |erro| ${dist(d.map(Math.abs))}`);
}
if (dump && !dumpNow) R.push('(Sem --dump-agora: se o usuário mexeu nos cortes depois de exportar, as comparações de tempo ficam erradas.)');
if (dump) {
  const cuts = [...new Set((dumpNow || dump).audio.flatMap(a => [a.start, a.end]).map(x => +x.toFixed(3)))].sort((a, b) => a - b);
  const near = (t, arr, tol = 0.02) => arr.some(x => Math.abs(x - t) <= tol);
  const onCut = fin.filter(c => near(c.s, cuts)).length;
  const cutsInside = cuts.filter(x => x > fin[0].s && x < fin[fin.length - 1].e);
  const cutWithCap = cutsInside.filter(x => near(x, fin.map(c => c.s))).length;
  R.push(`Legendas que começam exatamente num corte de clipe (±1 frame): ${onCut} de ${fin.length} (${Math.round(100 * onCut / fin.length)}%)`);
  R.push(`Cortes de clipe que ganham legenda nova: ${cutWithCap} de ${cutsInside.length} (${Math.round(100 * cutWithCap / cutsInside.length)}%)`);
  if (pre) { const p = pre.filter(c => c.sNow != null && near(c.sNow, cuts)).length; R.push(`(Premiere: ${p} de ${pre.length} começam num corte)`); }
  if (age) { const p = age.filter(c => c.sNow != null && near(c.sNow, cuts)).length; R.push(`(agente: ${p} de ${age.length} começam num corte)`); }
}
if (wt) {
  const ops = align(finT, wt); const off = [], offEnd = []; const firstTok = new Map(), lastTok = new Map();
  for (const [i, j] of ops) if (i >= 0 && j >= 0 && finT[i].n === wt[j].n) { const c = finT[i].cap; if (!firstTok.has(c)) firstTok.set(c, wt[j]); lastTok.set(c, wt[j]); }
  fin.forEach((c, ci) => { const a = firstTok.get(ci), b = lastTok.get(ci); if (a?.sNow != null) off.push(c.s - a.sNow); if (b?.eNow != null) offEnd.push(c.e - b.eNow); });
  R.push(`Início da legenda − início da 1ª palavra (Whisper, s; negativo = antes da fala): ${dist(off)}`);
  R.push(`Fim da legenda − fim da última palavra (Whisper, s): ${dist(offEnd)}`);
}

fs.writeFileSync(path.join(args.out, 'relatorio.md'), R.join('\n') + '\n');

// ---------- lado a lado: cada legenda final com o trecho do Premiere/agente que cobre as mesmas palavras
const side = [];
const mapCaps = (T, caps) => { const ops = align(finT, T); const m = new Map(); for (const [i, j] of ops) if (i >= 0 && j >= 0) { const c = finT[i].cap; if (!m.has(c)) m.set(c, new Set()); m.get(c).add(T[j].cap); } return m; };
const mp = pre && mapCaps(preT, pre), ma = age && mapCaps(ageT, age);
fin.forEach((c, ci) => {
  side.push(`#${ci + 1}  ${tc(c.s)} → ${tc(c.e)}  USUÁRIO: ${c.text.replace(/\n/g, ' / ')}`);
  if (mp) side.push(`        PREMIERE: ${[...(mp.get(ci) || [])].map(k => `[${pre[k].text.replace(/\n/g, ' / ')}]`).join(' ')}`);
  if (ma) side.push(`        AGENTE:   ${[...(ma.get(ci) || [])].map(k => `[${age[k].text.replace(/\n/g, ' / ')}]`).join(' ')}`);
});
fs.writeFileSync(path.join(args.out, 'lado-a-lado.txt'), side.join('\n') + '\n');
console.log(`ok: ${path.join(args.out, 'relatorio.md')} e lado-a-lado.txt (${fin.length} legendas finais)`);
