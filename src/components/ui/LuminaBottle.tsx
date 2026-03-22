import React from 'react';
import { motion } from 'motion/react';
import { Zap, Plus } from 'lucide-react';
import { useTest } from '../../store/TestContext';
import { useLanguage } from '../../i18n/LanguageContext';

export const LuminaBottle: React.FC = () => {
  const { userPoints, setIsPurchaseModalOpen } = useTest();
  const { t, language } = useLanguage();

  const fillPercentage = Math.min(100, (userPoints / 15) * 100);
  const isLow = userPoints < 3;
  const isEmpty = userPoints < 1;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed top-4 right-4 md:top-8 md:right-8 z-[40] flex items-center gap-3"
    >
      <div 
        onClick={() => setIsPurchaseModalOpen(true)}
        className={`group relative flex items-center gap-3 px-4 py-2 backdrop-blur-xl border rounded-2xl shadow-lg cursor-pointer transition-all ${
          isEmpty ? 'bg-rose-50/40 border-rose-200/50 hover:bg-rose-50/60' :
          isLow ? 'bg-amber-50/40 border-amber-200/50 hover:bg-amber-50/60' :
          'bg-white/40 border-white/50 hover:bg-white/60'
        }`}
      >
        {/* Bottle Icon / Energy Ball */}
        <div className="relative w-8 h-8 flex items-center justify-center">
          <div className={`absolute inset-0 rounded-full blur-md transition-colors ${
            isEmpty ? 'bg-rose-500/10 group-hover:bg-rose-500/20' :
            isLow ? 'bg-amber-500/10 group-hover:bg-amber-500/20' :
            'bg-wood/10 group-hover:bg-wood/20'
          }`} />
          <motion.div
            animate={{ 
              scale: isEmpty ? [1, 1.2, 1] : [1, 1.1, 1],
              opacity: isEmpty ? [0.4, 0.7, 0.4] : [0.6, 0.9, 0.6]
            }}
            transition={{ duration: isEmpty ? 1.5 : 3, repeat: Infinity, ease: "easeInOut" }}
            className={`relative w-4 h-4 rounded-full shadow-lg transition-colors ${
              isEmpty ? 'bg-rose-400 shadow-rose-400/50' :
              isLow ? 'bg-amber-400 shadow-amber-400/50' :
              'bg-wood shadow-wood/50'
            }`}
          />
          
          {/* Fill Level Indicator */}
          <svg className="absolute inset-0 -rotate-90 w-8 h-8">
            <circle
              cx="16"
              cy="16"
              r="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-ink/5"
            />
            <motion.circle
              cx="16"
              cy="16"
              r="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="88"
              initial={{ strokeDashoffset: 88 }}
              animate={{ strokeDashoffset: 88 - (88 * fillPercentage) / 100 }}
              className={isEmpty ? 'text-rose-400' : isLow ? 'text-amber-400' : 'text-wood'}
            />
          </svg>
        </div>

        <div className="flex flex-col">
          <span className={`text-[9px] uppercase tracking-[0.2em] leading-none mb-0.5 ${
            isEmpty ? 'text-rose-500' : isLow ? 'text-amber-600' : 'text-ink-muted'
          }`}>
            {t('energy_name')}
          </span>
          <div className="flex items-center gap-1.5">
            <span className={`text-sm font-serif leading-none ${isEmpty ? 'text-rose-600' : 'text-ink'}`}>{userPoints}</span>
            <Zap size={10} className={`fill-current ${isEmpty ? 'text-rose-400' : isLow ? 'text-amber-400' : 'text-wood'}`} />
          </div>
        </div>

        <div className={`ml-1 p-1 rounded-lg transition-colors ${
          isEmpty ? 'bg-rose-500/10 group-hover:bg-rose-500/20' :
          isLow ? 'bg-amber-500/10 group-hover:bg-amber-500/20' :
          'bg-wood/10 group-hover:bg-wood/20'
        }`}>
          <Plus size={12} className={isEmpty ? 'text-rose-500' : isLow ? 'text-amber-600' : 'text-wood'} />
        </div>
      </div>
    </motion.div>
  );
};
