import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  FileSearch,
  Palette,
  Type,
  MessageSquare,
  BarChart3,
  ArrowRight,
  Upload,
  Check,
  AlertTriangle
} from 'lucide-react';

export const LandingPage = () => {
  const navigate = useNavigate();

  const features = [
    {
      title: 'AI-Powered Content Analysis',
      desc: 'Deep multi-modal inspection evaluates copy, documents, and creative collateral in real time.',
      icon: Sparkles
    },
    {
      title: 'Brand Guideline Verification',
      desc: 'Enforces strict adherence to company guidelines, official rules, and legal standards.',
      icon: FileSearch
    },
    {
      title: 'Visual Identity Checking',
      desc: 'Detects unauthorized color shifts, outdated logos, and visual distortions across assets.',
      icon: Palette
    },
    {
      title: 'Smart Correction Suggestions',
      desc: 'Generates context-aware replacement text and verified claims ready to accept in one click.',
      icon: CheckCircle2
    },
    {
      title: 'Human Review & Approval',
      desc: 'Enterprise multi-role review workflows route flagged assets to brand stewards before publishing.',
      icon: MessageSquare
    },
    {
      title: 'Brand Intelligence Analytics',
      desc: 'Tracks recurring violations, compliance health scores, and approval rates across campaigns.',
      icon: BarChart3
    }
  ];

  const workflowSteps = [
    { step: '01', title: 'Upload', desc: 'Drop PDFs, DOCX, TXT, or visual collateral.', icon: Upload },
    { step: '02', title: 'Analyze', desc: 'AI compares content against company brand rules.', icon: Sparkles },
    { step: '03', title: 'Detect', desc: 'Flags inconsistent colors, claims, tone, or terms.', icon: AlertTriangle },
    { step: '04', title: 'Correct', desc: 'Review side-by-side smart suggestions & apply edits.', icon: CheckCircle2 },
    { step: '05', title: 'Approve', desc: 'Brand reviewer signs off on compliant publication.', icon: Check }
  ];

  return (
    <div className="min-h-screen bg-[#F8F6FF] flex flex-col font-sans text-[#2E2459]">
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-[#E8E3F2]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#7C3AED] flex items-center justify-center text-white shadow-md shadow-[#7C3AED]/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-[#2E2459]">
                BrandGuard <span className="text-[#7C3AED]">AI</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#EDE9FE] text-[#7C3AED]">
                Pre-Publish Engine
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-[#77718A]">
            <a href="#features" className="hover:text-[#7C3AED] transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-[#7C3AED] transition-colors">How It Works</a>
            <a href="#about" className="hover:text-[#7C3AED] transition-colors">About</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-semibold text-[#77718A] hover:text-[#2E2459] transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/dashboard"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] rounded-xl shadow-sm transition-all hover:shadow-md"
            >
              Start Reviewing
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-16 pb-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#EDE9FE] text-[#7C3AED] text-xs font-bold tracking-wide uppercase mb-6 border border-[#DDD6FE]">
            <Sparkles className="w-4 h-4" />
            Intelligent Brand Governance Before Every Publish
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-[#2E2459] tracking-tight max-w-4xl mx-auto leading-tight sm:leading-none">
            Protect Your Brand <br className="hidden sm:inline" />
            <span className="text-[#7C3AED]">Before Every Publish.</span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-[#77718A] max-w-2xl mx-auto leading-relaxed">
            An intelligent AI-powered brand governance platform that detects inconsistencies,
            verifies promotional claims against ground truth, and ensures every asset follows
            your approved brand identity.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-base shadow-lg shadow-[#7C3AED]/25 transition-all hover:scale-[1.02]"
            >
              Start Reviewing
              <ArrowRight className="w-5 h-5" />
            </button>
            <a
              href="#features"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white hover:bg-[#F8F6FF] text-[#2E2459] font-bold text-base border border-[#E8E3F2] shadow-xs transition-colors"
            >
              Explore Features
            </a>
          </div>

          {/* Interactive UI Mock Preview */}
          <div className="mt-16 max-w-5xl mx-auto bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#E8E3F2] text-left">
            <div className="flex items-center justify-between pb-6 border-b border-[#E8E3F2]">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <span className="text-xs font-bold text-[#77718A]">
                  BrandGuard AI Audit Studio – NovaEngine_Launch_Campaign.pdf
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]">
                  Compliance: 48/100 (Needs Review)
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Document Extract Preview */}
              <div className="md:col-span-1 p-4 rounded-2xl bg-[#F8F6FF] border border-[#EDE9FE]">
                <div className="text-xs font-bold text-[#77718A] uppercase mb-2">Original Copy Snippet</div>
                <p className="text-xs font-mono text-[#2E2459] leading-relaxed bg-white p-3 rounded-xl border border-[#E8E3F2]">
                  "Yo team! Introducing the new cloud solution from technova.
                  Our product provides <span className="bg-red-100 text-red-700 font-bold px-1 rounded">100% improved performance</span> powered by LegacyCloud."
                </p>
              </div>

              {/* Detected Issue Card */}
              <div className="md:col-span-2 p-4 rounded-2xl bg-white border border-[#E8E3F2] shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#DC2626] uppercase flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#DC2626]" /> Critical Violation Detected
                  </span>
                  <span className="text-xs text-[#77718A]">Confidence: 98%</span>
                </div>
                <div className="text-sm font-bold text-[#2E2459]">
                  Unsupported Promotional Claim: "100% improved performance"
                </div>
                <div className="text-xs text-[#77718A] leading-relaxed">
                  Contradicts TechNova Audited Benchmark Data. The approved verified claim statement is 25% performance improvement.
                </div>
                <div className="p-3 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-[#166534]">Smart AI Suggestion</div>
                    <div className="text-xs font-semibold text-[#15803D]">
                      "Our product delivers 25% improved performance."
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="px-3 py-1.5 rounded-lg bg-[#16A34A] text-white text-xs font-bold hover:bg-[#15803D] transition-colors"
                  >
                    Accept & Correct
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-20 bg-white border-y border-[#E8E3F2]">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-extrabold text-[#2E2459]">
            DETECT → EXPLAIN → CORRECT → APPROVE
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#77718A] max-w-2xl mx-auto">
            A frictionless, closed-loop governance workflow connecting content creators with brand stewards.
          </p>

          <div className="mt-16 grid grid-cols-1 sm:grid-cols-5 gap-6">
            {workflowSteps.map((ws, i) => {
              const Icon = ws.icon;
              return (
                <div key={ws.step} className="flex flex-col items-center text-center p-6 rounded-2xl bg-[#F8F6FF] border border-[#EDE9FE]">
                  <div className="w-12 h-12 rounded-2xl bg-[#7C3AED] text-white flex items-center justify-center font-black text-sm mb-4 shadow-sm shadow-[#7C3AED]/20">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-black text-[#7C3AED] tracking-widest uppercase mb-1">
                    STEP {ws.step}
                  </div>
                  <h3 className="text-base font-bold text-[#2E2459] mb-2">{ws.title}</h3>
                  <p className="text-xs text-[#77718A] leading-relaxed">{ws.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FEATURE SECTION */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#2E2459]">
              Enterprise Brand Governance at AI Speed
            </h2>
            <p className="mt-4 text-[#77718A] text-sm sm:text-base">
              Eliminate costly rework, PR embarrassments, and manual approval bottlenecks across all digital channels.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="bg-white p-8 rounded-3xl border border-[#E8E3F2] shadow-sm hover:shadow-md transition-all hover:-translate-y-1"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center mb-6">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-[#2E2459] mb-2">{feat.title}</h3>
                  <p className="text-sm text-[#77718A] leading-relaxed">{feat.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ABOUT SECTION */}
      <section id="about" className="py-20 bg-white border-t border-[#E8E3F2]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="bg-[#F8F6FF] rounded-3xl p-8 sm:p-12 border border-[#EDE9FE] flex flex-col md:flex-row items-center gap-8">
            <div className="w-16 h-16 rounded-3xl bg-[#7C3AED] text-white flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#7C3AED]/20">
              <ShieldCheck className="w-9 h-9" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#2E2459] mb-3">
                Why Brand Integrity Matters More Than Ever
              </h2>
              <p className="text-sm text-[#77718A] leading-relaxed">
                As organizations scale content generation across distributed teams, external agencies,
                and generative AI tooling, brand decay accelerates. Outdated logos, rogue color palettes,
                and unvetted promotional claims undermine consumer trust. BrandGuard AI gives enterprises
                an infallible automated pre-publish quality gate.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-auto bg-white border-t border-[#E8E3F2] py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-[#77718A]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#7C3AED] flex items-center justify-center text-white">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="font-bold text-[#2E2459]">BrandGuard AI</span>
            <span>– Intelligent Brand Governance Before Every Publish.</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="#features" className="hover:text-[#7C3AED]">Features</a>
            <a href="#how-it-works" className="hover:text-[#7C3AED]">How It Works</a>
            <Link to="/login" className="hover:text-[#7C3AED]">Sign In</Link>
            <Link to="/dashboard" className="text-[#7C3AED] font-bold">Launch App</Link>
          </div>

          <div>
            &copy; {new Date().getFullYear()} BrandGuard AI Systems. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};
