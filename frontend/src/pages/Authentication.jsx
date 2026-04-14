import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
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
  const hasGoogleClient = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID)
  async function onGoogleSuccess(credentialResponse) {
    try {
      setError('')
      const credential = credentialResponse?.credential
      if (!credential) {
        setError('Google login failed: missing credential')
        return
      }
      const { data } = await api.post('/auth/google', { credential })
      localStorage.setItem('token', data.token)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.response?.data?.error ?? err.message ?? 'Google login failed')
    }
  }


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

            {hasGoogleClient ? (
              <div className="flex justify-center rounded-[var(--radius-obs-lg)] border border-[rgba(70,69,84,0.15)] bg-obs-bg/80 p-2">
                <GoogleLogin
                  onSuccess={onGoogleSuccess}
                  onError={() => setError('Google login failed')}
                  shape="pill"
                  size="large"
                  text="continue_with"
                  theme="outline"
                />
              </div>
            ) : (
              <p className="rounded-[var(--radius-obs-lg)] border border-[rgba(70,69,84,0.15)] bg-obs-bg/80 py-3 text-center text-xs text-obs-muted">
                Set <code>VITE_GOOGLE_CLIENT_ID</code> to enable Google sign-in.
              </p>
            )}

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
