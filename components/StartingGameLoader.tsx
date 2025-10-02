import React from 'react';
import D20Icon from './icons/D20Icon';

const StartingGameLoader: React.FC = () => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
      <D20Icon className="w-24 h-24 text-amber-400 animate-spin" style={{ animationDuration: '3s' }} />
      <h2 className="mt-6 text-3xl font-modesto text-amber-200 drop-shadow-[0_2px_2px_rgba(0,0,0,0.7)]">
        The Adventure Begins...
      </h2>
      <p className="mt-2 text-slate-400 font-signika">
        The Dungeon Master is preparing your world. Please wait.
      </p>
    </div>
  );
};

export default StartingGameLoader;
