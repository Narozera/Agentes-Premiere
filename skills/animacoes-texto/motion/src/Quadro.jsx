import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Easing, cancelRender, continueRender, delayRender, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont} from '@remotion/fonts';

// "Quadro de contas": a full-screen board where a calculation is built line by line while the person keeps talking
// (first used for Caio Xavier's loan simulation). Everything is driven by the props (times in seconds from the start
// of the board), all sizes are for a 1080-wide frame and scale with the width (u). The caption band is kept empty.
//  props: {width,height,fps,dur, title, info:[{label,value,t}], header:[left,right], rows:[{label,t,count:{to,prefix,
//          suffix},tValue,color}], total:{text,sub,t,color}, band:[y0,y1] (caption line, nothing is drawn there)}

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'};
const expoOut = Easing.bezier(0.16, 1, 0.3, 1);
const GREEN = '#00ff00', WHITE = '#ffffff', GREY = '#9fb3a8';
const NUM = '"digital-7"', TXT = '"Montserrat Black"', TXT2 = '"Montserrat Bold"';

const fmt = (v) => Math.round(v).toLocaleString('pt-BR');
const enter = (frame, fps, t) => (frame < t * fps ? 0 : spring({frame: frame - t * fps, fps, config: {damping: 14, stiffness: 140}}));
const countUp = (frame, fps, t, to, dur = 0.8) => to * interpolate(frame, [t * fps, (t + dur) * fps], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
const punch = (frame, fps, t) => interpolate(frame, [t * fps, (t + 0.07) * fps, (t + 0.25) * fps], [1, 1.12, 1], clamp);

// numbers in Digital-7, words (MIL, A.M., JUROS...) in Montserrat Bold: Digital-7 has no accents and its letters are hard to read
const Money = ({prefix, num, unit, u}) => (
  <>
    {prefix ?? ''}{num}
    {unit ? <span style={{fontFamily: TXT2, fontSize: '0.55em', marginLeft: 12 * u, textShadow: 'none'}}>{unit.trim()}</span> : null}
  </>
);

// a block that slides in from the left on a spring (hidden before its time)
const In = ({frame, fps, t, u, children, style}) => {
  const s = enter(frame, fps, t);
  if (s <= 0) return null;
  return <div style={{...style, translate: `${(1 - s) * -160 * u}px 0px`, scale: String(0.85 + 0.15 * s)}}>{children}</div>;
};

export const Quadro = (p) => {
  const frame = useCurrentFrame();
  const {fps, width} = useVideoConfig();
  const u = width / 1080;
  const [handle] = useState(() => delayRender('fonts'));
  useEffect(() => {
    Promise.all((p.fonts ?? []).map((f) => loadFont({family: f.family, url: staticFile(`fonts/${f.file}`)})))
      .then(() => continueRender(handle)).catch((e) => cancelRender(e));
  }, [handle]);

  const W = 1080 * u, pad = 70 * u;
  const board = interpolate(frame, [0, 0.35 * fps], [0, 1], {...clamp, easing: expoOut});   // board scales in
  const glowG = `0 0 ${14 * u}px ${GREEN}88`;
  const maxRow = Math.max(...p.rows.map((r) => r.count.to));
  const Y = (y) => y * u;

  return (
    <AbsoluteFill style={{backgroundColor: `rgba(4,10,7,${0.9 * board})`}}>
      {/* faint ledger grid */}
      <AbsoluteFill style={{opacity: 0.08 * board, backgroundImage: `linear-gradient(${GREEN} 1px, transparent 1px), linear-gradient(90deg, ${GREEN} 1px, transparent 1px)`, backgroundSize: `${60 * u}px ${60 * u}px`}} />
      <div style={{position: 'absolute', left: pad, right: pad, top: Y(p.titleY ?? 250), scale: String(0.9 + 0.1 * board), textAlign: 'center'}}>
        <div style={{fontFamily: TXT, fontSize: (p.titleSize ?? 50) * u, color: WHITE, letterSpacing: 2 * u, whiteSpace: 'nowrap'}}>{p.title}</div>
        <div style={{height: 8 * u, marginTop: 18 * u, background: GREEN, boxShadow: glowG, width: `${interpolate(frame, [0.2 * fps, 0.8 * fps], [0, 100], {...clamp, easing: expoOut})}%`, marginLeft: 'auto', marginRight: 'auto'}} />
      </div>

      {/* loan data */}
      {p.info.map((it, i) => (
        <In key={i} frame={frame} fps={fps} t={it.t} u={u} style={{position: 'absolute', left: pad, right: pad, top: Y(it.y), display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
          <span style={{fontFamily: TXT2, fontSize: 46 * u, color: GREY}}>{it.label}</span>
          <span style={{fontFamily: it.font === 'text' ? TXT : NUM, fontSize: (it.font === 'text' ? 52 : 80) * u, color: GREEN, textShadow: glowG, scale: String(punch(frame, fps, it.t + 0.3))}}>
            {it.count ? <Money prefix={it.count.prefix} num={fmt(countUp(frame, fps, it.t, it.count.to))} unit={it.count.suffix} u={u} /> : it.font === 'text' ? it.value : <Money num={it.value} unit={it.unit} u={u} />}
          </span>
        </In>
      ))}

      {/* table */}
      <In frame={frame} fps={fps} t={p.headerT} u={u} style={{position: 'absolute', left: pad, right: pad, top: Y(p.headerY), display: 'flex', justifyContent: 'space-between', borderTop: `${4 * u}px solid ${GREEN}55`, paddingTop: 24 * u}}>
        <span style={{fontFamily: TXT2, fontSize: 40 * u, color: GREY}}>{p.header[0]}</span>
        <span style={{fontFamily: TXT2, fontSize: 40 * u, color: GREY}}>{p.header[1]}</span>
      </In>
      {p.rows.map((r, i) => {
        const col = r.color ?? GREEN;
        const v = countUp(frame, fps, r.tValue, r.count.to);
        const bar = frame < r.tValue * fps ? 0 : spring({frame: frame - r.tValue * fps, fps, config: {damping: 18, stiffness: 70}});
        return (
          <In key={i} frame={frame} fps={fps} t={r.t} u={u} style={{position: 'absolute', left: pad, right: pad, top: Y(r.y)}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
              <span style={{fontFamily: NUM, fontSize: 80 * u, color: WHITE}}>{r.label}</span>
              <span style={{fontFamily: NUM, fontSize: 80 * u, color: col, textShadow: `0 0 ${14 * u}px ${col}88`, visibility: frame < r.tValue * fps ? 'hidden' : 'visible', scale: String(punch(frame, fps, r.tValue + 0.8))}}>
                <Money prefix={r.count.prefix} num={fmt(v)} unit={r.count.suffix} u={u} />
              </span>
            </div>
            <div style={{height: 22 * u, marginTop: 12 * u, background: '#ffffff14', borderRadius: 11 * u}}>
              <div style={{height: '100%', width: `${(bar * r.count.to / maxRow) * 100}%`, background: col, borderRadius: 11 * u, boxShadow: `0 0 ${16 * u}px ${col}99`}} />
            </div>
          </In>
        );
      })}

      {/* conclusion: slams in */}
      {p.total && frame >= p.total.t * fps && (() => {
        const tt = (frame - p.total.t * fps) / fps;
        const s = interpolate(tt, [0, 0.12], [2.2, 1], {...clamp, easing: Easing.in(Easing.cubic)});
        const k = tt > 0.12 ? Math.exp(-(tt - 0.12) / 0.12) : 0;
        const col = p.total.color ?? '#ff3b3b';
        return (
          <div style={{position: 'absolute', left: pad, right: pad, top: Y(p.total.y), textAlign: 'center', scale: String(s), translate: `${Math.sin(tt * 110) * 14 * u * k}px 0px`,
            border: `${6 * u}px solid ${col}`, borderRadius: 24 * u, padding: `${24 * u}px ${20 * u}px`, background: `${col}22`, boxShadow: `0 0 ${30 * u}px ${col}66`}}>
            <div style={{fontFamily: NUM, fontSize: 150 * u, color: col, lineHeight: 1, textShadow: `0 0 ${16 * u}px ${col}`}}>{p.total.text}</div>
            <div style={{fontFamily: TXT, fontSize: 46 * u, color: WHITE, marginTop: 14 * u}}>{p.total.sub}</div>
          </div>
        );
      })()}
    </AbsoluteFill>
  );
};
