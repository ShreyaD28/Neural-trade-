import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'

const outline = 'border-[rgba(70,69,84,0.15)]'

export default function Authentication() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (tab === 'signup') {
        await api.post('/auth/register', { email, password, name: '' })
      }
      const { data } = await api.post('/auth/login', { email, password })
      localStorage.setItem('token', data.token)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(
        err.response?.data?.error ?? err.message ?? 'Authentication failed'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-obs-bg">
      <div
        className="absolute inset-0 bg-gradient-radial from-[#1d2023] to-[#111417]"
        style={{
          background:
            'radial-gradient(ellipse 80% 70% at 50% 20%, #1d2023 0%, #111417 65%)',
        }}
      />
      <div className="dot-grid-auth pointer-events-none absolute inset-0 opacity-60" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1400px] flex-col items-center justify-center px-4 py-12 lg:flex-row lg:items-stretch lg:justify-between lg:gap-8 lg:px-10">
        <div className="mb-8 hidden w-full max-w-[220px] flex-col gap-4 xl:flex">
          <div
            className={`rounded-[var(--radius-obs-xl)] border ${outline} bg-obs-surface/70 p-4 shadow-xl backdrop-blur-xl`}
          >
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-obs-muted">
              System status
            </p>
            <p className="mt-2 font-manrope text-2xl font-bold text-obs-green">
              99.9%
            </p>
            <p className="text-xs text-obs-muted">Model accuracy (backtest)</p>
          </div>
        </div>

        <div className="w-full max-w-md">
          <div
            className={`rounded-[var(--radius-obs-full)] border ${outline} bg-obs-surface/75 p-8 shadow-2xl shadow-black/40 backdrop-blur-xl`}
          >
            <div className="mb-8 flex flex-col items-center text-center">
              <div className="mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-3xl text-obs-primary">
                  neurology
                </span>
                <h1 className="font-manrope text-2xl font-extrabold tracking-tight text-obs-text">
                  NeuralTrade
                </h1>
              </div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-obs-primary">
                AI High-Intelligence Trading
              </p>
            </div>

            <div
              className={`mb-6 flex rounded-[var(--radius-obs-lg)] bg-obs-bg p-1 ${outline} border`}
            >
              <button
                type="button"
                onClick={() => setTab('login')}
                className={`flex-1 rounded-[var(--radius-obs)] py-2 font-manrope text-sm font-semibold transition ${
                  tab === 'login'
                    ? 'bg-obs-container-high text-obs-text'
                    : 'text-obs-muted hover:text-obs-text'
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setTab('signup')}
                className={`flex-1 rounded-[var(--radius-obs)] py-2 font-manrope text-sm font-semibold transition ${
                  tab === 'signup'
                    ? 'bg-obs-container-high text-obs-text'
                    : 'text-obs-muted hover:text-obs-text'
                }`}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-obs-muted">
                  Email
                </span>
                <div className="relative">
                  <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-obs-muted text-[20px]">
                    mail
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className={`w-full rounded-[var(--radius-obs-lg)] border ${outline} bg-obs-bg/90 py-3 pl-11 pr-3 font-inter text-sm text-obs-text placeholder:text-obs-muted focus:border-obs-primary/50 focus:outline-none focus:ring-1 focus:ring-obs-primary/40`}
                    placeholder="you@institution.com"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-obs-muted">
                  Password
                </span>
                <div className="relative">
                  <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-obs-muted text-[20px]">
                    lock
                  </span>
                  <input
                    type={showPw ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className={`w-full rounded-[var(--radius-obs-lg)] border ${outline} bg-obs-bg/90 py-3 pl-11 pr-12 font-inter text-sm text-obs-text placeholder:text-obs-muted focus:border-obs-primary/50 focus:outline-none focus:ring-1 focus:ring-obs-primary/40`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[var(--radius-obs)] p-1 text-obs-muted hover:bg-obs-container hover:text-obs-text"
                    aria-label="Toggle password"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPw ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </label>

              {error ? (
                <p className="text-sm text-obs-coral" role="alert">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-[var(--radius-obs-lg)] bg-gradient-to-r from-obs-primary to-[#8b8fd1] py-3.5 font-manrope text-sm font-bold text-[#111417] shadow-lg shadow-obs-primary/25 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading
                  ? 'Please wait…'
                  : tab === 'signup'
                    ? 'Create account'
                    : 'Sign In'}
              </button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className={`h-px flex-1 ${outline} bg-[rgba(70,69,84,0.2)]`} />
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-obs-muted">
                Or continue with
              </span>
              <div className={`h-px flex-1 ${outline} bg-[rgba(70,69,84,0.2)]`} />
            </div>

            <button
              type="button"
              onClick={(e) => e.preventDefault()}
              className={`flex w-full items-center justify-center gap-2 rounded-[var(--radius-obs-lg)] border ${outline} bg-obs-bg/80 py-3 font-inter text-sm font-medium text-obs-text backdrop-blur-sm hover:bg-obs-container`}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google OAuth
            </button>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-[10px] text-obs-muted">
              <span>Terms · Privacy</span>
              <span
                className={`rounded-[var(--radius-obs)] border ${outline} px-2 py-0.5`}
              >
                AES-256
              </span>
              <span
                className={`rounded-[var(--radius-obs)] border ${outline} px-2 py-0.5`}
              >
                2FA Ready
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 hidden w-full max-w-[240px] xl:mt-0 xl:flex xl:flex-col xl:justify-center">
          <div
            className={`rounded-[var(--radius-obs-xl)] border ${outline} bg-obs-surface/70 p-4 shadow-xl backdrop-blur-xl`}
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="obs-pulse-green h-2 w-2 rounded-full bg-obs-green" />
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-obs-green">
                Market Alpha
              </p>
            </div>
            <p className="text-sm italic leading-relaxed text-obs-muted">
              Neural routing detected elevated institutional flow into
              defensives. Hedge beta before NY open.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
