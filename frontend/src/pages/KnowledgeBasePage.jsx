import React, { useState, useEffect } from 'react';
import {
  Building2,
  Palette,
  Image as ImageIcon,
  Type,
  Mic,
  FileText,
  Package,
  BookOpen,
  Plus,
  Trash2,
  Check,
  Upload,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  X
} from 'lucide-react';
import { brandsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';

export const KnowledgeBasePage = () => {
  const [activeTab, setActiveTab] = useState('company');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    organization: null,
    rules: [],
    assets: [],
    products: [],
    guidelines: []
  });

  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  // Modals state
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isGuidelineModalOpen, setIsGuidelineModalOpen] = useState(false);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);

  // Form states
  const [ruleForm, setRuleForm] = useState({ rule_type: 'color', rule_key: '', rule_value: '', description: '', severity: 'high' });
  const [productForm, setProductForm] = useState({
    product_name: '',
    category: 'Core Product',
    specifications: '',
    approved_claims: '',
    verified_benchmarks: '',
    official_sla: '',
    prohibited_claims: '',
    source_doc: '',
    effective_date: ''
  });
  const [guideForm, setGuideForm] = useState({ title: '', category: 'Brand Identity', version: '1.0', raw_text: '', file: null });
  const [assetForm, setAssetForm] = useState({ name: '', asset_type: 'logo', version: 'v1.0', is_active: true, file: null });
  const [companyForm, setCompanyForm] = useState({ name: '', description: '', industry: '', website: '', contact_email: '' });

  const loadData = async () => {
    try {
      const res = await brandsAPI.getOverview();
      setData(res.data);
      if (res.data.organization) {
        setCompanyForm({
          name: res.data.organization.name || '',
          description: res.data.organization.description || '',
          industry: res.data.organization.industry || '',
          website: res.data.organization.website || '',
          contact_email: res.data.organization.contact_email || ''
        });
      }
    } catch (err) {
      showToast('Failed to load brand knowledge base.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCompanyUpdate = async (e) => {
    e.preventDefault();
    try {
      await brandsAPI.updateCompany(companyForm);
      showToast('Company information updated.', 'success');
      loadData();
    } catch (err) {
      showToast('Failed to update company info.', 'error');
    }
  };

  const handleCreateRule = async (e) => {
    e.preventDefault();
    try {
      await brandsAPI.createRule(ruleForm);
      showToast('Brand rule created successfully.', 'success');
      setIsRuleModalOpen(false);
      setRuleForm({ rule_type: 'color', rule_key: '', rule_value: '', description: '', severity: 'high' });
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to create rule.', 'error');
    }
  };

  const handleDeleteRule = async (id) => {
    if (!window.confirm('Delete this brand rule?')) return;
    try {
      await brandsAPI.deleteRule(id);
      showToast('Rule deleted.', 'info');
      loadData();
    } catch (err) {
      showToast('Could not delete rule.', 'error');
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      await brandsAPI.createProduct(productForm);
      showToast('Product information registered.', 'success');
      setIsProductModalOpen(false);
      setProductForm({
        product_name: '',
        category: 'Core Product',
        specifications: '',
        approved_claims: '',
        verified_benchmarks: '',
        official_sla: '',
        prohibited_claims: '',
        source_doc: '',
        effective_date: ''
      });
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to create product.', 'error');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Remove this product specification?')) return;
    try {
      await brandsAPI.deleteProduct(id);
      showToast('Product removed.', 'info');
      loadData();
    } catch (err) {
      showToast('Could not delete product.', 'error');
    }
  };

  const handleUploadAsset = async (e) => {
    e.preventDefault();
    if (!assetForm.file) {
      showToast('Please select a file.', 'error');
      return;
    }
    const fd = new FormData();
    fd.append('name', assetForm.name || assetForm.file.name);
    fd.append('asset_type', assetForm.asset_type);
    fd.append('version', assetForm.version);
    fd.append('is_active', assetForm.is_active);
    fd.append('file', assetForm.file);

    try {
      await brandsAPI.uploadAsset(fd);
      showToast('Asset uploaded successfully.', 'success');
      setIsAssetModalOpen(false);
      setAssetForm({ name: '', asset_type: 'logo', version: 'v1.0', is_active: true, file: null });
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to upload asset.', 'error');
    }
  };

  const handleToggleAsset = async (id) => {
    try {
      await brandsAPI.toggleAssetActive(id);
      showToast('Asset status toggled.', 'success');
      loadData();
    } catch (err) {
      showToast('Could not toggle asset status.', 'error');
    }
  };

  const handleDeleteAsset = async (id) => {
    if (!window.confirm('Delete this asset?')) return;
    try {
      await brandsAPI.deleteAsset(id);
      showToast('Asset removed.', 'info');
      loadData();
    } catch (err) {
      showToast('Could not delete asset.', 'error');
    }
  };

  const handleCreateGuideline = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('title', guideForm.title);
    fd.append('category', guideForm.category);
    fd.append('version', guideForm.version);
    fd.append('raw_text', guideForm.raw_text);
    if (guideForm.file) {
      fd.append('file', guideForm.file);
    }

    try {
      await brandsAPI.createGuideline(fd);
      showToast('Guideline document created and indexed.', 'success');
      setIsGuidelineModalOpen(false);
      setGuideForm({ title: '', category: 'Brand Identity', version: '1.0', raw_text: '', file: null });
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to create guideline.', 'error');
    }
  };

  const handleDeleteGuideline = async (id) => {
    if (!window.confirm('Remove this guideline document?')) return;
    try {
      await brandsAPI.deleteGuideline(id);
      showToast('Guideline removed.', 'info');
      loadData();
    } catch (err) {
      showToast('Could not delete guideline.', 'error');
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-[#77718A] animate-pulse">Loading Brand Knowledge Base...</div>;
  }

  const tabs = [
    { id: 'company', label: 'Company Info', icon: Building2 },
    { id: 'logos', label: 'Brand Logos', icon: ImageIcon, count: data.assets.length },
    { id: 'colors', label: 'Brand Colours', icon: Palette, count: data.rules.filter(r => r.rule_type === 'color').length },
    { id: 'typography', label: 'Typography', icon: Type, count: data.rules.filter(r => r.rule_type === 'typography').length },
    { id: 'voice', label: 'Brand Voice', icon: Mic, count: data.rules.filter(r => r.rule_type === 'tone').length },
    { id: 'terminology', label: 'Terminology', icon: FileText, count: data.rules.filter(r => r.rule_type === 'terminology').length },
    { id: 'products', label: 'Product & Claims', icon: Package, count: data.products.length },
    { id: 'guidelines', label: 'Documents', icon: BookOpen, count: data.guidelines.length }
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2E2459] tracking-tight">
            Brand Knowledge Base
          </h1>
          <p className="text-xs text-[#77718A] mt-1">
            Central repository of approved corporate identity, rules, logos, and verified promotional claims.
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#E8E3F2]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-[#7C3AED] text-white shadow-sm'
                  : 'bg-white text-[#77718A] hover:bg-[#F8F6FF] hover:text-[#2E2459] border border-[#E8E3F2]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-[#EDE9FE] text-[#7C3AED]'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: COMPANY INFORMATION */}
      {activeTab === 'company' && (
        <div className="bg-white rounded-3xl p-8 border border-[#E8E3F2] shadow-sm max-w-3xl">
          <h3 className="text-base font-bold text-[#2E2459] mb-4">Official Company Profile</h3>
          <form onSubmit={handleCompanyUpdate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#77718A] uppercase mb-1">Company Name</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={companyForm.name}
                  onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                  className="w-full bg-[#F8F6FF] border border-[#EDE9FE] rounded-xl px-4 py-2.5 text-xs font-semibold text-[#2E2459] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#77718A] uppercase mb-1">Industry</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={companyForm.industry}
                  onChange={(e) => setCompanyForm({ ...companyForm, industry: e.target.value })}
                  className="w-full bg-[#F8F6FF] border border-[#EDE9FE] rounded-xl px-4 py-2.5 text-xs font-semibold text-[#2E2459] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#77718A] uppercase mb-1">Company Description</label>
              <textarea
                rows={3}
                disabled={!isAdmin}
                value={companyForm.description}
                onChange={(e) => setCompanyForm({ ...companyForm, description: e.target.value })}
                className="w-full bg-[#F8F6FF] border border-[#EDE9FE] rounded-xl p-3 text-xs text-[#2E2459] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#77718A] uppercase mb-1">Website URL</label>
                <input
                  type="url"
                  disabled={!isAdmin}
                  value={companyForm.website}
                  onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                  className="w-full bg-[#F8F6FF] border border-[#EDE9FE] rounded-xl px-4 py-2.5 text-xs font-semibold text-[#2E2459] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#77718A] uppercase mb-1">Governance Contact</label>
                <input
                  type="email"
                  disabled={!isAdmin}
                  value={companyForm.contact_email}
                  onChange={(e) => setCompanyForm({ ...companyForm, contact_email: e.target.value })}
                  className="w-full bg-[#F8F6FF] border border-[#EDE9FE] rounded-xl px-4 py-2.5 text-xs font-semibold text-[#2E2459] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
                />
              </div>
            </div>

            {isAdmin && (
              <button
                type="submit"
                className="mt-4 px-6 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                Save Company Information
              </button>
            )}
          </form>
        </div>
      )}

      {/* TAB CONTENT: BRAND LOGOS */}
      {activeTab === 'logos' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#2E2459]">Approved Logo Assets</h3>
              <p className="text-xs text-[#77718A]">Manage official logos, vector marks, and mark deprecated variants.</p>
            </div>
            {isAdmin && (
              <button
                onClick={() => setIsAssetModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7C3AED] text-white text-xs font-semibold hover:bg-[#6D28D9]"
              >
                <Plus className="w-4 h-4" /> Upload Logo Asset
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.assets.map((asset) => (
              <div key={asset.id} className="bg-white rounded-3xl p-6 border border-[#E8E3F2] shadow-sm flex flex-col justify-between">
                <div>
                  <div className="h-32 bg-[#F8F6FF] rounded-2xl flex items-center justify-center p-4 border border-[#EDE9FE] mb-4">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-8 h-8 text-[#7C3AED]" />
                      <span className="font-extrabold text-lg text-[#2E2459]">{asset.name.split(' ')[0]}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-[#2E2459]">{asset.name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${asset.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {asset.is_active ? 'Active Approved' : 'Deprecated'}
                    </span>
                  </div>
                  <div className="text-xs text-[#77718A]">Version: {asset.version}</div>
                </div>

                {isAdmin && (
                  <div className="mt-4 pt-4 border-t border-[#E8E3F2] flex items-center justify-between">
                    <button
                      onClick={() => handleToggleAsset(asset.id)}
                      className="text-xs font-semibold text-[#7C3AED] hover:underline"
                    >
                      {asset.is_active ? 'Mark Deprecated' : 'Mark Active'}
                    </button>
                    <button
                      onClick={() => handleDeleteAsset(asset.id)}
                      className="text-xs text-red-500 hover:text-red-700 p-1 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: BRAND COLOURS */}
      {activeTab === 'colors' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#2E2459]">Brand Colour Palette</h3>
              <p className="text-xs text-[#77718A]">Official HEX codes and permitted tint variations.</p>
            </div>
            {isAdmin && (
              <button
                onClick={() => {
                  setRuleForm({ rule_type: 'color', rule_key: 'primary_hex', rule_value: '#7C3AED', description: 'Primary brand accent', severity: 'critical' });
                  setIsRuleModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7C3AED] text-white text-xs font-semibold hover:bg-[#6D28D9]"
              >
                <Plus className="w-4 h-4" /> Add Brand Colour
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {data.rules.filter(r => r.rule_type === 'color').map((rule) => (
              <div key={rule.id} className="bg-white rounded-3xl p-5 border border-[#E8E3F2] shadow-sm flex flex-col justify-between">
                <div>
                  <div
                    className="h-24 rounded-2xl w-full border border-black/5 shadow-inner mb-4 flex items-end p-3"
                    style={{ backgroundColor: rule.rule_value }}
                  >
                    <span className="bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-md text-xs font-mono font-bold text-[#2E2459]">
                      {rule.rule_value.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-[#2E2459]">{rule.description || rule.rule_key}</div>
                  <div className="text-[11px] text-[#77718A] mt-0.5">Role: {rule.rule_key}</div>
                </div>

                {isAdmin && (
                  <div className="mt-4 pt-3 border-t border-[#E8E3F2] flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-red-600 bg-red-50 px-2 py-0.5 rounded">
                      {rule.severity}
                    </span>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="text-[#77718A] hover:text-red-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: TYPOGRAPHY */}
      {activeTab === 'typography' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#2E2459]">Approved Typography</h3>
              <p className="text-xs text-[#77718A]">Typeface pairings and heading hierarchy rules.</p>
            </div>
            {isAdmin && (
              <button
                onClick={() => {
                  setRuleForm({ rule_type: 'typography', rule_key: 'heading_font', rule_value: 'Poppins, 600 Semi-Bold', description: 'Headline typeface', severity: 'medium' });
                  setIsRuleModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7C3AED] text-white text-xs font-semibold hover:bg-[#6D28D9]"
              >
                <Plus className="w-4 h-4" /> Add Typography Rule
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {data.rules.filter(r => r.rule_type === 'typography').map((rule) => (
              <div key={rule.id} className="bg-white rounded-3xl p-6 border border-[#E8E3F2] shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#7C3AED] uppercase tracking-wider">{rule.rule_key}</span>
                    <h4 className="text-xl font-bold text-[#2E2459] mt-1">{rule.rule_value}</h4>
                  </div>
                  {isAdmin && (
                    <button onClick={() => handleDeleteRule(rule.id)} className="text-[#77718A] hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-[#77718A] mt-3">{rule.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: BRAND VOICE */}
      {activeTab === 'voice' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#2E2459]">Brand Voice & Communication Tone</h3>
              <p className="text-xs text-[#77718A]">Tone guidelines, conversational rules, and prohibited buzzwords.</p>
            </div>
            {isAdmin && (
              <button
                onClick={() => {
                  setRuleForm({ rule_type: 'tone', rule_key: 'custom_tone_rule', rule_value: 'Professional and Friendly', description: 'Default editorial voice standard', severity: 'high' });
                  setIsRuleModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7C3AED] text-white text-xs font-semibold hover:bg-[#6D28D9]"
              >
                <Plus className="w-4 h-4" /> Add Voice Rule
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {data.rules.filter(r => r.rule_type === 'tone').map((rule) => (
              <div key={rule.id} className="bg-white rounded-3xl p-6 border border-[#E8E3F2] shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#7C3AED] uppercase">{rule.rule_key.replace('_', ' ')}</span>
                    <h4 className="text-base font-bold text-[#2E2459] mt-1">{rule.rule_value}</h4>
                  </div>
                  {isAdmin && (
                    <button onClick={() => handleDeleteRule(rule.id)} className="text-[#77718A] hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-[#77718A] mt-2">{rule.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: TERMINOLOGY */}
      {activeTab === 'terminology' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#2E2459]">Terminology & Naming Governance</h3>
              <p className="text-xs text-[#77718A]">Enforce company naming standards and blacklist deprecated product titles.</p>
            </div>
            {isAdmin && (
              <button
                onClick={() => {
                  setRuleForm({ rule_type: 'terminology', rule_key: 'prohibited_term', rule_value: '', description: 'Prohibited in external communications', severity: 'critical' });
                  setIsRuleModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7C3AED] text-white text-xs font-semibold hover:bg-[#6D28D9]"
              >
                <Plus className="w-4 h-4" /> Add Terminology Rule
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.rules.filter(r => r.rule_type === 'terminology').map((rule) => {
              const isProhibited = rule.rule_key.toLowerCase().includes('prohibited');
              return (
                <div key={rule.id} className="bg-white rounded-3xl p-6 border border-[#E8E3F2] shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${isProhibited ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {isProhibited ? 'Prohibited Word' : 'Approved Naming'}
                      </span>
                      <span className="text-[10px] text-[#77718A] font-semibold">{rule.severity}</span>
                    </div>
                    <div className="text-base font-bold text-[#2E2459]">{rule.rule_value}</div>
                    <p className="text-xs text-[#77718A] mt-1.5">{rule.description}</p>
                  </div>

                  {isAdmin && (
                    <div className="mt-4 pt-3 border-t border-[#E8E3F2] text-right">
                      <button onClick={() => handleDeleteRule(rule.id)} className="text-xs text-red-500 hover:underline">
                        Remove Term
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB CONTENT: PRODUCTS & APPROVED CLAIMS */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#2E2459]">Products & Audited Claims</h3>
              <p className="text-xs text-[#77718A]">The AI engine uses these verified claims as ground-truth for checking promotional assertions.</p>
            </div>
            {isAdmin && (
              <button
                onClick={() => setIsProductModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7C3AED] text-white text-xs font-semibold hover:bg-[#6D28D9]"
              >
                <Plus className="w-4 h-4" /> Add Product Claims
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.products.map((prod) => (
              <div key={prod.id} className="bg-white rounded-3xl p-6 border border-[#E8E3F2] shadow-sm space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#7C3AED] uppercase">{prod.category}</span>
                    <h4 className="text-lg font-bold text-[#2E2459]">{prod.product_name}</h4>
                  </div>
                  {isAdmin && (
                    <button onClick={() => handleDeleteProduct(prod.id)} className="text-[#77718A] hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="p-3.5 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0]">
                  <div className="text-[10px] font-bold uppercase text-[#166534] mb-1">Approved Marketing Claim</div>
                  <div className="text-xs font-semibold text-[#15803D] leading-relaxed">
                    "{prod.approved_claims || 'None registered'}"
                  </div>
                </div>

                {prod.verified_benchmarks && (
                  <div className="p-3 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE]">
                    <div className="text-[10px] font-bold uppercase text-[#1E40AF] mb-0.5">Verified Performance Benchmark</div>
                    <div className="text-xs font-semibold text-[#1D4ED8]">
                      {prod.verified_benchmarks}
                    </div>
                  </div>
                )}

                {prod.official_sla && (
                  <div className="p-3 rounded-2xl bg-[#F5F3FF] border border-[#DDD6FE]">
                    <div className="text-[10px] font-bold uppercase text-[#5B21B6] mb-0.5">Official SLA & Guarantees</div>
                    <div className="text-xs font-semibold text-[#6D28D9]">
                      {prod.official_sla}
                    </div>
                  </div>
                )}

                {prod.prohibited_claims && (
                  <div className="p-3 rounded-2xl bg-[#FEF2F2] border border-[#FECACA]">
                    <div className="text-[10px] font-bold uppercase text-[#991B1B] mb-0.5">Prohibited / Blocked Claims</div>
                    <div className="text-xs font-semibold text-[#DC2626]">
                      {prod.prohibited_claims}
                    </div>
                  </div>
                )}

                <div className="text-xs text-[#77718A] space-y-1 pt-1 border-t border-[#E8E3F2]">
                  <div><strong className="text-[#2E2459]">Specifications:</strong> {prod.specifications || 'N/A'}</div>
                  <div><strong className="text-[#2E2459]">Supporting Source:</strong> {prod.source_doc || 'Internal Verification'}</div>
                  <div className="flex justify-between items-center text-[11px] text-[#A09BAC]">
                    <span>Effective: {prod.effective_date || 'Current'}</span>
                    {prod.updated_at && <span>Updated: {new Date(prod.updated_at).toLocaleDateString()}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: GUIDELINE DOCUMENTS */}
      {activeTab === 'guidelines' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#2E2459]">Guideline Documents</h3>
              <p className="text-xs text-[#77718A]">Uploaded PDF and DOCX governance manuals.</p>
            </div>
            {isAdmin && (
              <button
                onClick={() => setIsGuidelineModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7C3AED] text-white text-xs font-semibold hover:bg-[#6D28D9]"
              >
                <Plus className="w-4 h-4" /> Upload Document
              </button>
            )}
          </div>

          <div className="space-y-4">
            {data.guidelines.map((guide) => (
              <div key={guide.id} className="bg-white rounded-3xl p-6 border border-[#E8E3F2] shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-[#2E2459]">{guide.title}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EDE9FE] text-[#7C3AED]">
                        v{guide.version}
                      </span>
                    </div>
                    <div className="text-xs text-[#77718A] mt-1">{guide.category} • Document: {guide.document_name || 'Direct Entry'}</div>
                  </div>
                  {isAdmin && (
                    <button onClick={() => handleDeleteGuideline(guide.id)} className="text-[#77718A] hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="mt-4 p-4 rounded-2xl bg-[#F8F6FF] border border-[#EDE9FE] text-xs font-mono text-[#2E2459] whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {guide.raw_text}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: ADD BRAND RULE */}
      <Modal isOpen={isRuleModalOpen} onClose={() => setIsRuleModalOpen(false)} title="Add Brand Governance Rule">
        <form onSubmit={handleCreateRule} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#77718A] uppercase mb-1">Rule Domain</label>
            <select
              value={ruleForm.rule_type}
              onChange={(e) => setRuleForm({ ...ruleForm, rule_type: e.target.value })}
              className="w-full bg-[#F8F6FF] border border-[#EDE9FE] rounded-xl p-2.5 text-xs font-semibold"
            >
              <option value="color">Color Rule</option>
              <option value="typography">Typography Rule</option>
              <option value="tone">Tone of Voice Rule</option>
              <option value="terminology">Terminology Rule</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#77718A] uppercase mb-1">Rule Key / Identifier</label>
            <input
              type="text"
              required
              placeholder="e.g. primary_hex, prohibited_term, approved_tone"
              value={ruleForm.rule_key}
              onChange={(e) => setRuleForm({ ...ruleForm, rule_key: e.target.value })}
              className="w-full bg-[#F8F6FF] border border-[#EDE9FE] rounded-xl p-2.5 text-xs text-[#2E2459]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#77718A] uppercase mb-1">Rule Value / Specification</label>
            <input
              type="text"
              required
              placeholder="e.g. #7C3AED, LegacyCloud, Professional & Friendly"
              value={ruleForm.rule_value}
              onChange={(e) => setRuleForm({ ...ruleForm, rule_value: e.target.value })}
              className="w-full bg-[#F8F6FF] border border-[#EDE9FE] rounded-xl p-2.5 text-xs text-[#2E2459]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#77718A] uppercase mb-1">Description / Rationale</label>
            <textarea
              rows={2}
              placeholder="Why this rule exists and when it applies"
              value={ruleForm.description}
              onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
              className="w-full bg-[#F8F6FF] border border-[#EDE9FE] rounded-xl p-2.5 text-xs text-[#2E2459]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#77718A] uppercase mb-1">Violation Severity</label>
            <select
              value={ruleForm.severity}
              onChange={(e) => setRuleForm({ ...ruleForm, severity: e.target.value })}
              className="w-full bg-[#F8F6FF] border border-[#EDE9FE] rounded-xl p-2.5 text-xs font-semibold"
            >
              <option value="critical">Critical (Blocks Publishing)</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsRuleModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-[#77718A] hover:bg-gray-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold rounded-xl"
            >
              Save Rule
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: ADD PRODUCT CLAIMS */}
      <Modal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} title="Register Verified Product Claims">
        <form onSubmit={handleCreateProduct} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#77718A] uppercase mb-1">Product Name</label>
            <input
              type="text"
              required
              placeholder="e.g. NovaEngine 3.0"
              value={productForm.product_name}
              onChange={(e) => setProductForm({ ...productForm, product_name: e.target.value })}
              className="w-full bg-[#F8F6FF] border border-[#EDE9FE] rounded-xl p-2.5 text-xs text-[#2E2459]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#77718A] uppercase mb-1">Approved Marketing Claim Statement</label>
            <textarea
              rows={2}
              required
              placeholder="e.g. Our product delivers 25% improved performance."
              value={productForm.approved_claims}
              onChange={(e) => setProductForm({ ...productForm, approved_claims: e.target.value })}
              className="w-full bg-[#F8F6FF] border border-[#EDE9FE] rounded-xl p-2.5 text-xs text-[#2E2459]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#77718A] uppercase mb-1">Verified Performance Benchmarks</label>
            <input
              type="text"
              placeholder="e.g. 25% performance improvement vs v2 (verified lab benchmark)"
              value={productForm.verified_benchmarks}
              onChange={(e) => setProductForm({ ...productForm, verified_benchmarks: e.target.value })}
              className="w-full bg-[#F8F6FF] border border-[#EDE9FE] rounded-xl p-2.5 text-xs text-[#2E2459]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#77718A] uppercase mb-1">Official SLA / Guarantees</label>
              <input
                type="text"
                placeholder="e.g. 99.99% uptime, 10ms latency"
                value={productForm.official_sla}
                onChange={(e) => setProductForm({ ...productForm, official_sla: e.target.value })}
                className="w-full bg-[#F8F6FF] border border-[#EDE9FE] rounded-xl p-2.5 text-xs text-[#2E2459]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#77718A] uppercase mb-1">Prohibited / Outdated Claims</label>
              <input
                type="text"
                placeholder="e.g. 100% improved performance, zero risk"
                value={productForm.prohibited_claims}
                onChange={(e) => setProductForm({ ...productForm, prohibited_claims: e.target.value })}
                className="w-full bg-[#F8F6FF] border border-[#EDE9FE] rounded-xl p-2.5 text-xs text-[#2E2459]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#77718A] uppercase mb-1">Technical Specifications</label>
            <input
              type="text"
              placeholder="e.g. Multi-region redundancy, TLS 1.3"
              value={productForm.specifications}
              onChange={(e) => setProductForm({ ...productForm, specifications: e.target.value })}
              className="w-full bg-[#F8F6FF] border border-[#EDE9FE] rounded-xl p-2.5 text-xs text-[#2E2459]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#77718A] uppercase mb-1">Supporting Source Doc</label>
              <input
                type="text"
                placeholder="Audit Report Q1 2026"
                value={productForm.source_doc}
                onChange={(e) => setProductForm({ ...productForm, source_doc: e.target.value })}
                className="w-full bg-[#F8F6FF] border border-[#EDE9FE] rounded-xl p-2.5 text-xs text-[#2E2459]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#77718A] uppercase mb-1">Effective Date</label>
              <input
                type="date"
                value={productForm.effective_date}
                onChange={(e) => setProductForm({ ...productForm, effective_date: e.target.value })}
                className="w-full bg-[#F8F6FF] border border-[#EDE9FE] rounded-xl p-2.5 text-xs text-[#2E2459]"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsProductModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-[#77718A] hover:bg-gray-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold rounded-xl"
            >
              Save Claim Data
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: UPLOAD ASSET */}
      <Modal isOpen={isAssetModalOpen} onClose={() => setIsAssetModalOpen(false)} title="Upload Approved Logo Asset">
        <form onSubmit={handleUploadAsset} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#77718A] uppercase mb-1">Asset Name</label>
            <input
              type="text"
              required
              placeholder="e.g. TechNova Primary Logo V2"
              value={assetForm.name}
              onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
              className="w-full bg-[#F8F6FF] border border-[#EDE9FE] rounded-xl p-2.5 text-xs text-[#2E2459]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#77718A] uppercase mb-1">Version</label>
              <input
                type="text"
                placeholder="v2.0"
                value={assetForm.version}
                onChange={(e) => setAssetForm({ ...assetForm, version: e.target.value })}
                className="w-full bg-[#F8F6FF] border border-[#EDE9FE] rounded-xl p-2.5 text-xs text-[#2E2459]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#77718A] uppercase mb-1">Status</label>
              <select
                value={assetForm.is_active ? 'true' : 'false'}
                onChange={(e) => setAssetForm({ ...assetForm, is_active: e.target.value === 'true' })}
                className="w-full bg-[#F8F6FF] border border-[#EDE9FE] rounded-xl p-2.5 text-xs"
              >
                <option value="true">Active Approved</option>
                <option value="false">Deprecated Variant</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#77718A] uppercase mb-1">Image File (PNG, JPG, SVG)</label>
            <input
              type="file"
              required
              accept=".png,.jpg,.jpeg,.svg"
              onChange={(e) => setAssetForm({ ...assetForm, file: e.target.files[0] })}
              className="w-full text-xs text-[#77718A]"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAssetModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-[#77718A] hover:bg-gray-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold rounded-xl"
            >
              Upload Asset
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: UPLOAD GUIDELINE */}
      <Modal isOpen={isGuidelineModalOpen} onClose={() => setIsGuidelineModalOpen(false)} title="Upload Brand Guideline Document">
        <form onSubmit={handleCreateGuideline} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#77718A] uppercase mb-1">Document Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Master Brand Governance Manual 2026"
              value={guideForm.title}
              onChange={(e) => setGuideForm({ ...guideForm, title: e.target.value })}
              className="w-full bg-[#F8F6FF] border border-[#EDE9FE] rounded-xl p-2.5 text-xs text-[#2E2459]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#77718A] uppercase mb-1">Category</label>
              <input
                type="text"
                placeholder="Editorial, Identity, Legal"
                value={guideForm.category}
                onChange={(e) => setGuideForm({ ...guideForm, category: e.target.value })}
                className="w-full bg-[#F8F6FF] border border-[#EDE9FE] rounded-xl p-2.5 text-xs text-[#2E2459]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#77718A] uppercase mb-1">Version</label>
              <input
                type="text"
                placeholder="1.0"
                value={guideForm.version}
                onChange={(e) => setGuideForm({ ...guideForm, version: e.target.value })}
                className="w-full bg-[#F8F6FF] border border-[#EDE9FE] rounded-xl p-2.5 text-xs text-[#2E2459]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#77718A] uppercase mb-1">File Upload (PDF, DOCX, TXT)</label>
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={(e) => setGuideForm({ ...guideForm, file: e.target.files[0] })}
              className="w-full text-xs text-[#77718A]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#77718A] uppercase mb-1">Direct Text / Content (Optional)</label>
            <textarea
              rows={4}
              placeholder="Paste rule text or policy statements..."
              value={guideForm.raw_text}
              onChange={(e) => setGuideForm({ ...guideForm, raw_text: e.target.value })}
              className="w-full bg-[#F8F6FF] border border-[#EDE9FE] rounded-xl p-2.5 text-xs text-[#2E2459]"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsGuidelineModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-[#77718A] hover:bg-gray-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold rounded-xl"
            >
              Save Guideline
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
