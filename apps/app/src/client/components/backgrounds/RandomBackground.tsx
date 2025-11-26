import { AnimatedBackground } from "animated-backgrounds";
import { useState, useEffect } from "react";

interface AnimationConfig {
  name: string;
  animationName: string;
  theme?: string;
  fps: number;
  speed: number;
  opacity: number;
  interactive: boolean;
  interactionEffect?: string;
  blendMode?: string;
}

interface RandomBackgroundProps {
  /**
   * Opacity level override (0-1)
   * If not provided, uses the random config's opacity
   */
  opacity?: number;

  /**
   * Animation speed multiplier override
   * If not provided, uses the random config's speed
   */
  speed?: number;

  /**
   * Enable mouse interaction override
   * If not provided, uses the random config's interactive setting
   */
  interactive?: boolean;

  /**
   * Enable random animation selection on each page load
   * @default true
   */
  randomize?: boolean;
}

/**
 * Clean, subtle, tech-focused animation configurations
 * Curated for professional developer tools with minimal distraction
 */
const ANIMATION_CONFIGS: AnimationConfig[] = [
  // Interactive configurations (engaging but subtle)
  {
    name: "Matrix Rain",
    animationName: "matrixRain",
    theme: "gaming",
    fps: 30,
    speed: 0.7,
    opacity: 0.1,
    interactive: true,
    interactionEffect: "wave",
    blendMode: "screen",
  },
  {
    name: "Neural Network",
    animationName: "neuralNetwork",
    theme: "portfolio",
    fps: 90,
    speed: 1,
    opacity: 0.2,
    interactive: true,
    interactionEffect: "attract",
    blendMode: "screen",
  },
  {
    name: "Particle Network",
    animationName: "particleNetwork",
    theme: "portfolio",
    fps: 30,
    speed: 1,
    opacity: 0.15,
    interactive: true,
    interactionEffect: "attract",
    blendMode: "multiply",
  },
  {
    name: "Starry Night",
    animationName: "starryNight",
    theme: "presentation",
    fps: 25,
    speed: 0.4,
    opacity: 0.2,
    interactive: true,
    interactionEffect: "follow",
    blendMode: "screen",
  },
  {
    name: "Aurora Borealis",
    animationName: "auroraBorealis",
    theme: "presentation",
    fps: 90,
    speed: 1,
    opacity: 0.15,
    interactive: false,
    blendMode: "soft-light",
  },
  {
    name: "Gradient Wave",
    animationName: "gradientWave",
    theme: "landing",
    fps: 60,
    speed: 0.7,
    opacity: 0.12,
    interactive: false,
    blendMode: "soft-light",
  },
];

/**
 * Random background animation component
 * Randomly selects from developer-focused animations on each page load
 */
export function RandomBackground({
  opacity,
  speed,
  interactive,
  randomize = true,
}: RandomBackgroundProps) {
  const [config, setConfig] = useState<AnimationConfig>(ANIMATION_CONFIGS[0]);

  useEffect(() => {
    if (randomize) {
      // Select random animation configuration on mount
      const randomIndex = Math.floor(Math.random() * ANIMATION_CONFIGS.length);
      setConfig(ANIMATION_CONFIGS[randomIndex]);
    }
  }, [randomize]);

  // Use prop overrides or fall back to config values
  const finalOpacity = opacity ?? config.opacity;
  const finalSpeed = speed ?? config.speed;
  const finalInteractive = interactive ?? config.interactive;

  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden"
      style={{ opacity: finalOpacity }}
    >
      <AnimatedBackground
        animationName={config.animationName}
        theme={config.theme}
        interactive={finalInteractive}
        fps={config.fps}
        opacity={finalOpacity}
        speed={finalSpeed}
        adaptivePerformance={true}
        interactionEffect={config.interactionEffect}
      />

      {/* Custom styling layer to match theme colors */}
      <div
        className="absolute inset-0 mix-blend-color"
        style={{
          background: "var(--primary)",
          opacity: 0.1,
        }}
      />

      {/* Debug label - shows animation name */}
      <div className="hidden fixed top-4 left-4 bg-black/50 text-white px-3 py-2 rounded text-sm font-mono z-50">
        {config.name}
        {config.interactive && (
          <span className="ml-2 text-xs opacity-70">(interactive)</span>
        )}
      </div>
    </div>
  );
}
