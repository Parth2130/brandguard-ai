import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Trash2,
  Edit2,
  Shield,
  CheckCircle2,
  XCircle,
  Mail,
  User
} from 'lucide-react';
import { usersAPI } from '../services/api';
import { Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    email: '',
    full_name: '',
    role: 'CONTENT_CREATOR',
    job_title: '',
    password: 'password123'
  });

  const { isAdmin, user: currentUser } = useAuth();
  const { showToast } = useToast();

  const loadUsers = async () => {
    try {
      const res = await usersAPI.list();
      setUsers(res.data.users);
    } catch (err) {
      showToast('Failed to load users list.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await usersAPI.create(form);
      showToast(`User ${form.full_name} created successfully.`, 'success');
      setModalOpen(false);
      setForm({ email: '', full_name: '', role: 'CONTENT_CREATOR', job_title: '', password: 'password123' });
      loadUsers();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to create user.', 'error');
    }
  };

  const handleDeleteUser = async (id, name) => {
    if (!window.confirm(`Remove user ${name} from organization?`)) return;
    try {
      await usersAPI.delete(id);
      showToast('User removed.', 'info');
      loadUsers();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete user.', 'error');
    }
  };

  const handleToggleActive = async (targetUser) => {
    try {
      await usersAPI.update(targetUser.id, { is_active: !targetUser.is_active });
      showToast(`User status updated to ${!targetUser.is_active ? 'Active' : 'Inactive'}.`, 'success');
      loadUsers();
    } catch (err) {
      showToast('Could not update status.', 'error');
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-[#77718A] animate-pulse">Loading organization members...</div>;
  }

  const roleLabels = {
    ADMIN: 'Admin',
    CONTENT_CREATOR: 'Content Creator',
    BRAND_REVIEWER: 'Brand Reviewer',
    MARKETING_MANAGER: 'Marketing Manager'
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2E2459] tracking-tight">
            User Management & Permissions
          </h1>
          <p className="text-xs text-[#77718A] mt-1">
            Manage authorized creators, brand reviewers, marketing managers, and organization administrators.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-xs shadow-md shadow-[#7C3AED]/20 transition-all"
          >
            <UserPlus className="w-4 h-4" /> Add Team Member
          </button>
        )}
      </div>

      {/* Role Definitions Legend */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-[#E8E3F2] shadow-xs">
          <div className="text-xs font-bold text-[#7C3AED] uppercase mb-1">Admin</div>
          <div className="text-xs text-[#77718A] leading-relaxed">
            Full control: organization profile, users, brand guidelines, rules, assets, and analytics.
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-[#E8E3F2] shadow-xs">
          <div className="text-xs font-bold text-[#2563EB] uppercase mb-1">Brand Reviewer</div>
          <div className="text-xs text-[#77718A] leading-relaxed">
            Authorized to inspect AI findings, add feedback, approve, reject, or request revisions.
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-[#E8E3F2] shadow-xs">
          <div className="text-xs font-bold text-[#16A34A] uppercase mb-1">Content Creator</div>
          <div className="text-xs text-[#77718A] leading-relaxed">
            Uploads content, runs AI scans, applies smart corrections, and routes for sign-off.
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-[#E8E3F2] shadow-xs">
          <div className="text-xs font-bold text-[#F59E0B] uppercase mb-1">Marketing Manager</div>
          <div className="text-xs text-[#77718A] leading-relaxed">
            Monitors compliance scores, reviews analytics telemetry, and tracks recurring violations.
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-[#E8E3F2] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E8E3F2] bg-[#F8F6FF]/60 text-[#77718A] font-semibold uppercase text-[10px]">
                <th className="py-4 px-6">User Member</th>
                <th className="py-4 px-6">Work Email</th>
                <th className="py-4 px-6">Governance Role</th>
                <th className="py-4 px-6">Job Title</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E3F2]">
              {users.map((u) => {
                const isSelf = u.id === currentUser?.id;
                return (
                  <tr key={u.id} className="hover:bg-[#F8F6FF]/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center font-bold text-xs">
                          {u.full_name ? u.full_name[0] : 'U'}
                        </div>
                        <div>
                          <div className="font-bold text-[#2E2459]">
                            {u.full_name} {isSelf && <span className="text-[10px] text-[#7C3AED] font-semibold">(You)</span>}
                          </div>
                          <div className="text-[10px] text-[#77718A]">Member since {new Date(u.created_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-mono text-[#77718A]">{u.email}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                        u.role === 'BRAND_REVIEWER' ? 'bg-blue-100 text-blue-700' :
                        u.role === 'MARKETING_MANAGER' ? 'bg-amber-100 text-amber-800' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {roleLabels[u.role] || u.role}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-[#77718A]">{u.job_title || '–'}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      {isAdmin && !isSelf && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleActive(u)}
                            className="text-xs text-[#7C3AED] hover:underline"
                          >
                            {u.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id, u.full_name)}
                            className="p-1 text-gray-400 hover:text-red-600 rounded"
                            title="Remove User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add User */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Invite New Team Member">
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#77718A] uppercase mb-1">Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Rachel Adams"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full bg-[#F8F6FF] border border-[#EDE9FE] rounded-xl p-2.5 text-xs text-[#2E2459]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#77718A] uppercase mb-1">Work Email</label>
            <input
              type="email"
              required
              placeholder="rachel@technova.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-[#F8F6FF] border border-[#EDE9FE] rounded-xl p-2.5 text-xs text-[#2E2459]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#77718A] uppercase mb-1">Governance Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full bg-[#F8F6FF] border border-[#EDE9FE] rounded-xl p-2.5 text-xs font-semibold"
              >
                <option value="CONTENT_CREATOR">Content Creator</option>
                <option value="BRAND_REVIEWER">Brand Reviewer</option>
                <option value="MARKETING_MANAGER">Marketing Manager</option>
                <option value="ADMIN">Organization Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#77718A] uppercase mb-1">Job Title</label>
              <input
                type="text"
                placeholder="Senior Graphic Designer"
                value={form.job_title}
                onChange={(e) => setForm({ ...form, job_title: e.target.value })}
                className="w-full bg-[#F8F6FF] border border-[#EDE9FE] rounded-xl p-2.5 text-xs text-[#2E2459]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#77718A] uppercase mb-1">Temporary Password</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full bg-[#F8F6FF] border border-[#EDE9FE] rounded-xl p-2.5 text-xs text-[#2E2459]"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-[#77718A] hover:bg-gray-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold rounded-xl"
            >
              Create Account
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
