import React from 'react'
import Header from './components/Header'
import Hero from './components/Hero'
import Features from './components/Features'
import HowWorks from './components/HowWorks'
import DriverBenefit from './components/DriverBenefit'
import Stats from './components/Stats'
import Testimonials from './components/Testimonials'
import Download from './components/Download'
import FAQ from './components/FAQ'
import CTA from './components/CTA'
import Footer from './components/Footer'

export default function App() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <Hero />
      <Features />
      <HowWorks />
      <DriverBenefit />
      <Stats />
      <Testimonials />
      <Download />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  )
}
