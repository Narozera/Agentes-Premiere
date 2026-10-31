import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Easing, cancelRender, continueRender, delayRender, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont} from '@remotion/fonts';

// Text animation presets modelled on what motion designers actually ship in short-form video (see
// ../REFERENCIAS.md): spring physics instead of linear moves, staggered characters, digit rolls, landing
// "punch" and real motion blur. Opacity is never animated (the user does fades in Premiere); before a line
// starts it is simply not drawn.

const LINE_DELAY = 0.1;  // s between lines of the same item
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'};
const expoOut = Easing.bezier(0.16, 1, 0.3, 1);

// length of the animated part (the render script then holds the last frame for the clip's media length)
const LEN = {pop: 0.8, queda: 1.0, impacto: 0.8, deslize: 0.7, mascara: 0.7, cascata: 1.0, roleta: 1.5, led: 0.6};
const ALIAS = {bounce: 'queda', stamp: 'impacto', slide: 'deslize'};
const animOf = (item, line) => {
  const a = (line && line.anim) || item.anim || 'pop';
  return ALIAS[a] || a;
};
export const animSeconds = (item) => Math.max(...item.lines.map((ln, i) => {
  const c = ln.count ? (ln.count.dur ?? 0.7) + 0.35 : 0;
  return i * LINE_DELAY + Math.max(LEN[animOf(item, ln)] ?? 1, c);
})) + 0.1;

const fmtNumber = (v, decimals) => v.toLocaleString('pt-BR', {minimumFractionDigits: decimals, maximumFractionDigits: decimals});

// whole-line transforms; t = frames since the line starts, u = px scale (1 at 1080 wide)
const lineStyle = (anim, t, fps, u) => {
  if (t < 0) return {visibility: 'hidden'};
  switch (anim) {
    case 'pop': {  // scale-in with overshoot and a small counter-rotation (CapCut/AE "pop in")
      const s = spring({frame: t, fps, config: {damping: 11, stiffness: 170, mass: 0.8}});
      return {scale: String(s), rotate: `${(1 - s) * -8}deg`};
    }
    case 'queda': {  // drops from above and bounces on a spring (no squash, the user likes it soft)
      const s = spring({frame: t, fps, config: {damping: 9, stiffness: 120, mass: 0.9}});
      return {translate: `0px ${-(1 - s) * 420 * u}px`};
    }
    case 'impacto': {  // slam from 260% with a decaying camera shake (MrBeast-style impact text)
      const land = 0.1 * fps;
      const s = interpolate(t, [0, land], [2.6, 1], {...clamp, easing: Easing.in(Easing.cubic)});
      const k = t > land ? Math.exp(-(t - land) / (0.1 * fps)) : 0;
      const ts = t / fps;   // seconds, so the shake is the same at any render fps
      return {scale: String(s), translate: `${Math.sin(ts * 114) * 16 * u * k}px ${Math.cos(ts * 138) * 10 * u * k}px`};
    }
    case 'deslize': {  // rises with an expo ease and settles (soft, emotional)
      const e = interpolate(t, [0, 0.55 * fps], [0, 1], {...clamp, easing: expoOut});
      return {translate: `0px ${(1 - e) * 160 * u}px`, scale: String(0.9 + 0.1 * e)};
    }
    case 'led': {  // digital display switching on (not for money: the user does not want flicker there)
      const on = t > 0.35 * fps || Math.sin((t / fps) * 96) > 0;
      return on ? {} : {visibility: 'hidden'};
    }
    default:
      return {};
  }
};

// one digit of the odometer: a column of 0-9 repeated that rolls up to the target digit on a spring
// The column is as wide as the TARGET digit (an invisible copy sizes it), so the settled number keeps the font's own
// spacing (a "1" is narrow); the rolling stack is centred on it and clipped only vertically.
const RollDigit = ({digit, t, fps, loops, cell}) => {
  const s = t < 0 ? 0 : spring({frame: t, fps, config: {damping: 18, stiffness: 120, mass: 1}});
  const pos = s * (loops * 10 + digit);
  const n = loops * 10 + 10;
  return (
    <span style={{position: 'relative', display: 'inline-block', height: cell, lineHeight: `${cell}px`, verticalAlign: 'top', clipPath: 'inset(0 -100% 0 -100%)'}}>
      <span style={{visibility: 'hidden'}}>{digit}</span>
      <span style={{position: 'absolute', left: '50%', top: 0, translate: `-50% ${-pos * cell}px`}}>
        {Array.from({length: n}, (_, i) => (
          <span key={i} style={{display: 'block', height: cell, textAlign: 'center'}}>{i % 10}</span>
        ))}
      </span>
    </span>
  );
};

const Line = ({item, line, index, frame, fps, u}) => {
  let anim = animOf(item, line);
  // the slam only on the main line (labels slamming over it look messy); a drop moves all lines together
  if (index > 0 && !line.anim && anim === 'impacto') anim = 'pop';
  const t = frame - (anim === 'queda' ? 0 : Math.round(index * LINE_DELAY * fps));
  const size = line.size;
  const stroke = line.stroke ?? 6;   // black outline, px outside the letter
  const color = line.color;
  const glow = line.glow ?? item.glow ?? 0;   // 0..1, soft light around the letters (LED/neon look)
  let text = line.text ?? '';
  let punch = 1;
  if (line.count) {  // count-up: eases out on the last digits, then a small landing punch
    const c = line.count, dur = (c.dur ?? 0.7) * fps;
    const p = interpolate(t, [0, dur], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
    const v = (c.from ?? 0) + ((c.to ?? 0) - (c.from ?? 0)) * p;
    text = `${c.prefix ?? ''}${fmtNumber(p >= 1 ? c.to : v, c.decimals ?? 0)}${c.suffix ?? ''}`;
    punch = interpolate(t - dur, [0, 0.07 * fps, 0.25 * fps], [1, 1.13, 1], clamp);
  }
  const base = {
    fontFamily: `"${line.font}"`,
    fontSize: size,
    color,
    whiteSpace: 'pre',
    lineHeight: 1.05,
    WebkitTextStroke: `${stroke * 2}px ${line.strokeColor ?? '#000'}`,
    paintOrder: 'stroke fill',
    textShadow: glow > 0 ? `0 0 ${0.08 * size * glow}px ${color}, 0 0 ${0.22 * size * glow}px ${color}aa` : undefined,
  };
  const wrap = {display: 'flex', justifyContent: 'center', ...base};

  if (anim === 'roleta') {
    // odometer: every digit rolls (the rightmost spins more), the rest of the line pops in
    const cell = Math.round(size * 1.25);
    const chars = [...text];
    const digitIdx = chars.map((ch, i) => (/\d/.test(ch) ? i : -1)).filter((i) => i >= 0);
    const enter = t < 0 ? 0 : spring({frame: t, fps, config: {damping: 13, stiffness: 160}});
    return (
      <div style={{...wrap, height: cell, alignItems: 'flex-start', scale: String((0.6 + 0.4 * enter) * punch)}}>
        {t < 0 ? null : chars.map((ch, i) => {
          const k = digitIdx.indexOf(i);
          if (k < 0) return <span key={i} style={{height: cell, lineHeight: `${cell}px`}}>{ch === ' ' ? ' ' : ch}</span>;
          return <RollDigit key={i} digit={Number(ch)} t={t - Math.round(k * 0.06 * fps)} fps={fps} loops={1 + k} cell={cell} />;
        })}
      </div>
    );
  }
  if (anim === 'cascata') {
    // per-character stagger (SplitText style): each letter springs up from below, 2 frames apart
    return (
      <div style={{...wrap, scale: String(punch)}}>
        {[...text].map((ch, i) => {
          const tc = t - i * Math.round(0.035 * fps);
          if (tc < 0) return <span key={i} style={{visibility: 'hidden'}}>{ch === ' ' ? ' ' : ch}</span>;
          const s = spring({frame: tc, fps, config: {damping: 12, stiffness: 150}});
          return <span key={i} style={{display: 'inline-block', translate: `0px ${(1 - s) * 90 * u}px`, scale: String(s)}}>{ch === ' ' ? ' ' : ch}</span>;
        })}
      </div>
    );
  }
  if (anim === 'mascara') {
    // line reveal: slides up from behind an invisible edge (classic kinetic-typography reveal)
    const e = t < 0 ? 0 : interpolate(t, [0, 0.5 * fps], [0, 1], {...clamp, easing: expoOut});
    const pad = stroke * 2 + 0.25 * size;
    return (
      <div style={{overflow: 'hidden', padding: `${pad}px ${pad}px 0`, marginTop: -pad}}>
        <div style={{...wrap, translate: `0px ${(1 - e) * 130}%`, scale: String(punch)}}>{text}</div>
      </div>
    );
  }
  const st = lineStyle(anim, t, fps, u);
  const sc = st.scale ? String(Number(st.scale) * punch) : String(punch);
  return <div style={{...wrap, ...st, scale: sc}}>{text}</div>;
};

const Block = ({item}) => {
  const frame = useCurrentFrame();
  const {fps, width} = useVideoConfig();
  const u = width / 1080;
  // lineY: the MAIN line sits on that line (the user's caption line) and the labels hang below it;
  // otherwise y is the centre of the whole block
  const first = item.lines[0];
  const firstBox = animOf(item, first) === 'roleta' ? Math.round(first.size * 1.25) : first.size * 1.05;
  const pos = item.lineY != null ? {top: item.lineY - firstBox / 2} : {top: item.y, translate: '0px -50%'};
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: 0, right: 0, ...pos, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        {item.lines.map((ln, i) => <Line key={i} item={item} line={ln} index={i} frame={frame} fps={fps} u={u} />)}
      </div>
    </AbsoluteFill>
  );
};

// Motion blur is not done here: <HtmlInCanvasMotionBlur> fails in the headless render ("No cached paint record"),
// so render.mjs renders at fps x N and averages sub-frames with ffmpeg. All timing is in seconds (spring/fps).
export const Texto = (item) => {
  const [handle] = useState(() => delayRender('fonts'));
  useEffect(() => {
    Promise.all((item.fonts ?? []).map((f) => loadFont({family: f.family, url: staticFile(`fonts/${f.file}`)})))
      .then(() => continueRender(handle))
      .catch((e) => cancelRender(e));
  }, [handle]);
  return <Block item={item} />;
};
