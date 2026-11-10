import React, { useState, useEffect } from 'react'
import { Users, ShieldCheck } from 'lucide-react'
import { fetchAllUsers, updateUserRole } from '../api.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [error, setError] = useState(null)

  const load = () => {
    fetchAllUsers().then((data) => setUsers(data.users)).catch((e) => setError(e.message))
  }

  useEffect(() => { load() }, [])

  const handleRoleChange = async (userId, role) => {
    try {
      await updateUserRole(userId, role)
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 flex flex-col gap-5">
      <div>
        <h1 className="text-lg font-semibold text-ink flex items-center gap-2">
          <Users size={20} className="text-accent" />
          Manage Users
        </h1>
        <p className="text-xs text-muted mt-1">Assign admin or standard user roles across the platform.</p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="rounded-2xl border border-border bg-surface shadow-soft overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-raised text-muted text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left font-medium px-4 py-2.5">Name</th>
              <th className="text-left font-medium px-4 py-2.5">Username</th>
              <th className="text-left font-medium px-4 py-2.5">Email</th>
              <th className="text-left font-medium px-4 py-2.5">Role</th>
              <th className="text-left font-medium px-4 py-2.5">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="px-4 py-2.5 text-ink font-medium">{u.full_name}</td>
                <td className="px-4 py-2.5 text-ink">@{u.username}</td>
                <td className="px-4 py-2.5 text-muted">{u.email}</td>
                <td className="px-4 py-2.5">
                  <select
                    value={u.role}
                    disabled={u.id === currentUser?.id}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    className="bg-app border border-border rounded-lg px-2 py-1 text-xs text-ink outline-none disabled:opacity-50"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-4 py-2.5 text-muted text-xs font-data">{u.created_at?.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted">
        <ShieldCheck size={13} className="text-accent" />
        You cannot change your own role from this screen.
      </div>
    </div>
  )
}
