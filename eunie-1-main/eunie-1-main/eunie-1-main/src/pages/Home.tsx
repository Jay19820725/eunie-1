import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../components/ui/Button';
import { Sparkles, ArrowRight, Activity, Calendar, Zap } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../hooks/useAuth';
import { useTest } from '../store/TestContext';
import { LoopStage } from '../App';
import { AuthPromptModal } from '../components/AuthPromptModal';

interface HomeProps {
  onStartTest: () => void;
  loopStage: LoopStage;
  onNavigate: (page: string) => void;
  streak?: number;
}

const EnergyOrb = ({ color, delay, initialPos, size = "100vw" }: { color: string; delay: number; initialPos: { x: string; y: string }; size?: string }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8, left: initialPos.x, top: initialPos.y }}
    animate={{ 
      opacity: [0.35, 0.6, 0.35],
      scale: [1, 1.4, 1],
      x: [0, 80, 0],
      y: [0, -80, 0],
    }}
    transition={{ 
      duration: 35 + delay, 
      repeat: Infinity, 
      ease: "easeInOut",
      delay: delay 
    }}
    className="absolute rounded-full blur-[120px] md:blur-[200px]"
    style={{ 
      width: size,
      height: size,
      backgroundColor: color,
      willChange: 'transform, opacity',
      transform: 'translateZ(0)'
    }}
  />
);

const EnergyField = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-[#FDFCF8]">
    <EnergyOrb color="#B2DFDB" delay={0} initialPos={{ x: '-20%', y: '10%' }} size="120vw" />
    <EnergyOrb color="#FFF59D" delay={8} initialPos={{ x: '50%', y: '20%' }} size="100vw" />
    <EnergyOrb color="#F8BBD0" delay={16} initialPos={{ x: '80%', y: '10%' }} size="110vw" />
    <EnergyOrb color="#C8E6C9" delay={24} initialPos={{ x: '30%', y: '70%' }} size="130vw" />
    
    {/* Washi Texture Overlay */}
    <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]" />
  </div>
);

const StatusCard = ({ title, value, icon: Icon, delay = 0 }: { title: string; value: string; icon: any; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 1.5, delay, ease: [0.22, 1, 0.36, 1] }}
    className="bg-white/30 backdrop-blur-2xl border border-white/50 p-6 md:p-8 rounded-[2.5rem] flex flex-col gap-4 shadow-sm hover:shadow-md transition-all duration-700"
  >
    <div className="flex items-center justify-between">
      <span className="text-[9px] tracking-[0.3em] uppercase text-ink/40 font-medium">{title}</span>
      <div className="p-2 bg-ink/5 rounded-full text-ink/30">
        <Icon size={14} />
      </div>
    </div>
    <div className="text-xl md:text-2xl font-serif text-ink/80 tracking-wide font-light">{value}</div>
  </motion.div>
);

export const Home: React.FC<HomeProps> = ({ onStartTest, loopStage, onNavigate, streak = 0 }) => {
  const { profile, login } = useAuth();
  const { t, language } = useLanguage();
  const { setReportType } = useTest();
  const [lastEnergy, setLastEnergy] = useState<string | null>(null);
  const [isAuthPromptOpen, setIsAuthPromptOpen] = useState(false);
  const [weeklyCount, setWeeklyCount] = useState(0);
  const [latestInsight, setLatestInsight] = useState<string | null>(null);
  const [balanceScore, setBalanceScore] = useState(0);

  const handleStartTest = (type: 'daily' | 'wish' = 'daily') => {
    if (!profile?.uid) {
      setIsAuthPromptOpen(true);
      return;
    }
    setReportType(type);
    onStartTest();
  };

  const handleAuthSuccess = () => {
    // After successful login, automatically start the test
    onStartTest();
  };

  useEffect(() => {
    if (profile?.uid) {
      fetch(`/api/reports/${profile.uid}`)
        .then(res => res.json())
        .then(data => {
          if (data.reports && data.reports.length > 0) {
            const latest = data.reports[0];
            setLastEnergy(latest.dominantElement || null);
            setBalanceScore(latest.balanceScore || 0);
            
            // Extract insight quote if available
            if (latest.analysis && latest.analysis.psychologicalInsight) {
              setLatestInsight(latest.analysis.psychologicalInsight);
            }

            // Calculate weekly count
            const now = new Date();
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const weekly = data.reports.filter((r: any) => new Date(r.createdAt) >= oneWeekAgo).length;
            setWeeklyCount(weekly);
          }
        })
        .catch(() => setLastEnergy(null));
    }
  }, [profile?.uid]);

  const getEnergyAdvice = () => {
    if (balanceScore < 70) {
      return {
        suitable: t('home_wait'),
        unsuitable: t('home_decision')
      };
    }
    return {
      suitable: t('home_decision'),
      unsuitable: t('home_wait')
    };
  };

  const advice = getEnergyAdvice();

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-start px-6 py-24">
      <EnergyField />

      {/* Vertical Side Text */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2, delay: 1 }}
        className="hidden lg:block fixed right-16 top-1/2 -translate-y-1/2 z-20"
        style={{ writingMode: 'vertical-rl' }}
      >
        <span className="text-[9px] tracking-[0.8em] text-ink/20 uppercase font-light">
          {t('home_subtitle')}
        </span>
      </motion.div>

      <div className="ma-container relative z-10 w-full max-w-4xl space-y-16 md:space-y-24">
        {/* Header Section */}
        <div className="text-center space-y-8 mb-12 -mt-[20px] md:mt-0 w-full mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 2 }}
            className="text-[10px] tracking-[0.6em] text-ink/30 uppercase font-light"
          >
            {t('home_top_slogan')}
          </motion.div>
          
          <div className="space-y-6">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.8, delay: 0.3 }}
              className="text-[32px] md:text-5xl font-serif font-extralight text-ink/80 leading-[1.3] tracking-tight"
            >
              {t('home_hero_title')}
            </motion.h1>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 2, delay: 0.8 }}
              className="h-px w-10 bg-ink/10 mx-auto"
            />
          </div>
        </div>

        {/* Dashboard Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.8, delay: 1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full"
        >
          {/* Weekly Stats */}
          <StatusCard 
            title={t('home_weekly_count' as any)} 
            value={`${weeklyCount} ${t('home_streak_unit' as any)}`} 
            icon={Calendar} 
            delay={1.2}
          />

          {/* Energy Status Advice */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.5, delay: 1.4, ease: [0.22, 1, 0.36, 1] }}
            className="bg-white/30 backdrop-blur-2xl border border-white/50 p-6 rounded-[2rem] flex flex-col gap-3 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] tracking-[0.3em] uppercase text-ink/40 font-medium">{t('home_energy_status' as any)}</span>
              <Activity size={14} className="text-ink/20" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-emerald-600/60 font-medium">{t('home_suitable' as any)}</span>
                <span className="text-sm font-serif text-ink/70">「{advice.suitable}」</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-rose-600/60 font-medium">{t('home_not_suitable' as any)}</span>
                <span className="text-sm font-serif text-ink/70">「{advice.unsuitable}」</span>
              </div>
            </div>
          </motion.div>

          {/* Streak */}
          <StatusCard 
            title={t('home_streak_title')} 
            value={streak > 0 ? `${streak} ${t('home_streak_unit')}` : t('home_yesterday_none')} 
            icon={Zap} 
            delay={1.6}
          />
        </motion.div>

        {/* Insight Quote */}
        {latestInsight && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2, delay: 2 }}
            className="text-center px-8 py-12 bg-ink/[0.02] rounded-[3rem] border border-ink/[0.03] relative overflow-hidden group"
          >
            <Sparkles className="absolute top-4 left-4 text-ink/5" size={24} />
            <div className="text-[9px] tracking-[0.5em] text-ink/20 uppercase mb-6">{t('home_insight_quote' as any)}</div>
            <p className="text-lg md:text-xl font-serif italic font-extralight text-ink/60 leading-relaxed max-w-2xl mx-auto">
              「{latestInsight}」
            </p>
            <Sparkles className="absolute bottom-4 right-4 text-ink/5" size={24} />
          </motion.div>
        )}

        {/* Action Section - Dual Entry Points */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl mx-auto">
          {/* Heart's Wish Entry */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1.5, delay: 2.2 }}
          >
            <button 
              onClick={() => handleStartTest('wish')}
              className="w-full group relative overflow-hidden p-8 md:p-12 rounded-[3rem] bg-ink text-white shadow-2xl shadow-ink/20 transition-all duration-700 hover:scale-[1.02] active:scale-[0.98] text-left"
            >
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <Sparkles size={80} />
              </div>
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                    <Sparkles size={16} />
                  </div>
                  <span className="text-[10px] tracking-[0.3em] uppercase text-white/40">{t('home_sparkle_cost' as any)}</span>
                </div>
                <h3 className="text-2xl md:text-3xl font-serif font-light tracking-wide">{t('home_wish_title' as any)}</h3>
                <p className="text-xs text-white/40 font-light tracking-widest leading-relaxed max-w-[200px]">
                  {t('home_wish_desc' as any)}
                </p>
                <div className="pt-4 flex items-center gap-2 text-[10px] tracking-[0.4em] uppercase text-white/60 group-hover:text-white transition-colors">
                  {t('home_start_btn')} <ArrowRight size={12} className="group-hover:translate-x-2 transition-transform" />
                </div>
              </div>
            </button>
          </motion.div>

          {/* Daily Energy Entry */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1.5, delay: 2.4 }}
          >
            <button 
              onClick={() => handleStartTest('daily')}
              className="w-full group relative overflow-hidden p-8 md:p-12 rounded-[3rem] bg-white border border-ink/5 text-ink shadow-xl shadow-ink/5 transition-all duration-700 hover:scale-[1.02] active:scale-[0.98] text-left"
            >
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                <Activity size={80} />
              </div>
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-ink/5 flex items-center justify-center">
                    <Activity size={16} className="text-ink/40" />
                  </div>
                  <span className="text-[10px] tracking-[0.3em] uppercase text-ink/30">{t('home_sparkle_cost' as any)}</span>
                </div>
                <h3 className="text-2xl md:text-3xl font-serif font-light tracking-wide">{t('home_energy_title' as any)}</h3>
                <p className="text-xs text-ink/30 font-light tracking-widest leading-relaxed max-w-[200px]">
                  {t('home_energy_desc' as any)}
                </p>
                <div className="pt-4 flex items-center gap-2 text-[10px] tracking-[0.4em] uppercase text-ink/40 group-hover:text-ink transition-colors">
                  {t('home_start_btn')} <ArrowRight size={12} className="group-hover:translate-x-2 transition-transform" />
                </div>
              </div>
            </button>
          </motion.div>
        </div>

        {/* Five Elements Visualizer */}
        <div className="flex justify-center gap-10 md:gap-16 pt-8">
          {[
            { id: 'wood', color: 'bg-wood' },
            { id: 'fire', color: 'bg-fire' },
            { id: 'earth', color: 'bg-earth' },
            { id: 'metal', color: 'bg-metal' },
            { id: 'water', color: 'bg-water' }
          ].map((el, i) => (
            <motion.div
              key={el.id}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: lastEnergy === el.id ? 1 : 0.1, scale: lastEnergy === el.id ? 1.2 : 1 }}
              whileHover={{ opacity: 0.5, scale: 1.1 }}
              transition={{ delay: 3.5 + (i * 0.1) }}
              className="flex flex-col items-center gap-6 group cursor-default"
            >
              <div className={`w-1 h-1 rounded-full ${el.color} shadow-[0_0_10px_currentColor] transition-all duration-700`} />
              <span className="text-[7px] tracking-[0.4em] text-ink/20 uppercase font-serif group-hover:text-ink/40 transition-colors duration-500">{t(`home_element_${el.id}`)}</span>
            </motion.div>
          ))}
        </div>
      </div>

      <AuthPromptModal 
        isOpen={isAuthPromptOpen} 
        onClose={() => setIsAuthPromptOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Background Breathing Hint */}
      <motion.div
        animate={{ opacity: [0.03, 0.1, 0.03] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="fixed bottom-12 left-1/2 -translate-x-1/2 text-[7px] tracking-[1em] text-ink/10 uppercase pointer-events-none font-light"
      >
        {t('home_breath')}
      </motion.div>
    </div>
  );
};
