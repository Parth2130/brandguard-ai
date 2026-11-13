import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, ArrowRight, UserCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      await login(email, password);
      showToast('Welcome to BrandGuard AI!', 'success');
      navigate('/dashboard');
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demoEmail, roleLabel) => {
    setEmail(demoEmail);
    setPassword('password123');
    setErrorMsg('');
    setLoading(true);
    try {
      await login(demoEmail, 'password123');
      showToast(`Logged in as ${roleLabel}!`, 'success');
      navigate('/dashboard');
    } catch (err) {
      setErrorMsg('Demo login failed. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F6FF] flex flex-col justify-center items-center p-6 font-sans">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-3">
            <div className="w-11 h-11 rounded-2xl bg-[#7C3AED] flex items-center justify-center text-white shadow-md shadow-[#7C3AED]/20">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <span className="font-extrabold text-2xl text-[#2E2459] tracking-tight">
              BrandGuard <span className="text-[#7C3AED]">AI</span>
            </span>
          </Link>
          <h2 className="text-xl font-bold text-[#2E2459]">Welcome back</h2>
          <p className="text-xs text-[#77718A] mt-1">
            Access enterprise brand compliance & approval console
          </p>
        </div>

        {/* Expired Session Notice */}
        {searchParams.get('expired') && (
          <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Your session has expired. Please sign in again.
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white rounded-3xl p-8 border border-[#E8E3F2] shadow-xl">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#2E2459] uppercase tracking-wider mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#77718A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#F8F6FF] text-[#2E2459] text-sm pl-10 pr-4 py-2.5 rounded-xl border border-[#EDE9FE] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED] transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#2E2459] uppercase tracking-wider">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs font-semibold text-[#7C3AED] hover:underline">
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#77718A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#F8F6FF] text-[#2E2459] text-sm pl-10 pr-4 py-2.5 rounded-xl border border-[#EDE9FE] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED] transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-sm shadow-md shadow-[#7C3AED]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Personas */}
          <div className="mt-8 pt-6 border-t border-[#E8E3F2]">
            <div className="flex items-center gap-2 mb-3">
              <UserCheck className="w-4 h-4 text-[#7C3AED]" />
              <span className="text-xs font-bold text-[#2E2459] uppercase tracking-wider">
                Instant Demo Access (TechNova)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('admin@technova.com', 'Admin')}
                className="p-2 rounded-xl border border-[#EDE9FE] bg-[#F8F6FF] hover:bg-[#EDE9FE] text-[#2E2459] font-medium text-left transition-colors"
              >
                <div className="font-bold text-[#7C3AED]">Admin</div>
                <div className="text-[10px] text-[#77718A]">Sarah Connor</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('creator@technova.com', 'Content Creator')}
                className="p-2 rounded-xl border border-[#EDE9FE] bg-[#F8F6FF] hover:bg-[#EDE9FE] text-[#2E2459] font-medium text-left transition-colors"
              >
                <div className="font-bold text-[#7C3AED]">Creator</div>
                <div className="text-[10px] text-[#77718A]">Alex Rivera</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('reviewer@technova.com', 'Brand Reviewer')}
                className="p-2 rounded-xl border border-[#EDE9FE] bg-[#F8F6FF] hover:bg-[#EDE9FE] text-[#2E2459] font-medium text-left transition-colors"
              >
                <div className="font-bold text-[#7C3AED]">Reviewer</div>
                <div className="text-[10px] text-[#77718A]">David Chen</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('manager@technova.com', 'Marketing Manager')}
                className="p-2 rounded-xl border border-[#EDE9FE] bg-[#F8F6FF] hover:bg-[#EDE9FE] text-[#2E2459] font-medium text-left transition-colors"
              >
                <div className="font-bold text-[#7C3AED]">Manager</div>
                <div className="text-[10px] text-[#77718A]">Elena Rostova</div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer link */}
        <p className="text-center text-xs text-[#77718A] mt-6">
          Don't have an organization account?{' '}
          <Link to="/register" className="font-bold text-[#7C3AED] hover:underline">
            Register Organization
          </Link>
        </p>
      </div>
    </div>
  );
};
