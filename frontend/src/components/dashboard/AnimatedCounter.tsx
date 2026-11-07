import React, { useEffect, useState } from 'react';
import { animate } from 'framer-motion';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 1.2,
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    // If value is 0, display 0 immediately
    if (value === 0) {
      setDisplayValue(0);
      return;
    }

    const controls = animate(0, value, {
      duration: Math.min(duration, 1.8),
      ease: 'easeOut',
      onUpdate: (latest) => {
        setDisplayValue(Math.round(latest));
      },
    });

    return () => controls.stop();
  }, [value, duration]);

  return <span>{displayValue.toLocaleString()}</span>;
};

export default AnimatedCounter;

