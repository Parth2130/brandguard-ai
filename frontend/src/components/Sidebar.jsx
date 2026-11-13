import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  UploadCloud,
  Sparkles,
  CheckSquare,
  History,
  BarChart3,
  Users,
  Settings,
  LogOut,
  ShieldCheck,
  Building2,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const Sidebar = () => {
  const { user, organization, logout, switchDemoAccount } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    showToast('Logged out successfully.', 'info');
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Brand Knowledge Base', path: '/knowledge-base', icon: BookOpen },
    { label: 'Upload Content', path: '/upload', icon: UploadCloud },
    { label: 'AI Analysis', path: '/analysis', icon: Sparkles },
    { label: 'Review & Approval', path: '/reviews', icon: CheckSquare },
    { label: 'Content History', path: '/history', icon: History },
    { label: 'Brand Intelligence', path: '/analytics', icon: BarChart3 },
    { label: 'User Management', path: '/users', icon: Users, adminOnly: false },
    { label: 'Settings', path: '/settings', icon: Settings }
  ];

  const handleRoleSwitch = async (e) => {
    const newRole = e.target.value;
    try {
      await switchDemoAccount(newRole);
      showToast(`Switched persona to ${newRole.replace('_', ' ')}.`, 'success');
    } catch (err) {
      showToast('Could not switch persona.', 'error');
    }
  };

  return (
    <aside className="w-64 bg-white border-r border-[#E8E3F2] flex flex-col h-screen fixed left-0 top-0 z-30 select-none">
      {/* BrandGuard AI Logo header */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-[#E8E3F2]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#7C3AED] flex items-center justify-center text-white shadow-sm shadow-[#7C3AED]/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="font-extrabold text-[#2E2459] text-base leading-tight tracking-tight flex items-center gap-1">
              BrandGuard <span className="text-[#7C3AED]">AI</span>
            </div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-[#77718A]">
              Pre-Publish Governance
            </div>
          </div>
        </div>
      </div>

      {/* Organization pill */}
      <div className="px-5 py-3 border-b border-[#E8E3F2] bg-[#F8F6FF]/60 flex items-center gap-2 text-xs">
        <Building2 className="w-3.5 h-3.5 text-[#7C3AED] flex-shrink-0" />
        <span className="font-semibold text-[#2E2459] truncate">
          {organization?.name || 'TechNova Solutions'}
        </span>
        {organization?.is_demo && (
          <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#EDE9FE] text-[#7C3AED]">
            Demo
          </span>
        )}
      </div>

      {/* Navigation menu */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#EDE9FE] text-[#7C3AED] font-semibold'
                    : 'text-[#77718A] hover:bg-[#F8F6FF] hover:text-[#2E2459]'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Role switcher & User profile footer */}
      <div className="p-4 border-t border-[#E8E3F2] bg-[#F8F6FF]/40 space-y-3">
        {/* Quick Demo Persona Switcher */}
        <div className="bg-white p-2 rounded-xl border border-[#E8E3F2] shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[#77718A] mb-1">
            <span className="flex items-center gap-1">
              <UserCheck className="w-3 h-3 text-[#7C3AED]" /> Active Persona
            </span>
            <span className="text-[10px] text-[#7C3AED] font-bold">Switch</span>
          </div>
          <select
            value={user?.role || 'ADMIN'}
            onChange={handleRoleSwitch}
            className="w-full text-xs font-semibold text-[#2E2459] bg-[#F8F6FF] rounded-lg px-2 py-1.5 border border-[#EDE9FE] focus:outline-none focus:ring-1 focus:ring-[#7C3AED] cursor-pointer"
          >
            <option value="ADMIN">Admin (Sarah Connor)</option>
            <option value="CONTENT_CREATOR">Content Creator (Alex Rivera)</option>
            <option value="BRAND_REVIEWER">Brand Reviewer (David Chen)</option>
            <option value="MARKETING_MANAGER">Marketing Manager (Elena)</option>
          </select>
        </div>

        {/* User Card */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center font-bold text-xs">
              {user?.full_name ? user.full_name[0] : 'U'}
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-[#2E2459] truncate">
                {user?.full_name || 'User'}
              </div>
              <div className="text-[10px] text-[#77718A] capitalize">
                {(user?.role || 'User').replace('_', ' ').toLowerCase()}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-1.5 text-[#77718A] hover:text-[#DC2626] rounded-lg hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
