import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, Zap, Sparkles, MessageSquare } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useTest } from '../store/TestContext';
import { trackGrowthEvent } from '../utils/growthAnalytics';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'energy' | 'ritual' | 'insight' | 'achievement' | 'reengage' | 'system';
  icon: any;
}

export const NotificationManager: React.FC = () => {
  const { t } = useLanguage();
  const { userPoints } = useTest();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Browser Push API Helper
  const sendBrowserPush = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
  };

  const addNotification = (type: Notification['type'], title: string, message: string, icon: any) => {
    // In-app toast
    const id = crypto.randomUUID();
    setNotifications(prev => [...prev, { id, title, message, type, icon }]);
    
    // Growth Tracking for impressions
    trackGrowthEvent('message_impression', {
      message_id: id,
      message_type: type,
      message_title: title
    });

    // Browser push for important categories
    if (type === 'reengage' || type === 'energy') {
      sendBrowserPush(title, message);
    }

    // Auto-remove after 5 seconds
    setTimeout(() => {
      removeNotification(id);
    }, 5000);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Simulated "Energy Low" notification
  useEffect(() => {
    if (userPoints > 0 && userPoints <= 3) {
      const timer = setTimeout(() => {
        addNotification(
          'energy',
          t('points_low_title'),
          t('points_low_body'),
          Zap
        );
      }, 5000);
      return () => clearTimeout(timer);
    } else if (userPoints === 0) {
      const timer = setTimeout(() => {
        addNotification(
          'energy',
          t('points_empty_title'),
          t('points_empty_body'),
          Zap
        );
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [userPoints]);

  // Simulated "Daily Ritual" notification (once per session for demo)
  useEffect(() => {
    const timer = setTimeout(() => {
      addNotification(
        'ritual',
        t('push_daily_ritual_title'),
        t('push_daily_ritual_body'),
        Sparkles
      );
    }, 30000); // Show after 30s
    return () => clearTimeout(timer);
  }, []);

  // Request Push Permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Life-integrated Push Simulation (based on time of day)
  useEffect(() => {
    const hour = new Date().getHours();
    let notification: { title: string; body: string } | null = null;

    if (hour >= 5 && hour < 10) {
      notification = { title: t('reengage_morning_title'), body: t('reengage_morning_body') };
    } else if (hour >= 22 || hour < 2) {
      notification = { title: t('reengage_night_title'), body: t('reengage_night_body') };
    }

    if (notification) {
      const timer = setTimeout(() => {
        addNotification('reengage', notification!.title, notification!.body, MessageSquare);
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Achievement Milestones (Simulated)
  useEffect(() => {
    // In a real app, these would be triggered by event bus or state changes
    const timer = setTimeout(() => {
      const streak = parseInt(localStorage.getItem('eunie_streak') || '0');
      if (streak >= 3) {
        addNotification(
          'achievement',
          t('milestone_streak_title'),
          t('milestone_streak_body').replace('{count}', streak.toString()),
          Sparkles
        );
      }
    }, 45000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed top-20 right-4 md:right-8 z-[100] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            className="pointer-events-auto w-72 md:w-80 bg-white/80 backdrop-blur-2xl border border-white/50 rounded-2xl shadow-2xl p-4 flex gap-4 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-wood/5 to-transparent opacity-50" />
            
            <div className="relative flex-shrink-0 w-10 h-10 rounded-xl bg-wood/10 flex items-center justify-center text-wood">
              <notification.icon size={20} />
            </div>
            
            <div className="relative flex-1 min-w-0">
              <h4 className="text-xs font-serif text-ink font-medium truncate mb-0.5">
                {notification.title}
              </h4>
              <p className="text-[10px] text-ink-muted leading-relaxed line-clamp-2">
                {notification.message}
              </p>
            </div>

            <button 
              onClick={() => removeNotification(notification.id)}
              className="relative flex-shrink-0 text-ink/20 hover:text-ink/40 transition-colors"
            >
              <X size={14} />
            </button>

            {/* Progress bar for auto-remove */}
            <motion.div 
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 5, ease: "linear" }}
              className="absolute bottom-0 left-0 h-0.5 bg-wood/20"
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
