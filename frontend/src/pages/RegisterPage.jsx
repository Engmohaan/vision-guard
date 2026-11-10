import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ScanFace, AlertTriangle } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', username: '', email: '', password: '' })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await register(form)
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
          <h1 className="text-lg font-semibold text-ink">Create your account</h1>
          <p className="text-xs text-muted mt-1">Join Vision Guard</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-2xl shadow-soft p-6 space-y-4">
          <div>
            <label className="text-xs text-muted">Full Name</label>
            <input required value={form.fullName} onChange={update('fullName')}
              className="mt-1 w-full bg-app border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-accent" />
          </div>
          <div>
            <label className="text-xs text-muted">Username</label>
            <input required value={form.username} onChange={update('username')}
              className="mt-1 w-full bg-app border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-accent" />
          </div>
          <div>
            <label className="text-xs text-muted">Email Address</label>
            <input required type="email" value={form.email} onChange={update('email')}
              className="mt-1 w-full bg-app border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-accent" />
          </div>
          <div>
            <label className="text-xs text-muted">Password</label>
            <input required type="password" minLength={6} value={form.password} onChange={update('password')}
              className="mt-1 w-full bg-app border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-accent" />
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
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-xs text-muted mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-accent font-medium hover:underline">Sign in</Link>
        </p>
        <p className="text-center text-[11px] text-muted mt-2">
          <Link to="/" className="hover:text-accent">← Back to home</Link>
        </p>
      </div>
    </div>
  )
}
