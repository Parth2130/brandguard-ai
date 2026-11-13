import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar = ({ onSearch }) => {
  const { user, organization } = useAuth();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const sampleNotifications = [
    {
      id: 1,
      title: 'Review Request Assigned',
      desc: 'NovaEngine Q4 Marketing Flyer is pending compliance review.',
      time: '15m ago',
      unread: true,
      icon: AlertTriangle,
      color: 'text-amber-500'
    },
    {
      id: 2,
      title: 'Content Approved',
      desc: 'TechNova Cloud Solution Brief was approved for release.',
      time: '2h ago',
      unread: false,
      icon: CheckCircle2,
      color: 'text-green-500'
    }
  ];

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-[#E8E3F2] fixed top-0 right-0 left-64 z-20 px-8 flex items-center justify-between">
      {/* Search Input */}
      <form onSubmit={handleSearchSubmit} className="relative w-80 max-w-sm">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#77718A]" />
        <input
          type="text"
          placeholder="Search guidelines, rules, or content..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#F8F6FF] text-[#2E2459] text-xs font-medium pl-10 pr-4 py-2 rounded-xl border border-[#EDE9FE] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED] transition-all"
        />
      </form>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Quick Upload CTA */}
        <button
          onClick={() => navigate('/upload')}
          className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold shadow-xs transition-colors"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Upload Content</span>
        </button>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl text-[#77718A] hover:text-[#2E2459] hover:bg-[#F8F6FF] relative transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#DC2626] ring-2 ring-white" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-[#E8E3F2] p-4 z-40 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E8E3F2]">
                <span className="text-xs font-bold text-[#2E2459]">Notifications</span>
                <span className="text-[10px] text-[#7C3AED] font-semibold cursor-pointer">Mark all read</span>
              </div>
              <div className="space-y-2.5">
                {sampleNotifications.map((n) => {
                  const Icon = n.icon;
                  return (
                    <div
                      key={n.id}
                      className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-[#F8F6FF] transition-colors cursor-pointer text-xs"
                      onClick={() => {
                        setShowNotifications(false);
                        navigate('/reviews');
                      }}
                    >
                      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${n.color}`} />
                      <div className="flex-1">
                        <div className="font-semibold text-[#2E2459]">{n.title}</div>
                        <div className="text-[11px] text-[#77718A] leading-tight mt-0.5">{n.desc}</div>
                        <div className="text-[9px] text-[#77718A] mt-1">{n.time}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* User Status pill */}
        <div className="flex items-center gap-3 pl-2 border-l border-[#E8E3F2]">
          <div className="w-8 h-8 rounded-full bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center font-bold text-xs ring-2 ring-[#EDE9FE]">
            {user?.full_name ? user.full_name[0] : 'U'}
          </div>
          <div className="hidden md:block text-left">
            <div className="text-xs font-bold text-[#2E2459] leading-tight">
              {user?.full_name || 'Admin'}
            </div>
            <div className="text-[10px] font-semibold text-[#7C3AED] capitalize">
              {(user?.role || 'Creator').replace('_', ' ').toLowerCase()}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
