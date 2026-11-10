import React from 'react'
import Navbar from '../components/landing/Navbar.jsx'
import Hero from '../components/landing/Hero.jsx'
import Features from '../components/landing/Features.jsx'
import HowItWorks from '../components/landing/HowItWorks.jsx'
import FAQ from '../components/landing/FAQ.jsx'
import Contact from '../components/landing/Contact.jsx'
import Footer from '../components/landing/Footer.jsx'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-app">
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <FAQ />
      <Contact />
      <Footer />
    </div>
  )
}
