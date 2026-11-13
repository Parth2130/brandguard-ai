import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  X,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check
} from 'lucide-react';
import { contentAPI, analysisAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const UploadPage = () => {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedContent, setUploadedContent] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Analysis categories checklist
  const [selectedCategories, setSelectedCategories] = useState({
    logo: true,
    color: true,
    claim: true,
    tone: true,
    terminology: true,
    accessibility: true
  });

  const fileInputRef = useRef(null);
  const { organization } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (selectedFile) => {
    const ext = selectedFile.name.rsplit ? selectedFile.name.rsplit('.', 1)[-1] : selectedFile.name.split('.').pop().toLowerCase();
    const allowed = ['pdf', 'docx', 'png', 'jpg', 'jpeg', 'txt'];
    if (!allowed.includes(ext)) {
      showToast(`Unsupported file format .${ext}. Please upload PDF, DOCX, PNG, JPG, or TXT.`, 'error');
      return;
    }

    if (selectedFile.size > 25 * 1024 * 1024) {
      showToast('File size exceeds maximum 25 MB limit.', 'error');
      return;
    }

    setFile(selectedFile);
    if (!title) {
      setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
    }
    setUploadedContent(null);
  };

  const handleToggleCategory = (cat) => {
    setSelectedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleUploadAndAnalyze = async (autoAnalyze = true) => {
    if (!file) {
      showToast('Please select a file to upload.', 'error');
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);

    const fd = new FormData();
    fd.append('file', file);
    fd.append('title', title);

    try {
      setUploadProgress(50);
      const res = await contentAPI.upload(fd);
      const content = res.data.content;
      setUploadedContent(content);
      setUploadProgress(100);
      showToast('File uploaded and pre-processed.', 'success');

      if (autoAnalyze) {
        setIsAnalyzing(true);
        // Execute AI analysis engine
        const cats = Object.keys(selectedCategories).filter((k) => selectedCategories[k]);
        const analysisRes = await analysisAPI.run(content.id, { categories: cats });
        showToast('AI Brand Governance analysis complete!', 'success');
        navigate(`/analysis/results/${analysisRes.data.analysis.id}`);
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Upload failed.', 'error');
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  };

  const categoriesConfig = [
    { id: 'logo', label: 'Logo Verification', desc: 'Checks approved logo usage, active variants, and visual distortion.' },
    { id: 'color', label: 'Colour Palette', desc: 'Extracts dominant image HEX codes & text colors vs approved palette.' },
    { id: 'claim', label: 'Claim Verification', desc: 'Compares numerical metrics and marketing assertions with audited specifications.' },
    { id: 'tone', label: 'Brand Voice & Tone', desc: 'Audits copy for inappropriate slang, hyperbole, or tone mismatch.' },
    { id: 'terminology', label: 'Terminology Checking', desc: 'Scans for prohibited product names, deprecated words, and company casing.' },
    { id: 'accessibility', label: 'Accessibility Analysis', desc: 'Evaluates color contrast ratios (WCAG 2.1 AA) and readability grade.' }
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-[#2E2459] tracking-tight">
          Upload Content for Brand Governance
        </h1>
        <p className="text-xs text-[#77718A] mt-1">
          Upload promotional posters, brochures, pitch decks, or copy drafts before publishing.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Drag & Drop Zone */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8E3F2] shadow-sm">
            {/* Title Input */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-[#2E2459] uppercase tracking-wider mb-2">
                Content / Campaign Title
              </label>
              <input
                type="text"
                placeholder="e.g. Q4 Cloud Product Launch Brochure"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#F8F6FF] text-[#2E2459] text-sm px-4 py-2.5 rounded-xl border border-[#EDE9FE] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
              />
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current.click()}
              className={`border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-[#7C3AED] bg-[#EDE9FE]/40 scale-[0.99]'
                  : file
                  ? 'border-[#16A34A] bg-[#F0FDF4]/30'
                  : 'border-[#D8CEF6] hover:border-[#7C3AED] hover:bg-[#F8F6FF]'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.docx,.png,.jpg,.jpeg,.txt"
                className="hidden"
              />

              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors ${
                file ? 'bg-green-100 text-[#16A34A]' : 'bg-[#EDE9FE] text-[#7C3AED]'
              }`}>
                {file ? <CheckCircle2 className="w-8 h-8" /> : <UploadCloud className="w-8 h-8" />}
              </div>

              {file ? (
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#16A34A]">File Ready</span>
                  <h4 className="text-base font-bold text-[#2E2459] mt-1">{file.name}</h4>
                  <p className="text-xs text-[#77718A] mt-1">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB • Click or drop to replace
                  </p>
                </div>
              ) : (
                <div>
                  <h4 className="text-base font-bold text-[#2E2459]">
                    Drag & Drop your creative asset here
                  </h4>
                  <p className="text-xs text-[#77718A] mt-1.5">
                    or <span className="text-[#7C3AED] font-semibold underline">browse files</span> from your computer
                  </p>
                  <p className="text-[11px] text-[#77718A] mt-4">
                    Supported formats: PDF, DOCX, PNG, JPG, JPEG, TXT (Max 25 MB)
                  </p>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            {isUploading && (
              <div className="mt-6 space-y-2">
                <div className="flex justify-between text-xs font-semibold text-[#2E2459]">
                  <span>{isAnalyzing ? 'Running AI Brand Governance Engine...' : 'Uploading & extracting text...'}</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-[#EDE9FE] h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#7C3AED] h-full transition-all duration-300 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Action Button */}
            <div className="mt-8 flex items-center justify-end gap-3">
              {file && (
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="px-4 py-2.5 rounded-xl border border-[#E8E3F2] text-xs font-semibold text-[#77718A] hover:bg-gray-50"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                disabled={!file || isUploading || isAnalyzing}
                onClick={() => handleUploadAndAnalyze(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold shadow-md shadow-[#7C3AED]/20 transition-all disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing Brand Rules...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Upload & Run AI Analysis</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Analysis Categories Checklist */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-[#E8E3F2] shadow-sm">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#E8E3F2]">
              <ShieldCheck className="w-5 h-5 text-[#7C3AED]" />
              <h3 className="text-sm font-bold text-[#2E2459]">Governance Checks</h3>
            </div>
            <p className="text-xs text-[#77718A] mb-4">
              Select the compliance criteria evaluated for this asset:
            </p>

            <div className="space-y-3">
              {categoriesConfig.map((cat) => {
                const isSelected = selectedCategories[cat.id];
                return (
                  <div
                    key={cat.id}
                    onClick={() => handleToggleCategory(cat.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? 'border-[#DDD6FE] bg-[#F8F6FF]'
                        : 'border-[#E8E3F2] bg-white opacity-60'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border ${
                      isSelected ? 'bg-[#7C3AED] border-[#7C3AED] text-white' : 'border-[#D8CEF6] bg-white'
                    }`}>
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#2E2459]">{cat.label}</div>
                      <div className="text-[11px] text-[#77718A] leading-tight mt-0.5">{cat.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
