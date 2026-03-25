import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Zap, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from './ui/Button';
import { useLanguage } from '../i18n/LanguageContext';
import { useTest } from '../store/TestContext';

interface PreConsumptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const PreConsumptionModal: React.FC<PreConsumptionModalProps> = ({
  isOpen,
  onClose,
  onConfirm
}) => {
  const { t } = useLanguage();
  const { userPoints } = useTest();
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    setIsConfirming(true);
    // Add a small artificial delay for ritual feel
    await new Promise(resolve => setTimeout(resolve, 600));
    onConfirm();
    setIsConfirming(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md bg-white/90 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/50 p-8"
        >
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 hover:bg-ink/5 rounded-full transition-colors"
          >
            <X size={20} className="text-ink-muted" />
          </button>

          <div className="flex flex-col items-center text-center space-y-6">
            <div className="relative">
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.3, 0.6, 0.3]
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 bg-wood/20 rounded-full blur-2xl"
              />
              <div className="relative w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl shadow-wood/5 border border-wood/5">
                <Zap size={28} className="text-wood fill-wood" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-serif text-ink tracking-wide">
                {t('test_revealed_ready')}
              </h2>
              <p className="text-sm text-ink-muted leading-relaxed font-light px-4">
                {t('points_pre_consume_hint')}
              </p>
            </div>

            <div className="w-full bg-ink/5 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <Zap size={18} className="text-wood fill-wood" />
                </div>
                <div className="text-left">
                  <div className="text-[10px] uppercase tracking-widest text-ink-muted leading-none mb-1">
                    {t('points_remaining')}
                  </div>
                  <div className="text-sm font-serif text-ink leading-none">
                    {userPoints} 點靈光
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-wood">
                <span className="text-xs font-medium">-1</span>
                <Zap size={14} className="fill-wood" />
              </div>
            </div>

            <div className="w-full space-y-4">
              <Button
                onClick={handleConfirm}
                isLoading={isConfirming}
                className="w-full h-14 rounded-2xl shadow-xl shadow-wood/10 group"
              >
                <span className="flex items-center gap-2">
                  {t('test_revealed_view_report')}
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </Button>
            </div>

            <div className="flex items-center justify-center gap-2 text-[10px] text-ink-muted uppercase tracking-widest">
              <ShieldCheck size={14} />
              能量校準保護中
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
