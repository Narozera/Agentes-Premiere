// Renders every item of spec.json with Remotion (ProRes 4444 + alpha), then with ffmpeg:
//  - motion blur: the animation is rendered at fps x SUB and each output frame averages the first half of its
//    sub-frames (180 deg shutter, like After Effects), premultiplied so the alpha edges don't darken;
//  - holds the last frame so the media is `hold` seconds long (the user drags the clip end out in Premiere).
// Usage: node render.mjs <spec.json> <outDir> <ffmpeg.exe> <hold seconds>   (called by scripts/render-motion.ps1)
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';

const SUB = 6;
const here = path.dirname(fileURLToPath(import.meta.url));
const [specPath, outDir, ffmpeg, holdArg] = process.argv.slice(2);
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8').replace(/^﻿/, ''));
const hold = Number(holdArg || 10);
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
fs.mkdirSync(path.join(outDir, 'tmp'), {recursive: true});

const serveUrl = await bundle({entryPoint: path.join(here, 'src', 'index.jsx'), publicDir: path.join(here, 'public')});
for (const item of spec.items) {
  if (only && !only.includes(item.id)) continue;
  // a count-up changes digits every frame: averaging sub-frames turns them into ghosts, so no blur by default
  const blur = (item.blur ?? spec.blur ?? (item.lines.some((l) => l.count) ? 0 : 1)) > 0;
  const sub = blur ? SUB : 1;
  const inputProps = {...item, width: spec.width, height: spec.height, fps: spec.fps * sub, fonts: spec.fonts ?? []};
  const composition = await selectComposition({serveUrl, id: 'Texto', inputProps});
  const tmp = path.join(outDir, 'tmp', `${item.id}.mov`);
  const t0 = Date.now();
  await renderMedia({
    composition, serveUrl, inputProps, outputLocation: tmp,
    codec: 'prores', proResProfile: '4444', pixelFormat: 'yuva444p10le', imageFormat: 'png', logLevel: 'error',
  });
  const animDur = composition.durationInFrames / composition.fps;
  const vf = [];
  if (blur) vf.push('format=rgba64le', 'premultiply=inplace=1', `tmix=frames=${SUB / 2}`, 'unpremultiply=inplace=1',
    `select='not(mod(n+1\\,${SUB}))'`, `setpts=N/(${spec.fps}*TB)`);
  vf.push(`tpad=stop_mode=clone:stop_duration=${Math.max(0, hold - animDur).toFixed(3)}`, 'format=yuva444p10le');
  const out = path.join(outDir, `${item.id}.mov`);
  execFileSync(ffmpeg, ['-v', 'error', '-y', '-i', tmp, '-vf', vf.join(','), '-r', String(spec.fps),
    '-c:v', 'prores_ks', '-profile:v', '4', '-pix_fmt', 'yuva444p10le', '-an', out]);
  console.log(`${item.id.padEnd(16)} ${String(item.anim).padEnd(9)} anim ${animDur.toFixed(2)}s  render ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
