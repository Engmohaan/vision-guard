import React from 'react'
import { Upload, Cpu, ScanFace, Tags, BarChart3, FileText } from 'lucide-react'

const STEPS = [
  { n: '01', icon: Upload, title: 'Upload Media', desc: 'Capture or upload images, video, or live webcam from any source.' },
  { n: '02', icon: Cpu, title: 'AI Processing', desc: 'The pipeline analyzes the media in real time on your own hardware.' },
  { n: '03', icon: ScanFace, title: 'Person & Face Detection', desc: 'YOLOv8 locates people; SCRFD locates faces and landmarks within them.' },
  { n: '04', icon: Tags, title: 'Feature Extraction', desc: 'ArcFace converts each detected face into a 512-d identity embedding.' },
  { n: '05', icon: BarChart3, title: 'Confidence Score', desc: 'Each match is scored against your identity database via cosine similarity.' },
  { n: '06', icon: FileText, title: 'Report & Insights', desc: 'Every event is logged, searchable, and summarized in the Reports page.' },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-20">
      <div className="text-center max-w-xl mx-auto mb-14">
        <h2 className="text-3xl font-bold text-ink">Precision Workflow</h2>
        <p className="text-muted mt-3">Our AI-powered system delivers accurate and fast results in every step.</p>
      </div>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex flex-col items-center text-center relative">
            {i < STEPS.length - 1 && (
              <span className="hidden lg:block absolute top-7 left-1/2 w-full h-px border-t border-dashed border-border" />
            )}
            <div className="relative z-10 w-14 h-14 rounded-full bg-accent flex items-center justify-center shadow-soft">
              <s.icon size={22} className="text-white" />
            </div>
            <span className="text-xs font-data text-accent mt-3">{s.n}</span>
            <h3 className="text-sm font-semibold text-ink mt-1">{s.title}</h3>
            <p className="text-xs text-muted mt-1.5 max-w-[11rem]">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
