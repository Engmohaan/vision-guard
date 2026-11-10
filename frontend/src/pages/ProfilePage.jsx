import React, { useState } from 'react'
import { UserCircle, KeyRound, CheckCircle2, AlertTriangle } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { updateProfile, changePassword } from '../api.js'

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [profileMsg, setProfileMsg] = useState(null)
  const [profileError, setProfileError] = useState(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passMsg, setPassMsg] = useState(null)
  const [passError, setPassError] = useState(null)

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setProfileError(null)
    setProfileMsg(null)
    try {
      await updateProfile({ fullName, email })
      await refreshUser()
      setProfileMsg('Profile-ka waa la cusboonaysiiyay.')
    } catch (e) {
      setProfileError(e.message)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setPassError(null)
    setPassMsg(null)
    try {
      await changePassword({ currentPassword, newPassword })
      setPassMsg('Password-ka waa la beddelay.')
      setCurrentPassword('')
      setNewPassword('')
    } catch (e) {
      setPassError(e.message)
    }
  }

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 flex flex-col gap-5 max-w-2xl">
      <div>
        <h1 className="text-lg font-semibold text-ink flex items-center gap-2">
          <UserCircle size={20} className="text-accent" />
          Profile
        </h1>
        <p className="text-xs text-muted mt-1">Manage your account information and password.</p>
      </div>

      <div className="bg-surface border border-border rounded-2xl shadow-soft p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-accent-soft flex items-center justify-center text-accent text-xl font-semibold">
            {user?.full_name?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">{user?.full_name}</p>
            <p className="text-xs text-muted">@{user?.username} · <span className="capitalize">{user?.role}</span></p>
          </div>
        </div>

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-muted">Full Name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full bg-app border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-accent" />
          </div>
          <div>
            <label className="text-xs text-muted">Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full bg-app border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-accent" />
          </div>

          {profileMsg && <p className="flex items-center gap-2 text-success text-xs"><CheckCircle2 size={13} /> {profileMsg}</p>}
          {profileError && <p className="flex items-center gap-2 text-danger text-xs"><AlertTriangle size={13} /> {profileError}</p>}

          <button type="submit" className="bg-accent text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-accent-hover transition-colors">
            Save Changes
          </button>
        </form>
      </div>

      <div className="bg-surface border border-border rounded-2xl shadow-soft p-6">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound size={15} className="text-accent" />
          <p className="text-sm font-semibold text-ink">Change Password</p>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-muted">Current Password</label>
            <input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-1 w-full bg-app border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-accent" />
          </div>
          <div>
            <label className="text-xs text-muted">New Password</label>
            <input type="password" required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 w-full bg-app border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-accent" />
          </div>

          {passMsg && <p className="flex items-center gap-2 text-success text-xs"><CheckCircle2 size={13} /> {passMsg}</p>}
          {passError && <p className="flex items-center gap-2 text-danger text-xs"><AlertTriangle size={13} /> {passError}</p>}

          <button type="submit" className="bg-accent text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-accent-hover transition-colors">
            Update Password
          </button>
        </form>
      </div>
    </div>
  )
}
