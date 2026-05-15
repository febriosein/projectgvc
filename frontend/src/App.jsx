import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import ResultPage from './pages/ResultPage'
import HistoryPage from './pages/HistoryPage'
import CalculatorsPage from './pages/CalculatorsPage'
import Navbar from './components/Navbar'
import Footer from './components/Footer'

function App() {
  return (
    <BrowserRouter>
      <div className="bg-surface-bright dark:bg-on-surface text-on-surface dark:text-surface-bright min-h-screen flex flex-col font-body-md text-body-md selection:bg-secondary/20 selection:text-secondary">
        <Navbar />
        
        <main className="flex-grow w-full max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop pt-32 pb-stack-xl flex flex-col gap-stack-xl">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/result" element={<ResultPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/calculators" element={<CalculatorsPage />} />
          </Routes>
        </main>
        
        <Footer />
      </div>
    </BrowserRouter>
  )
}

export default App
