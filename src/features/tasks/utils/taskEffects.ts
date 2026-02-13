import confetti from 'canvas-confetti';

export const fireTaskConfetti = (x: number, y: number) => {
  const xRatio = x / window.innerWidth;
  const yRatio = y / window.innerHeight;

  confetti({
    particleCount: 80,
    spread: 60,
    origin: { x: xRatio, y: yRatio },
    colors: ['#017a6c', '#00c2cc', '#FFD700', '#FF69B4'],
    disableForReducedMotion: true,
    zIndex: 100,
    scalar: 0.8,
  });
};
