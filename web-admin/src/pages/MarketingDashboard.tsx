import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';

// ─── Types ──────────────────────────────────────────────────────────────────
interface MarketingUser {
  _id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone: string;
  role: 'f1_lead' | 'f2_sub_lead' | 'f3_staff_mkt';
  status: 'active' | 'inactive' | 'suspended' | 'banned';
  address?: string;
  referralCode?: string;
  walletBalance?: number;
  pendingBalance?: number;
  createdAt: string;
  level?: number;
  parentId?: string;
  region?: {
    _id: string;
    name: string;
  };
}

interface KpiStats {
  totalNetwork: number;
  activeF1: number;
  activeF2: number;
  activeF3: number;
  monthlyDrivers: number;
  totalDriversByTeam: number;
  totalTransactions: number;
  totalCommission: number;
  pendingCommission: number;
  commissionHistory: number;
}

// ─── Role Config ────────────────────────────────────────────────────────────
const ROLE_CONFIG = {
  f1_lead: {
    label: 'Giám đốc Phát triển Thị trường',
    shortLabel: 'F1 Lead Vùng',
    badge: 'F1',
    color: '#7c3aed',
    bg: 'rgba(124,58,237,0.12)',
    border: 'rgba(124,58,237,0.3)',
    icon: 'military_tech',
  },
  f2_sub_lead: {
    label: 'Trưởng nhóm Kinh doanh Huyện',
    shortLabel: 'F2 Sub Lead',
    badge: 'F2',
    color: '#2563eb',
    bg: 'rgba(37,99,235,0.12)',
    border: 'rgba(37,99,235,0.3)',
    icon: 'supervisor_account',
  },
  f3_staff_mkt: {
    label: 'Chuyên viên Phát triển Thị trường',
    shortLabel: 'F3 Sale',
    badge: 'F3',
    color: '#059669',
    bg: 'rgba(5,150,105,0.12)',
    border: 'rgba(5,150,105,0.3)',
    icon: 'storefront',
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function decodeToken(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length === 3) return JSON.parse(atob(parts[1]));
  } catch { }
  return null;
}

function getKpiTarget(role: string) {
  if (role === 'f1_lead') return { 
    metric1Name: 'Giao dịch toàn Vùng (GD)', metric1Target: 15000, 
    metric1Icon: 'swap_horiz', metric1Color: '#2563eb',
    metric2Name: 'Hợp đồng B2B (Doanh nghiệp)', metric2Target: 3, 
    metric2Icon: 'business', metric2Color: '#059669',
    metric3Name: 'Sub Lead (F2) hoạt động', metric3Target: 4, 
    metric3Icon: 'group', metric3Color: '#7c3aed',
    label: '1 Tỉnh (≥ 15.000 GD) + Ký 3 Hợp đồng B2B' 
  };
  if (role === 'f2_sub_lead') return { 
    metric1Name: 'Giao dịch toàn Huyện (GD)', metric1Target: 4500, 
    metric1Icon: 'swap_horiz', metric1Color: '#2563eb',
    metric2Name: 'Điểm Check-in', metric2Target: 1, 
    metric2Icon: 'location_on', metric2Color: '#059669',
    metric3Name: 'Sale (F3) hoạt động', metric3Target: 5, 
    metric3Icon: 'group', metric3Color: '#7c3aed',
    label: '1 Huyện (≥ 4.500 GD) + Chăm sóc điểm Checkin' 
  };
  return { 
    metric1Name: 'Giao dịch Cá nhân (GD)', metric1Target: 400, 
    metric1Icon: 'swap_horiz', metric1Color: '#2563eb',
    metric2Name: 'Cộng tác viên phát sinh', metric2Target: 10, 
    metric2Icon: 'group_add', metric2Color: '#059669',
    metric3Name: 'Tài xế/Đối tác cá nhân tuyển', metric3Target: 15, 
    metric3Icon: 'directions_car', metric3Color: '#7c3aed',
    label: 'Cá Nhân (≥ 400 GD) + Tìm 10 Cộng tác viên' 
  };
}

// ═══════════════════════════════════════════════════════════════════════════
export default function MarketingDashboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<MarketingUser[]>([]);
  const [f3Drivers, setF3Drivers] = useState<any[]>([]);
  const [stats, setStats] = useState<KpiStats>({
    totalNetwork: 0, activeF1: 0, activeF2: 0, activeF3: 0,
    monthlyDrivers: 0, totalDriversByTeam: 0,
    totalTransactions: 0, totalCommission: 0, pendingCommission: 0, commissionHistory: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'network' | 'kpi' | 'referral' | 'roadmap' | 'channels'>('dashboard');
  const [showAddModal, setShowAddModal] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '', password: '', address: '', role: 'f3_staff_mkt', regionId: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [viewingTargetId, setViewingTargetId] = useState<string | null>(null);
  const [managerData, setManagerData] = useState<any>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // ── Auth Check ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }

    const decoded = decodeToken(token);
    if (!decoded || !['f1_lead', 'f2_sub_lead', 'f3_staff_mkt'].includes(decoded.role)) {
      navigate('/');
      return;
    }
    setCurrentUser(decoded);

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') { setDarkMode(true); document.documentElement.classList.add('dark'); }

    fetchData();
  }, [navigate]);

  const fetchData = async (targetId?: string) => {
    setLoading(true);
    try {
      const dashboardUrl = targetId ? `/teams/dashboard?targetUserId=${targetId}` : '/teams/dashboard';
      const membersUrl = targetId ? `/teams/members?page=1&limit=100&targetUserId=${targetId}` : '/teams/members?page=1&limit=100';
      const driversUrl = targetId ? `/teams/drivers?page=1&limit=100&targetUserId=${targetId}` : '/teams/drivers?page=1&limit=100';

      const [dashRes, membersRes, driversRes] = await Promise.all([
        apiService.get(dashboardUrl).catch(() => null),
        apiService.get(membersUrl).catch(() => ({ members: [], total: 0 })),
        apiService.get(driversUrl).catch(() => ({ drivers: [], total: 0 })),
      ]);

      if (dashRes?.me) {
        if (!targetId) {
          setCurrentUser((prev: any) => ({ ...prev, ...dashRes.me }));
        }
        setManagerData(dashRes.me.manager || null);
      }

      const members: MarketingUser[] = membersRes?.members || membersRes?.data || [];
      setTeamMembers(members);

      const drivers = driversRes?.drivers || driversRes?.data || [];
      setF3Drivers(drivers);

      const serverStats = dashRes?.stats;
      setStats({
        totalNetwork: serverStats?.totalNetwork ?? members.length,
        activeF1: serverStats?.activeF1 ?? 0,
        activeF2: serverStats?.activeF2 ?? 0,
        activeF3: serverStats?.activeF3 ?? 0,
        monthlyDrivers: serverStats?.monthlyDrivers ?? 0,
        totalDriversByTeam: serverStats?.totalDriversByTeam ?? 0,
        totalTransactions: serverStats?.totalTransactions ?? 0,
        totalCommission: serverStats?.totalCommission ?? 0,
        pendingCommission: serverStats?.pendingCommission ?? 0,
        commissionHistory: serverStats?.commissionHistory ?? 0,
      });
    } catch (err) {
      console.error('[MarketingDashboard] fetchData error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    next ? document.documentElement.classList.add('dark') : document.documentElement.classList.remove('dark');
  };

  const copyReferralCode = (code?: string) => {
    if (!code) return;
    const link = `https://firego.vn/register?ref=${code}`;
    navigator.clipboard.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    try {
      // Nếu không nhập regionId thì xoá đi để khỏi gửi chuỗi rỗng
      const payload: any = { ...formData, status: 'active', regionName: formData.address || 'Chưa phân vùng' };
      if (!payload.regionId) delete payload.regionId;

      // Bước 1: Tạo tài khoản user mới
      const newUser: any = await apiService.post('/admin/users', payload);
      const newUserId = newUser?._id || newUser?.data?._id;

      // Bước 2: Gán vào cây team của người gọi
      // (Backend đã tự động xử lý gán vào team nếu account là F1/F2/F3)

      setShowAddModal(false);
      setFormData({ firstName: '', lastName: '', email: '', phone: '', password: '', address: '', role: 'f3_staff_mkt', regionId: '' });
      fetchData(viewingTargetId || undefined);
    } catch (err: any) {
      if (err.response?.data?.message) {
        const msg = err.response.data.message;
        setFormError(Array.isArray(msg) ? msg.join(' • ') : msg);
      } else {
        setFormError(err.message || 'Lỗi khi thêm thành viên');
      }
    } finally {
      setFormLoading(false);
    }
  };

  const roleConfig = currentUser?.role ? ROLE_CONFIG[currentUser.role as keyof typeof ROLE_CONFIG] : ROLE_CONFIG.f3_staff_mkt;
  const kpiTarget = getKpiTarget(currentUser?.role || 'f3_staff_mkt');
  const canAddMember = currentUser?.role === 'f1_lead' || currentUser?.role === 'f2_sub_lead';

  const allowedNewRoles = () => {
    if (currentUser?.role === 'f1_lead') return [
      { value: 'f2_sub_lead', label: 'F2 - Trưởng nhóm Huyện' },
      { value: 'f3_staff_mkt', label: 'F3 - Nhân viên Sale' },
    ];
    if (currentUser?.role === 'f2_sub_lead') return [
      { value: 'f3_staff_mkt', label: 'F3 - Nhân viên Sale' },
    ];
    return [];
  };

  // Server đã scope theo team — trả về đúng dữ liệu của team người gọi
  const filteredMembers = teamMembers;

  // ─── KPI Progress ──────────────────────────────────────────────────────────
  const driverProgress = Math.min(100, Math.round((stats.monthlyDrivers / kpiTarget.drivers) * 100));
  const customerProgress = Math.min(100, Math.round(((stats.totalDriversByTeam || 0) / kpiTarget.customers) * 100));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' }}>
        <div className="text-center">
          <div style={{ width: 64, height: 64, border: '3px solid rgba(255,107,0,0.3)', borderTopColor: '#FF6B00', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: darkMode ? '#0d1117' : '#f0f2f5', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse-glow { 0%,100% { box-shadow: 0 0 0 0 rgba(255,107,0,0.4); } 50% { box-shadow: 0 0 0 12px rgba(255,107,0,0); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .mkt-card { animation: fadeUp 0.4s ease forwards; border-radius: 16px; transition: transform 0.2s, box-shadow 0.2s; }
        .mkt-card:hover { transform: translateY(-2px); }
        .tab-btn { padding: 10px 20px; border-radius: 10px; font-weight: 600; font-size: 14px; border: none; cursor: pointer; transition: all 0.2s; }
        .tab-active { background: linear-gradient(135deg, #FF6B00, #FF8C00); color: white; box-shadow: 0 4px 15px rgba(255,107,0,0.3); }
        .tab-inactive { background: transparent; color: ${darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)'}; }
        .tab-inactive:hover { background: ${darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}; }
        .progress-bar { height: 8px; border-radius: 100px; background: ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}; overflow: hidden; }
        .progress-fill { height: 100%; border-radius: 100px; transition: width 1.2s cubic-bezier(0.4,0,0.2,1); }
        .stat-card { padding: 24px; border-radius: 16px; border: 1px solid; transition: all 0.2s; }
        .stat-card:hover { transform: translateY(-3px); }
        .badge { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 28px; border-radius: 8px; font-size: 12px; font-weight: 800; letter-spacing: 0.5px; }
        .member-row { padding: 16px 20px; border-radius: 12px; transition: background 0.15s; cursor: default; }
        .member-row:hover { background: ${darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'}; }
        .referral-card { background: linear-gradient(135deg, #FF6B00 0%, #FF4500 50%, #c0392b 100%); border-radius: 20px; padding: 28px; color: white; position: relative; overflow: hidden; }
        .referral-card::before { content: ''; position: absolute; top: -60px; right: -60px; width: 200px; height: 200px; background: rgba(255,255,255,0.07); border-radius: 50%; }
        .referral-card::after { content: ''; position: absolute; bottom: -40px; left: 40px; width: 140px; height: 140px; background: rgba(255,255,255,0.05); border-radius: 50%; }
        .hierarchy-node { border-radius: 12px; padding: 16px 20px; border: 2px solid; position: relative; }
        .copy-btn { background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25); color: white; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 6px; }
        .copy-btn:hover { background: rgba(255,255,255,0.25); }
        .input-field { width: 100%; padding: 10px 14px; border-radius: 10px; font-size: 14px; outline: none; transition: border-color 0.2s, box-shadow 0.2s; box-sizing: border-box; }
        .input-field:focus { border-color: #FF6B00 !important; box-shadow: 0 0 0 3px rgba(255,107,0,0.15); }
        .btn-primary { background: linear-gradient(135deg, #FF6B00, #FF4500); color: white; border: none; padding: 11px 22px; border-radius: 10px; font-weight: 700; font-size: 14px; cursor: pointer; transition: all 0.2s; }
        .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(255,107,0,0.35); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .btn-ghost { background: ${darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}; color: ${darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'}; border: none; padding: 11px 22px; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s; }
        .btn-ghost:hover { background: ${darkMode ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.1)'}; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 16px; }
        .modal-box { border-radius: 20px; padding: 28px; width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 60px rgba(0,0,0,0.4); }
      `}</style>

      {/* ── Top Navbar ─────────────────────────────────────────────────────── */}
      <nav style={{
        background: darkMode ? 'rgba(13,17,23,0.95)' : 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
        position: 'sticky', top: 0, zIndex: 100,
        padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 64,
      }}>
        {/* Left: Logo + Role */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #FF6B00, #FF4500)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(255,107,0,0.4)',
            }}>
              <span className="material-symbols-outlined" style={{ color: 'white', fontSize: 20 }}>local_fire_department</span>
            </div>
            <div>
              <span style={{ fontWeight: 800, fontSize: 16, color: darkMode ? 'white' : '#111' }}>FireGo</span>
              <span style={{ fontSize: 12, color: '#FF6B00', fontWeight: 700, marginLeft: 6, background: 'rgba(255,107,0,0.12)', padding: '2px 8px', borderRadius: 6 }}>Marketing</span>
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 28, background: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />

          {/* Role badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px',
            borderRadius: 10, background: roleConfig.bg, border: `1px solid ${roleConfig.border}`,
          }}>
            <span className="material-symbols-outlined" style={{ color: roleConfig.color, fontSize: 16 }}>{roleConfig.icon}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: roleConfig.color }}>{roleConfig.shortLabel}</span>
          </div>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={toggleDark} style={{
            width: 36, height: 36, borderRadius: 8,
            background: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{darkMode ? 'light_mode' : 'dark_mode'}</span>
          </button>

          {/* Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, #FF6B00, #FF4500)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 800, fontSize: 13,
            }}>
              {currentUser?.firstName?.[0] || currentUser?.email?.[0]?.toUpperCase() || 'M'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: darkMode ? 'white' : '#111' }}>
                {currentUser?.firstName ? `${currentUser.lastName || ''} ${currentUser.firstName}`.trim() : currentUser?.email?.split('@')[0]}
              </span>
              <span style={{ fontSize: 11, color: darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
                {currentUser?.email}
              </span>
            </div>
          </div>

          <button onClick={handleLogout} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '6px 10px',
            borderRadius: 8, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 13, fontWeight: 600,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>logout</span>
            Đăng xuất
          </button>
        </div>
      </nav>

      {/* ── Main Content ────────────────────────────────────────────────────── */}
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 24px' }}>

        {/* ── Welcome Banner ───────────────────────────────────────────────── */}
        <div className="mkt-card" style={{
          background: 'linear-gradient(135deg, #FF6B00 0%, #FF4500 40%, #c0392b 100%)',
          padding: '28px 32px', marginBottom: 24, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -80, right: -80, width: 280, height: 280, background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', bottom: -50, left: 200, width: 180, height: 180, background: 'rgba(255,255,255,0.04)', borderRadius: '50%' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{
                background: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: '6px 12px',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span className="material-symbols-outlined" style={{ color: 'white', fontSize: 18 }}>{roleConfig.icon}</span>
                <span style={{ color: 'white', fontWeight: 800, fontSize: 14 }}>{roleConfig.badge}</span>
              </div>
              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 500 }}>{roleConfig.label}</span>
            </div>
            <h1 style={{ color: 'white', fontSize: 26, fontWeight: 800, marginBottom: 8 }}>
              Xin chào, {currentUser?.firstName || 'Đồng nghiệp'}! 👋
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 15, maxWidth: 580 }}>
              {currentUser?.role === 'f1_lead' && 'Bạn đang quản lý toàn bộ mạng lưới phát triển thị trường tỉnh/vùng. Theo dõi KPI, mở rộng đội F2 & F3 để tăng trưởng bền vững.'}
              {currentUser?.role === 'f2_sub_lead' && 'Bạn đang dẫn dắt đội kinh doanh huyện. Hãy đẩy số, hỗ trợ F3 và duy trì ít nhất 5 nhân viên Sale hoạt động.'}
              {currentUser?.role === 'f3_staff_mkt' && 'Hãy tích cực kéo tài xế & khách hàng qua mã giới thiệu của bạn! Mỗi giao dịch thành công = hoa hồng vào ví.'}
            </p>
            {managerData && (
              <div style={{
                marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(255,255,255,0.1)', padding: '6px 14px', borderRadius: 20,
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)' }}>shield_person</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                  Quản lý trực tiếp: {managerData.name} ({managerData.phone})
                </span>
              </div>
            )}
            
            {viewingTargetId && (
              <div style={{ marginTop: 24 }}>
                <button
                  onClick={() => { setViewingTargetId(null); fetchData(); }}
                  style={{
                    background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)',
                    color: 'white', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
                  Quay lại Dashboard của tôi
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', gap: 8, marginBottom: 24,
          background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
          padding: 6, borderRadius: 14, width: 'fit-content',
        }}>
          {[
            { key: 'dashboard', label: 'Tổng quan', icon: 'dashboard', roles: ['f1_lead', 'f2_sub_lead', 'f3_staff_mkt'] },
            { key: 'network', label: 'Mạng lưới', icon: 'account_tree', roles: ['f1_lead', 'f2_sub_lead'] },
            { key: 'drivers', label: 'Tài xế của tôi', icon: 'directions_car', roles: ['f3_staff_mkt'] },
            { key: 'kpi', label: 'KPI tháng', icon: 'trending_up', roles: ['f1_lead', 'f2_sub_lead', 'f3_staff_mkt'] },
            { key: 'referral', label: 'Cơ chế Referral', icon: 'share', roles: ['f1_lead', 'f2_sub_lead', 'f3_staff_mkt'] },
            { key: 'roadmap', label: 'Lộ trình & Thu nhập', icon: 'map', roles: ['f1_lead', 'f2_sub_lead', 'f3_staff_mkt'] },
            { key: 'channels', label: 'Chiến dịch Khách hàng', icon: 'campaign', roles: ['f1_lead', 'f2_sub_lead', 'f3_staff_mkt'] },
          ].filter(t => t.roles.includes(currentUser?.role || 'f3_staff_mkt')).map(tab => (
            <button
              key={tab.key}
              className={`tab-btn ${activeTab === tab.key ? 'tab-active' : 'tab-inactive'}`}
              onClick={() => setActiveTab(tab.key as any)}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* TAB: DASHBOARD */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              {[
                {
                  icon: 'group', label: 'Tổng mạng lưới', value: stats.totalNetwork,
                  suffix: 'người', color: '#7c3aed', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.15)',
                },
                {
                  icon: 'directions_car', label: 'Tài xế tháng này', value: stats.monthlyDrivers,
                  suffix: 'tài xế', color: '#2563eb', bg: 'rgba(37,99,235,0.08)', border: 'rgba(37,99,235,0.15)',
                },
                {
                  icon: 'person_add', label: 'Khách hàng mới', value: stats.totalDriversByTeam,
                  suffix: 'người', color: '#059669', bg: 'rgba(5,150,105,0.08)', border: 'rgba(5,150,105,0.15)',
                },
                {
                  icon: 'account_balance_wallet', label: 'Hoa hồng tháng', value: stats.totalCommission,
                  suffix: '₫', isMoney: true, color: '#FF6B00', bg: 'rgba(255,107,0,0.08)', border: 'rgba(255,107,0,0.2)',
                },
                {
                  icon: 'pending', label: 'Đang chờ duyệt', value: stats.pendingCommission,
                  suffix: '₫', isMoney: true, color: '#d97706', bg: 'rgba(217,119,6,0.08)', border: 'rgba(217,119,6,0.15)',
                },
                {
                  icon: 'receipt_long', label: 'Lịch sử giao dịch', value: stats.commissionHistory,
                  suffix: 'GD', color: '#06b6d4', bg: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.15)',
                },
              ].map((s, i) => (
                <div key={i} className="stat-card mkt-card" style={{
                  background: darkMode ? `rgba(255,255,255,0.04)` : s.bg,
                  border: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : s.border}`,
                  animationDelay: `${i * 0.06}s`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, background: s.bg,
                      border: `1px solid ${s.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span className="material-symbols-outlined" style={{ color: s.color, fontSize: 20 }}>{s.icon}</span>
                    </div>
                    <span className="material-symbols-outlined" style={{ color: '#22c55e', fontSize: 18 }}>arrow_upward</span>
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: darkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {s.label}
                  </p>
                  <p style={{ fontSize: 26, fontWeight: 800, color: darkMode ? 'white' : '#111' }}>
                    {s.isMoney
                      ? (s.value >= 1000000 ? `${(s.value / 1000000).toFixed(1)}M` : `${s.value.toLocaleString()}`)
                      : s.value.toLocaleString()}
                    <span style={{ fontSize: 13, fontWeight: 500, color: s.color, marginLeft: 4 }}>{s.suffix}</span>
                  </p>
                </div>
              ))}
            </div>



            {/* F1-F2-F3 Network Summary */}
            {(currentUser?.role === 'f1_lead' || currentUser?.role === 'f2_sub_lead') && (
              <>
            <div className="mkt-card" style={{
              background: darkMode ? 'rgba(255,255,255,0.04)' : 'white',
              border: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
              padding: 28,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: darkMode ? 'white' : '#111' }}>insert_chart</span>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: darkMode ? 'white' : '#111' }}>
                  Phân bổ mạng lưới theo cấp
                </h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {[
                  { level: 'F1', label: 'Lead Vùng', count: stats.activeF1, total: teamMembers.filter(m => m.role === 'f1_lead').length, color: '#7c3aed', icon: 'military_tech', desc: 'Giám đốc Phát triển TT Tỉnh' },
                  { level: 'F2', label: 'Sub Lead', count: stats.activeF2, total: teamMembers.filter(m => m.role === 'f2_sub_lead').length, color: '#2563eb', icon: 'supervisor_account', desc: 'Trưởng nhóm KD Huyện' },
                  { level: 'F3', label: 'Sale', count: stats.activeF3, total: teamMembers.filter(m => m.role === 'f3_staff_mkt').length, color: '#059669', icon: 'storefront', desc: 'Chuyên viên Phát triển TT' },
                ].map((item, i) => (
                  <div key={i} style={{
                    borderRadius: 14, padding: '20px 24px',
                    background: `linear-gradient(135deg, ${item.color}15, ${item.color}05)`,
                    border: `1px solid ${item.color}25`,
                    textAlign: 'center',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
                      <span className="material-symbols-outlined" style={{ color: item.color, fontSize: 22 }}>{item.icon}</span>
                      <span style={{
                        background: `${item.color}20`, border: `1px solid ${item.color}35`,
                        color: item.color, fontWeight: 800, fontSize: 13,
                        padding: '3px 10px', borderRadius: 6,
                      }}>{item.level}</span>
                    </div>
                    <p style={{ fontWeight: 800, fontSize: 28, color: item.color, lineHeight: 1 }}>
                      {item.count}
                      <span style={{ fontSize: 13, fontWeight: 500, color: darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)', marginLeft: 4 }}>/ {item.total}</span>
                    </p>
                    <p style={{ fontSize: 12, fontWeight: 700, color: darkMode ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)', marginTop: 4 }}>{item.label}</p>
                    <p style={{ fontSize: 11, color: darkMode ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)', marginTop: 2 }}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Model Description */}
            <div className="mkt-card" style={{
              background: darkMode ? 'rgba(255,255,255,0.04)' : 'white',
              border: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
              padding: 28,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: darkMode ? 'white' : '#111' }}>account_tree</span>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: darkMode ? 'white' : '#111' }}>Mô hình tổ chức 3 cấp</h3>
              </div>
              <p style={{ fontSize: 13, color: darkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)', marginBottom: 20 }}>
                Hoa hồng Referral tối đa 3 cấp • Không trừ tiền người thực hiện
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  {
                    level: 'F1', color: '#7c3aed', title: 'GIÁM ĐỐC PHÁT TRIỂN THỊ TRƯỜNG TỈNH/VÙNG (Lead Vùng)',
                    tasks: ['Tuyển dụng & Đào tạo Trưởng nhóm (F2) phụ trách Quận/Huyện', 'Chốt Sales B2B: Ký hợp đồng với chuỗi nhà hàng (Lái hộ), chung cư (Vệ sinh)', 'Tự vận động kéo tài xế/khách hàng vào giỏ riêng'],
                    kpi: 'Doanh thu toàn tỉnh • Số F2 hoạt động',
                    commission: 'Hoa hồng F1 từ toàn bộ giao dịch mạng lưới',
                  },
                  {
                    level: 'F2', color: '#2563eb', title: 'TRƯỞNG NHÓM KINH DOANH HUYỆN (Sub Lead)',
                    tasks: ['Tuyển dụng, phỏng vấn và quản lý đội Nhân viên Sale (F3)', 'Họp team định kỳ, đẩy số, hỗ trợ F3 tháo gỡ khó khăn', 'Tự phát tờ rơi, cài app cho khách để gia tăng hoa hồng'],
                    kpi: 'Doanh thu nhóm • Duy trì tối thiểu 5 F3 hoạt động',
                    commission: 'Hoa hồng F2 từ giao dịch nhóm F3',
                  },
                  {
                    level: 'F3', color: '#059669', title: 'CHUYÊN VIÊN PHÁT TRIỂN THỊ TRƯỜNG / SALE',
                    tasks: ['Kéo Cung: Cắm chốt tại quán nhậu, bến xe, xóm trọ để cài app cho Tài Xế, Shipper, Cô Vệ Sinh', 'Kéo Cầu: Tặng mã giảm giá tại khu dân cư, hướng dẫn khách lẻ tải app & gọi cuốc'],
                    kpi: 'Tuyển đủ 10-20 tài xế/tháng • Số khách tải app • Tổng giao dịch từ mạng lưới',
                    commission: 'Hoa hồng trực tiếp từ giao dịch cá nhân',
                  },
                ].map((item, i) => (
                  <div key={i} className="hierarchy-node" style={{ borderColor: `${item.color}35`, background: `${item.color}06` }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                      <div style={{
                        minWidth: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: `${item.color}15`, border: `2px solid ${item.color}30`,
                        fontWeight: 900, fontSize: 14, color: item.color,
                      }}>{item.level}</div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 800, fontSize: 12, color: item.color, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {item.title}
                        </p>
                        <ul style={{ paddingLeft: 16, marginBottom: 8 }}>
                          {item.tasks.map((t, j) => (
                            <li key={j} style={{ fontSize: 13, color: darkMode ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)', marginBottom: 2 }}>{t}</li>
                          ))}
                        </ul>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
                          <span style={{ fontSize: 12, background: `${item.color}12`, color: item.color, padding: '3px 10px', borderRadius: 6, fontWeight: 600 }}>
                            📌 KPI: {item.kpi}
                          </span>
                          <span style={{ fontSize: 12, background: 'rgba(255,107,0,0.1)', color: '#FF6B00', padding: '3px 10px', borderRadius: 6, fontWeight: 600 }}>
                            💰 {item.commission}
                          </span>
                        </div>
                      </div>
                    </div>
                    {i < 2 && (
                      <div style={{ textAlign: 'center', marginTop: 12, color: `${item.color}60`, fontSize: 20 }}>↓</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
              </>
            )}
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* TAB: NETWORK */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        {activeTab === 'network' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: darkMode ? 'white' : '#111' }}>Mạng lưới của tôi</h2>
                <p style={{ fontSize: 13, color: darkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)', marginTop: 2 }}>
                  {filteredMembers.length} thành viên trong mạng lưới
                </p>
              </div>
              {canAddMember && (
                <button className="btn-primary" onClick={() => setShowAddModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person_add</span>
                  Thêm thành viên
                </button>
              )}
            </div>

            {/* Members list */}
            <div className="mkt-card" style={{
              background: darkMode ? 'rgba(255,255,255,0.04)' : 'white',
              border: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
              padding: '8px 0',
            }}>
              {/* Table Header */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 140px 160px 120px 120px 140px',
                padding: '10px 20px', gap: 8,
                borderBottom: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'}`,
              }}>
                {['Thành viên', 'Cấp bậc', 'Khu vực', 'Mã GT', 'Hoa hồng', 'Trạng thái'].map(h => (
                  <span key={h} style={{ fontSize: 11, fontWeight: 700, color: darkMode ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</span>
                ))}
              </div>

              {filteredMembers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 48, color: darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)', display: 'block', marginBottom: 12 }}>group_off</span>
                  <p style={{ color: darkMode ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)', fontSize: 14 }}>Chưa có thành viên trong mạng lưới</p>
                  {canAddMember && (
                    <button className="btn-primary" onClick={() => setShowAddModal(true)} style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span> Thêm ngay
                    </button>
                  )}
                </div>
              ) : (
                filteredMembers.map(member => {
                  const rc = ROLE_CONFIG[member.role];
                  return (
                    <div key={member._id} className="member-row" style={{
                      display: 'grid', gridTemplateColumns: '1fr 140px 160px 120px 120px 140px', gap: 8, alignItems: 'center',
                    }}>
                      {/* Member */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                          background: `linear-gradient(135deg, ${rc.color}, ${rc.color}80)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'white', fontWeight: 800, fontSize: 13,
                        }}>
                          {(member.firstName || member.email)?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 700, color: darkMode ? 'white' : '#111' }}>{`${member.lastName || ''} ${member.firstName || ''}`.trim() || 'Thành viên'}</p>
                          <p style={{ fontSize: 12, color: darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>{member.email} • {member.phone}</p>
                        </div>
                      </div>
                      {/* Role */}
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        background: rc.bg, border: `1px solid ${rc.border}`, borderRadius: 8,
                        color: rc.color, fontSize: 12, fontWeight: 700, padding: '4px 10px', width: 'fit-content',
                      }}>
                        {rc.badge} {rc.shortLabel}
                      </span>
                      {/* Region */}
                      <span style={{ fontSize: 13, color: darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>{member.region?.name || '—'}</span>
                      {/* Referral Code */}
                      <code style={{
                        fontSize: 13, fontWeight: 700, color: '#FF6B00',
                        background: 'rgba(255,107,0,0.08)', borderRadius: 6, padding: '2px 8px',
                      }}>{member.referralCode || '—'}</code>
                      {/* Commission */}
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>
                        {(member.walletBalance || 0).toLocaleString()}₫
                      </span>
                      {/* Status and Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, width: 'fit-content',
                          background: member.status === 'active' ? 'rgba(5,150,105,0.1)' : member.status === 'suspended' ? 'rgba(239,68,68,0.1)' : 'rgba(107,114,128,0.1)',
                          color: member.status === 'active' ? '#059669' : member.status === 'suspended' ? '#ef4444' : '#6b7280',
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                          {member.status === 'active' ? 'Hoạt động' : member.status === 'suspended' ? 'Khóa' : 'Không HĐ'}
                        </span>
                        
                        {(currentUser?.role === 'f1_lead' || currentUser?.role === 'f2_sub_lead') && (
                          <button
                            onClick={() => {
                              setViewingTargetId(member._id);
                              fetchData(member._id);
                              setActiveTab('dashboard');
                            }}
                            title="Xem chi tiết thành viên"
                            style={{
                              background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: '#2563eb', padding: 4, borderRadius: 6, transition: 'all 0.2s',
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(37,99,235,0.1)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>visibility</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* TAB: DRIVERS */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        {activeTab === 'drivers' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: darkMode ? 'white' : '#111' }}>Tài xế của tôi</h2>
                <p style={{ fontSize: 13, color: darkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)', marginTop: 2 }}>
                  {f3Drivers.length} tài xế trong giỏ hàng giới thiệu
                </p>
              </div>
              <button className="btn-primary" onClick={() => copyReferralCode(currentUser?.referralCode)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>share</span>
                Gửi mã giới thiệu
              </button>
            </div>

            {/* Drivers list */}
            <div className="mkt-card" style={{
              background: darkMode ? 'rgba(255,255,255,0.04)' : 'white',
              border: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
              padding: '8px 0',
            }}>
              {/* Table Header */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 140px 140px 140px',
                padding: '10px 20px', gap: 8,
                borderBottom: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'}`,
              }}>
                {['Tài xế', 'Biển số', 'Số cuốc HT', 'Trạng thái'].map(h => (
                  <span key={h} style={{ fontSize: 11, fontWeight: 700, color: darkMode ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</span>
                ))}
              </div>

              {f3Drivers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 48, color: darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)', display: 'block', marginBottom: 12 }}>directions_car</span>
                  <p style={{ color: darkMode ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)', fontSize: 14 }}>Chưa có tài xế nào được giới thiệu</p>
                </div>
              ) : (
                f3Drivers.map((driver: any) => (
                  <div key={driver._id} className="member-row" style={{
                    display: 'grid', gridTemplateColumns: '1fr 140px 140px 140px', gap: 8, alignItems: 'center',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg, #059669, #10b981)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: 800, fontSize: 13,
                      }}>
                        {(driver.firstName || driver.email)?.[0]?.toUpperCase() || 'D'}
                      </div>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: darkMode ? 'white' : '#111' }}>{`${driver.lastName || ''} ${driver.firstName || ''}`.trim() || 'Tài xế'}</p>
                        <p style={{ fontSize: 12, color: darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>{driver.phone}</p>
                      </div>
                    </div>
                    <span style={{ fontSize: 13, color: darkMode ? 'white' : '#111', fontWeight: 600 }}>{driver.vehiclePlate || '—'}</span>
                    <span style={{ fontSize: 13, color: '#059669', fontWeight: 800 }}>{driver.completedRides || 0} cuốc</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, width: 'fit-content',
                        background: driver.status === 'active' ? 'rgba(5,150,105,0.1)' : 'rgba(107,114,128,0.1)',
                        color: driver.status === 'active' ? '#059669' : '#6b7280',
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                        {driver.status === 'active' ? 'Hoạt động' : 'Chưa HĐ'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* TAB: KPI */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        {activeTab === 'kpi' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="mkt-card" style={{
              background: darkMode ? 'rgba(255,255,255,0.04)' : 'white',
              border: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
              padding: 28,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span className="material-symbols-outlined" style={{ color: '#FF6B00', fontSize: 22 }}>trending_up</span>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: darkMode ? 'white' : '#111' }}>KPI Tháng {new Date().getMonth() + 1}/{new Date().getFullYear()}</h2>
              </div>
              <p style={{ fontSize: 13, color: darkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)', marginBottom: 28 }}>
                📌 {kpiTarget.label}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Metric 1: Transactions */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="material-symbols-outlined" style={{ color: kpiTarget.metric1Color, fontSize: 18 }}>{kpiTarget.metric1Icon}</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: darkMode ? 'white' : '#111' }}>{kpiTarget.metric1Name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 22, fontWeight: 900, color: kpiTarget.metric1Color }}>{stats.totalTransactions}</span>
                      <span style={{ fontSize: 14, color: darkMode ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }}>/ {kpiTarget.metric1Target}</span>
                      <span style={{
                        fontSize: 12, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                        background: Math.min(100, Math.round((stats.totalTransactions / kpiTarget.metric1Target) * 100)) >= 100 ? 'rgba(5,150,105,0.12)' : Math.min(100, Math.round((stats.totalTransactions / kpiTarget.metric1Target) * 100)) >= 60 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
                        color: Math.min(100, Math.round((stats.totalTransactions / kpiTarget.metric1Target) * 100)) >= 100 ? '#059669' : Math.min(100, Math.round((stats.totalTransactions / kpiTarget.metric1Target) * 100)) >= 60 ? '#d97706' : '#ef4444',
                      }}>{Math.min(100, Math.round((stats.totalTransactions / kpiTarget.metric1Target) * 100))}%</span>
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{
                      width: `${Math.min(100, Math.round((stats.totalTransactions / kpiTarget.metric1Target) * 100))}%`,
                      background: Math.min(100, Math.round((stats.totalTransactions / kpiTarget.metric1Target) * 100)) >= 100 ? 'linear-gradient(90deg, #059669, #10b981)' :
                        Math.min(100, Math.round((stats.totalTransactions / kpiTarget.metric1Target) * 100)) >= 60 ? 'linear-gradient(90deg, #d97706, #f59e0b)' :
                          `linear-gradient(90deg, ${kpiTarget.metric1Color}, ${kpiTarget.metric1Color}dd)`,
                    }} />
                  </div>
                </div>

                {/* Metric 2: B2B / Checkin / CTV (Currently defaults to 0 as no explicit stats prop tracks it yet) */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="material-symbols-outlined" style={{ color: kpiTarget.metric2Color, fontSize: 18 }}>{kpiTarget.metric2Icon}</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: darkMode ? 'white' : '#111' }}>{kpiTarget.metric2Name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 22, fontWeight: 900, color: kpiTarget.metric2Color }}>0</span>
                      <span style={{ fontSize: 14, color: darkMode ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }}>/ {kpiTarget.metric2Target}</span>
                      <span style={{
                        fontSize: 12, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                        background: 'rgba(239,68,68,0.12)',
                        color: '#ef4444',
                      }}>0%</span>
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{
                      width: `0%`,
                      background: `linear-gradient(90deg, ${kpiTarget.metric2Color}, ${kpiTarget.metric2Color}dd)`,
                    }} />
                  </div>
                </div>

                {/* Metric 3: Network Size (F2, F3 or Drivers) */}
                {(() => {
                  let actual = 0;
                  if (currentUser?.role === 'f1_lead') actual = stats.activeF2;
                  else if (currentUser?.role === 'f2_sub_lead') actual = stats.activeF3;
                  else actual = stats.totalDriversByTeam;
                  const pct = Math.min(100, Math.round((actual / kpiTarget.metric3Target) * 100) || 0);

                  return (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="material-symbols-outlined" style={{ color: kpiTarget.metric3Color, fontSize: 18 }}>{kpiTarget.metric3Icon}</span>
                          <span style={{ fontSize: 15, fontWeight: 700, color: darkMode ? 'white' : '#111' }}>
                            {kpiTarget.metric3Name}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 22, fontWeight: 900, color: kpiTarget.metric3Color }}>{actual}</span>
                          <span style={{ fontSize: 14, color: darkMode ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }}>/ {kpiTarget.metric3Target}</span>
                          <span style={{
                            fontSize: 12, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                            background: pct >= 100 ? 'rgba(5,150,105,0.12)' : pct >= 60 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
                            color: pct >= 100 ? '#059669' : pct >= 60 ? '#d97706' : '#ef4444',
                          }}>{pct}%</span>
                        </div>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{
                          width: `${pct}%`,
                          background: pct >= 100 ? 'linear-gradient(90deg, #059669, #10b981)' :
                            pct >= 60 ? 'linear-gradient(90deg, #d97706, #f59e0b)' :
                              `linear-gradient(90deg, ${kpiTarget.metric3Color}, ${kpiTarget.metric3Color}dd)`,
                        }} />
                      </div>
                    </div>
                  );
                })()}

              </div>
            </div>

            {/* Bonus threshold */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              {[
                { label: 'Đạt 80% KPI', reward: 'Thưởng hiệu suất 500.000₫', icon: 'emoji_events', color: '#d97706', done: driverProgress >= 80 && customerProgress >= 80 },
                { label: 'Đạt 100% KPI', reward: 'Thưởng mục tiêu 1.500.000₫', icon: 'military_tech', color: '#7c3aed', done: driverProgress >= 100 && customerProgress >= 100 },
                { label: 'Vượt 120% KPI', reward: 'Thưởng xuất sắc 3.000.000₫ + Vinh danh', icon: 'workspace_premium', color: '#FF6B00', done: driverProgress >= 120 && customerProgress >= 120 },
              ].map((item, i) => (
                <div key={i} className="mkt-card" style={{
                  background: item.done ? `${item.color}10` : (darkMode ? 'rgba(255,255,255,0.04)' : 'white'),
                  border: `1px solid ${item.done ? item.color + '35' : (darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)')}`,
                  padding: 20,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    <span className="material-symbols-outlined" style={{ color: item.color, fontSize: 28 }}>{item.icon}</span>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: darkMode ? 'white' : '#111' }}>{item.label}</p>
                      <p style={{ fontSize: 12, color: item.color, fontWeight: 600 }}>{item.reward}</p>
                    </div>
                  </div>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                    background: item.done ? 'rgba(5,150,105,0.12)' : (darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                    color: item.done ? '#059669' : (darkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)'),
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{item.done ? 'check_circle' : 'radio_button_unchecked'}</span>
                    {item.done ? 'Đã đạt' : 'Chưa đạt'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* TAB: REFERRAL */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        {activeTab === 'referral' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* My Referral Card */}
            <div className="referral-card" style={{ padding: '24px', borderRadius: '16px', background: 'linear-gradient(135deg, #FF6B00 0%, #D9381E 100%)', boxShadow: '0 10px 30px rgba(217, 56, 30, 0.3)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%' }}></div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.8)', marginBottom: 12 }}>Liên kết giới thiệu của tôi</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Mã Code */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)' }}>Mã NV: </span>
                    <strong style={{ fontSize: 20, fontWeight: 900, color: 'white', letterSpacing: '2px', background: 'rgba(0,0,0,0.2)', padding: '4px 12px', borderRadius: '8px' }}>
                      {currentUser?.referralCode || 'Đang khởi tạo...'}
                    </strong>
                  </div>
                  
                  {/* Link liên kết */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: 'rgba(255,255,255,0.1)', padding: '12px 16px', borderRadius: '12px', border: '1px border rgba(255,255,255,0.2)' }}>
                    <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <code style={{ fontSize: 15, fontWeight: 600, color: 'white' }}>
                        https://firego.vn/register?ref={currentUser?.referralCode || 'FIRXXX'}
                      </code>
                    </div>
                    <button 
                      onClick={() => copyReferralCode(currentUser?.referralCode)}
                      style={{ 
                        background: copied ? '#059669' : 'white', 
                        color: copied ? 'white' : '#FF6B00', 
                        border: 'none', padding: '8px 16px', borderRadius: '8px', 
                        fontSize: 13, fontWeight: 700, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6,
                        transition: 'all 0.2s', whiteSpace: 'nowrap'
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{copied ? 'check' : 'content_copy'}</span>
                      {copied ? 'Đã sao chép Link!' : 'Copy Link'}
                    </button>
                  </div>
                </div>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 16, lineHeight: 1.5 }}>
                  Gửi link này cho Tài xế hoặc Khách hàng trực tiếp qua Zalo/Facebook. Khi họ tải App đăng ký thông qua link này, hệ thống sẽ tự động ghi nhận vĩnh viễn thu nhập hoa hồng về tài khoản của bạn.
                </p>
              </div>
            </div>

            {/* Commission Structure */}
            <div className="mkt-card" style={{
              background: darkMode ? 'rgba(255,255,255,0.04)' : 'white',
              border: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
              padding: 28,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#FF6B00' }}>lightbulb</span>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: darkMode ? 'white' : '#111' }}>
                  Chia đôi thiên hạ (50/50): Hệ sinh thái 4 dịch vụ
                </h3>
              </div>
              <p style={{ fontSize: 13, color: darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)', marginBottom: 20 }}>
                Công ty thu 20% phí nền tảng. Trích đúng 50% phần thu này để trả thưởng cho Sale F1-F2-F3. Không bao giờ thu tiền người tạo ra dịch vụ.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                {[
                  { service: 'Ghép Xe', icon: 'directions_car', target: 'Tài xế có xe riêng', customer: 'Khách đi tỉnh, VP', value: 'Tiết kiệm, đi chung tiện lợi' },
                  { service: 'Lái Hộ', icon: 'local_taxi', target: 'Đội tài xế B2+', customer: 'Khách uống rượu bia', value: 'Say xỉn, về nhà an toàn' },
                  { service: 'Vận Chuyển', icon: 'local_shipping', target: 'Shipper xe máy, tải', customer: 'Shop online, Cty', value: 'Giao hàng liên tỉnh' },
                  { service: 'Vệ Sinh', icon: 'cleaning_services', target: 'Lao động, tạp vụ', customer: 'Gia đình, Văn phòng', value: 'Dọn dẹp theo giờ uy tín' },
                ].map((item, i) => (
                  <div key={i} style={{
                    borderRadius: 14, padding: 18, border: `1px solid ${darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                    background: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 20, color: darkMode ? 'white' : '#111' }}>{item.icon}</span>
                      <p style={{ fontSize: 15, fontWeight: 800, color: darkMode ? 'white' : '#111' }}>{item.service}</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ fontSize: 13 }}>
                        <span style={{ color: darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', fontWeight: 600 }}>Cần tuyển:</span> <span style={{ color: '#059669', fontWeight: 700 }}>{item.target}</span>
                      </div>
                      <div style={{ fontSize: 13 }}>
                        <span style={{ color: darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', fontWeight: 600 }}>Tệp khách:</span> <span style={{ color: '#2563eb', fontWeight: 700 }}>{item.customer}</span>
                      </div>
                      <div style={{ fontSize: 13 }}>
                        <span style={{ color: darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', fontWeight: 600 }}>Giá trị:</span> <span style={{ color: '#FF6B00', fontWeight: 700 }}>{item.value}</span>
                      </div>
                    </div>
                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px dashed ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}>
                      <p style={{ fontSize: 12, fontWeight: 800, textAlign: 'center', color: darkMode ? 'rgba(255,255,255,0.8)' : '#111' }}>
                        Hoa hồng: F1 (2%) • F2 (3%) • F3 (5%)
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Guard rails */}
            <div className="mkt-card" style={{
              background: 'rgba(237,137,54,0.06)', border: '1px solid rgba(237,137,54,0.2)', padding: 20,
              display: 'flex', gap: 14, alignItems: 'flex-start',
            }}>
              <span className="material-symbols-outlined" style={{ color: '#d97706', fontSize: 24, flexShrink: 0, marginTop: 2 }}>shield</span>
              <div>
                <p style={{ fontWeight: 800, fontSize: 14, color: '#d97706', marginBottom: 6 }}>Cơ chế kiểm soát chống biến tướng đa cấp</p>
                <ul style={{ paddingLeft: 16, margin: 0 }}>
                  {[
                    'Tối đa 3 cấp (F1 → F2 → F3) — không thể thêm cấp thứ 4',
                    'Hoa hồng đến từ DOANH THU giao dịch thực tế, không phải tiền người dùng nạp',
                    'Không trừ tiền từ thu nhập của người thực hiện dịch vụ (tài xế, shipper, cô vệ sinh)',
                    'Tất cả giao dịch hoa hồng được ghi log và có thể kiểm toán',
                    'Hủy hoa hồng tự động nếu giao dịch bị hủy hoặc hoàn tiền',
                  ].map((rule, i) => (
                    <li key={i} style={{ fontSize: 13, color: darkMode ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)', marginBottom: 4 }}>{rule}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Commission wallet */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="mkt-card" style={{
                background: 'linear-gradient(135deg, rgba(5,150,105,0.1), rgba(5,150,105,0.03))',
                border: '1px solid rgba(5,150,105,0.2)', padding: 24,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span className="material-symbols-outlined" style={{ color: '#059669', fontSize: 22 }}>account_balance_wallet</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: darkMode ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)' }}>Ví Hoa hồng</span>
                </div>
                <p style={{ fontSize: 30, fontWeight: 900, color: '#059669' }}>{stats.totalCommission.toLocaleString()}₫</p>
                <p style={{ fontSize: 12, color: '#059669', marginTop: 4, opacity: 0.7 }}>Đã được duyệt, có thể rút</p>
              </div>
              <div className="mkt-card" style={{
                background: 'linear-gradient(135deg, rgba(217,119,6,0.1), rgba(217,119,6,0.03))',
                border: '1px solid rgba(217,119,6,0.2)', padding: 24,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span className="material-symbols-outlined" style={{ color: '#d97706', fontSize: 22 }}>pending</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: darkMode ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)' }}>Đang chờ duyệt</span>
                </div>
                <p style={{ fontSize: 30, fontWeight: 900, color: '#d97706' }}>{stats.pendingCommission.toLocaleString()}₫</p>
                <p style={{ fontSize: 12, color: '#d97706', marginTop: 4, opacity: 0.7 }}>Sẽ về ví sau khi xác nhận</p>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* TAB: ROADMAP */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        {activeTab === 'roadmap' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Mục tiêu các giai đoạn */}
            <div className="mkt-card" style={{
              background: darkMode ? 'rgba(255,255,255,0.04)' : 'white',
              border: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
              padding: 28,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 24, color: darkMode ? 'white' : '#111' }}>map</span>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: darkMode ? 'white' : '#111' }}>
                  Lộ trình phát triển mạng lưới Sale
                </h2>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
                {/* GDT 1 */}
                <div style={{ background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 16, padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: '#2563eb' }}>Giai đoạn 1 (Tháng 1-3)</h3>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', background: 'rgba(37,99,235,0.1)', color: '#2563eb', borderRadius: 20 }}>Thí điểm</span>
                  </div>
                  <ul style={{ paddingLeft: 18, margin: 0, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: darkMode ? 'rgba(255,255,255,0.7)' : '#333' }}>
                    <li><strong>Khu vực:</strong> Quỳnh Lưu, Hoàng Mai, TP Vinh</li>
                    <li><strong>Mục tiêu nhân sự:</strong> 1 F1, 3 F2, 10 F3 / vùng</li>
                    <li><strong>Điều kiện rào cản:</strong> ≥ 40 F3 có data sau 3 tháng / vùng</li>
                    <li><strong>Giao dịch:</strong> ≥ 500 GD/ngày</li>
                    <li><strong>DT nền tảng:</strong> ≥ 240 triệu VNĐ/tháng</li>
                  </ul>
                </div>

                {/* GDT 2 */}
                <div style={{ background: 'rgba(5,150,105,0.05)', border: '1px solid rgba(5,150,105,0.2)', borderRadius: 16, padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: '#059669' }}>Giai đoạn 2 (Tháng 3-6)</h3>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', background: 'rgba(5,150,105,0.1)', color: '#059669', borderRadius: 20 }}>Nhân rộng</span>
                  </div>
                  <ul style={{ paddingLeft: 18, margin: 0, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: darkMode ? 'rgba(255,255,255,0.7)' : '#333' }}>
                    <li><strong>Khu vực:</strong> Toàn tỉnh Nghệ An (6-8 vùng)</li>
                    <li><strong>Mục tiêu nhân sự:</strong> 8 F1, 30 F2, 150 F3</li>
                    <li><strong>Cột mốc:</strong> 150 Sale phủ kín, kéo user vòng lặp 4 mảng</li>
                    <li><strong>Giao dịch:</strong> ≥ 2.500 GD/ngày (Tỷ lệ Đối tác HĐ ≥ 70%)</li>
                    <li><strong>DT nền tảng:</strong> ≥ 1,2 tỷ VNĐ/tháng</li>
                  </ul>
                </div>

                {/* GDT 3 */}
                <div style={{ background: 'rgba(255,107,0,0.05)', border: '1px solid rgba(255,107,0,0.2)', borderRadius: 16, padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: '#FF6B00' }}>Giai đoạn 3 (Tháng 6-12)</h3>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', background: 'rgba(255,107,0,0.1)', color: '#FF6B00', borderRadius: 20 }}>Mở rộng</span>
                  </div>
                  <ul style={{ paddingLeft: 18, margin: 0, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: darkMode ? 'rgba(255,255,255,0.7)' : '#333' }}>
                    <li><strong>Khu vực:</strong> Nghệ An, Hà Tĩnh, Thanh Hóa</li>
                    <li><strong>Mục tiêu nhân sự:</strong> 500+ NV thị trường</li>
                    <li><strong>Phủ sóng dịch vụ:</strong> Xe công nghệ + Lái hộ + Vệ sinh </li>
                    <li><strong>Giao dịch:</strong> ≥ 8.333 GD/ngày</li>
                    <li><strong>DT nền tảng:</strong> ≥ 4 tỷ VNĐ/tháng</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Bảng Kịch bản tài chính */}
            <div className="mkt-card" style={{
              background: darkMode ? 'rgba(255,255,255,0.04)' : 'white',
              border: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
              padding: 28,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 22, color: darkMode ? 'white' : '#111' }}>insert_chart</span>
                    <h2 style={{ fontSize: 18, fontWeight: 800, color: darkMode ? 'white' : '#111' }}>
                      Ước tính Tài chính Nền tảng
                    </h2>
                  </div>
                  <p style={{ fontSize: 13, color: darkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }}>
                    Giả định: Giá trị GD trung bình = 150.000₫ • Phí nền tảng (20%) = 30.000₫/GD
                  </p>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}>
                      {['Kịch bản', 'Số NV F3', 'GD/Ngày', 'DT Nền tảng/Tháng', 'Chi HH Sale (50%)', 'LN Gộp CTy (50%)'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: darkMode ? 'rgba(255,255,255,0.5)' : '#555', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: 'GĐ1 - Nhỏ', f3: 30, gd: '500', dt: '240 triệu', chi: '120 triệu', ln: '120 triệu', color: '#2563eb' },
                      { name: 'GĐ2 - Vừa', f3: 150, gd: '2.500', dt: '1,2 tỷ', chi: '600 triệu', ln: '600 triệu', color: '#059669' },
                      { name: 'GĐ3 - Lớn', f3: 500, gd: '8.333', dt: '4 tỷ', chi: '2 tỷ', ln: '2 tỷ', color: '#FF6B00' },
                    ].map((row, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` }}>
                        <td style={{ padding: '16px', fontSize: 14, fontWeight: 800, color: row.color }}>{row.name}</td>
                        <td style={{ padding: '16px', fontSize: 14, fontWeight: 700 }}>{row.f3}</td>
                        <td style={{ padding: '16px', fontSize: 14, fontWeight: 700 }}>{row.gd}</td>
                        <td style={{ padding: '16px', fontSize: 14, fontWeight: 700 }}>{row.dt}</td>
                        <td style={{ padding: '16px', fontSize: 14, fontWeight: 700, color: '#059669' }}>{row.chi}</td>
                        <td style={{ padding: '16px', fontSize: 14, fontWeight: 700, color: '#7c3aed' }}>{row.ln}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bức tranh thu nhập */}
            <div className="mkt-card" style={{
              background: 'linear-gradient(135deg, rgba(255,107,0,0.08), rgba(255,107,0,0.02))',
              border: '1px solid rgba(255,107,0,0.2)', padding: 28,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#FF6B00' }}>payments</span>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#FF6B00' }}>
                  Bức tranh thu nhập Đội ngũ
                </h2>
              </div>
              <p style={{ fontSize: 13, color: darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', marginBottom: 20 }}>
                Ước tính theo Giai đoạn 2 (AOV an toàn 80.000₫/cuốc, 6 GD/ngày/F3). Điển hình: nếu F1 ký được dòng tiền B2B hóa đơn lớn, thu nhập F1 sẽ nhân đôi.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                {[
                  { level: 'F1 (Lead Vùng)', kpi: '1 Tỉnh (≥ 15K GD) + Ký 3 B2B', salary: '8Tr', bonusDesc: 'HH QL Vùng (2%)', bonus: '24Tr', total: '≈ 32.000.000₫', color: '#7c3aed' },
                  { level: 'F2 (Sub Lead)', kpi: '1 Huyện (≥ 4.5K GD) + Checkin', salary: '5Tr', bonusDesc: 'HH QL Team (2%)', bonus: '7.2Tr', total: '≈ 12.200.000₫', color: '#2563eb' },
                  { level: 'F3 (Nhân viên Sale)', kpi: '≥ 400 GD + Tìm 10 CTV', salary: '3Tr', bonusDesc: 'HH CTV (2%)', bonus: '640K', total: '≈ 3.640.000₫', color: '#059669' },
                  { level: 'CTV Phát Sinh', kpi: '> 5 cuốc duy trì', salary: '0đ', bonusDesc: 'Bắt khách trực tiếp (4%)', bonus: '3.2Tr ~', total: 'Thực tế', color: '#d97706' },
                ].map((item, i) => (
                  <div key={i} style={{ background: darkMode ? 'rgba(0,0,0,0.2)' : 'white', borderRadius: 12, padding: 16, border: `1px solid ${item.color}35` }}>
                    <p style={{ fontSize: 14, fontWeight: 800, color: item.color, marginBottom: 10 }}>{item.level}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                      <p style={{ fontSize: 13, color: darkMode ? 'rgba(255,255,255,0.7)' : '#333' }}><strong>KPI:</strong> {item.kpi}</p>
                      <p style={{ fontSize: 13, color: darkMode ? 'rgba(255,255,255,0.7)' : '#333' }}><strong>Lương cứng:</strong> {item.salary}</p>
                      <p style={{ fontSize: 13, color: darkMode ? 'rgba(255,255,255,0.7)' : '#333' }}><strong>{item.bonusDesc}:</strong> {item.bonus}</p>
                    </div>
                    <div style={{ background: `${item.color}15`, padding: '8px 12px', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: item.color }}>Tổng thu nhập:</span>
                      <span style={{ fontSize: 15, fontWeight: 900, color: item.color }}>{item.total}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB: CHANNELS */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'channels' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Header Banner */}
            <div className="mkt-card" style={{
              background: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)',
              padding: '24px 28px', position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 24, color: 'white' }}>campaign</span>
                  <h2 style={{ color: 'white', fontSize: 22, fontWeight: 800 }}>
                    Chiến dịch Phát triển Khách hàng
                  </h2>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, maxWidth: 600 }}>
                  Cân bằng Cung – Cầu trong vùng. KPI của F1/F2 bao gồm cả số khách hàng mới/tháng trên 4 dịch vụ, không chỉ số người đăng ký chạy ứng dụng.
                </p>
              </div>
            </div>

            {/* 6 Kênh Phát Triển Khách Hàng */}
            <div className="mkt-card" style={{
              background: darkMode ? 'rgba(255,255,255,0.04)' : 'white',
              border: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
              padding: 28,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: darkMode ? 'white' : '#111' }}>my_location</span>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: darkMode ? 'white' : '#111' }}>
                  6 Kênh Phát Triển Khách Hàng
                </h3>
              </div>
              <p style={{ fontSize: 13, color: darkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)', marginBottom: 20 }}>
                Team Lead chịu trách nhiệm phát triển CẢ HAI phía (Cung & Cầu) trong vùng của mình
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { num: '01', icon: 'person_add', name: 'Referral Khách Hàng', how: 'Khách cũ giới thiệu bạn bè → nhận voucher / ưu đãi chuyến tiếp', who: 'App tự động · F1/F2 thúc đẩy', color: '#7c3aed' },
                  { num: '02', icon: 'thumb_up', name: 'Mạng Xã Hội Địa Phương', how: 'Facebook Groups, Zalo OA, TikTok vùng — F1/F2 chạy content chi phí thấp', who: 'F1/F2 là KOL địa phương', color: '#2563eb' },
                  { num: '03', icon: 'confirmation_number', name: 'Voucher Chuyến Đầu', how: 'Ưu đãi 30–50% chuyến đầu tiên — F1/F2 được phát mã cho người dùng mới trong vùng', who: 'F1/F2 phân phối mã', color: '#059669' },
                  { num: '04', icon: 'directions_car', name: 'Tài Xế Là Kênh MKT', how: 'Mỗi tài xế chủ động giới thiệu app cho hành khách → bonus khi khách mới đặt 3 chuyến', who: 'F3 (tài xế)', color: '#0891b2' },
                  { num: '05', icon: 'business', name: 'Đối Tác Doanh Nghiệp (B2B)', how: 'Liên kết công ty, trường học, bệnh viện trong vùng → hợp đồng đội xe cố định', who: 'F1 ký thỏa thuận', color: '#FF6B00' },
                  { num: '06', icon: 'festival', name: 'Event & Cộng Đồng Vùng', how: 'Tham gia hội chợ, sự kiện địa phương — phát mã QR tải app', who: 'F1 phụ trách', color: '#d97706' },
                ].map((ch, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 16,
                    background: darkMode ? 'rgba(255,255,255,0.03)' : `${ch.color}06`,
                    border: `1px solid ${ch.color}20`,
                    borderRadius: 12, padding: '16px 20px',
                  }}>
                    <div style={{
                      minWidth: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: `${ch.color}15`, border: `1px solid ${ch.color}30`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span className="material-symbols-outlined" style={{ color: ch.color, fontSize: 20 }}>{ch.icon}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: ch.color, background: `${ch.color}15`, padding: '2px 8px', borderRadius: 6 }}>#{ch.num}</span>
                        <p style={{ fontSize: 14, fontWeight: 800, color: darkMode ? 'white' : '#111' }}>{ch.name}</p>
                      </div>
                      <p style={{ fontSize: 13, color: darkMode ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)', marginBottom: 6 }}>{ch.how}</p>
                      <span style={{ fontSize: 12, fontWeight: 700, color: ch.color, background: `${ch.color}10`, padding: '2px 10px', borderRadius: 20 }}>
                        Phụ trách: {ch.who}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* KPI Khách hàng bổ sung */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
              {[
                {
                  level: 'F1 – Team Lead', color: '#7c3aed', icon: 'military_tech',
                  kpis: ['Số người dùng mới/tháng trong vùng', 'Tỷ lệ khách hàng quay lại (≥ 40%)', 'Số hợp đồng doanh nghiệp B2B ký được'],
                },
                {
                  level: 'F2 – Sub Lead', color: '#2563eb', icon: 'supervisor_account',
                  kpis: ['Số khách hàng mới từ network F2 phát triển', 'Số mã voucher được kích hoạt trong tháng', 'Tỷ lệ chuyển đổi user mới → đặt lần 2'],
                },
              ].map((item, i) => (
                <div key={i} className="mkt-card" style={{
                  background: darkMode ? 'rgba(255,255,255,0.04)' : 'white',
                  border: `1px solid ${item.color}25`, padding: 24,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <span className="material-symbols-outlined" style={{ color: item.color, fontSize: 22 }}>{item.icon}</span>
                    <p style={{ fontSize: 15, fontWeight: 800, color: item.color }}>{item.level}</p>
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)', marginBottom: 10, letterSpacing: '0.5px' }}>KPI Khách hàng bổ sung</p>
                  <ul style={{ paddingLeft: 18, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {item.kpis.map((kpi, j) => (
                      <li key={j} style={{ fontSize: 13, color: darkMode ? 'rgba(255,255,255,0.7)' : '#333' }}>{kpi}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Nguyên tắc cốt lõi */}
            <div className="mkt-card" style={{
              background: darkMode ? 'rgba(255,255,255,0.04)' : 'white',
              border: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
              padding: 28,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: darkMode ? 'white' : '#111' }}>account_balance</span>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: darkMode ? 'white' : '#111' }}>
                  Nguyên tắc Cốt lõi
                </h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                {[
                  { icon: 'security', title: 'Không trừ tiền người thực hiện', desc: 'Mọi hoa hồng 100% từ phí nền tảng — F3 luôn nhận đủ phần của mình', color: '#059669' },
                  { icon: 'balance', title: 'Không đa cấp biến tướng', desc: 'Tối đa 3 cấp, giới hạn rõ ràng — tuân thủ quy định pháp luật', color: '#7c3aed' },
                  { icon: 'insert_chart', title: 'Minh bạch thu nhập', desc: 'Mỗi người thấy rõ nguồn thu, lý do và thời điểm nhận — không mờ ám', color: '#2563eb' },
                  { icon: 'location_on', title: 'Ưu tiên phát triển theo vùng', desc: 'Người địa phương hiểu địa bàn sẽ phát triển hiệu quả hơn đội MKT trung tâm', color: '#FF6B00' },
                  { icon: 'lock', title: 'Chống gian lận tự động', desc: '1 người = 1 tài khoản · Kiểm tra thiết bị/IP · Lock tiền trước khi rút · Chỉ tính GD thực', color: '#ef4444' },
                ].map((p, i) => (
                  <div key={i} style={{
                    borderRadius: 12, padding: '16px 18px',
                    background: `${p.color}08`, border: `1px solid ${p.color}25`,
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 24, marginBottom: 8, color: p.color }}>{p.icon}</span>
                    <p style={{ fontSize: 14, fontWeight: 800, color: p.color, marginBottom: 6 }}>{p.title}</p>
                    <p style={{ fontSize: 13, color: darkMode ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)' }}>{p.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Luồng vận hành */}
            <div className="mkt-card" style={{
              background: darkMode ? 'rgba(255,255,255,0.04)' : 'white',
              border: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
              padding: 28,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: darkMode ? 'white' : '#111' }}>settings</span>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: darkMode ? 'white' : '#111' }}>
                  Luồng Vận hành Hệ thống
                </h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
                {/* Onboarding */}
                <div>
                  <p style={{ fontSize: 14, fontWeight: 800, color: '#7c3aed', marginBottom: 14 }}>1. Tuyển dụng (Onboarding)</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { step: '1', text: 'F1 tạo link mời riêng → gửi cho người muốn làm F2', color: '#7c3aed' },
                      { step: '2', text: 'F2 đăng ký qua link → hệ thống tự gán vào đội của F1', color: '#7c3aed' },
                      { step: '3', text: 'F2 tạo link mời riêng → Gửi cho F3 đăng ký (Tự động gán vào team)', color: '#2563eb' },
                      { step: '4', text: 'F3 tạo mã chia sẻ → Gửi Tài xế/Shipper/Vệ sinh đăng ký (Tự động gắn vào giỏ F3)', color: '#059669' },
                      { step: '5', text: 'Mỗi link là duy nhất — hệ thống biết chính xác ai giới thiệu ai, thuộc vùng nào', color: '#FF6B00' },
                    ].map((s, i) => (
                      <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div style={{
                          minWidth: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                          background: `${s.color}20`, border: `1.5px solid ${s.color}50`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 800, color: s.color,
                        }}>{s.step}</div>
                        <p style={{ fontSize: 13, color: darkMode ? 'rgba(255,255,255,0.7)' : '#333', paddingTop: 3 }}>{s.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Commission flow */}
                <div>
                  <p style={{ fontSize: 14, fontWeight: 800, color: '#FF6B00', marginBottom: 14 }}>2. Giao dịch → Phân bổ Hoa hồng</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { step: '6', text: 'Khách đặt dịch vụ → Đối tác nhận cuốc', color: '#2563eb' },
                      { step: '7', text: 'Giao dịch hoàn thành thành công', color: '#059669' },
                      { step: '8', text: 'Hệ thống tự động tính phí nền tảng (20%)', color: '#059669' },
                      { step: '9', text: 'Tra cứu cây referral của người thực hiện (F3 → F2 → F1)', color: '#7c3aed' },
                      { step: '10', text: 'Tính hoa hồng từng cấp (F3: 25%, F2: 15%, F1: 10%)', color: '#FF6B00' },
                      { step: '11', text: 'Cộng vào ví giới thiệu của F1, F2, F3 — khóa 24h trước khi mở rút', color: '#FF6B00' },
                    ].map((s, i) => (
                      <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div style={{
                          minWidth: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                          background: `${s.color}20`, border: `1.5px solid ${s.color}50`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 800, color: s.color,
                        }}>{s.step}</div>
                        <p style={{ fontSize: 13, color: darkMode ? 'rgba(255,255,255,0.7)' : '#333', paddingTop: 3 }}>{s.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}
      </main>

      {/* ── Add Member Modal ─────────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAddModal(false)}>
          <div className="modal-box" style={{ background: darkMode ? '#161b22' : 'white', color: darkMode ? 'white' : '#111' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800 }}>Thêm thành viên mới</h2>
                <p style={{ fontSize: 13, color: darkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)', marginTop: 2 }}>Tuyển dụng vào mạng lưới của bạn</p>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }}>×</button>
            </div>

            {formError && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#ef4444' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleAddMember} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: darkMode ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Họ và Đệm</label>
                  <input required className="input-field" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} placeholder="Nguyễn Văn"
                    style={{ borderColor: darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.15)', background: darkMode ? 'rgba(255,255,255,0.06)' : 'white', color: darkMode ? 'white' : '#111', border: '1px solid' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: darkMode ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tên</label>
                  <input required className="input-field" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} placeholder="An"
                    style={{ borderColor: darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.15)', background: darkMode ? 'rgba(255,255,255,0.06)' : 'white', color: darkMode ? 'white' : '#111', border: '1px solid' }} />
                </div>
              </div>

              {[
                { label: 'Email', type: 'email', key: 'email', placeholder: 'ten@gmail.com' },
                { label: 'Số điện thoại', type: 'tel', key: 'phone', placeholder: '0901 234 567' },
                { label: 'Mật khẩu', type: 'password', key: 'password', placeholder: 'Tối thiểu 6 ký tự' },
                { label: 'Địa chỉ / Khu vực phụ trách', type: 'text', key: 'address', placeholder: 'Phường Hưng Bình, TP Vinh...' },
              ].map(field => (
                <div key={field.key}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: darkMode ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{field.label}</label>
                  <input required={field.key !== 'address'} className="input-field" type={field.type} value={(formData as any)[field.key]}
                    onChange={e => setFormData({ ...formData, [field.key]: e.target.value })} placeholder={field.placeholder} minLength={field.key === 'password' ? 6 : undefined}
                    style={{ borderColor: darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.15)', background: darkMode ? 'rgba(255,255,255,0.06)' : 'white', color: darkMode ? 'white' : '#111', border: '1px solid' }} />
                </div>
              ))}

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: darkMode ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cấp bậc</label>
                <select required className="input-field" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}
                  style={{ borderColor: darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.15)', background: darkMode ? 'rgba(255,255,255,0.06)' : 'white', color: darkMode ? 'white' : '#111', border: '1px solid', cursor: 'pointer' }}>
                  {allowedNewRoles().map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="button" className="btn-ghost" onClick={() => setShowAddModal(false)} style={{ flex: 1 }}>Hủy</button>
                <button type="submit" className="btn-primary" disabled={formLoading} style={{ flex: 2 }}>
                  {formLoading ? 'Đang lưu...' : 'Thêm thành viên'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
