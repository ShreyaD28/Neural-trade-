import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import TickerTape from './TickerTape'
import { useSocket } from '../hooks/useSocket'
import api from '../api/client'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: 'space_dashboard' },
  { to: '/trade', label: 'Trade', icon: 'candlestick_chart' },
  { to: '/portfolio', label: 'Portfolio', icon: 'account_balance_wallet' },
  { to: '/ai-insights', label: 'AI Insights', icon: 'psychology' },
  { to: '/risk', label: 'Risk Analytics', icon: 'shield' },
  { to: '/history', label: 'Trade History', icon: 'history' },
]

const outline = 'border-[rgba(70,69,84,0.15)]'

export default function Layout() {
  const navigate = useNavigate()
  const { prices } = useSocket(null)
  const [cash, setCash] = useState(null)
  const [cashLoading, setCashLoading] = useState(true)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // Read user from localStorage (written by Authentication on login/google)
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('neuraltrade_user')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })
  const [notifications, setNotifications] = useState([
    { icon: '📈', title: 'AAPL Signal', body: 'BUY signal detected — RSI 32.4', time: '2 min ago', unread: true },
    { icon: '✅', title: 'Trade Executed', body: 'Bought 5 AAPL @ $260.48', time: '14 min ago', unread: true },
    { icon: '⚠️', title: 'Risk Alert', body: 'Portfolio VaR exceeded 5% threshold', time: '1 hr ago', unread: false },
  ])
  const unreadCount = notifications.filter((n) => n.unread).length

  const [soundAlerts, setSoundAlerts] = useState(false)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [oneTapExecution, setOneTapExecution] = useState(false)
  const [showCommissionFees, setShowCommissionFees] = useState(true)
  const [autoRefreshPrices, setAutoRefreshPrices] = useState(true)
  const [showPnlPercent, setShowPnlPercent] = useState(true)
  const [compactTableView, setCompactTableView] = useState(false)

  const notificationsRef = useRef(null)
  const settingsRef = useRef(null)

  useEffect(() => {
    let mounted = true
    async function loadCash() {
      setCashLoading(true)
      try {
        const { data } = await api.get('/portfolio/summary')
        const value = Number(data?.cashBalance ?? 0)
        if (!mounted) return
        setCash(value)
        localStorage.setItem('neuraltrade_cash', String(value))
      } catch {
        if (!mounted) return
        const cached = Number(localStorage.getItem('neuraltrade_cash') ?? 0)
        setCash(Number.isFinite(cached) ? cached : 0)
      } finally {
        if (mounted) setCashLoading(false)
      }
    }

    // If user info not yet in localStorage, fetch from /auth/me
    async function loadUser() {
      if (user) return
      try {
        const { data } = await api.get('/auth/me')
        if (!mounted || !data.user) return
        setUser(data.user)
        localStorage.setItem('neuraltrade_user', JSON.stringify(data.user))
      } catch { /* keep anonymous */ }
    }

    loadCash()
    loadUser()
    const id = setInterval(loadCash, 30_000)
    return () => {
      mounted = false
      clearInterval(id)
    }
  }, [])

  useEffect(() => {
    function handleOutsideClick(e) {
      if (
        showNotifications &&
        notificationsRef.current &&
        !notificationsRef.current.contains(e.target)
      ) {
        setShowNotifications(false)
      }
      if (
        showSettings &&
        settingsRef.current &&
        !settingsRef.current.contains(e.target)
      ) {
        setShowSettings(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [showNotifications, showSettings])

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('neuraltrade_cash')
    localStorage.removeItem('neuraltrade_user')
    navigate('/', { replace: true })
  }

  function toggleNotifications() {
    setShowNotifications((v) => !v)
    setShowSettings(false)
  }

  function toggleSettings() {
    setShowSettings((v) => !v)
    setShowNotifications(false)
  }

  return (
    <div className="min-h-screen bg-obs-bg">
      <aside
        className={`fixed bottom-0 left-0 top-0 z-30 flex w-[230px] flex-col border-r ${outline} bg-obs-bg`}
      >
        <div className={`border-b ${outline} px-4 py-5`}>
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-obs-primary">
              neurology
            </span>
            <div>
              <p className="font-manrope text-lg font-bold leading-tight tracking-tight text-obs-text">
                NeuralTrade
              </p>
              <p className="mt-1 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-obs-primary">
                AI High-Intelligence
              </p>
            </div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          {NAV.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-[var(--radius-obs-lg)] px-3 py-2.5 font-inter text-sm font-medium transition-colors',
                  isActive
                    ? `border-l-2 border-obs-primary bg-obs-container-high pl-[10px] text-obs-text`
                    : `border-l-2 border-transparent pl-3 text-obs-muted hover:bg-obs-surface/80 hover:text-obs-text`,
                ].join(' ')
              }
            >
              <span className="material-symbols-outlined text-[20px] opacity-90">
                {icon}
              </span>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className={`border-t ${outline} p-3`}>
          <button
            type="button"
            onClick={() => navigate('/trade')}
            className="mb-4 w-full rounded-[var(--radius-obs-lg)] bg-gradient-to-r from-[#8b8fd1] to-obs-primary py-2.5 font-manrope text-sm font-bold text-[#111417] shadow-lg shadow-obs-primary/20"
          >
            + New Trade
          </button>
          <div className="flex items-center gap-3 rounded-[var(--radius-obs-lg)] bg-obs-surface/60 p-2 backdrop-blur-md">
            <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-obs)] bg-obs-container-high font-manrope text-xs font-bold text-obs-primary">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : user?.email ? user.email.slice(0, 2).toUpperCase() : '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-manrope text-sm font-semibold text-obs-text">
                {user?.name || user?.email || 'Trader'}
              </p>
              <p className="text-[10px] font-medium uppercase tracking-wide text-obs-green">
                Pro Tier
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="mt-2 w-full rounded-[var(--radius-obs)] py-1.5 text-center font-mono text-[10px] uppercase tracking-wide text-obs-muted hover:bg-obs-surface hover:text-obs-text"
          >
            Log out
          </button>
          <p className="mt-2 text-center font-mono text-[10px] text-obs-muted">
            Cash: {cashLoading ? 'Loading...' : `$${Number(cash ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </p>
        </div>
      </aside>

      <div className="pl-[230px]">
        <header
          className={`fixed left-[230px] right-0 top-0 z-20 flex flex-col border-b ${outline} bg-obs-bg/80 backdrop-blur-xl`}
        >
          <div className="flex h-14 items-center gap-4 px-4">
          <div className="relative hidden max-w-xs flex-1 md:block">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-obs-muted text-[18px]">
              search
            </span>
            <input
              type="search"
              placeholder="Search markets, tickers, AI signals…"
              className={`w-full rounded-full border ${outline} bg-obs-surface/90 py-2 pl-10 pr-4 font-inter text-sm text-obs-text placeholder:text-obs-muted backdrop-blur-md focus:border-obs-primary/40 focus:outline-none focus:ring-1 focus:ring-obs-primary/30`}
            />
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <div className="relative" ref={notificationsRef}>
              <button
                type="button"
                onClick={toggleNotifications}
                className={`relative rounded-[var(--radius-obs)] p-2 text-obs-muted hover:bg-obs-surface hover:text-obs-text`}
                aria-label="Notifications"
              >
                <span className="material-symbols-outlined text-[22px]">
                  notifications
                </span>
                {unreadCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 rounded-full bg-obs-coral px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                    {unreadCount}
                  </span>
                ) : null}
              </button>
              {showNotifications ? (
                <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-obs-outline-variant/20 bg-obs-surface shadow-xl">
                  <div className="flex items-center justify-between border-b border-[rgba(70,69,84,0.15)] px-4 py-3">
                    <h3 className="font-manrope text-sm font-bold text-obs-text">Notifications</h3>
                    <button
                      type="button"
                      onClick={() => setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))}
                      className="text-[10px] font-mono uppercase text-obs-muted hover:text-obs-text"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.map((n) => (
                      <div key={`${n.title}-${n.time}`} className="border-b border-[rgba(70,69,84,0.12)] px-4 py-3 last:border-b-0">
                        <div className="flex items-start gap-3">
                          <div className="text-base">{n.icon}</div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-obs-text">{n.title}</p>
                            <p className="mt-0.5 text-xs text-obs-muted">{n.body}</p>
                            <p className="mt-1 text-[10px] font-mono uppercase text-obs-muted">{n.time}</p>
                          </div>
                          {n.unread ? <span className="mt-1 h-2 w-2 rounded-full bg-obs-green" /> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-[rgba(70,69,84,0.15)] px-4 py-2">
                    <button type="button" className="text-xs font-semibold text-obs-primary hover:opacity-90">
                      View all notifications
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="relative" ref={settingsRef}>
              <button
                type="button"
                onClick={toggleSettings}
                className={`rounded-[var(--radius-obs)] p-2 text-obs-muted hover:bg-obs-surface hover:text-obs-text`}
                aria-label="Settings"
              >
                <span className="material-symbols-outlined text-[22px]">
                  settings
                </span>
              </button>
              {showSettings ? (
                <div className="absolute right-0 top-11 z-50 w-72 rounded-xl border border-obs-outline-variant/20 bg-obs-surface shadow-xl">
                  <div className="border-b border-[rgba(70,69,84,0.15)] px-4 py-3">
                    <h3 className="font-manrope text-sm font-bold text-obs-text">Settings</h3>
                  </div>
                  <div className="space-y-4 px-4 py-3">
                    <div>
                      <p className="mb-2 text-[10px] font-mono uppercase text-obs-muted">Preferences</p>
                      <div className="space-y-2">
                        <label className="flex items-center justify-between text-xs text-obs-text">
                          Dark Mode
                          <input type="checkbox" checked disabled className="h-4 w-4 accent-obs-green opacity-60" />
                        </label>
                        <label className="flex items-center justify-between text-xs text-obs-text">
                          Sound Alerts
                          <input type="checkbox" checked={soundAlerts} onChange={(e) => setSoundAlerts(e.target.checked)} className="h-4 w-4 accent-obs-green" />
                        </label>
                        <label className="flex items-center justify-between text-xs text-obs-text">
                          Email Notifications
                          <input type="checkbox" checked={emailNotifications} onChange={(e) => setEmailNotifications(e.target.checked)} className="h-4 w-4 accent-obs-green" />
                        </label>
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-[10px] font-mono uppercase text-obs-muted">Trading</p>
                      <div className="space-y-2">
                        <label className="flex items-center justify-between text-xs text-obs-text">
                          One-Tap Execution
                          <input type="checkbox" checked={oneTapExecution} onChange={(e) => setOneTapExecution(e.target.checked)} className="h-4 w-4 accent-obs-green" />
                        </label>
                        <label className="flex items-center justify-between text-xs text-obs-text">
                          Show Commission Fees
                          <input type="checkbox" checked={showCommissionFees} onChange={(e) => setShowCommissionFees(e.target.checked)} className="h-4 w-4 accent-obs-green" />
                        </label>
                        <label className="flex items-center justify-between text-xs text-obs-text">
                          Auto-refresh Prices
                          <input type="checkbox" checked={autoRefreshPrices} onChange={(e) => setAutoRefreshPrices(e.target.checked)} className="h-4 w-4 accent-obs-green" />
                        </label>
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-[10px] font-mono uppercase text-obs-muted">Display</p>
                      <div className="space-y-2">
                        <label className="flex items-center justify-between text-xs text-obs-text">
                          Show P&amp;L in %
                          <input type="checkbox" checked={showPnlPercent} onChange={(e) => setShowPnlPercent(e.target.checked)} className="h-4 w-4 accent-obs-green" />
                        </label>
                        <label className="flex items-center justify-between text-xs text-obs-text">
                          Compact Table View
                          <input type="checkbox" checked={compactTableView} onChange={(e) => setCompactTableView(e.target.checked)} className="h-4 w-4 accent-obs-green" />
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-[rgba(70,69,84,0.15)] px-4 py-2 text-[10px] font-mono text-obs-muted">
                    v1.0.0 · NeuralTrade
                  </div>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => navigate('/trade')}
              className="hidden rounded-[var(--radius-obs-lg)] bg-obs-green px-4 py-2 font-manrope text-sm font-bold text-[#111417] sm:inline"
            >
              Execute
            </button>
            <div className="ml-1 hidden items-center gap-2 border-l border-[rgba(70,69,84,0.15)] pl-3 sm:flex">
              <div className="text-right">
                <p className="font-manrope text-xs font-semibold text-obs-text">
                  {user?.name || user?.email || 'Trader'}
                </p>
                <span className="inline-block rounded-[var(--radius-obs)] bg-obs-container-high px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-obs-primary">
                  Pro
                </span>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-obs)] bg-obs-container-high font-manrope text-xs font-bold text-obs-primary">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : user?.email ? user.email.slice(0, 2).toUpperCase() : '?'}
              </div>
            </div>
          </div>
          </div>

          <div className="hidden border-t border-[rgba(70,69,84,0.12)] lg:block">
            <TickerTape livePrices={prices} />
          </div>
        </header>

        <div className="pt-14 lg:pt-[7rem]">
          <div className="lg:hidden">
            <TickerTape livePrices={prices} />
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
