import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, User, History, Home, ShieldAlert, Waves } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../hooks/useAuth';

interface NavigationProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentPath, onNavigate }) => {
  const { t } = useLanguage();
  const { isAdmin, user, isPremium } = useAuth();
  
  // 方案 A：漸進式路徑方案 (The Journey)
  // 1. 未登入用戶 (Newbie): [首頁] [開始測驗 (核心高亮)] [個人]
  // 2. 免費用戶 (Free): [首頁] [測驗] [海洋] [歷史] [個人]
  // 3. 訂閱用戶 (Pro): 完整功能 + 視覺強化
  
  const allItems = [
    { path: 'home', label: t('nav_home'), icon: Home },
    { path: 'test', label: t('nav_test'), icon: Sparkles, stage: 'calibration', highlight: !user },
    { path: 'ocean', label: t('nav_ocean'), icon: Waves, stage: 'resonance' },
    { path: 'history', label: t('nav_history'), icon: History, stage: 'reflection' },
    { path: 'profile', label: t('nav_profile'), icon: User },
  ];

  let navItems = allItems;

  if (!user) {
    // 未登入用戶：隱藏海洋與歷史
    navItems = allItems.filter(item => ['home', 'test', 'profile'].includes(item.path));
  }

  if (isAdmin) {
    navItems = [...navItems, { path: 'admin', label: t('admin_panel'), icon: ShieldAlert }];
  }

  return (
    <nav className="fixed bottom-6 md:bottom-12 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] md:w-auto">
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
        className={`relative bg-white/60 backdrop-blur-3xl border px-3 md:px-10 py-2 md:py-4 flex items-center justify-between md:justify-center gap-1 md:gap-10 rounded-full shadow-[0_20px_80px_-20px_rgba(0,0,0,0.1)] transition-all duration-700 ${
          isPremium 
            ? 'border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.15)]' 
            : 'border-white/30'
        }`}
      >
        {/* 訂閱用戶專屬流光背景 */}
        {isPremium && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500/5 via-transparent to-emerald-500/5 pointer-events-none"
          />
        )}

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => onNavigate(item.path)}
              className={`relative flex items-center gap-2 transition-all duration-500 px-3 md:px-5 py-2.5 rounded-full ${
                isActive 
                  ? 'text-ink bg-ink/5' 
                  : item.highlight 
                    ? 'text-emerald-600 bg-emerald-50/50 animate-pulse' 
                    : 'text-ink/30 hover:text-ink/60'
              }`}
            >
              <Icon size={isActive ? 20 : 18} strokeWidth={isActive ? 1.8 : 1.2} />
              
              {/* 每日閉環提示點 (僅限已登入用戶) */}
              {user && item.stage && !isActive && (
                <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-wood rounded-full animate-pulse" />
              )}
              
              <AnimatePresence mode="wait">
                {(isActive || item.highlight) && (
                  <motion.span
                    initial={{ width: 0, opacity: 0, x: -10 }}
                    animate={{ width: 'auto', opacity: 1, x: 0 }}
                    exit={{ width: 0, opacity: 0, x: -10 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="text-[11px] whitespace-nowrap tracking-[0.1em] font-sans font-medium overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>

              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${
                    isPremium ? 'bg-emerald-500' : 'bg-ink'
                  }`}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </motion.div>
    </nav>
  );
};
