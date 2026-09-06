import React, { useState, useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import {
  Sparkles,
  Send,
  Plus,
  Trash2,
  ListTodo,
  CheckCircle2,
  AlertCircle,
  Clock,
  MessageSquare,
  ChevronRight,
  Code2,
  Lightbulb,
  BookOpen,
  ArrowRight,
  Copy,
  Check,
} from 'lucide-react';
import type { JournalUser, Conversation, Message } from '../types';
import {
  subscribeToConversations,
  subscribeToMessages,
  createConversation,
  addMessage,
  updateConversationTitle,
  deleteConversation,
  callServerChat,
} from '../lib/journalService';
import { getCurrentUserIdToken } from '../lib/firebase';

interface ChatViewProps {
  user: JournalUser;
  selectedConversationId: string | null;
  onSelectConversation: (id: string | null) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  user,
  selectedConversationId,
  onSelectConversation,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Subscribe to user's conversations list in real-time
  useEffect(() => {
    if (!user.uid) return;
    const unsubscribe = subscribeToConversations(
      user.uid,
      (convs) => {
        setConversations(convs);
        // If no conversation selected and conversations exist, select first one
        if (!selectedConversationId && convs.length > 0) {
          onSelectConversation(convs[0].id);
        }
      },
      (err) => {
        console.error('Failed to load conversations:', err);
      }
    );
    return () => unsubscribe();
  }, [user.uid]);

  // Subscribe to messages of active conversation in real-time
  useEffect(() => {
    if (!user.uid || !selectedConversationId) {
      setMessages([]);
      return;
    }

    const unsubscribe = subscribeToMessages(
      user.uid,
      selectedConversationId,
      (msgs) => {
        setMessages(msgs);
        scrollToBottom();
      },
      (err) => {
        console.error('Failed to load messages:', err);
      }
    );
    return () => unsubscribe();
  }, [user.uid, selectedConversationId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const activeConversation = conversations.find((c) => c.id === selectedConversationId);

  const handleStartNewConversation = async () => {
    try {
      setError(null);
      const newId = await createConversation(user.uid, 'New Thought Journal');
      onSelectConversation(newId);
      setInputMessage('');
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    } catch (err: any) {
      console.error('Failed to create new conversation:', err);
      setError('Could not create new journal session. Please retry.');
    }
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this journal conversation?')) {
      try {
        await deleteConversation(user.uid, id);
        if (selectedConversationId === id) {
          const remaining = conversations.filter((c) => c.id !== id);
          onSelectConversation(remaining.length > 0 ? remaining[0].id : null);
        }
      } catch (err) {
        console.error('Failed to delete conversation:', err);
      }
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputMessage).trim();
    if (!textToSend || loading) return;

    setError(null);
    setInputMessage('');

    let convId = selectedConversationId;

    try {
      // Auto-create conversation if none is active
      if (!convId) {
        convId = await createConversation(user.uid, 'New Journal Entry');
        onSelectConversation(convId);
      }

      setLoading(true);

      // 1. Save user message to Firestore
      await addMessage(user.uid, convId, 'user', textToSend);

      // 2. Prepare conversation history for server call
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const isFirst = messages.length === 0;

      // 3. Get authentic Firebase ID token for Authorization header
      const idToken = await getCurrentUserIdToken();
      if (!idToken) {
        throw new Error('Authentication session expired. Please sign in again.');
      }

      // 4. Call privileged server-side Gemini API endpoint
      const result = await callServerChat(idToken, textToSend, historyPayload, isFirst);

      // 5. Save model response to Firestore
      await addMessage(user.uid, convId, 'model', result.reply, result.actionItems);

      // 6. If title suggested, update conversation title in Firestore
      if (result.suggestedTitle && isFirst) {
        await updateConversationTitle(user.uid, convId, result.suggestedTitle);
      }

      scrollToBottom();
    } catch (err: any) {
      console.error('Chat error:', err);
      setError(err.message || 'Failed to generate response. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const starterPrompts = [
    {
      title: 'Debug Technical Trade-Off',
      desc: 'Evaluate architectural choices, bottlenecks, or tricky bugs.',
      icon: <Code2 className="w-4 h-4 text-indigo-600" />,
      prompt: "I need to evaluate two architectural options for my project: one favors rapid shipping with simpler relational queries, while the other offers higher scalability with event streaming. Help me break down the trade-offs, potential failure points, and next steps.",
    },
    {
      title: 'Study & Exam Sprint Plan',
      desc: 'Turn a sprawling academic syllabus into a prioritized plan.',
      icon: <BookOpen className="w-4 h-4 text-violet-600" />,
      prompt: "I have an important milestone/exam coming up in two weeks and feel overwhelmed by the scope. Help me deconstruct the topics, identify high-yield focus areas, and create a realistic revision schedule.",
    },
    {
      title: 'Deconstruct Mental Block',
      desc: 'Work through imposter syndrome or decision paralysis.',
      icon: <Lightbulb className="w-4 h-4 text-amber-600" />,
      prompt: "I feel stuck and hit a wall on my current project. I'm overthinking every implementation detail. Help me identify the underlying assumptions and pick the smallest, most impactful next step.",
    },
  ];

  return (
    <div id="chat-view-container" className="flex-1 flex overflow-hidden h-[calc(100vh-64px)] bg-slate-50">
      {/* Sidebar - Conversations History */}
      <aside
        id="chat-sidebar"
        className={`${
          sidebarOpen ? 'w-80' : 'w-0'
        } transition-all duration-200 ease-in-out border-r border-slate-200 bg-white flex flex-col overflow-hidden flex-shrink-0`}
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-2">
          <button
            id="new-chat-btn"
            onClick={handleStartNewConversation}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            New Journal Session
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300 opacity-60" />
              No journal entries yet.
              <br />
              Start your first reflection!
            </div>
          ) : (
            conversations.map((conv) => {
              const isActive = conv.id === selectedConversationId;
              const dateStr = new Date(conv.updatedAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              });

              return (
                <div
                  key={conv.id}
                  id={`conv-item-${conv.id}`}
                  onClick={() => onSelectConversation(conv.id)}
                  className={`group relative p-3 rounded-xl cursor-pointer text-left transition ${
                    isActive
                      ? 'bg-indigo-50/70 border border-indigo-200/80 text-indigo-950'
                      : 'hover:bg-slate-100/80 text-slate-700 border border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-xs truncate max-w-[180px]">
                      {conv.title || 'Untitled Thought'}
                    </h3>
                    <button
                      id={`delete-conv-${conv.id}`}
                      onClick={(e) => handleDeleteConversation(e, conv.id)}
                      title="Delete entry"
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-1">
                    {conv.preview || 'No thoughts recorded yet...'}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400 font-mono">
                    <Clock className="w-3 h-3" />
                    <span>{dateStr}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* Main Chat Canvas */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
        {/* Chat Header */}
        <div className="px-6 py-3.5 bg-white border-b border-slate-200/80 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-xs text-slate-500 hover:text-slate-800 p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition"
              title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 truncate max-w-md">
                {activeConversation?.title || 'Active Journal Thought'}
              </h2>
              <span className="text-[10px] text-slate-500 font-medium">
                Multi-turn cognitive sparring session
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-md text-[11px] font-mono text-slate-600">
              <Sparkles className="w-3 h-3 text-indigo-600" />
              Gemini 2.5 Flash
            </span>
          </div>
        </div>

        {/* Message Thread */}
        <div id="messages-container" className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6">
          {messages.length === 0 ? (
            /* Empty State */
            <div id="chat-empty-state" className="max-w-2xl mx-auto py-8 text-center space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-xs">
                <Sparkles className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                  What's on your mind today?
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto mt-1 leading-relaxed">
                  Use Gemini Journal to clarify confusing concepts, untangle complex architectural decisions, or debrief a challenging study session.
                </p>
              </div>

              {/* Starter Prompts */}
              <div className="grid grid-cols-1 gap-3 text-left">
                {starterPrompts.map((starter, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(starter.prompt)}
                    className="p-4 bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-xl transition text-left shadow-2xs group flex items-start gap-3.5"
                  >
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/60 group-hover:bg-indigo-50 group-hover:border-indigo-200 transition">
                      {starter.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-900 group-hover:text-indigo-600 transition">
                          {starter.title}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition" />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{starter.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Messages List */
            messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id || idx}
                  id={`chat-msg-${idx}`}
                  className={`flex items-start gap-3.5 max-w-3xl ${
                    isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs flex-shrink-0 shadow-2xs ${
                      isUser
                        ? 'bg-slate-900 text-white font-medium'
                        : 'bg-gradient-to-tr from-indigo-600 to-violet-600 text-white'
                    }`}
                  >
                    {isUser ? 'You' : <Sparkles className="w-4 h-4" />}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`p-4 sm:p-5 rounded-2xl text-xs sm:text-sm leading-relaxed space-y-3 ${
                      isUser
                        ? 'bg-slate-900 text-white rounded-tr-xs max-w-xl'
                        : 'bg-white border border-slate-200/90 text-slate-800 shadow-2xs rounded-tl-xs max-w-2xl'
                    }`}
                  >
                    {/* Content */}
                    {isUser ? (
                      <div className="whitespace-pre-wrap font-normal">{msg.content}</div>
                    ) : (
                      <div className="relative group">
                        <div className="prose prose-slate prose-xs sm:prose-sm max-w-none prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:rounded-xl prose-code:font-mono prose-code:text-indigo-600 prose-code:bg-indigo-50/60 prose-code:px-1 prose-code:py-0.5 prose-code:rounded-sm">
                          <Markdown>{msg.content}</Markdown>
                        </div>

                        {/* Copy button */}
                        <button
                          onClick={() => copyToClipboard(msg.content, idx)}
                          title="Copy message"
                          className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100"
                        >
                          {copiedIndex === idx ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}

                    {/* Extracted Action Items */}
                    {!isUser && msg.actionItems && msg.actionItems.length > 0 && (
                      <div className="pt-3 mt-3 border-t border-slate-100 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-900">
                          <ListTodo className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Extracted Action Items</span>
                        </div>
                        <ul className="space-y-1.5">
                          {msg.actionItems.map((item, aIdx) => (
                            <li
                              key={aIdx}
                              className="flex items-start gap-2 text-xs text-slate-700 bg-indigo-50/50 p-2 rounded-lg border border-indigo-100/80"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Loading Indicator */}
          {loading && (
            <div
              id="chat-loading-indicator"
              className="flex items-start gap-3.5 mr-auto max-w-2xl"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-2xs">
                <Sparkles className="w-4 h-4 animate-spin" />
              </div>
              <div className="p-4 bg-white border border-slate-200 rounded-2xl rounded-tl-xs shadow-2xs text-xs text-slate-600 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                <span>Synthesizing thoughts and extracting actions with Gemini...</span>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div
              id="chat-error-banner"
              className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between gap-3 max-w-2xl mx-auto"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={() => handleSendMessage()}
                className="px-2.5 py-1 bg-white border border-rose-300 text-rose-700 hover:bg-rose-100/50 rounded-lg text-xs font-semibold transition"
              >
                Retry
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-white border-t border-slate-200/80">
          <div className="max-w-3xl mx-auto relative">
            <textarea
              id="chat-input-textarea"
              ref={textareaRef}
              rows={2}
              value={inputMessage}
              disabled={loading}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What are you working on or trying to unpack? (Shift+Enter for newline)..."
              className="w-full resize-none p-3.5 pr-14 text-xs sm:text-sm border border-slate-300 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition placeholder:text-slate-400 bg-slate-50/50"
            />
            <button
              id="chat-send-btn"
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || loading}
              className="absolute right-3 bottom-3.5 p-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl disabled:opacity-30 transition shadow-xs"
              title="Send thought"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="max-w-3xl mx-auto flex items-center justify-between text-[11px] text-slate-400 mt-1 px-1">
            <span>Enter to send, Shift+Enter for new line</span>
            <span>All entries stored under your UID</span>
          </div>
        </div>
      </main>
    </div>
  );
};
