import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="w-full py-8 md:py-10 px-6 md:px-12 bg-surface-base dark:bg-surface-container-lowest border-t border-border-subtle mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center md:items-start gap-8">
        
        {/* Brand Section */}
        <div className="flex flex-col items-center md:items-start gap-2">
          <div className="flex items-center gap-2 text-primary dark:text-on-surface">
            <span className="material-symbols-outlined text-secondary" style={{ fontSize: '24px' }}>science</span>
            <span className="text-lg font-headline-md font-bold tracking-tight">Chem Vision AI</span>
          </div>
          <p className="text-xs text-on-surface-variant text-center md:text-left">
            Platform analisis struktur kimia berbasis AI terdepan.
          </p>
        </div>

        {/* Links */}
        <div className="flex flex-wrap justify-center gap-6">
          <Link to="/" className="text-sm font-medium text-on-surface-variant hover:text-secondary transition-colors">Explorer</Link>
          <Link to="/chat" className="text-sm font-medium text-on-surface-variant hover:text-secondary transition-colors">Chat AI</Link>
          <Link to="/calculators" className="text-sm font-medium text-on-surface-variant hover:text-secondary transition-colors">Kalkulator</Link>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-border-subtle flex flex-col-reverse md:flex-row justify-between items-center gap-4">
        <p className="text-xs text-on-surface-variant text-center md:text-left">
          © {new Date().getFullYear()} Chem Vision AI. Seluruh hak cipta dilindungi.
        </p>
        <div className="flex gap-4">
          <a href="#" className="text-on-surface-variant hover:text-secondary transition-colors" title="Github">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>code</span>
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
