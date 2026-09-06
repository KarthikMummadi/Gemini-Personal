import React, { useState, useEffect } from 'react';
import { auth, onAuthStateChanged, FirebaseUser } from './lib/firebase';
import type { JournalUser, NavigationTab } from './types';
import { LandingPage } from './components/LandingPage';
import { AuthModal } from './components/AuthModal';
import { Header } from './components/Header';
import { ChatView } from './components/ChatView';
import { HistoryView } from './components/HistoryView';
import { InsightsView } from './components/InsightsView';
import { Sparkles, ShieldCheck } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<JournalUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [activeTab, setActiveTab] = useState<NavigationTab>('chat');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  // Monitor Firebase Authentication State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        setCurrentUser({
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName,
          photoURL: fbUser.photoURL,
        });
      } else {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleOpenAuth = (mode: 'signin' | 'signup' = 'signin') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  // Initial Auth Loading Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg animate-pulse">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-sm font-semibold tracking-tight text-slate-200">
            Gemini Journal
          </h2>
          <p className="text-xs text-slate-400 font-mono flex items-center gap-1.5 justify-center">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Initializing secure runtime...
          </p>
        </div>
      </div>
    );
  }

  // Unauthenticated: Present Landing Page & Auth Flow
  if (!currentUser) {
    return (
      <>
        <LandingPage onOpenAuth={handleOpenAuth} />
        <AuthModal
          isOpen={authModalOpen}
          defaultMode={authMode}
          onClose={() => setAuthModalOpen(false)}
        />
      </>
    );
  }

  // Authenticated: Dashboard Layout with Navigation
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans">
      <Header
        user={currentUser}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'chat' && (
          <ChatView
            user={currentUser}
            selectedConversationId={selectedConversationId}
            onSelectConversation={setSelectedConversationId}
          />
        )}

        {activeTab === 'history' && (
          <HistoryView
            user={currentUser}
            onSelectConversation={setSelectedConversationId}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'insights' && (
          <InsightsView
            user={currentUser}
            onNavigateTab={setActiveTab}
          />
        )}
      </div>
    </div>
  );
}
