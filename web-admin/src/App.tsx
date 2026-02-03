import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import viVN from 'antd/locale/vi_VN'
import { useEffect } from 'react'
import { LanguageProvider } from './context/LanguageContext'
import { NotificationProvider } from './context/NotificationContext'
import Login from './pages/login'
import Dashboard from './pages/dashboard'
import UserManagement from './pages/user-management'
import DriverManagement from './pages/driver-management'
import DriverDetail from './pages/driver-detail'
import DriverApproval from './pages/driver-approval'
import AddDriverPage from './pages/add-driver'
import RideManagement from './pages/ride-management'
import RevenueManagement from './pages/revenue-management'
import DispatchManagement from './pages/dispatch-management'
import ReportsAnalytics from './pages/reports-analytics'
import Customers from './pages/customers'
import Settings from './pages/settings'
import WalletManagement from './pages/transaction-management'
import NotificationsManagement from './pages/NotificationsManagement'
import PricingConfig from './pages/pricing-config'
import './App.css'

function App() {
  // Load Google Maps API script
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    // Debug: log the API key (only first/last chars for security)
    if (apiKey) {
      console.log('✅ API Key found:', apiKey.substring(0, 6) + '...' + apiKey.substring(apiKey.length - 4));
    } else {
      console.error('❌ VITE_GOOGLE_MAPS_API_KEY is not defined in .env.local');
      return;
    }

    // Check if Google Maps already loaded
    if ((window as any).google && (window as any).google.maps) {
      console.log('Google Maps API already loaded');
      return;
    }

    // Check if script already exists
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      console.log('Google Maps script tag already exists');
      return;
    }

    // Create and load script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&callback=initMap`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log('✅ Google Maps API script loaded successfully');
    };
    script.onerror = () => {
      console.error('❌ Failed to load Google Maps API. Check your API key in .env.local');
    };
    document.head.appendChild(script);

    // Global callback
    (window as any).initMap = () => {
      console.log('✅ Google Maps initialized');
    };
  }, []);

  return (
    <NotificationProvider>
      <LanguageProvider>
        <ConfigProvider locale={viVN}>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Dashboard />} />
              <Route path="/user-management" element={<UserManagement />} />
              <Route path="/drivers" element={<DriverManagement />} />
              <Route path="/driver/:id" element={<DriverDetail />} />
              <Route path="/driver-approval" element={<DriverApproval />} />
              <Route path="/add-driver" element={<AddDriverPage />} />
              <Route path="/rides" element={<RideManagement />} />
              <Route path="/revenue" element={<RevenueManagement />} />
              <Route path="/dispatch" element={<DispatchManagement />} />
              <Route path="/notifications" element={<NotificationsManagement />} />
              <Route path="/reports" element={<ReportsAnalytics />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/transactions" element={<WalletManagement />} />
              <Route path="/pricing-config" element={<PricingConfig />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Router>
        </ConfigProvider>
      </LanguageProvider>
    </NotificationProvider>
  )
}

export default App
