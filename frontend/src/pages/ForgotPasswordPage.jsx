import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
    showToast('Reset instructions sent to your email.', 'success');
  };

  return (
    <div className="min-h-screen bg-[#F8F6FF] flex flex-col justify-center items-center p-6 font-sans">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-3">
            <div className="w-11 h-11 rounded-2xl bg-[#7C3AED] flex items-center justify-center text-white shadow-md shadow-[#7C3AED]/20">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <span className="font-extrabold text-2xl text-[#2E2459] tracking-tight">
              BrandGuard <span className="text-[#7C3AED]">AI</span>
            </span>
          </Link>
          <h2 className="text-xl font-bold text-[#2E2459]">Reset Password</h2>
          <p className="text-xs text-[#77718A] mt-1">
            We will send you an authorized password reset link
          </p>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-[#E8E3F2] shadow-xl">
          {submitted ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 rounded-full bg-green-100 text-[#16A34A] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#2E2459]">Check your email</h3>
              <p className="text-xs text-[#77718A] leading-relaxed">
                If an account exists for <span className="font-semibold text-[#2E2459]">{email}</span>,
                you will receive password reset instructions shortly.
              </p>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-xs font-bold text-[#7C3AED] hover:underline"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#2E2459] uppercase tracking-wider mb-1.5">
                  Account Email
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

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-sm shadow-md shadow-[#7C3AED]/20 transition-all"
              >
                Send Reset Link
              </button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#77718A] hover:text-[#2E2459]"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
