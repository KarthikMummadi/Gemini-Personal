import React from 'react';
import {
  Sparkles,
  MessageSquare,
  BookOpen,
  Lightbulb,
  LogOut,
  ShieldCheck,
  User,
} from 'lucide-react';
import type { JournalUser, NavigationTab } from '../types';
import { logOut } from '../lib/firebase';

interface HeaderProps {
  user: JournalUser;
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
}

export const Header: React.FC<HeaderProps> = ({ user, activeTab, onSelectTab }) => {
  const handleSignOut = async () => {
    try {
      await logOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const navItems: Array<{ id: NavigationTab; label: string; icon: React.ReactNode }> = [
    { id: 'chat', label: 'Chat & Journal', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'history', label: 'Journal History', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'insights', label: 'AI Life Insights', icon: <Lightbulb className="w-4 h-4" /> },
  ];

  return (
    <header className="w-full bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-slate-900 tracking-tight">Gemini Journal</span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200/60">
                <ShieldCheck className="w-3 h-3" />
                UID Isolated
              </span>
            </div>
            <p className="hidden sm:block text-[11px] text-slate-500 font-medium">Turn Thoughts Into Action</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/60">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}-btn`}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User profile & sign out */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-right">
            <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-700 font-medium text-xs">
              {user.displayName ? (
                user.displayName.charAt(0).toUpperCase()
              ) : (
                <User className="w-4 h-4 text-slate-500" />
              )}
            </div>
            <div className="text-left leading-tight">
              <div className="text-xs font-semibold text-slate-800 truncate max-w-[140px]">
                {user.displayName || user.email || 'Authenticated User'}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                UID: {user.uid.slice(0, 6)}...
              </div>
            </div>
          </div>

          <button
            id="header-signout-btn"
            onClick={handleSignOut}
            title="Sign Out"
            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-rose-600 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-rose-200 hover:bg-rose-50 transition"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
