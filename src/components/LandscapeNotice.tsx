import React, { useState, useEffect } from 'react';
import { Smartphone, RotateCw, Maximize2 } from 'lucide-react';
import { soundManager } from '../audio/soundManager';

export const LandscapeNotice: React.FC = () => {
  const [isPortraitMobile, setIsPortraitMobile] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      const isMobileDevice =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        ) || (window.innerWidth < 768 && window.innerHeight > window.innerWidth);

      const isPortrait = window.innerHeight > window.innerWidth && window.innerWidth < 850;
      setIsPortraitMobile(isMobileDevice && isPortrait);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  const handleRequestFullscreenAndLandscape = async () => {
    soundManager.playClick();
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      if (screen.orientation && (screen.orientation as any).lock) {
        await (screen.orientation as any).lock('landscape');
      }
    } catch (err) {
      console.log('Fullscreen/orientation lock not permitted directly:', err);
    }
  };

  if (!isPortraitMobile || dismissed) {
    return null;
  }

  return (
    <div
      id="landscape-orientation-overlay"
      className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center text-white select-none"
    >
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center gap-5">
        {/* Animated Rotating Phone Icon */}
        <div className="relative w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-amber-500/10 animate-ping" />
          <div className="w-20 h-20 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center shadow-lg">
            <Smartphone className="w-10 h-10 text-amber-400 animate-[spin_4s_ease-in-out_infinite]" />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-amber-400 font-mono text-xs font-black tracking-widest uppercase">
            ORIENTATION LOCK
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white">ROTATE YOUR DEVICE</h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Tank Stars 3D requires <strong>Landscape Mode</strong> for precise ballistic aiming, full destructible terrain view, and combat controls.
          </p>
        </div>

        <div className="flex flex-col w-full gap-2.5">
          <button
            onClick={handleRequestFullscreenAndLandscape}
            className="w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 shadow-lg flex items-center justify-center gap-2 active:scale-95 transition"
          >
            <Maximize2 className="w-4 h-4" />
            ENTER FULLSCREEN LANDSCAPE
          </button>

          <button
            onClick={() => setDismissed(true)}
            className="text-[11px] font-bold text-slate-400 hover:text-slate-300 py-1"
          >
            Continue in Portrait anyway
          </button>
        </div>
      </div>
    </div>
  );
};
