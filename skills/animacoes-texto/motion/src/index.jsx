import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {Texto, animSeconds} from './Texto.jsx';

// One composition, driven entirely by the item of spec.json (inputProps); size/fps/length come from the props.
const calculateMetadata = ({props}) => ({
  width: props.width,
  height: props.height,
  fps: props.fps,
  durationInFrames: Math.max(1, Math.ceil(animSeconds(props) * props.fps)),
});

const Root = () => (
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
);

registerRoot(Root);
