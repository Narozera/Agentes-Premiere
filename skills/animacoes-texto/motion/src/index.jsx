import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {Texto, animSeconds} from './Texto.jsx';
import {Quadro} from './Quadro.jsx';

// Compositions driven entirely by the item of spec.json (inputProps); size/fps/length come from the props.
// Texto: one animated value (+ label). Quadro: full-screen board with a calculation built line by line ("comp":"Quadro").
const calculateMetadata = ({props}) => ({
  width: props.width,
  height: props.height,
  fps: props.fps,
  durationInFrames: Math.max(1, Math.ceil(animSeconds(props) * props.fps)),
});
const quadroMetadata = ({props}) => ({
  width: props.width, height: props.height, fps: props.fps, durationInFrames: Math.max(1, Math.ceil(props.dur * props.fps)),
});

const Root = () => (
  <>
    <Composition
      id="Texto"
      component={Texto}
      width={1080}
      height={1920}
      fps={60}
      durationInFrames={60}
      defaultProps={{width: 1080, height: 1920, fps: 60, y: 1050, anim: 'pop', fonts: [], lines: [{text: 'R$ 80', font: 'digital-7', color: '#00ff00', size: 240}]}}
      calculateMetadata={calculateMetadata}
    />
    <Composition
      id="Quadro"
      component={Quadro}
      width={1080}
      height={1920}
      fps={60}
      durationInFrames={60}
      defaultProps={{width: 1080, height: 1920, fps: 60, dur: 1, title: '', info: [], header: ['', ''], headerY: 0, headerT: 0, rows: [], fonts: []}}
      calculateMetadata={quadroMetadata}
    />
  </>
);

registerRoot(Root);
