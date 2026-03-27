/**
 * Core type definitions for EUNIE 嶼妳
 */

export enum FiveElement {
  WOOD = 'wood',
  FIRE = 'fire',
  EARTH = 'earth',
  METAL = 'metal',
  WATER = 'water'
}

export const ELEMENT_COLORS: Record<FiveElement, string> = {
  [FiveElement.WOOD]: "#A8E6CF",
  [FiveElement.FIRE]: "#FFB7B2",
  [FiveElement.EARTH]: "#FDFD96",
  [FiveElement.METAL]: "#E0E0E0",
  [FiveElement.WATER]: "#B39DDB",
};

export const ELEMENT_NAMES_ZH: Record<FiveElement, string> = {
  [FiveElement.WOOD]: "木",
  [FiveElement.FIRE]: "火",
  [FiveElement.EARTH]: "土",
  [FiveElement.METAL]: "金",
  [FiveElement.WATER]: "水",
};

export interface FiveElementValues {
  [FiveElement.WOOD]: number;
  [FiveElement.FIRE]: number;
  [FiveElement.EARTH]: number;
  [FiveElement.METAL]: number;
  [FiveElement.WATER]: number;
}

export interface ImageCard {
  id: string;
  locale?: string;
  name: string;
  name_en?: string;
  imageUrl: string;
  elements: FiveElementValues;
  description?: string;
  metadata?: {
    artist?: string;
    series?: string;
  };
}

export interface WordCard {
  id: string;
  locale?: string;
  name: string;
  name_en?: string;
  text: string;
  imageUrl: string;
  elements: FiveElementValues;
  description?: string;
  metadata?: {
    language?: string;
    category?: string;
  };
}

export interface CardPair {
  image: ImageCard;
  word: WordCard;
  association?: string;
}

export interface SelectedCards {
  sessionId?: string;
  reportType?: ReportType;
  wishContext?: WishContext;
  images: ImageCard[];
  words: WordCard[];
  pairs?: CardPair[];
  drawnAt: number;
}

export type ReportType = 'daily' | 'wish';

export interface WishContext {
  domains: string[]; // e.g., ['career', 'love', 'health']
  targets: Record<string, string>; // domain -> target/person
  contents: Record<string, string>; // domain -> specific wish content
}

export interface AnalysisReport {
  id: string;
  userId?: string;
  timestamp: number;
  reportType?: ReportType;
  wishContext?: WishContext;
  selectedImageIds: string[];
  selectedWordIds: string[];
  totalScores: FiveElementValues; // Normalized percentages
  dominantElement: string;
  weakElement: string;
  balanceScore: number;
  interpretation?: string;
  pairInterpretations?: { pair_id: string; text: string }[];
  pairs?: CardPair[];
  
  // AI Analysis Sections
  todayTheme?: string;
  cardInterpretation?: string;
  psychologicalInsight?: string;
  fiveElementAnalysis?: string;
  reflection?: string;
  actionSuggestion?: string;
  shareThumbnail?: string;

  // Wish Specific AI Content
  manifestationGuidance?: string; // 顯化指引
  energyObstacles?: string; // 能量阻礙分析

  // Multilingual Content
  multilingualContent?: {
    'zh-TW': {
      todayTheme: string;
      cardInterpretation: string;
      psychologicalInsight: string;
      fiveElementAnalysis: string;
      reflection: string;
      actionSuggestion: string;
      pairInterpretations: { pair_id: string; text: string }[];
    };
    'ja-JP': {
      todayTheme: string;
      cardInterpretation: string;
      psychologicalInsight: string;
      fiveElementAnalysis: string;
      reflection: string;
      actionSuggestion: string;
      pairInterpretations: { pair_id: string; text: string }[];
    };
  };
  
  // Legacy fields (keep for backward compatibility)
  psychologicalReflection?: string;
  energyAdvice?: string;
  
  isGuest?: boolean;
  isAiComplete?: boolean;
}

export type UserRole = 'guest' | 'free_member' | 'premium_member' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: UserRole;
  register_date: string;
  subscription_status: 'active' | 'inactive' | 'none' | 'trialing' | 'expired';
  subscription_tier?: 'free' | 'premium';
  subscription_type?: 'none' | 'monthly' | 'yearly';
  subscription_expiry?: string;
  trial_start_date?: string;
  last_login?: string;
  default_bottle_nickname?: string;
  settings?: {
    daily_reminder: boolean;
    dark_mode: boolean;
    newsletter: boolean;
  };
}

export interface Session {
  id: string;
  user_id: string;
  session_time: string;
  image_cards: ImageCard[];
  word_cards: WordCard[];
  pairs: CardPair[];
  association_text: string[];
}

export type EmotionTag = 'calm' | 'anxious' | 'inspired' | 'tired';

export type ManifestationStatus = 'active' | 'completed' | 'cancelled' | 'expired';
export type ManifestationDeadlineOption = '1_month' | '6_months' | '12_months';

export interface Manifestation {
  id?: string;
  user_id: string;
  wish_title: string;
  deadline: string;
  deadline_option: ManifestationDeadlineOption;
  status: ManifestationStatus;
  created_at: string;
  reminder_sent?: boolean;
}

export interface EnergyJournalEntry {
  id?: string;
  user_id: string;
  date: string;
  emotion_tag: EmotionTag;
  insight: string;
  intention: string;
  created_at: string;
}

export type AIPromptCategory = 'analysis' | 'daily' | 'persona';
export type AIPromptStyle = 'gentle' | 'ethereal' | 'poetic' | 'professional' | 'healing' | 'custom';

export interface AIPrompt {
  id: string;
  module_name: string;
  content_zh: string;
  content_ja: string;
  version: string;
  status: 'active' | 'draft' | 'archived';
  category: 'core' | 'scenario' | 'format';
  created_at: string;
  updated_at: string;
}

export interface SEOSettings {
  title: string;
  description: string;
  keywords: string;
  og_image: string;
  google_analytics_id: string;
  search_console_id: string;
  index_enabled: boolean;
}

export interface ChatMessage {
  role: "user" | "model";
  content: string;
  energyUpdate?: FiveElementValues;
}

export type DrawStage = 'idle' | 'wish_input' | 'shuffling' | 'drawing_images' | 'drawing_words' | 'pairing' | 'associating' | 'revealed';

export type EnergyReportData = AnalysisReport;

export interface SiteSettings {
  key: string;
  value: any;
  updated_at: string;
}

export interface Bottle {
  id: string;
  user_id: string;
  content: string;
  element: string;
  lang: string;
  origin_locale: string;
  energy_color_tag?: string;
  tag_id?: string;
  hug_count?: number;
  card_id?: string;
  quote?: string;
  report_id?: string;
  sender_nickname?: string;
  is_active: boolean;
  created_at: string;
  display_name?: string; // Joined from users table
  sender_name?: string; // COALESCE(sender_nickname, display_name)
  card_image?: string;
  card_name?: string;
  card_image_url?: string;
  card_name_saved?: string;
  word_text?: string;
  word_name?: string;
  translatedContent?: string; // For frontend translation
  report_data?: any; // JSON data from energy_reports
  reply_message?: string; // For saved bottles
  saved_id?: string; // For saved bottles
  saved_at?: string; // For saved bottles
  tag_zh?: string; // Joined from bottle_tags
  tag_ja?: string; // Joined from bottle_tags
}

export interface BottleTag {
  id: string;
  tag: string;
  zh: string;
  ja: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface BottleBlessing {
  id: string;
  bottle_id: string;
  user_id: string;
  tag_id: string;
  created_at: string;
}
