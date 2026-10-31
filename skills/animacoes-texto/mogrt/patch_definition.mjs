// Edits the definition.json of a .mogrt (read from stdin, written to stdout) for options AE scripting cannot set:
//  - text fields: font family / faux styles / font size editable in Premiere (AE's "Edit Properties" dialog);
//  - slider ranges (AE's Slider Control UI range is 0-100): Tamanho up to 300.
// Usage: node patch_definition.mjs <definition.json in> <out>   (called by build-mogrts.ps1)
import fs from 'node:fs';

const MAX = {Tamanho: 300};
const [inP, outP] = process.argv.slice(2);
const j = JSON.parse(fs.readFileSync(inP, 'utf8').replace(/^﻿/, ''));
const nameOf = (c) => c.uiName?.strDB?.[0]?.str;
const walk = (o) => {
  if (!o || typeof o !== 'object') return;
  for (const k of Object.keys(o)) {
    if (/^capPropFont(Edit|FauxStyleEdit|SizeEdit)$/.test(k)) o[k] = true;
    else walk(o[k]);
  }
};
walk(j);
for (const c of j.clientControls ?? []) if (MAX[nameOf(c)] != null) c.max = MAX[nameOf(c)];
for (const loc of Object.values(j.sourceInfoLocalized ?? {}))
  for (const p of loc.capsuleparams?.capParams ?? []) if (MAX[p.capPropUIName] != null) p.capPropMax = MAX[p.capPropUIName];
fs.writeFileSync(outP, JSON.stringify(j));
