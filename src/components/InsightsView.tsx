import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Lightbulb,
  Target,
  ListTodo,
  Compass,
  CalendarCheck,
  CheckCircle2,
  Clock,
  RefreshCw,
  AlertCircle,
  Tag,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import type { JournalUser, LifeInsight, Conversation, NavigationTab } from '../types';
import {
  subscribeToInsights,
  subscribeToConversations,
  saveInsight,
  updateInsightStatus,
  deleteInsight,
  callServerAnalyzeInsights,
} from '../lib/journalService';
import { getCurrentUserIdToken } from '../lib/firebase';

interface InsightsViewProps {
  user: JournalUser;
  onNavigateTab: (tab: NavigationTab) => void;
}

export const InsightsView: React.FC<InsightsViewProps> = ({ user, onNavigateTab }) => {
  const [insights, setInsights] = useState<LifeInsight[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<
    'all' | 'recurring_topic' | 'goal' | 'action_item' | 'idea' | 'weekly_reflection'
  >('all');

  // Subscribe to insights in Firestore
  useEffect(() => {
    if (!user.uid) return;
    const unsubscribe = subscribeToInsights(
      user.uid,
      (items) => {
        setInsights(items);
      },
      (err) => {
        console.error('Failed to load insights:', err);
      }
    );
    return () => unsubscribe();
  }, [user.uid]);

  // Subscribe to conversations to have data for analysis
  useEffect(() => {
    if (!user.uid) return;
    const unsubscribe = subscribeToConversations(
      user.uid,
      (convs) => {
        setConversations(convs);
      }
    );
    return () => unsubscribe();
  }, [user.uid]);

  const handleGenerateInsights = async () => {
    if (conversations.length === 0) {
      setError('You need at least one journal conversation before AI Life Insights can be synthesized.');
      return;
    }

    setError(null);
    setAnalyzing(true);

    try {
      const idToken = await getCurrentUserIdToken();
      if (!idToken) {
        throw new Error('Authentication expired. Please sign in again.');
      }

      // Package sanitized user's own journal entries
      const entriesPayload = conversations.slice(0, 15).map((c) => ({
        title: c.title,
        date: new Date(c.updatedAt).toLocaleDateString(),
        content: c.preview || c.title,
      }));

      // Call secure server endpoint
      const result = await callServerAnalyzeInsights(idToken, entriesPayload);

      // Save Recurring Topics
      for (const topic of result.recurringTopics || []) {
        await saveInsight(user.uid, {
          type: 'recurring_topic',
          title: topic.topic,
          description: topic.description,
          timeframe: topic.frequency,
          status: 'active',
          createdAt: Date.now(),
        });
      }

      // Save Goals
      for (const goal of result.goals || []) {
        await saveInsight(user.uid, {
          type: 'goal',
          title: goal.title,
          description: goal.description,
          timeframe: goal.timeframe,
          status: goal.status || 'active',
          createdAt: Date.now(),
        });
      }

      // Save Action Items
      for (const action of result.actionItems || []) {
        await saveInsight(user.uid, {
          type: 'action_item',
          title: action.task,
          description: action.context,
          priority: action.priority || 'medium',
          status: 'active',
          createdAt: Date.now(),
        });
      }

      // Save Ideas Worth Revisiting
      for (const idea of result.ideasToRevisit || []) {
        await saveInsight(user.uid, {
          type: 'idea',
          title: idea.title,
          description: `${idea.summary}\n\nNext step: ${idea.potentialNextStep}`,
          status: 'revisit',
          createdAt: Date.now(),
        });
      }

      // Save Weekly Reflection
      if (result.weeklyReflection) {
        await saveInsight(user.uid, {
          type: 'weekly_reflection',
          title: `Weekly Reflection — ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`,
          description: result.weeklyReflection.focusForNextWeek,
          weeklyDetails: result.weeklyReflection,
          status: 'active',
          createdAt: Date.now(),
        });
      }
    } catch (err: any) {
      console.error('Failed to generate insights:', err);
      setError(err.message || 'Error generating insights from journal entries.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleToggleGoalStatus = async (insight: LifeInsight) => {
    const nextStatus = insight.status === 'completed' ? 'active' : 'completed';
    try {
      await updateInsightStatus(user.uid, insight.id, nextStatus);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const categories: Array<{ id: typeof activeCategory; label: string; icon: React.ReactNode }> = [
    { id: 'all', label: 'All Insights', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'recurring_topic', label: 'Recurring Topics', icon: <TrendingUp className="w-3.5 h-3.5 text-indigo-600" /> },
    { id: 'goal', label: 'Goals & Milestones', icon: <Target className="w-3.5 h-3.5 text-emerald-600" /> },
    { id: 'action_item', label: 'Action Items', icon: <ListTodo className="w-3.5 h-3.5 text-amber-600" /> },
    { id: 'idea', label: 'Ideas to Revisit', icon: <Compass className="w-3.5 h-3.5 text-violet-600" /> },
    { id: 'weekly_reflection', label: 'Weekly Reflections', icon: <CalendarCheck className="w-3.5 h-3.5 text-rose-600" /> },
  ];

  const filteredInsights = activeCategory === 'all'
    ? insights
    : insights.filter((i) => i.type === activeCategory);

  return (
    <div id="insights-view-container" className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50 min-h-[calc(100vh-64px)]">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Banner */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Private Cognitive Synthesis Engine
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              AI Life & Development Insights
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Analyzes strictly your authenticated journal history to extract recurring themes, goal progression, actionable next steps, and weekly reflections.
            </p>
          </div>

          <button
            id="generate-insights-btn"
            disabled={analyzing}
            onClick={handleGenerateInsights}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition disabled:opacity-60 flex-shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} />
            {analyzing ? 'Analyzing Your Journal...' : 'Synthesize Insights Now'}
          </button>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                id={`cat-${cat.id}-btn`}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Section */}
        {filteredInsights.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 p-8 space-y-4 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <Lightbulb className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">
              No Insights Generated Yet
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Write a few thoughts, bug debug notes, or study reflections in the Chat tab, then click "Synthesize Insights Now" to let Gemini detect recurring patterns and distill action items.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => onNavigateTab('chat')}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition"
              >
                Write in Journal
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleGenerateInsights}
                disabled={analyzing}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold transition"
              >
                Run Synthesis
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInsights.map((item) => {
              const isGoal = item.type === 'goal';
              const isAction = item.type === 'action_item';
              const isReflection = item.type === 'weekly_reflection';
              const isCompleted = item.status === 'completed';

              return (
                <div
                  key={item.id}
                  id={`insight-card-${item.id}`}
                  className={`bg-white border rounded-2xl p-5 shadow-2xs flex flex-col justify-between transition ${
                    isCompleted
                      ? 'border-slate-200 bg-slate-50/50 opacity-80'
                      : 'border-slate-200 hover:border-indigo-300'
                  } ${isReflection ? 'md:col-span-2 lg:col-span-3 bg-gradient-to-br from-indigo-50/20 to-white' : ''}`}
                >
                  <div className="space-y-3">
                    {/* Badge & Type */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {item.type.replace('_', ' ')}
                      </span>

                      {item.timeframe && (
                        <span className="text-[11px] text-slate-400 font-mono">
                          {item.timeframe}
                        </span>
                      )}

                      {item.priority && (
                        <span
                          className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md ${
                            item.priority === 'high'
                              ? 'bg-rose-50 text-rose-700'
                              : item.priority === 'medium'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {item.priority} priority
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3
                      className={`text-sm font-semibold text-slate-900 ${
                        isCompleted ? 'line-through text-slate-500' : ''
                      }`}
                    >
                      {item.title}
                    </h3>

                    {/* Description */}
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                      {item.description}
                    </p>

                    {/* Reflection breakdown if weekly reflection */}
                    {isReflection && item.weeklyDetails && (
                      <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                          <span className="font-semibold text-slate-800 block">Key Themes</span>
                          <ul className="list-disc list-inside text-slate-600 space-y-0.5 text-[11px]">
                            {item.weeklyDetails.keyThemes?.map((t, idx) => (
                              <li key={idx}>{t}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="p-3 bg-emerald-50/50 rounded-xl space-y-1">
                          <span className="font-semibold text-emerald-900 block">Wins & Growth</span>
                          <ul className="list-disc list-inside text-emerald-800 space-y-0.5 text-[11px]">
                            {item.weeklyDetails.whatWentWell?.map((w, idx) => (
                              <li key={idx}>{w}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="p-3 bg-indigo-50/50 rounded-xl space-y-1">
                          <span className="font-semibold text-indigo-900 block">Focus for Next Week</span>
                          <p className="text-indigo-800 text-[11px] leading-relaxed">
                            {item.weeklyDetails.focusForNextWeek}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions / Interactive status */}
                  {(isGoal || isAction) && (
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={() => handleToggleGoalStatus(item)}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg transition ${
                          isCompleted
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{isCompleted ? 'Completed' : 'Mark as Done'}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
