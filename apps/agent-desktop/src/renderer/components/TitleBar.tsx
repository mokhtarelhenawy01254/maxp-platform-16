import React, { useState, useEffect } from 'react';
import { Minus, Square, Copy, X, Bot, Sparkles, Command, Sun, Moon } from 'lucide-react';
import { useTheme } from '../theme/ThemeContext';

interface TitleBarProps {
  storeName?: string;
  isLoggedIn?: boolean;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  storeName = 'متجر سوان',
  isLoggedIn = false,
}) => {
  const { mode, toggleTheme } = useTheme();
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (window.electronAPI?.windowIsMaximized) {
      window.electronAPI.windowIsMaximized().then(setIsMaximized).catch(() => {});
    }
  }, []);

  const handleMinimize = () => {
    window.electronAPI?.windowMinimize?.();
  };

  const handleToggleMaximize = async () => {
    if (window.electronAPI?.windowToggleMaximize) {
      const nowMax = await window.electronAPI.windowToggleMaximize();
      setIsMaximized(nowMax);
    }
  };

  const handleClose = () => {
    window.electronAPI?.windowClose?.();
  };

  return (
    <header className="h-9 flex items-center justify-between px-3 select-none bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 z-50 transition-colors">
      {/* Draggable Title / Brand Region */}
      <div
        className="flex items-center gap-3 flex-1 h-full cursor-grab active:cursor-grabbing"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Bot size={12} />
          </div>
          <span className="text-xs font-black tracking-tight text-white flex items-center gap-1.5">
            <span>MaxP Agent Studio</span>
            <span className="text-[10px] font-mono text-indigo-400 px-1.5 py-0.2 bg-indigo-950/60 border border-indigo-800/40 rounded">
              v1.0
            </span>
          </span>
        </div>

        {isLoggedIn && (
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400 font-medium mr-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {storeName}
            </span>
          </div>
        )}

        <div className="hidden md:flex items-center gap-1 text-[10px] text-slate-500 mr-auto font-mono">
          <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
            Alt + Space
          </span>
          <span>لإظهار وإخفاء الاستوديو</span>
        </div>
      </div>

      {/* Non-draggable Window Controls */}
      <div
        className="flex items-center gap-1 h-full"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-black/10 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          title={mode === 'dark' ? 'التحويل إلى الوضع النهاري (Light Mode)' : 'التحويل إلى الوضع الليلي (Dark Mode)'}
          aria-label="Toggle Theme"
        >
          {mode === 'dark' ? <Sun size={13} className="text-amber-400" /> : <Moon size={13} className="text-indigo-600" />}
        </button>

        <button
          type="button"
          onClick={handleMinimize}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          title="تصغير النافذة"
          aria-label="Minimize"
        >
          <Minus size={13} />
        </button>

        <button
          type="button"
          onClick={handleToggleMaximize}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          title={isMaximized ? 'استعادة الحجم' : 'تكبير النافذة'}
          aria-label="Maximize"
        >
          {isMaximized ? <Copy size={11} className="rotate-180" /> : <Square size={11} />}
        </button>

        <button
          type="button"
          onClick={handleClose}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-rose-600 text-slate-400 hover:text-white transition-colors"
          title="إخفاء في شريط المهام"
          aria-label="Close"
        >
          <X size={14} />
        </button>
      </div>
    </header>
  );
};
