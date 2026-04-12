import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import TickerTape from './TickerTape'
import { useSocket } from '../hooks/useSocket'

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

  function logout() {
    localStorage.removeItem('token')
    navigate('/', { replace: true })
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
              AC
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-manrope text-sm font-semibold text-obs-text">
                Alex Chen
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
            <button
              type="button"
              className={`rounded-[var(--radius-obs)] p-2 text-obs-muted hover:bg-obs-surface hover:text-obs-text`}
              aria-label="Notifications"
            >
              <span className="material-symbols-outlined text-[22px]">
                notifications
              </span>
            </button>
            <button
              type="button"
              className={`rounded-[var(--radius-obs)] p-2 text-obs-muted hover:bg-obs-surface hover:text-obs-text`}
              aria-label="Settings"
            >
              <span className="material-symbols-outlined text-[22px]">
                settings
              </span>
            </button>
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
                  Alex Chen
                </p>
                <span className="inline-block rounded-[var(--radius-obs)] bg-obs-container-high px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-obs-primary">
                  Pro
                </span>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-obs)] bg-obs-container-high font-manrope text-xs font-bold text-obs-primary">
                AC
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
