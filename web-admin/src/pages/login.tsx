import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Vui lòng nhập email và mật khẩu');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🚀 Logging in with:', { email, password });
      
      // Call API login
      const response = await apiService.login(email, password);
      
      console.log('✅ Login response:', response);

      // Save token
      if (response.accessToken || response.data?.accessToken) {
        const token = response.accessToken || response.data?.accessToken;
        localStorage.setItem('token', token);
        console.log('💾 Token saved to localStorage');
        
        // Always store at least the email from login form
        const profileData = {
          firstName: response.user?.firstName || response.data?.user?.firstName || '',
          lastName: response.user?.lastName || response.data?.user?.lastName || '',
          email: response.user?.email || response.data?.user?.email || email,
          phone: response.user?.phone || response.data?.user?.phone || '',
          role: response.user?.role || response.data?.user?.role || 'admin'
        };
        
        localStorage.setItem('userProfile', JSON.stringify(profileData));
        console.log('💾 User profile saved to localStorage:', profileData);
        
        // Try to fetch full profile with phone number if API endpoint is ready
        try {
          setTimeout(async () => {
            const fullProfile = await apiService.getAdminProfile();
            if (fullProfile && fullProfile.email) {
              console.log('📞 Full profile fetched, updating with phone:', fullProfile.phone);
              const updatedProfile = {
                ...profileData,
                firstName: fullProfile.firstName || fullProfile.first_name || profileData.firstName,
                lastName: fullProfile.lastName || fullProfile.last_name || profileData.lastName,
                phone: fullProfile.phone || profileData.phone
              };
              localStorage.setItem('userProfile', JSON.stringify(updatedProfile));
              console.log('💾 Profile updated with full data:', updatedProfile);
            }
          }, 1000); // Delay to avoid blocking
        } catch (err) {
          console.log('Could not fetch full profile (this is ok if API is not ready)');
        }
        
        // Redirect to dashboard
        navigate('/');
      } else {
        setError('Lỗi: Không nhận được token từ server');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Lỗi đăng nhập';
      console.error('❌ Login error:', err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark">
      <div className="flex flex-1 flex-col justify-center px-4 py-8 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex w-full flex-col items-center justify-center pb-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/20 mb-4 shadow-lg shadow-primary/10">
            <span className="material-symbols-outlined text-primary text-[40px]">local_fire_department</span>
          </div>
        </div>

        {/* Header */}
        <div className="w-full text-center">
          <h1 className="text-[#111418] dark:text-white tracking-tight text-[32px] font-bold leading-tight pb-2">
            FireGo Admin
          </h1>
          <p className="text-[#637588] dark:text-[#9dabb9] text-base font-normal leading-normal pb-8">
            Hệ thống quản trị điều phối &amp; vận hành
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="w-full max-w-[480px] mx-auto space-y-5">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Email Input */}
          <div className="flex flex-col">
            <label className="text-[#111418] dark:text-white text-base font-medium leading-normal pb-2">
              Tên đăng nhập / Email
            </label>
            <div className="flex w-full items-stretch rounded-lg shadow-sm">
              <input
                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-l-lg text-[#111418] dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-[#dce0e5] dark:border-[#3b4754] bg-white dark:bg-[#1c2127] focus:border-primary h-14 placeholder:text-[#9dabb9] p-[15px] border-r-0 pr-2 text-base font-normal leading-normal transition-colors"
                placeholder="admin@firego.com"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <div className="text-[#9dabb9] flex border border-[#dce0e5] dark:border-[#3b4754] bg-white dark:bg-[#1c2127] items-center justify-center pr-[15px] pl-2 rounded-r-lg border-l-0">
                <span className="material-symbols-outlined text-[24px]">person</span>
              </div>
            </div>
          </div>

          {/* Password Input */}
          <div className="flex flex-col">
            <label className="text-[#111418] dark:text-white text-base font-medium leading-normal pb-2">
              Mật khẩu
            </label>
            <div className="flex w-full items-stretch rounded-lg shadow-sm">
              <input
                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-l-lg text-[#111418] dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-[#dce0e5] dark:border-[#3b4754] bg-white dark:bg-[#1c2127] focus:border-primary h-14 placeholder:text-[#9dabb9] p-[15px] border-r-0 pr-2 text-base font-normal leading-normal transition-colors"
                placeholder="********"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div
                className="text-[#9dabb9] flex border border-[#dce0e5] dark:border-[#3b4754] bg-white dark:bg-[#1c2127] items-center justify-center pr-[15px] pl-2 rounded-r-lg border-l-0 cursor-pointer hover:text-primary transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                <span className="material-symbols-outlined text-[24px]">
                  {showPassword ? 'visibility' : 'visibility_off'}
                </span>
              </div>
            </div>
          </div>

          {/* Forgot Password */}
          <div className="flex w-full justify-end">
            <a className="text-sm font-medium text-primary hover:text-orange-600 transition-colors" href="#">
              Quên mật khẩu?
            </a>
          </div>

          {/* Login Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary h-14 text-white text-base font-bold leading-normal hover:bg-orange-600 active:bg-orange-700 transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined text-[20px] animate-spin">autorenew</span>
                  <span>Đang đăng nhập...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">login</span>
                  <span>Đăng nhập</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Footer */}
      <div className="w-full p-4">
        <div className="flex flex-col items-center justify-center gap-2 opacity-60">
          <p className="text-xs text-[#637588] dark:text-[#9dabb9] font-normal text-center">
            FireGo Admin v2.1.0 - Bảo mật &amp; An toàn
          </p>
          <div className="flex items-center gap-1 text-xs text-[#637588] dark:text-[#9dabb9]">
            <span className="material-symbols-outlined text-[14px]">shield</span>
            <span>Kết nối mã hóa SSL</span>
          </div>
        </div>
      </div>
    </div>
  );
}