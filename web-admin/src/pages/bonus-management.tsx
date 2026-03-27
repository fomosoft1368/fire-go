import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const PERIOD_LABELS: Record<string, string> = {
  daily: 'Hàng ngày',
  weekly: 'Hàng tuần',
  monthly: 'Hàng tháng',
  yearly: 'Hàng năm',
};

const PERIOD_COLORS: Record<string, string> = {
  daily: '#10b981',
  weekly: '#3b82f6',
  monthly: '#8b5cf6',
  yearly: '#f59e0b',
};

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending: { label: 'Chờ duyệt', color: '#d97706', bg: '#fef3c7', border: '#fde68a' },
  approved: { label: 'Đã duyệt', color: '#059669', bg: '#d1fae5', border: '#6ee7b7' },
  rejected: { label: 'Từ chối', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' },
};

function getHeaders() {
  const token = localStorage.getItem('token');
  return { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers: getHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.data ?? data;
}

// ==================== MODAL: Create/Edit Rule ====================
interface RuleModalProps {
  rule?: any;
  onClose: () => void;
  onSave: () => void;
}

const RuleModal: React.FC<RuleModalProps> = ({ rule, onClose, onSave }) => {
  const [form, setForm] = useState({
    name: rule?.name || '',
    description: rule?.description || '',
    period: rule?.period || 'daily',
    requiredTrips: rule?.requiredTrips || 10,
    bonusAmount: rule?.bonusAmount || 50000,
    isActive: rule?.isActive !== false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Vui lòng nhập tên thưởng'); return; }
    if (form.requiredTrips < 1) { setError('Số chuyến phải >= 1'); return; }
    if (form.bonusAmount < 1000) { setError('Tiền thưởng phải >= 1,000đ'); return; }
    try {
      setSaving(true);
      setError('');
      if (rule?._id) {
        await apiFetch(`/bonuses/rules/${rule._id}`, { method: 'PATCH', body: JSON.stringify(form) });
      } else {
        await apiFetch('/bonuses/rules', { method: 'POST', body: JSON.stringify(form) });
      }
      onSave();
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div className="bg-white dark:bg-[#1E252B] rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <span className="text-white text-lg">🎁</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {rule?._id ? 'Chỉnh sửa thưởng' : 'Thêm mới thưởng'}
            </h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined text-slate-500 text-[18px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Tên thưởng *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="VD: Thưởng chăm chỉ hàng ngày"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Mô tả</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={2}
              placeholder="Mô tả ngắn về điều kiện nhận thưởng..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent transition-all resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Loại thưởng *</label>
            <div className="grid grid-cols-4 gap-2">
              {(['daily', 'weekly', 'monthly', 'yearly'] as const).map(p => (
                <button
                  key={p} type="button"
                  onClick={() => setForm({ ...form, period: p })}
                  className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                    form.period === p
                      ? 'text-white border-transparent shadow-md'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                  style={form.period === p ? { background: PERIOD_COLORS[p] } : {}}
                >
                  {p === 'daily' ? 'Ngày' : p === 'weekly' ? 'Tuần' : p === 'monthly' ? 'Tháng' : 'Năm'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Số chuyến yêu cầu *</label>
              <input
                type="number"
                value={form.requiredTrips}
                onChange={e => setForm({ ...form, requiredTrips: parseInt(e.target.value) || 1 })}
                min={1}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent transition-all"
              />
              <p className="text-xs text-slate-400 mt-1">Số chuyến hoàn thành cần đạt</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Tiền thưởng (đ) *</label>
              <input
                type="number"
                value={form.bonusAmount}
                onChange={e => setForm({ ...form, bonusAmount: parseInt(e.target.value) || 0 })}
                min={1000}
                step={1000}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent transition-all"
              />
              <p className="text-xs text-slate-400 mt-1">{form.bonusAmount.toLocaleString('vi-VN')}đ</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setForm({ ...form, isActive: !form.isActive })}
              className={`relative w-12 h-6 rounded-full transition-all duration-300 ${form.isActive ? 'bg-[#FF6B00]' : 'bg-slate-300 dark:bg-slate-600'}`}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 ${form.isActive ? 'translate-x-6' : ''}`} />
            </button>
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {form.isActive ? 'Đang hoạt động' : 'Tạm dừng'}
              </p>
              <p className="text-xs text-slate-400">Tài xế {form.isActive ? 'có thể' : 'không thể'} nhận thưởng này</p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
              Hủy
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#FF8A3D] to-[#FF6B00] text-white font-semibold hover:shadow-lg hover:shadow-orange-500/25 transition-all disabled:opacity-50 disabled:cursor-wait">
              {saving ? 'Đang lưu...' : (rule?._id ? 'Lưu thay đổi' : 'Tạo thưởng')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==================== MODAL: Claim Detail ====================
interface ClaimModalProps {
  claim: any;
  onClose: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
  loading: boolean;
}

const ClaimModal: React.FC<ClaimModalProps> = ({ claim, onClose, onApprove, onReject, loading }) => {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  const rule = claim.bonusRuleId || {};
  const driver = claim.driverId || {};
  const tripCount = claim.tripCount || 0;
  const required = rule.requiredTrips || 0;
  const isEligible = tripCount >= required;
  const progress = Math.min(100, required > 0 ? Math.round((tripCount / required) * 100) : 0);

  const formatDate = (d: string) =>
    d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

  const driverName = driver.firstName && driver.lastName
    ? `${driver.firstName} ${driver.lastName}`
    : driver.phone || 'Tài xế';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div className="bg-white dark:bg-[#1E252B] rounded-2xl shadow-2xl w-full max-w-lg border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-[#1E252B] rounded-t-2xl z-10">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Chi tiết yêu cầu thưởng</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined text-slate-500 text-[18px]">close</span>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Driver Info */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
              {driverName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white text-base">{driverName}</p>
              <p className="text-slate-500 dark:text-slate-400 text-sm">{driver.phone || driver.email || ''}</p>
              <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold`}
                style={{ background: STATUS_LABELS[claim.status]?.bg, color: STATUS_LABELS[claim.status]?.color, border: `1px solid ${STATUS_LABELS[claim.status]?.border}` }}>
                {STATUS_LABELS[claim.status]?.label || claim.status}
              </span>
            </div>
          </div>

          {/* Bonus Rule */}
          <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="font-bold text-slate-900 dark:text-white">{rule.name || '—'}</p>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold text-white"
                  style={{ background: PERIOD_COLORS[rule.period] || '#64748b' }}>
                  {PERIOD_LABELS[rule.period] || rule.period}
                </span>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-2xl font-black text-[#FF6B00] leading-tight">
                  {(claim.bonusAmount || 0).toLocaleString('vi-VN')}đ
                </p>
                <p className="text-xs text-slate-400">Tiền thưởng</p>
              </div>
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Tiến độ hoàn thành</span>
                <span className={`font-bold ${isEligible ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {tripCount} / {required} chuyến
                </span>
              </div>
              <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progress}%`,
                    background: isEligible ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #FF8A3D, #FF6B00)',
                  }}
                />
              </div>
              <div className="flex items-center gap-2">
                {isEligible ? (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900">
                    <span className="material-symbols-outlined text-emerald-600 text-[16px]">check_circle</span>
                    <span className="text-emerald-700 dark:text-emerald-400 text-sm font-semibold">Đạt chỉ tiêu ✓</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900">
                    <span className="material-symbols-outlined text-red-500 text-[16px]">cancel</span>
                    <span className="text-red-600 dark:text-red-400 text-sm font-semibold">Chưa đạt chỉ tiêu</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Period info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
              <p className="text-xs text-slate-400 mb-0.5">Từ ngày</p>
              <p className="font-semibold text-slate-900 dark:text-white text-sm">{formatDate(claim.periodStart)}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
              <p className="text-xs text-slate-400 mb-0.5">Đến ngày</p>
              <p className="font-semibold text-slate-900 dark:text-white text-sm">{formatDate(claim.periodEnd)}</p>
            </div>
          </div>

          {/* Rejection reason (if any) */}
          {claim.status === 'rejected' && claim.rejectionReason && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">Lý do từ chối:</p>
              <p className="text-sm text-red-600 dark:text-red-300">{claim.rejectionReason}</p>
            </div>
          )}

          {/* Reject input */}
          {claim.status === 'pending' && rejecting && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900">
              <label className="block text-sm font-semibold text-red-700 dark:text-red-400 mb-2">Lý do từ chối *</label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={3}
                placeholder="Nhập lý do từ chối yêu cầu thưởng này..."
                className="w-full px-3 py-2 rounded-lg border border-red-200 dark:border-red-900 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none text-sm"
              />
            </div>
          )}

          {/* Actions */}
          {claim.status === 'pending' && (
            <div className="flex gap-3 pt-1">
              {!rejecting ? (
                <>
                  <button onClick={() => setRejecting(true)} disabled={loading}
                    className="flex-1 py-3 rounded-xl border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    <span className="material-symbols-outlined text-[18px]">cancel</span>
                    Từ chối
                  </button>
                  <button onClick={onApprove} disabled={loading}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-600 text-white font-semibold hover:shadow-lg hover:shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    {loading ? 'Đang duyệt...' : 'Duyệt thưởng'}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => { setRejecting(false); setReason(''); }}
                    className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                    Hủy
                  </button>
                  <button
                    onClick={() => { if (reason.trim()) onReject(reason); }}
                    disabled={loading || !reason.trim()}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold hover:shadow-lg hover:shadow-red-500/25 transition-all disabled:opacity-50">
                    {loading ? 'Đang từ chối...' : 'Xác nhận từ chối'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== MAIN PAGE ====================
const BonusManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'rules' | 'claims'>('rules');
  const [claimStatusFilter, setClaimStatusFilter] = useState<string>('');

  // Rules state
  const [rules, setRules] = useState<any[]>([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);

  // Claims state
  const [claims, setClaims] = useState<any[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState<any>(null);
  const [claimActionLoading, setClaimActionLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);

  // Notification state
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showNotif = (type: 'success' | 'error', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 3500);
  };

  // ---- Load Rules ----
  const loadRules = useCallback(async () => {
    try {
      setRulesLoading(true);
      const data = await apiFetch('/bonuses/rules');
      setRules(Array.isArray(data) ? data : []);
    } catch (e: any) {
      showNotif('error', e.message || 'Lỗi tải danh sách thưởng');
    } finally {
      setRulesLoading(false);
    }
  }, []);

  // ---- Load Claims ----
  const loadClaims = useCallback(async () => {
    try {
      setClaimsLoading(true);
      const url = claimStatusFilter ? `/bonuses/admin/claims?status=${claimStatusFilter}` : '/bonuses/admin/claims';
      const [data, statsData] = await Promise.all([
        apiFetch(url),
        apiFetch('/bonuses/admin/stats').catch(() => null),
      ]);
      setClaims(Array.isArray(data) ? data : []);
      if (statsData) setStats(statsData);
    } catch (e: any) {
      showNotif('error', e.message || 'Lỗi tải danh sách yêu cầu');
    } finally {
      setClaimsLoading(false);
    }
  }, [claimStatusFilter]);

  useEffect(() => { loadRules(); }, [loadRules]);
  useEffect(() => { if (activeTab === 'claims') loadClaims(); }, [loadClaims, activeTab]);

  // ---- Delete Rule ----
  const handleDeleteRule = async (id: string) => {
    if (!confirm('Xóa quy tắc thưởng này?')) return;
    try {
      await apiFetch(`/bonuses/rules/${id}`, { method: 'DELETE' });
      showNotif('success', 'Đã xóa quy tắc thưởng');
      loadRules();
    } catch (e: any) {
      showNotif('error', e.message || 'Lỗi xóa quy tắc');
    }
  };

  // ---- Toggle Rule Active ----
  const handleToggleRule = async (rule: any) => {
    try {
      await apiFetch(`/bonuses/rules/${rule._id}`, { method: 'PATCH', body: JSON.stringify({ isActive: !rule.isActive }) });
      showNotif('success', `Đã ${rule.isActive ? 'tắt' : 'bật'} quy tắc thưởng`);
      loadRules();
    } catch (e: any) {
      showNotif('error', e.message);
    }
  };

  // ---- Approve Claim ----
  const handleApproveClaim = async () => {
    if (!selectedClaim) return;
    try {
      setClaimActionLoading(true);
      await apiFetch(`/bonuses/admin/claims/${selectedClaim._id}/approve`, { method: 'PATCH' });
      showNotif('success', 'Đã duyệt và cộng tiền vào ví tài xế!');
      setSelectedClaim(null);
      loadClaims();
    } catch (e: any) {
      showNotif('error', e.message || 'Lỗi duyệt thưởng');
    } finally {
      setClaimActionLoading(false);
    }
  };

  // ---- Reject Claim ----
  const handleRejectClaim = async (reason: string) => {
    if (!selectedClaim) return;
    try {
      setClaimActionLoading(true);
      await apiFetch(`/bonuses/admin/claims/${selectedClaim._id}/reject`, { method: 'PATCH', body: JSON.stringify({ rejectionReason: reason }) });
      showNotif('success', 'Đã từ chối yêu cầu thưởng');
      setSelectedClaim(null);
      loadClaims();
    } catch (e: any) {
      showNotif('error', e.message || 'Lỗi từ chối thưởng');
    } finally {
      setClaimActionLoading(false);
    }
  };

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

  return (
    <Layout>
      <div className="p-6">
        {/* Notification Toast */}
        {notification && (
          <div className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white transition-all duration-300 ${
            notification.type === 'success' ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : 'bg-gradient-to-r from-red-500 to-red-600'
          }`}>
            <span className="material-symbols-outlined text-[20px]">
              {notification.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span className="font-semibold text-sm">{notification.msg}</span>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/25">
                <span className="text-white text-xl">🎁</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Quản lý Thưởng</h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm ml-13">Thiết lập chương trình thưởng và duyệt yêu cầu nhận thưởng của tài xế</p>
          </div>
          {activeTab === 'rules' && (
            <button
              onClick={() => { setEditingRule(null); setShowRuleModal(true); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#FF8A3D] to-[#FF6B00] text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-orange-500/25 transition-all whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              Thêm thưởng
            </button>
          )}
        </div>

        {/* Stats Cards */}
        {stats && activeTab === 'claims' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Tổng yêu cầu', value: stats.total, icon: 'list_alt', color: '#3b82f6', bg: '#eff6ff' },
              { label: 'Chờ duyệt', value: stats.pending, icon: 'schedule', color: '#d97706', bg: '#fffbeb' },
              { label: 'Đã duyệt', value: stats.approved, icon: 'check_circle', color: '#059669', bg: '#ecfdf5' },
              { label: 'Đã từ chối', value: stats.rejected, icon: 'cancel', color: '#dc2626', bg: '#fef2f2' },
            ].map((s, i) => (
              <div key={i} className="bg-white dark:bg-[#1E252B] rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: s.bg }}>
                    <span className="material-symbols-outlined text-[20px]" style={{ color: s.color }}>{s.icon}</span>
                  </div>
                  <div>
                    <p className="text-2xl font-black" style={{ color: s.color }}>{s.value || 0}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{s.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit mb-6">
          {([
            { key: 'rules', icon: 'settings', label: 'Thiết lập thưởng' },
            { key: 'claims', icon: 'inbox', label: `Yêu cầu nhận thưởng${stats?.pending ? ` (${stats.pending})` : ''}` },
          ] as const).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-white dark:bg-[#1E252B] text-[#FF6B00] shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}>
              <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* =================== TAB: RULES =================== */}
        {activeTab === 'rules' && (
          <div>
            {rulesLoading ? (
              <div className="flex items-center justify-center py-20 bg-white dark:bg-[#1E252B] rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-[#FF6B00] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-slate-500 dark:text-slate-400">Đang tải...</p>
                </div>
              </div>
            ) : rules.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#1E252B] rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                  <span className="text-3xl">🎁</span>
                </div>
                <p className="text-slate-900 dark:text-white font-bold text-lg mb-1">Chưa có quy tắc thưởng</p>
                <p className="text-slate-400 text-sm mb-5">Tạo quy tắc thưởng đầu tiên để khuyến khích tài xế</p>
                <button onClick={() => { setEditingRule(null); setShowRuleModal(true); }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#FF8A3D] to-[#FF6B00] text-white rounded-xl font-semibold">
                  <span className="material-symbols-outlined text-[20px]">add</span>
                  Tạo thưởng đầu tiên
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {rules.map(rule => (
                  <div key={rule._id}
                    className={`bg-white dark:bg-[#1E252B] rounded-2xl border shadow-sm transition-all hover:shadow-md ${rule.isActive ? 'border-slate-100 dark:border-slate-800' : 'border-slate-200 dark:border-slate-700 opacity-70'}`}>
                    <div className="p-5">
                      {/* Period badge */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white"
                          style={{ background: PERIOD_COLORS[rule.period] || '#64748b' }}>
                          {PERIOD_LABELS[rule.period] || rule.period}
                        </span>
                        <button
                          onClick={() => handleToggleRule(rule)}
                          className={`relative w-11 h-6 rounded-full transition-all flex-shrink-0 ${rule.isActive ? 'bg-[#FF6B00]' : 'bg-slate-200 dark:bg-slate-700'}`}
                        >
                          <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-all ${rule.isActive ? 'translate-x-5' : ''}`} />
                        </button>
                      </div>

                      <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1">{rule.name}</h3>
                      {rule.description && <p className="text-slate-500 dark:text-slate-400 text-sm mb-3 leading-relaxed">{rule.description}</p>}

                      {/* Condition */}
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 mb-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-outlined text-blue-500 text-[18px]">local_taxi</span>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Điều kiện</p>
                          <p className="font-bold text-slate-900 dark:text-white text-sm">
                            Hoàn thành <span className="text-[#FF6B00]">{rule.requiredTrips}</span> chuyến
                          </p>
                        </div>
                      </div>

                      {/* Reward */}
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/10">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-outlined text-emerald-600 text-[18px]">payments</span>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Phần thưởng</p>
                          <p className="font-black text-emerald-600 text-base">{rule.bonusAmount.toLocaleString('vi-VN')}đ</p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex border-t border-slate-100 dark:border-slate-800">
                      <button onClick={() => { setEditingRule(rule); setShowRuleModal(true); }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-3 text-slate-600 dark:text-slate-400 hover:text-[#FF6B00] hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-all text-sm font-semibold">
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                        Chỉnh sửa
                      </button>
                      <div className="w-px bg-slate-100 dark:bg-slate-800" />
                      <button onClick={() => handleDeleteRule(rule._id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-3 text-slate-600 dark:text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all text-sm font-semibold">
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                        Xóa
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =================== TAB: CLAIMS =================== */}
        {activeTab === 'claims' && (
          <div>
            {/* Filter */}
            <div className="flex flex-wrap gap-2 mb-5">
              {[
                { value: '', label: 'Tất cả' },
                { value: 'pending', label: 'Chờ duyệt' },
                { value: 'approved', label: 'Đã duyệt' },
                { value: 'rejected', label: 'Từ chối' },
              ].map(f => (
                <button key={f.value} onClick={() => setClaimStatusFilter(f.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                    claimStatusFilter === f.value
                      ? 'bg-[#FF6B00] text-white border-[#FF6B00] shadow-md shadow-orange-500/20'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 bg-white dark:bg-[#1E252B]'
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>

            <div className="bg-white dark:bg-[#1E252B] rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              {claimsLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-[#FF6B00] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-slate-500 dark:text-slate-400">Đang tải...</p>
                  </div>
                </div>
              ) : claims.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <span className="text-4xl mb-4">📭</span>
                  <p className="text-slate-900 dark:text-white font-bold mb-1">Không có yêu cầu nào</p>
                  <p className="text-slate-400 text-sm">Chưa có tài xế nào gửi yêu cầu nhận thưởng</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                      <tr>
                        {['Tài xế', 'Loại thưởng', 'Số chuyến', 'Tiền thưởng', 'Kỳ', 'Trạng thái', 'Thao tác'].map(h => (
                          <th key={h} className="px-5 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                      {claims.map(claim => {
                        const rule = claim.bonusRuleId || {};
                        const driver = claim.driverId || {};
                        const driverName = driver.firstName && driver.lastName
                          ? `${driver.firstName} ${driver.lastName}` : driver.phone || 'N/A';
                        const tripCount = claim.tripCount || 0;
                        const required = rule.requiredTrips || 0;
                        const isEligible = tripCount >= required;
                        const st = STATUS_LABELS[claim.status] || { label: claim.status, color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0' };

                        return (
                          <tr key={claim._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                  {driverName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-900 dark:text-white text-sm">{driverName}</p>
                                  <p className="text-xs text-slate-400">{driver.phone || ''}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <div>
                                <p className="font-semibold text-slate-900 dark:text-white text-sm">{rule.name || '—'}</p>
                                <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs font-bold text-white"
                                  style={{ background: PERIOD_COLORS[rule.period] || '#64748b' }}>
                                  {PERIOD_LABELS[rule.period] || '—'}
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-bold ${isEligible ? 'text-emerald-600' : 'text-red-500'}`}>
                                  {tripCount}/{required}
                                </span>
                                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${isEligible ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                                  {isEligible ? 'Đạt' : 'Chưa'}
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span className="font-black text-emerald-600">{(claim.bonusAmount || 0).toLocaleString('vi-VN')}đ</span>
                            </td>
                            <td className="px-5 py-4">
                              <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                {formatDate(claim.periodStart)} – {formatDate(claim.periodEnd)}
                              </p>
                            </td>
                            <td className="px-5 py-4">
                              <span className="inline-block px-3 py-1.5 rounded-xl text-xs font-bold"
                                style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                                {st.label}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <button onClick={() => setSelectedClaim(claim)}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-[#FF6B00] hover:text-white text-slate-600 dark:text-slate-300 transition-all text-xs font-semibold">
                                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                                Chi tiết
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modals */}
        {showRuleModal && (
          <RuleModal
            rule={editingRule}
            onClose={() => { setShowRuleModal(false); setEditingRule(null); }}
            onSave={() => { setShowRuleModal(false); setEditingRule(null); loadRules(); showNotif('success', editingRule ? 'Đã cập nhật quy tắc thưởng!' : 'Đã tạo quy tắc thưởng mới!'); }}
          />
        )}

        {selectedClaim && (
          <ClaimModal
            claim={selectedClaim}
            onClose={() => setSelectedClaim(null)}
            onApprove={handleApproveClaim}
            onReject={handleRejectClaim}
            loading={claimActionLoading}
          />
        )}
      </div>
    </Layout>
  );
};

export default BonusManagement;
