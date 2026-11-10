import React from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'

const CHECKS = ['YOLOv8-Powered', 'ArcFace Accuracy', 'Real-Time Insights']

/**
 * Illustrated crowd scene used as the "Analysis Result" mockup - abstract
 * silhouettes (no real photos/faces), styled to echo the corner-bracket
 * visualization language the backend actually draws on detections.
 */
function ScenePreview() {
  return (
    <svg viewBox="0 0 400 220" className="w-full h-full" preserveAspectRatio="xMidYMax slice">
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--c-accent-soft))" stopOpacity="0.6" />
          <stop offset="100%" stopColor="rgb(var(--c-app))" stopOpacity="1" />
        </linearGradient>
      </defs>
      <rect width="400" height="220" fill="url(#skyGrad)" />
      {/* ground line */}
      <line x1="0" y1="190" x2="400" y2="190" stroke="rgb(var(--c-border))" strokeWidth="2" />

      {/* background silhouettes (unlabeled, small, far) */}
      {[ {x: 40, s: 0.55}, {x: 330, s: 0.5}, {x: 300, s: 0.6} ].map((p, i) => (
        <g key={i} transform={`translate(${p.x} 150) scale(${p.s})`} opacity="0.35">
          <circle cx="0" cy="-38" r="12" fill="rgb(var(--c-muted))" />
          <path d="M -14 -4 Q 0 -18 14 -4 L 16 40 L -16 40 Z" fill="rgb(var(--c-muted))" />
        </g>
      ))}

      {/* foreground silhouette 1 - verified */}
      <g transform="translate(120 145)">
        <circle cx="0" cy="-46" r="16" fill="rgb(var(--c-ink))" opacity="0.55" />
        <path d="M -19 -6 Q 0 -24 19 -6 L 21 55 L -21 55 Z" fill="rgb(var(--c-ink))" opacity="0.55" />
      </g>

      {/* foreground silhouette 2 - unrecognized */}
      <g transform="translate(230 150)">
        <circle cx="0" cy="-42" r="15" fill="rgb(var(--c-ink))" opacity="0.4" />
        <path d="M -18 -5 Q 0 -22 18 -5 L 20 50 L -20 50 Z" fill="rgb(var(--c-ink))" opacity="0.4" />
      </g>

      {/* scanning sweep line */}
      <rect x="0" y="0" width="400" height="3" fill="rgb(var(--c-accent))" opacity="0.5">
        <animate attributeName="y" values="10;200;10" dur="3.5s" repeatCount="indefinite" />
      </rect>
    </svg>
  )
}

export default function Hero() {
  return (
    <section id="home" className="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-12 items-center">
      <div>
        <span className="inline-block text-[11px] font-medium tracking-wide uppercase text-accent bg-accent-soft px-3 py-1 rounded-full">
          Vision Guard v1.0
        </span>
        <h1 className="text-4xl md:text-5xl font-bold mt-5 leading-tight">
          <span className="text-ink">Smart Person &amp; Face Recognition</span>{' '}
          <span className="text-accent">Using Advanced Computer Vision</span>
        </h1>
        <p className="text-muted mt-5 text-base leading-relaxed max-w-md">
          Detect people and verify identities in real time from image, video, or live
          webcam feeds — built on a trained YOLOv8 detection model and an ArcFace
          recognition pipeline.
        </p>

        <div className="mt-8 flex items-center gap-4">
          <Link
            to="/register"
            className="px-6 py-3 rounded-xl bg-accent text-white font-medium hover:bg-accent-hover
                       transition-colors shadow-soft"
          >
            Start Detection
          </Link>
          <a href="#how-it-works" className="text-sm text-ink/70 hover:text-accent transition-colors">
            See how it works →
          </a>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-8">
          {CHECKS.map((c) => (
            <div key={c} className="flex items-center gap-2 text-sm text-ink/80">
              <CheckCircle2 size={16} className="text-accent" />
              {c}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface border border-border rounded-2xl shadow-soft p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-muted uppercase tracking-wide">Analysis Result</p>
          <span className="flex items-center gap-1.5 text-[11px] text-success">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulseline" /> Live
          </span>
        </div>
        <div className="aspect-video rounded-xl bg-app border border-border relative overflow-hidden">
          <div className="absolute inset-0">
            <ScenePreview />
          </div>

          {/* Verified corner-bracket box (matches backend overlay style) */}
          <div className="absolute" style={{ left: '24%', top: '22%', width: '17%', height: '52%' }}>
            <div className="relative w-full h-full">
              <span className="absolute -top-0.5 -left-0.5 w-3 h-3 border-t-2 border-l-2 border-accent" />
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 border-t-2 border-r-2 border-accent" />
              <span className="absolute -bottom-0.5 -left-0.5 w-3 h-3 border-b-2 border-l-2 border-accent" />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 border-b-2 border-r-2 border-accent" />
              <span className="absolute -top-6 left-0 bg-accent text-white text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap shadow-soft">
                Verified: 0.93
              </span>
            </div>
          </div>

          {/* Unrecognized corner-bracket box */}
          <div className="absolute" style={{ left: '55%', top: '26%', width: '15%', height: '48%' }}>
            <div className="relative w-full h-full">
              <span className="absolute -top-0.5 -left-0.5 w-3 h-3 border-t-2 border-l-2 border-muted" />
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 border-t-2 border-r-2 border-muted" />
              <span className="absolute -bottom-0.5 -left-0.5 w-3 h-3 border-b-2 border-l-2 border-muted" />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 border-b-2 border-r-2 border-muted" />
              <span className="absolute -top-6 left-0 bg-surface border border-border text-ink text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap">
                Unrecognized
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
