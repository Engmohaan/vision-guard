import React, { useState } from 'react'
import { Mail, Phone, MapPin, Send } from 'lucide-react'

export default function Contact() {
  const [sent, setSent] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setSent(true)
  }

  return (
    <section id="contact" className="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-12">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-accent">Contact Us</p>
        <h2 className="text-3xl font-bold text-ink mt-2">Get in Touch</h2>
        <p className="text-muted mt-4 max-w-sm leading-relaxed">
          Have a question about Vision Guard or want to discuss the thesis project?
          Reach out and we'll get back to you as soon as possible.
        </p>

        <div className="mt-8 space-y-4">
          <div className="flex items-center gap-3 text-sm text-ink">
            <Mail size={16} className="text-accent" /> iconicmoment9533@gmail.com
          </div>
          <div className="flex items-center gap-3 text-sm text-ink">
            <Phone size={16} className="text-accent" /> +252 61 706 9812
          </div>
          <div className="flex items-center gap-3 text-sm text-ink">
            <MapPin size={16} className="text-accent" /> Mogadishu, Somalia
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-2xl shadow-soft p-6">
        <h3 className="text-sm font-semibold text-ink mb-4">Send a Message</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted">Full Name</label>
              <input required className="mt-1 w-full bg-app border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent" />
            </div>
            <div>
              <label className="text-xs text-muted">Email Address</label>
              <input required type="email" className="mt-1 w-full bg-app border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted">Subject</label>
            <input required className="mt-1 w-full bg-app border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent" />
          </div>
          <div>
            <label className="text-xs text-muted">Message</label>
            <textarea required rows={4} className="mt-1 w-full bg-app border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent resize-none" />
          </div>
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-accent text-white text-sm font-medium
                       py-2.5 rounded-lg hover:bg-accent-hover transition-colors"
          >
            <Send size={14} />
            {sent ? 'Message Sent' : 'Send Message'}
          </button>
        </form>
      </div>
    </section>
  )
}
