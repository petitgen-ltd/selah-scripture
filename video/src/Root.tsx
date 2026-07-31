import React from 'react';
import { Composition } from 'remotion';
import { Selah, FPS, TOTAL_FRAMES } from './Selah';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Selah"
      component={Selah}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={1920}
      height={1080}
    />
  );
};
