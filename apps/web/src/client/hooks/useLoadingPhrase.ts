import { useState, useEffect } from "react";

/**
 * Fun, whimsical loading phrases inspired by Claude
 */
const LOADING_PHRASES = [
  "Jitterbugging",
  "Boondoggling",
  "Percolating",
  "Cogitating",
  "Ruminating",
  "Noodling",
  "Tinkering",
  "Pondering",
  "Mulling",
  "Deliberating",
  "Scheming",
  "Conspiring",
  "Concocting",
  "Brainstorming",
  "Daydreaming",
  "Contemplating",
  "Philosophizing",
  "Calculating",
  "Rummaging",
  "Ferreting",
  "Sleuthing",
  "Investigating",
  "Puzzling",
  "Deciphering",
  "Unraveling",
  "Calibrating",
  "Synthesizing",
  "Formulating",
  "Musing",
  "Ideating",
  "Theorizing",
  "Reasoning",
  "Meditating",
  "Reflecting",
  "Scrutinizing",
  "Analyzing",
  "Processing",
  "Computing",
  "Calculating",
  "Evaluating",
];

/**
 * Hook that returns a randomly rotating loading phrase
 * Changes phrase every 2-3 seconds while active
 */
export function useLoadingPhrase(isActive: boolean) {
  const [phrase, setPhrase] = useState(() =>
    LOADING_PHRASES[Math.floor(Math.random() * LOADING_PHRASES.length)]
  );

  useEffect(() => {
    if (!isActive) return;

    // Change phrase every 2-3 seconds (randomize interval for variety)
    const interval = setInterval(() => {
      setPhrase(
        LOADING_PHRASES[Math.floor(Math.random() * LOADING_PHRASES.length)]
      );
    }, 2000 + Math.random() * 1000); // 2-3 seconds

    return () => clearInterval(interval);
  }, [isActive]);

  return phrase;
}
