import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import PrivacySection from './components/PrivacySection';
import FAQ from './components/FAQ';
import Download from './components/Download';
import Footer from './components/Footer';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import StarField from './components/StarField';

function getPage() {
  const hash = window.location.hash;
  if (hash === '#/privacy') return 'privacy';
  if (hash === '#/terms') return 'terms';
  return 'home';
}

export default function App() {
  const [page, setPage] = useState(getPage);

  useEffect(() => {
    const onHashChange = () => {
      setPage(getPage());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (page === 'privacy') {
    return (
      <div className="app">
        <StarField />
        <Navbar legal />
        <PrivacyPolicy />
        <Footer />
      </div>
    );
  }

  if (page === 'terms') {
    return (
      <div className="app">
        <StarField />
        <Navbar legal />
        <TermsOfService />
        <Footer />
      </div>
    );
  }

  return (
    <div className="app">
      <StarField />
      <Navbar />
      <Hero />
      <Features />
      <PrivacySection />
      <FAQ />
      <Download />
      <Footer />
    </div>
  );
}
