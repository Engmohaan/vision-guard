import React, { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const FAQS = [
  {
    q: 'How accurate is the face recognition?',
    a: 'The system uses ArcFace embeddings compared via cosine similarity. With a threshold of 0.75, verified matches are highly reliable; you can raise or lower the threshold to trade off precision and recall for your dataset.',
  },
  {
    q: 'Does it support real-time webcam streams?',
    a: 'Yes. The backend opens your local webcam and streams an annotated MJPEG feed to the dashboard, running detection and recognition on every frame.',
  },
  {
    q: 'How is the identity database managed?',
    a: 'Identities are stored as precomputed embeddings (NumPy arrays) alongside reference photos. Admin users can review recognition history and manage accounts from the admin panel.',
  },
]

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0)

  return (
    <section id="faq" className="max-w-3xl mx-auto px-6 py-20">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-ink">Frequently Asked Questions</h2>
      </div>

      <div className="flex flex-col gap-3">
        {FAQS.map((item, i) => {
          const isOpen = openIndex === i
          return (
            <div key={item.q} className="bg-surface border border-border rounded-2xl shadow-soft overflow-hidden">
              <button
                onClick={() => setOpenIndex(isOpen ? -1 : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
              >
                <span className="text-sm font-medium text-ink">{item.q}</span>
                <ChevronDown
                  size={16}
                  className={`text-muted transition-transform duration-200 shrink-0 ml-4 ${isOpen ? 'rotate-180 text-accent' : ''}`}
                />
              </button>
              <div
                className="grid transition-all duration-200 ease-in-out"
                style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
              >
                <div className="overflow-hidden">
                  <p className="px-5 pb-4 text-sm text-muted leading-relaxed">{item.a}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
