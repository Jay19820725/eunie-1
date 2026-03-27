import { useEffect } from 'react';

/**
 * Simple Growth Analytics Utility
 * Tracks message impressions and user actions for growth loop analysis.
 */

export type GrowthEvent =
  | 'message_impression'
  | 'message_cta_click'
  | 'purchase_started'
  | 'test_completed'
  | 'report_viewed'
  | 'bottle_cast'
  | 'journal_entry';

interface EventProperties {
  message_id?: string;
  message_type?: string;
  page?: string;
  source?: string;
  plan_type?: string;
  [key: string]: any;
}

export const trackGrowthEvent = (event: GrowthEvent, props: EventProperties = {}) => {
  const payload = {
    event,
    properties: {
      ...props,
      timestamp: Date.now(),
      url: window.location.href,
      language: localStorage.getItem('eunie_lang') || 'zh'
    }
  };

  // Log to console in development
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Growth Analytics] ${event}:`, payload.properties);
  }

  // Persist to local log for growth loop analysis (simulated backend)
  try {
    const log = JSON.parse(localStorage.getItem('eunie_growth_log') || '[]');
    log.push(payload);
    // Keep only last 100 events
    localStorage.setItem('eunie_growth_log', JSON.stringify(log.slice(-100)));
  } catch (e) {
    console.warn('Failed to save growth event:', e);
  }
};

/**
 * Hook to track page views
 */
export const useGrowthTracking = (page: string) => {
  useEffect(() => {
    trackGrowthEvent('message_impression', { page, source: 'navigation' });
  }, [page]);
};
