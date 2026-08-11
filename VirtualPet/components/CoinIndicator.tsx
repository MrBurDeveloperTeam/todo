
import React from 'react';

interface CoinIndicatorProps {
  amount: number;
}

const CoinIndicator: React.FC<CoinIndicatorProps> = ({ amount }) => {
  return (
    <div className="flex h-full shrink-0 cursor-default select-none items-center gap-1 bg-transparent px-1 text-black transition-transform duration-300 hover:scale-105 sm:gap-1.5 sm:px-1.5">
      <div className="text-xs drop-shadow-sm filter sm:text-sm lg:text-lg">💰</div>
      <span className="whitespace-nowrap text-xs font-black tracking-wide text-black sm:text-sm lg:text-base">{amount}</span>
    </div>
  );
};

export default CoinIndicator;
