import React from 'react'
import { Link } from 'react-router-dom'
import { ScanFace, Sun, Moon } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext.jsx'

const NAV_LINKS = [
  { label: 'Home', href: '#home' },
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Contact', href: '#contact' },
]

export default function Navbar() {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-sm border-b border-border">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="#home" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <ScanFace size={17} className="text-white" />
          </div>
          <span className="font-semibold text-ink">Vision Guard</span>
        </a>

        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="text-sm text-ink/70 hover:text-accent transition-colors">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            aria-label="Toggle dark/light mode"
            className="w-9 h-9 rounded-lg border border-border flex items-center justify-center
                       text-muted hover:text-accent hover:border-accent/40 transition-colors"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <Link
            to="/login"
            className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium
                       hover:bg-accent-hover transition-colors shadow-soft"
          >
            Login / Sign Up
          </Link>
        </div>
      </div>
    </header>
  )
}
