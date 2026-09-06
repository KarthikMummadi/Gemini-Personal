import React, { useState, useEffect } from 'react';
import {
  Search,
  BookOpen,
  Calendar,
  MessageSquare,
  ArrowRight,
  Trash2,
  Clock,
  Filter,
} from 'lucide-react';
import type { JournalUser, Conversation, NavigationTab } from '../types';
import {
  subscribeToConversations,
  deleteConversation,
} from '../lib/journalService';

interface HistoryViewProps {
  user: JournalUser;
  onSelectConversation: (id: string) => void;
  onNavigateTab: (tab: NavigationTab) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  user,
  onSelectConversation,
  onNavigateTab,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user.uid) return;
    const unsubscribe = subscribeToConversations(
      user.uid,
      (convs) => {
        setConversations(convs);
        setLoading(false);
      },
      (err) => {
        console.error('Failed to load conversations in HistoryView:', err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [user.uid]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Delete this journal conversation permanently?')) {
      try {
        await deleteConversation(user.uid, id);
      } catch (err) {
        console.error('Failed to delete conversation:', err);
      }
    }
  };

  const handleOpenConversation = (id: string) => {
    onSelectConversation(id);
    onNavigateTab('chat');
  };

  const filtered = conversations.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      (c.title || '').toLowerCase().includes(q) ||
      (c.preview || '').toLowerCase().includes(q)
    );
  });

  return (
    <div id="history-view-container" className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50 min-h-[calc(100vh-64px)]">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-indigo-600" />
              Journal History & Archives
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Explore past brainstorming sessions, architectural reflections, and study logs.
            </p>
          </div>

          <div className="text-xs font-mono text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
            Total Sessions: <span className="font-semibold text-slate-900">{conversations.length}</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            id="history-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, topic, or keywords in your reflections..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition shadow-2xs placeholder:text-slate-400"
          />
        </div>

        {/* List of Entries */}
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading your private journal archives...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 p-8 space-y-3 shadow-2xs">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-800">
              {searchQuery ? 'No matching journal entries found' : 'No journal history yet'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? 'Try a different search term or clear the filter to see all entries.'
                : 'Start a new conversation in the Chat tab to begin building your action-oriented journal.'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => onNavigateTab('chat')}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
              >
                Open Chat & Start Writing
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((conv) => {
              const updatedDate = new Date(conv.updatedAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              });

              return (
                <div
                  key={conv.id}
                  id={`history-card-${conv.id}`}
                  onClick={() => handleOpenConversation(conv.id)}
                  className="bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="font-semibold text-sm text-slate-900 group-hover:text-indigo-600 transition">
                        {conv.title || 'Untitled Journal Entry'}
                      </h3>
                      <button
                        onClick={(e) => handleDelete(e, conv.id)}
                        title="Delete entry"
                        className="text-slate-300 hover:text-rose-600 p-1 rounded-md transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                      {conv.preview || 'No preview recorded yet...'}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5 font-mono">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{updatedDate}</span>
                    </div>

                    <span className="inline-flex items-center gap-1 font-medium text-indigo-600 group-hover:translate-x-0.5 transition">
                      Resume Reflection
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
