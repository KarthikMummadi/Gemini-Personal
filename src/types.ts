export interface JournalUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  preview: string;
  messageCount: number;
  tags?: string[];
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  actionItems?: string[];
}

export type InsightType =
  | 'recurring_topic'
  | 'goal'
  | 'action_item'
  | 'idea'
  | 'weekly_reflection';

export interface LifeInsight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  timeframe?: string;
  priority?: 'high' | 'medium' | 'low';
  status?: 'active' | 'in_progress' | 'completed' | 'revisit';
  tags?: string[];
  createdAt: number;
  weeklyDetails?: {
    keyThemes: string[];
    whatWentWell: string[];
    growthAreas: string[];
    focusForNextWeek: string;
  };
}

export type NavigationTab = 'chat' | 'history' | 'insights';
