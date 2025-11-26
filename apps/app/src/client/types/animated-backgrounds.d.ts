declare module 'animated-backgrounds' {
  import { FC } from 'react';

  export interface AnimatedBackgroundProps {
    animationName: string;
    theme?: string;
    interactive?: boolean;
    fps?: number;
    opacity?: number;
    speed?: number;
    adaptivePerformance?: boolean;
    interactionEffect?: string;
  }

  export const AnimatedBackground: FC<AnimatedBackgroundProps>;
}
