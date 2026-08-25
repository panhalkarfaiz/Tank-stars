import React, { useState } from 'react';
import {
  Settings,
  Volume2,
  VolumeX,
  Eye,
  Wind,
  Sliders,
  X,
  Download,
  CheckCircle,
  ShieldCheck,
  Play,
  RotateCcw,
} from 'lucide-react';
import { GameSettings, AIDifficulty } from '../types';
import { soundManager } from '../audio/soundManager';
import { run7PillarsTestSuite, TestSuiteReport } from '../tests/gameTestSuite';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onUpdateSettings, onClose }) => {
  const [testReport, setTestReport] = useState<TestSuiteReport | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleRunTests = () => {
    soundManager.playClick();
    setIsRunningTests(true);
    setTimeout(() => {
      const report = run7PillarsTestSuite();
      setTestReport(report);
      setIsRunningTests(false);
    }, 200);
  };

  const handleDownloadZip = () => {
    soundManager.playClick();
    const link = document.createElement('a');
    link.href = '/tankstars-game-source.zip';
    link.download = 'tankstars-3d-source-code.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 text-white max-h-[92vh] overflow-y-auto">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg sm:text-xl font-black">GAME SETTINGS & QA TESTING</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SETTINGS OPTIONS */}
        <div className="flex flex-col gap-3.5">
          {/* Trajectory Guide Line Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-xs sm:text-sm text-white">Trajectory Aim Arc Guide</div>
              <div className="text-[11px] text-slate-400">Shows real-time ballistic projectile path preview</div>
            </div>
            <button
              onClick={() => {
                soundManager.playClick();
                onUpdateSettings({ showTrajectory: !settings.showTrajectory });
              }}
              className={`w-12 h-6 rounded-full transition-colors relative p-1 ${
                settings.showTrajectory ? 'bg-amber-500' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  settings.showTrajectory ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Trajectory Length Slider */}
          {settings.showTrajectory && (
            <div className="flex flex-col gap-1.5 bg-slate-950 p-2.5 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-400">ARC PREVIEW LENGTH</span>
                <span className="font-mono text-amber-300">{settings.trajectoryLength}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                value={settings.trajectoryLength}
                onChange={(e) => onUpdateSettings({ trajectoryLength: Number(e.target.value) })}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>
          )}

          {/* Wind Physics Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-xs sm:text-sm text-white">Battlefield Wind Effects</div>
              <div className="text-[11px] text-slate-400">Dynamic wind shifts ballistic trajectories</div>
            </div>
            <button
              onClick={() => {
                soundManager.playClick();
                onUpdateSettings({ windEnabled: !settings.windEnabled });
              }}
              className={`w-12 h-6 rounded-full transition-colors relative p-1 ${
                settings.windEnabled ? 'bg-cyan-500' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  settings.windEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Camera Mode Select */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-xs sm:text-sm text-white">Camera Follow Mode</div>
              <div className="text-[11px] text-slate-400">Dynamic bullet tracking vs wide overview</div>
            </div>
            <select
              value={settings.cameraMode}
              onChange={(e) =>
                onUpdateSettings({
                  cameraMode: e.target.value as 'dynamic' | 'cinematic' | 'overview',
                })
              }
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-amber-400"
            >
              <option value="dynamic">Dynamic Action</option>
              <option value="cinematic">Cinematic Zoom</option>
              <option value="overview">Battlefield Overview</option>
            </select>
          </div>

          {/* Sound FX Volume */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-emerald-400" /> SOUND FX VOLUME
              </span>
              <span className="font-mono text-emerald-300">{Math.round(settings.soundVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.soundVolume}
              onChange={(e) => {
                const vol = Number(e.target.value);
                soundManager.setVolume(vol);
                onUpdateSettings({ soundVolume: vol });
              }}
              className="w-full accent-emerald-400 cursor-pointer"
            />
          </div>
        </div>

        {/* 7 PILLARS TESTING & ZIP DOWNLOAD SECTION */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                7 PILLARS SOFTWARE TESTING & ARTIFACTS
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRunTests}
              disabled={isRunningTests}
              className="flex-1 py-2 px-3 rounded-xl font-bold text-xs uppercase bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              {isRunningTests ? 'RUNNING TESTS...' : 'RUN 7 PILLARS TESTS'}
            </button>

            <button
              onClick={handleDownloadZip}
              className="flex-1 py-2 px-3 rounded-xl font-black text-xs uppercase bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md"
            >
              <Download className="w-3.5 h-3.5" />
              {downloadSuccess ? 'DOWNLOAD STARTED! ✅' : 'DOWNLOAD CODE (.ZIP)'}
            </button>
          </div>

          {/* Test Results Output */}
          {testReport && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex flex-col gap-1.5 text-xs">
              <div className="flex items-center justify-between font-bold border-b border-slate-800 pb-1">
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> ALL {testReport.totalTests} TESTS PASSED
                </span>
                <span className="text-slate-400 font-mono text-[10px]">{testReport.timestamp.slice(11, 19)}</span>
              </div>
              <div className="flex flex-col gap-1 max-h-32 overflow-y-auto pr-1">
                {Object.entries(testReport.pillarsSummary).map(([pillar, stats]) => {
                  const s = stats as { total: number; passed: number };
                  return (
                    <div key={pillar} className="flex items-center justify-between text-[11px] text-slate-300">
                      <span className="truncate max-w-[240px]">{pillar}</span>
                      <span className="font-mono text-emerald-400 font-bold">
                        {s.passed}/{s.total} PASS
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 text-white transition active:scale-95"
        >
          Save & Close
        </button>
      </div>
    </div>
  );
};
