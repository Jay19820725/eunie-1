import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../components/ui/Button';
import { Sparkles, ArrowRight, Activity, Calendar, Zap } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../hooks/useAuth';
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
  const [lastEnergy, setLastEnergy] = useState<string | null>(null);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [isAuthPromptOpen, setIsAuthPromptOpen] = useState(false);

  const handleStartTest = () => {
    if (!profile?.uid) {
      setIsAuthPromptOpen(true);
      return;
    }
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
            setRecentReports(data.reports.slice(0, 7).reverse());
          }
        })
        .catch(() => setLastEnergy(null));
    }
  }, [profile?.uid]);

  const getStatusText = () => {
    if (loopStage === 'calibration') return t('home_status_pending');
    if (loopStage === 'completed') return t('home_status_calibrated');
    return t('home_continue_loop');
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 py-24">
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

      <div className="ma-container relative z-10 w-full max-w-4xl space-y-24 md:space-y-36">
        {/* Header Section */}
        <div className="text-center space-y-12 mb-24 -mt-[50px] md:mt-0 w-[264px] md:w-full mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 2 }}
            className="text-[10px] tracking-[0.6em] text-ink/30 uppercase font-light"
          >
            {t('home_top_slogan')}
          </motion.div>
          
          <div className="space-y-10">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.8, delay: 0.3 }}
              className="text-[38px] md:text-6xl font-serif font-extralight text-ink/80 leading-[1.3] tracking-tight"
            >
              {t('home_hero_title')}
            </motion.h1>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 2, delay: 0.8 }}
              className="h-px w-10 bg-ink/10 mx-auto -mt-5"
            />

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.8, delay: 1.2 }}
              className="text-xs md:text-base text-ink/40 font-light tracking-[0.3em] -mt-5"
            >
              {t('home_hero_desc')}
            </motion.p>
          </div>
        </div>

        {/* Action Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.8, delay: 1.5 }}
          className="flex flex-col items-center gap-16 md:gap-24"
        >
          {/* Dashboard Grid - Moved Above Button */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl -mt-10 md:-mt-[80px] p-0 mb-0">
            <StatusCard 
              title={t('home_status_title')} 
              value={getStatusText()} 
              icon={Activity} 
              delay={1.5}
            />
            <StatusCard 
              title={t('home_streak_title' as any)} 
              value={streak > 0 ? `${streak} ${t('home_streak_unit' as any)}` : t('home_yesterday_none')} 
              icon={Zap} 
              delay={1.7}
            />
          </div>

          {/* Growth Trajectory (New) */}
          {recentReports.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 2, delay: 2 }}
              className="w-full max-w-2xl px-4 space-y-6 md:mt-[-50px] md:mb-0"
            >
              <div className="flex items-center justify-between px-2">
                <span className="text-[9px] tracking-[0.3em] uppercase text-ink/30 font-medium">
                  {t('home_growth_title' as any)}
                </span>
                <span className="text-[9px] tracking-[0.3em] uppercase text-ink/20 font-light">
                  {t('home_growth_subtitle' as any)}
                </span>
              </div>
              <div className="flex items-end justify-between h-16 px-4 border-b border-ink/[0.03]">
                {recentReports.map((report, idx) => (
                  <div key={report.id} className="flex flex-col items-center gap-3 group relative">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(report.balanceScore || 50)}%` }}
                      transition={{ duration: 1.5, delay: 2.2 + (idx * 0.1) }}
                      className={`w-1.5 rounded-t-full transition-all duration-500 ${
                        report.dominantElement === 'wood' ? 'bg-wood' :
                        report.dominantElement === 'fire' ? 'bg-fire' :
                        report.dominantElement === 'earth' ? 'bg-earth' :
                        report.dominantElement === 'metal' ? 'bg-metal' :
                        'bg-water'
                      } opacity-40 group-hover:opacity-100`}
                    />
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-md px-2 py-1 rounded-md border border-ink/5 text-[8px] text-ink/60 whitespace-nowrap z-20">
                      {report.balanceScore}% {t('home_balance_label' as any)}
                    </div>
                  </div>
                ))}
                {/* Fill empty days if less than 7 */}
                {Array.from({ length: Math.max(0, 7 - recentReports.length) }).map((_, i) => (
                  <div key={`empty-${i}`} className="w-1.5 h-1 bg-ink/[0.03] rounded-t-full" />
                ))}
              </div>
            </motion.div>
          )}

          {loopStage === 'calibration' ? (
            <Button 
              onClick={handleStartTest}
              className="group relative overflow-hidden h-16 md:h-20 px-16 md:px-24 rounded-full text-sm md:text-base tracking-[0.5em] bg-ink text-white hover:bg-ink/90 shadow-2xl shadow-ink/10 transition-all duration-700 md:mt-[-40px]"
            >
              <span className="relative z-10 flex items-center gap-4">
                {t('home_start_btn')}
                <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform duration-700" />
              </span>
            </Button>
          ) : (
            <div className="flex flex-wrap justify-center gap-8 md:-mt-[30px]">
              <Button 
                onClick={() => onNavigate(loopStage === 'resonance' ? 'ocean' : 'history')}
                className="h-14 px-10 rounded-full text-[10px] tracking-[0.4em] bg-ink text-white hover:bg-ink/90 shadow-xl shadow-ink/10"
              >
                {t('home_continue_loop')}
              </Button>
              <Button 
                onClick={handleStartTest}
                variant="outline"
                className="h-14 px-10 rounded-full text-[10px] tracking-[0.4em] border-ink/10 text-ink/30 hover:text-ink hover:border-ink/20"
              >
                {t('report_new_test')}
              </Button>
            </div>
          )}

          {/* Five Elements Visualizer */}
          <div className="flex gap-10 md:gap-16 pt-8">
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
                transition={{ delay: 2.2 + (i * 0.1) }}
                className="flex flex-col items-center gap-6 group cursor-default"
              >
                <div className={`w-1 h-1 rounded-full ${el.color} shadow-[0_0_10px_currentColor] transition-all duration-700`} />
                <span className="text-[7px] tracking-[0.4em] text-ink/20 uppercase font-serif group-hover:text-ink/40 transition-colors duration-500">{t(`home_element_${el.id}`)}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
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
