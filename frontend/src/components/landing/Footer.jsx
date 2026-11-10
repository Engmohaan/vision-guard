import React from 'react'
import { ScanFace } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-accent flex items-center justify-center">
            <ScanFace size={13} className="text-white" />
          </div>
          <span className="text-sm font-medium text-ink">Vision Guard</span>
        </div>
        <p className="text-xs text-muted">© 2026 Vision Guard. Thesis project — all rights reserved.</p>
      </div>
    </footer>
  )
}
