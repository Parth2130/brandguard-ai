import React, { useState, useEffect } from 'react';
import {
  Settings,
  Sparkles,
  Key,
  RotateCcw,
  CheckCircle2,
  Building2,
  Cpu,
  AlertCircle,
  ShieldCheck,
  Save
} from 'lucide-react';
import { settingsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const SettingsPage = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [geminiKey, setGeminiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-1.5-flash');
  const [provider, setProvider] = useState('gemini');
  const [savingAI, setSavingAI] = useState(false);
  const [resettingDemo, setResettingDemo] = useState(false);

  const { isAdmin, organization } = useAuth();
  const { showToast } = useToast();

  const loadSettings = async () => {
    try {
      const res = await settingsAPI.get();
      setSettings(res.data);
      if (res.data.ai_configuration) {
        setGeminiModel(res.data.ai_configuration.model || 'gemini-1.5-flash');
        setProvider(res.data.ai_configuration.provider || 'gemini');
      }
    } catch (err) {
      showToast('Failed to load settings.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveAIConfig = async (e) => {
    e.preventDefault();
    setSavingAI(true);
    try {
      await settingsAPI.updateAI({
        gemini_api_key: geminiKey,
        gemini_model: geminiModel,
        provider: provider
      });
      showToast('AI Governance configuration updated successfully.', 'success');
      setGeminiKey('');
      loadSettings();
    } catch (err) {
      showToast('Failed to update AI settings.', 'error');
    } finally {
      setSavingAI(false);
    }
  };

  const handleResetDemoData = async () => {
    if (!window.confirm('Reset TechNova demonstration data to its pristine initial state? This re-populates test violations, sample content, and reviews.')) {
      return;
    }
    setResettingDemo(true);
    try {
      await settingsAPI.resetDemo();
      showToast('TechNova demonstration data reset successfully.', 'success');
      loadSettings();
    } catch (err) {
      showToast('Failed to reset demo data.', 'error');
    } finally {
      setResettingDemo(false);
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-[#77718A] animate-pulse">Loading system settings...</div>;
  }

  const aiConfig = settings?.ai_configuration || {};

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-[#2E2459] tracking-tight">
          System & Governance Settings
        </h1>
        <p className="text-xs text-[#77718A] mt-1">
          Configure AI inspection models, API keys, and workspace demonstration environments.
        </p>
      </div>

      {/* AI ENGINE INTEGRATION */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8E3F2] shadow-sm space-y-6">
        <div className="flex items-start justify-between pb-4 border-b border-[#E8E3F2]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#2E2459]">AI Engine Configuration</h3>
              <p className="text-xs text-[#77718A]">Manage Google Gemini API credentials and analysis models</p>
            </div>
          </div>

          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
            aiConfig.has_gemini_key
              ? 'bg-green-100 text-green-700'
              : 'bg-purple-100 text-[#7C3AED]'
          }`}>
            <span className="w-2 h-2 rounded-full bg-current" />
            {aiConfig.has_gemini_key ? 'Gemini API Active' : 'Built-in Engine Active'}
          </span>
        </div>

        {/* Informational Banner */}
        <div className="p-4 rounded-2xl bg-[#F8F6FF] border border-[#EDE9FE] text-xs text-[#2E2459] flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-[#7C3AED] flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">Dual-Engine Reliability Architecture:</span>
            <p className="text-[#77718A] leading-relaxed">
              BrandGuard AI operates with a deterministic ground-truth engine that executes complete, mathematically
              grounded brand rule evaluations offline. If a Google Gemini API Key is entered below, the system automatically
              leverages multimodal LLM inference for enhanced qualitative copy nuances.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveAIConfig} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#77718A] uppercase mb-1">
              Google Gemini API Key
            </label>
            <div className="relative">
              <Key className="w-4 h-4 text-[#77718A] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                disabled={!isAdmin}
                placeholder={aiConfig.has_gemini_key ? '••••••••••••••••••••••••••••••••' : 'Enter Gemini API Key (e.g. AIzaSy...)'}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                className="w-full bg-[#F8F6FF] border border-[#EDE9FE] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#2E2459] font-mono focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
              />
            </div>
            <p className="text-[11px] text-[#77718A] mt-1">
              Keys are securely stored in backend environment configuration and never exposed to clients.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#77718A] uppercase mb-1">Target Model</label>
              <select
                disabled={!isAdmin}
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value)}
                className="w-full bg-[#F8F6FF] border border-[#EDE9FE] rounded-xl p-2.5 text-xs font-semibold text-[#2E2459]"
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Latest, Recommended)</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Ultra-fast)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep Reasoning)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#77718A] uppercase mb-1">Execution Mode</label>
              <select
                disabled={!isAdmin}
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full bg-[#F8F6FF] border border-[#EDE9FE] rounded-xl p-2.5 text-xs font-semibold text-[#2E2459]"
              >
                <option value="gemini">Google Gemini with Deterministic Fallback</option>
                <option value="built-in">Built-in Deterministic Engine Only</option>
              </select>
            </div>
          </div>

          {isAdmin && (
            <div className="pt-2">
              <button
                type="submit"
                disabled={savingAI}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {savingAI ? 'Saving...' : 'Save AI Configuration'}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* DEMO DATASET MANAGEMENT */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8E3F2] shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#2E2459]">Demonstration Data Management</h3>
            <p className="text-xs text-[#77718A]">Reset or re-seed the TechNova corporate testing environment</p>
          </div>
        </div>

        <p className="text-xs text-[#77718A] leading-relaxed">
          Resetting restores sample brand rules (Primary #7C3AED, Secondary #EDE9FE), approved 25% performance claim,
          unapproved color violations, prohibited "LegacyCloud" terms, and initial review requests for testing the
          <span className="font-semibold text-[#2E2459]"> DETECT → EXPLAIN → CORRECT → APPROVE</span> workflow.
        </p>

        {isAdmin ? (
          <button
            onClick={handleResetDemoData}
            disabled={resettingDemo}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-bold transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
            {resettingDemo ? 'Resetting dataset...' : 'Reset TechNova Demonstration Data'}
          </button>
        ) : (
          <div className="text-xs text-[#77718A] italic">
            Only Organization Administrators can trigger demonstration dataset resets.
          </div>
        )}
      </div>
    </div>
  );
};
