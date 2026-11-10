import React from 'react'
import { NavLink } from 'react-router-dom'
import { ScanFace, Sun, Moon, LayoutGrid, History, BarChart3, UserCircle, Users, LogOut } from 'lucide-react'
import { useTheme } from '../context/ThemeContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'

function NavItem({ to, icon: Icon, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 ${
          isActive ? 'bg-accent text-white shadow-soft' : 'text-ink/80 hover:bg-accent-soft hover:text-accent'
        }`
      }
    >
      <Icon size={17} strokeWidth={2} />
      <span>{label}</span>
    </NavLink>
  )
}

export default function Sidebar() {
  const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()

  return (
    <aside className="w-64 shrink-0 h-full flex flex-col gap-6 p-5 bg-surface border-r border-border">
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center shadow-soft">
            <ScanFace size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink leading-none">Vision Guard</p>
            <p className="text-[11px] text-muted mt-1">Detection Console</p>
          </div>
        </div>

        <button
          onClick={toggleTheme}
          aria-label="Toggle dark/light mode"
          className="w-8 h-8 rounded-lg border border-border flex items-center justify-center
                     text-muted hover:text-accent hover:border-accent/40 transition-colors"
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>

      <nav className="flex flex-col gap-1.5">
        <NavItem to="/app" end icon={LayoutGrid} label="Dashboard" />
        <NavItem to="/app/history" icon={History} label="History" />
        <NavItem to="/app/reports" icon={BarChart3} label="Reports" />
        <NavItem to="/app/profile" icon={UserCircle} label="Profile" />
        {user?.role === 'admin' && <NavItem to="/app/users" icon={Users} label="Manage Users" />}
      </nav>

      <div className="mt-auto pt-4 border-t border-border">
        <div className="flex items-center gap-3 px-1 mb-3">
          <div className="w-8 h-8 rounded-full bg-accent-soft flex items-center justify-center text-accent text-xs font-semibold shrink-0">
            {user?.full_name?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-ink truncate">{user?.full_name || user?.username}</p>
            <p className="text-[10px] text-muted capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl
                     border border-danger/40 text-danger text-xs font-medium hover:bg-danger/10 transition-colors"
        >
          <LogOut size={13} />
          Log Out
        </button>
      </div>
    </aside>
  )
}
