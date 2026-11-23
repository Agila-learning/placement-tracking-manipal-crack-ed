import React from 'react';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ value }) => {
  return <span>{Number(value || 0).toLocaleString()}</span>;
};

export default AnimatedCounter;
