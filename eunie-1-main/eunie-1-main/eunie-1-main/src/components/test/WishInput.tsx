import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useTest } from '../../store/TestContext';
import { Sparkles, Briefcase, Heart, Activity, Coins, MoreHorizontal } from 'lucide-react';

const WishInput: React.FC = () => {
  const { t } = useLanguage();
  const { setWishContext, startDraw } = useTest();
  const [category, setCategory] = useState('career');
  const [target, setTarget] = useState('');
  const [content, setContent] = useState('');

  const categories = [
    { id: 'career', icon: Briefcase, label: t('wish_category_career') },
    { id: 'love', icon: Heart, label: t('wish_category_love') },
    { id: 'health', icon: Activity, label: t('wish_category_health') },
    { id: 'wealth', icon: Coins, label: t('wish_category_wealth') },
    { id: 'other', icon: MoreHorizontal, label: t('wish_category_other') },
  ];

  const handleNext = () => {
    if (!target.trim() || !content.trim()) return;

    setWishContext({
      domains: [category],
      targets: { [category]: target },
      contents: { [category]: content }
    });
    
    startDraw('wish', {
      domains: [category],
      targets: { [category]: target },
      contents: { [category]: content }
    });
  };

  const isFormValid = target.trim() && content.trim();

  return (
    <div className="w-full max-w-2xl mx-auto px-6 py-12 space-y-12">
      <div className="text-center space-y-4">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl md:text-4xl font-serif font-light text-ink tracking-widest"
        >
          {t('wish_input_title')}
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xs text-ink/40 tracking-[0.2em] font-light"
        >
          {t('wish_input_desc')}
        </motion.p>
      </div>

      <div className="space-y-10">
        {/* Category Selection */}
        <div className="space-y-4">
          <label className="text-[10px] tracking-[0.3em] uppercase text-ink/30 font-medium px-2">
            {t('wish_category_label')}
          </label>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border transition-all duration-500 ${
                  category === cat.id 
                    ? 'bg-ink text-white border-ink shadow-lg shadow-ink/10' 
                    : 'bg-white/50 border-ink/5 text-ink/40 hover:border-ink/20'
                }`}
              >
                <cat.icon size={20} className={category === cat.id ? 'text-white' : 'text-ink/20'} />
                <span className="text-[9px] tracking-widest font-light">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Target Input */}
        <div className="space-y-4">
          <label className="text-[10px] tracking-[0.3em] uppercase text-ink/30 font-medium px-2">
            {t('wish_target_label')}
          </label>
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder={t('wish_target_placeholder')}
            className="w-full bg-white/50 border border-ink/5 rounded-2xl px-6 py-4 text-sm text-ink placeholder:text-ink/20 focus:outline-none focus:border-ink/20 transition-all font-light tracking-wide"
          />
        </div>

        {/* Content Input */}
        <div className="space-y-4">
          <label className="text-[10px] tracking-[0.3em] uppercase text-ink/30 font-medium px-2">
            {t('wish_content_label')}
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('wish_content_placeholder')}
            rows={4}
            className="w-full bg-white/50 border border-ink/5 rounded-3xl px-6 py-5 text-sm text-ink placeholder:text-ink/20 focus:outline-none focus:border-ink/20 transition-all font-light tracking-wide resize-none leading-relaxed"
          />
        </div>

        {/* Next Button */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="pt-8 flex justify-center"
        >
          <button
            disabled={!isFormValid}
            onClick={handleNext}
            className={`group relative overflow-hidden h-16 px-16 rounded-full text-sm tracking-[0.5em] transition-all duration-700 ${
              isFormValid 
                ? 'bg-ink text-white shadow-2xl shadow-ink/20 hover:scale-105 active:scale-95' 
                : 'bg-ink/5 text-ink/20 cursor-not-allowed'
            }`}
          >
            <span className="relative z-10 flex items-center gap-4">
              {t('wish_next_btn')}
              <Sparkles size={16} className={isFormValid ? 'animate-pulse' : ''} />
            </span>
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default WishInput;
