import React from 'react'
import { Radar, Users, Gauge, Network } from 'lucide-react'

const FEATURES = [
  { icon: Radar, title: 'Real-Time Detection', desc: 'Detect people in real time using a custom-trained YOLOv8 model with high accuracy and minimal latency.' },
  { icon: Users, title: 'Multi-Identity Verification', desc: 'Recognize multiple faces in a single frame and match each one against your identity database.' },
  { icon: Gauge, title: 'Confidence Scoring', desc: 'Every match ships with a cosine-similarity confidence score so you can tune your own threshold.' },
  { icon: Network, title: 'Scalable REST API', desc: 'A clean FastAPI backend exposes image, video, and live-stream endpoints ready to integrate.' },
]

export default function Features() {
  return (
    <section id="features" className="max-w-6xl mx-auto px-6 py-20">
      <div className="text-center max-w-xl mx-auto mb-12">
        <h2 className="text-3xl font-bold text-ink">Powerful Detection Features</h2>
        <p className="text-muted mt-3">
          A complete computer vision pipeline for person detection and face recognition.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="bg-surface border border-border rounded-2xl p-6 shadow-soft
                       hover:-translate-y-1 transition-transform duration-200"
          >
            <div className="w-10 h-10 rounded-xl bg-accent-soft flex items-center justify-center mb-4">
              <f.icon size={19} className="text-accent" />
            </div>
            <h3 className="font-semibold text-ink text-sm mb-1.5">{f.title}</h3>
            <p className="text-xs text-muted leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
