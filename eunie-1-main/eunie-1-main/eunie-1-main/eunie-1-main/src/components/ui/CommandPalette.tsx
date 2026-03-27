import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ArrowRight, LayoutDashboard, Users, CreditCard, Database, BarChart, ImageIcon, Sparkles, Music, Waves, BarChart3, Settings } from 'lucide-react';

interface Command {
  id: string;
  title: string;
  icon: React.ReactNode;
  action: () => void;
  shortcut?: string[];
  category: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: Command[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, commands }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredCommands = commands.filter((cmd) =>
    cmd.title.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 10);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter' && filteredCommands.length > 0) {
        e.preventDefault();
        filteredCommands[selectedIndex].action();
        onClose();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center pt-[15vh] px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-ink/5"
      >
        <div className="flex items-center px-4 py-4 border-b border-ink/5 gap-3">
          <Search className="text-ink-muted" size={20} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋指令或跳轉模組 (試試輸入 '用戶' 或 '設定')..."
            className="flex-1 bg-transparent border-none outline-none text-ink placeholder:text-ink/30 text-base"
          />
          <div className="flex gap-1">
            <kbd className="px-2 py-1 bg-ink/5 rounded text-[10px] text-ink-muted font-mono uppercase">ESC</kbd>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center text-ink-muted text-sm">
              找不到符合 "{query}" 的指令
            </div>
          ) : (
            filteredCommands.map((cmd, index) => (
              <button
                key={cmd.id}
                onClick={() => {
                  cmd.action();
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${
                  index === selectedIndex ? 'bg-wood/10 text-wood' : 'hover:bg-ink/5 text-ink'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${index === selectedIndex ? 'bg-wood/20' : 'bg-ink/5'}`}>
                    {cmd.icon}
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium">{cmd.title}</span>
                    <span className="text-[10px] uppercase tracking-widest opacity-60">{cmd.category}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {cmd.shortcut && (
                    <div className="flex gap-1">
                      {cmd.shortcut.map(key => (
                        <kbd key={key} className={`px-2 py-1 rounded text-[10px] font-mono uppercase ${
                          index === selectedIndex ? 'bg-wood/20 text-wood' : 'bg-ink/5 text-ink-muted'
                        }`}>
                          {key}
                        </kbd>
                      ))}
                    </div>
                  )}
                  <ArrowRight size={14} className={index === selectedIndex ? 'opacity-100' : 'opacity-0'} />
                </div>
              </button>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};
