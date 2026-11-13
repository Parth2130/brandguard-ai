import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, User, Building2, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const RegisterPage = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [role, setRole] = useState('ADMIN');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!fullName || !email || !password || !orgName) {
      setErrorMsg('All fields are required.');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      await register({
        full_name: fullName,
        email,
        password,
        organization_name: orgName,
        role
      });
      showToast('Organization registered successfully!', 'success');
      navigate('/dashboard');
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Registration failed. Please check inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F6FF] flex flex-col justify-center items-center p-6 font-sans">
      <div className="w-full max-w-lg">
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
          <h2 className="text-xl font-bold text-[#2E2459]">Register Organization</h2>
          <p className="text-xs text-[#77718A] mt-1">
            Establish your centralized brand governance workspace
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-8 border border-[#E8E3F2] shadow-xl">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#2E2459] uppercase tracking-wider mb-1.5">
                Organization / Company Name
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-[#77718A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Acme Global Inc."
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full bg-[#F8F6FF] text-[#2E2459] text-sm pl-10 pr-4 py-2.5 rounded-xl border border-[#EDE9FE] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED] transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#2E2459] uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#77718A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Jane Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-[#F8F6FF] text-[#2E2459] text-sm pl-10 pr-4 py-2.5 rounded-xl border border-[#EDE9FE] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2E2459] uppercase tracking-wider mb-1.5">
                  Account Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-[#F8F6FF] text-[#2E2459] text-sm px-3.5 py-2.5 rounded-xl border border-[#EDE9FE] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED] transition-all cursor-pointer font-medium"
                >
                  <option value="ADMIN">Organization Admin</option>
                  <option value="BRAND_REVIEWER">Brand Reviewer</option>
                  <option value="CONTENT_CREATOR">Content Creator</option>
                  <option value="MARKETING_MANAGER">Marketing Manager</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2E2459] uppercase tracking-wider mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#77718A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="jane@acme.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#F8F6FF] text-[#2E2459] text-sm pl-10 pr-4 py-2.5 rounded-xl border border-[#EDE9FE] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2E2459] uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#77718A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#F8F6FF] text-[#2E2459] text-sm pl-10 pr-4 py-2.5 rounded-xl border border-[#EDE9FE] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED] transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3 px-4 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-sm shadow-md shadow-[#7C3AED]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Create Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[#77718A] mt-6">
          Already registered?{' '}
          <Link to="/login" className="font-bold text-[#7C3AED] hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};
