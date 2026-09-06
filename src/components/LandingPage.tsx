import React from 'react';
import {
  Sparkles,
  ShieldCheck,
  BrainCircuit,
  CheckCircle2,
  Terminal,
  GraduationCap,
  ArrowRight,
  Lock,
  ListTodo,
  TrendingUp,
} from 'lucide-react';

interface LandingPageProps {
  onOpenAuth: (mode?: 'signin' | 'signup') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuth }) => {
  return (
    <div id="landing-page-root" className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Navigation Header */}
      <header className="w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-base text-slate-900 tracking-tight">Gemini Journal</span>
              <span className="hidden sm:inline-block ml-2 text-xs font-medium text-slate-500 border-l border-slate-300 pl-2">
                Turn Thoughts Into Action
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="landing-signin-btn"
              onClick={() => onOpenAuth('signin')}
              className="text-sm font-medium text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition"
            >
              Sign In
            </button>
            <button
              id="landing-getstarted-btn"
              onClick={() => onOpenAuth('signup')}
              className="text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 px-4 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-16 pb-20 text-center">
          {/* Security & Target Tag */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50/80 border border-indigo-200/60 text-indigo-700 text-xs font-semibold mb-6">
            <ShieldCheck className="w-3.5 h-3.5" />
            Private & Encrypted to Your Authenticated UID
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15] max-w-4xl mx-auto">
            Turn Tangled Thoughts Into <span className="text-indigo-600">Actionable Velocity</span>.
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed font-normal">
            A private AI journaling and cognitive sparring application designed for students and developers.
            Unpack messy bug investigations, architectural trade-offs, and study milestones — with guaranteed data isolation.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              id="hero-cta-btn"
              onClick={() => onOpenAuth('signup')}
              className="w-full sm:w-auto px-7 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-base transition shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              Start Your Private Journal
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              id="hero-demo-btn"
              onClick={() => onOpenAuth('signin')}
              className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-medium rounded-xl text-base transition shadow-xs"
            >
              Already Have an Account?
            </button>
          </div>

          {/* Interactive Visual Proof / Workflow Preview */}
          <div className="mt-14 max-w-4xl mx-auto text-left bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="bg-slate-900 px-4 py-3 flex items-center justify-between text-slate-400 text-xs border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="ml-2 font-mono text-slate-300">gemini-journal // session: arch-review-04</span>
              </div>
              <div className="flex items-center gap-1 text-emerald-400 font-mono text-[11px]">
                <Lock className="w-3 h-3" />
                <span>Isolated UID Boundary</span>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              {/* User Entry */}
              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs flex-shrink-0">
                  Dev
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-sm p-4 text-sm text-slate-800 max-w-2xl leading-relaxed">
                  <p className="font-semibold text-slate-900 mb-1">State management dilemma in distributed sync:</p>
                  "I'm torn between optimistic offline updates vs server-authoritative reconciliation for our real-time editor. If network drops mid-transaction, rollback state gets tricky. How should I isolate the edge cases before tomorrow's code freeze?"
                </div>
              </div>

              {/* Gemini Response */}
              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="bg-indigo-50/40 border border-indigo-100 rounded-2xl rounded-tl-sm p-5 text-sm text-slate-800 max-w-2xl space-y-3">
                  <p className="font-medium text-slate-900">
                    Let's de-risk this immediately by decoupling transactional state from ephemeral presentation:
                  </p>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Rather than full optimistic rollback, adopt an <strong>Append-Only Event Queue</strong> with local sequence IDs. When offline, queue deltas locally; upon reconnect, let the server return an authoritative snapshot + applied delta vector.
                  </p>

                  {/* Extracted Action Items */}
                  <div className="pt-2 border-t border-indigo-100">
                    <div className="text-xs font-semibold text-indigo-900 mb-2 flex items-center gap-1.5">
                      <ListTodo className="w-3.5 h-3.5 text-indigo-600" />
                      Extracted Action Items
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-700">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span>Define the 3 core state transitions that fail on dirty disconnects</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span>Isolate the rollback logic into a standalone pure reducer with test coverage</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Pillars */}
        <section className="border-t border-slate-200 bg-white py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Built for Depth, Security, and Forward Momentum
              </h2>
              <p className="mt-2 text-slate-600 text-sm">
                Everything you need to turn raw cognitive friction into structured progress.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Pillar 1 */}
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition space-y-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-base text-slate-900">Zero Cross-User Leakage</h3>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Every document is scoped strictly under your Firebase UID (<code className="text-slate-700 font-mono">/users/{'{uid}'}</code>). Server operations cryptographically verify ID tokens on every privileged call.
                </p>
              </div>

              {/* Pillar 2 */}
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition space-y-3">
                <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-base text-slate-900">Cognitive Sparring Partner</h3>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Powered by Gemini 2.5 Flash on trusted server infrastructure. Never exposes secrets to client browsers. Formats technical code, architecture trees, and math.
                </p>
              </div>

              {/* Pillar 3 */}
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-base text-slate-900">Life Insights Synthesis</h3>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Automatically extracts recurring mental roadblocks, milestones, action items, and weekly reflections across your private entries.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Gemini Journal. Private & isolated for students & developers.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-slate-600">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              End-to-end UID Boundary Enforced
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
