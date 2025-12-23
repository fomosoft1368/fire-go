import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import viVN from 'antd/locale/vi_VN'
import Login from './pages/login'
import Dashboard from './pages/dashboard'
import UserManagement from './pages/user-management'
import DriverManagement from './pages/driver-management'
import RideManagement from './pages/ride-management'
import RevenueManagement from './pages/revenue-management'
import DispatchManagement from './pages/dispatch-management'
import ReportsAnalytics from './pages/reports-analytics'
import Customers from './pages/customers'
import Settings from './pages/settings'
import './App.css'

function App() {
  return (
    <ConfigProvider locale={viVN}>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/user-management" element={<UserManagement />} />
          <Route path="/drivers" element={<DriverManagement />} />
          <Route path="/rides" element={<RideManagement />} />
          <Route path="/revenue" element={<RevenueManagement />} />
          <Route path="/dispatch" element={<DispatchManagement />} />
          <Route path="/reports" element={<ReportsAnalytics />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Router>
    </ConfigProvider>
  )
}

export default App
