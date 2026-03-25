import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Plus } from 'lucide-react';
import { useTest } from '../../store/TestContext';
import { useLanguage } from '../../i18n/LanguageContext';

export const EnergyStatus: React.FC = () => {
  const { userPoints, setIsPurchaseModalOpen } = useTest();
  const { t } = useLanguage();

  const isLow = userPoints > 0 && userPoints <= 3;
  const isEmpty = userPoints === 0;

  return (
    <div className="fixed top-6 left-6 md:left-auto md:right-32 z-50">
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsPurchaseModalOpen(true)}
        className={`
          flex items-center gap-3 px-4 py-2 rounded-full cursor-pointer transition-all duration-500
          backdrop-blur-2xl border shadow-lg
          ${isEmpty
            ? 'bg-fire/10 border-fire/30 text-fire shadow-fire/10'
            : isLow
              ? 'bg-earth/10 border-earth/30 text-earth shadow-earth/10'
              : 'bg-white/40 border-white/40 text-wood shadow-black/5'}
        `}
      >
        <div className={`
          flex items-center justify-center w-6 h-6 rounded-full
          ${isEmpty ? 'bg-fire/20' : isLow ? 'bg-earth/20' : 'bg-wood/10'}
        `}>
          <Zap size={14} className={isEmpty || isLow ? 'fill-current' : ''} />
        </div>

        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-widest opacity-60 font-medium leading-none mb-0.5">
            {t('points_remaining')}
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-serif font-bold">{userPoints}</span>
            <span className="text-[10px] opacity-40">/ 15</span>
          </div>
        </div>

        <div className="ml-1 p-1 rounded-full bg-black/5 hover:bg-black/10 transition-colors">
          <Plus size={12} />
        </div>

        {/* Scarcity Hint for low points */}
        <AnimatePresence>
          {isLow && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="absolute top-full mt-2 left-0 right-0"
            >
              <div className="bg-earth/90 backdrop-blur-md text-white text-[9px] py-1 px-3 rounded-lg whitespace-nowrap shadow-xl">
                {t('points_scarcity_hint').replace('{count}', userPoints.toString())}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
