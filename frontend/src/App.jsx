import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import RequireAuth from './components/RequireAuth'
import Authentication from './pages/Authentication'
import MainDashboard from './pages/MainDashboard'
import TradingPanel from './pages/TradingPanel'
import PortfolioOverview from './pages/PortfolioOverview'
import AIInsights from './pages/AIInsights'
import RiskAnalytics from './pages/RiskAnalytics'
import TradeHistory from './pages/TradeHistory'

function RootGate() {
  if (localStorage.getItem('token')) {
    return <Navigate to="/dashboard" replace />
  }
  return <Authentication />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootGate />} />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<MainDashboard />} />
          <Route path="/trade" element={<TradingPanel />} />
          <Route path="/portfolio" element={<PortfolioOverview />} />
          <Route path="/ai-insights" element={<AIInsights />} />
          <Route path="/risk" element={<RiskAnalytics />} />
          <Route path="/history" element={<TradeHistory />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
