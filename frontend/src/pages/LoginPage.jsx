import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ScanFace, AlertTriangle } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(username, password)
      navigate('/app')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-app flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center mb-3 shadow-soft">
            <ScanFace size={22} className="text-white" />
          </div>
          <h1 className="text-lg font-semibold text-ink">Welcome back</h1>
          <p className="text-xs text-muted mt-1">Sign in to Vision Guard</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-2xl shadow-soft p-6 space-y-4">
          <div>
            <label className="text-xs text-muted">Username</label>
            <input
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full bg-app border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-accent"
              placeholder="admin"
            />
          </div>
          <div>
            <label className="text-xs text-muted">Password</label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full bg-app border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-accent"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-danger text-xs bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
              <AlertTriangle size={13} className="shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-white text-sm font-medium py-2.5 rounded-lg
                       hover:bg-accent-hover transition-colors disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-muted mt-5">
          Don't have an account?{' '}
          <Link to="/register" className="text-accent font-medium hover:underline">Create one</Link>
        </p>
        <p className="text-center text-[11px] text-muted mt-2">
          <Link to="/" className="hover:text-accent">← Back to home</Link>
        </p>
      </div>
    </div>
  )
}
