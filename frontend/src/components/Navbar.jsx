import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import SettingsModal from './SettingsModal';
import ProfileDropdown from './ProfileDropdown';
import { saveToHistory } from '../pages/HistoryPage';

const NAV_LINKS = [
  { path: '/', label: 'Explorer', icon: 'explore' },
  { path: '/history', label: 'History', icon: 'history' },
  { path: '/calculators', label: 'Calculators', icon: 'calculate' },
];

const Navbar = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const profileBtnRef = useRef(null);

  // Scroll effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await axios.post('/api/analyze/text', { query: query.trim() });
      if (response.data) {
        // Save to history
        saveToHistory({
          query: query.trim(),
          type: 'text',
          compoundName: response.data.metadata?.common_name || response.data.metadata?.iupac_name || query.trim(),
          smiles: response.data.smiles,
          resultData: response.data,
        });

        navigate('/result', { state: { data: response.data } });
        setQuery('');
        setMobileMenuOpen(false);
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Terjadi kesalahan saat mencari senyawa.');
    } finally {
      setLoading(false);
    }
  };

  const isActive = useCallback((path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  }, [location.pathname]);

  return (
    <>
      <nav
        className={`fixed top-0 w-full z-50 h-16 transition-all duration-300 border-b
          ${scrolled
            ? 'bg-surface-base/80 dark:bg-surface-container-lowest/80 backdrop-blur-xl border-border-subtle shadow-[0_1px_12px_rgba(0,0,0,0.06)]'
            : 'bg-surface-base dark:bg-surface-container-lowest border-border-subtle'
          }`}
      >
        <div className="flex items-center gap-stack-lg max-w-max-width mx-auto w-full h-full justify-between px-margin-mobile md:px-margin-desktop">
          {/* Left: Logo + Nav Links */}
          <div className="flex items-center gap-stack-lg">
            <Link to="/" className="text-headline-md font-headline-md text-primary dark:text-on-surface tracking-tight shrink-0">
              Chem Vision AI
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex gap-1 ml-stack-md items-center">
              {NAV_LINKS.map(({ path, label, icon }) => (
                <Link
                  key={path}
                  to={path}
                  className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-label-sm font-label-sm transition-all duration-200
                    ${isActive(path)
                      ? 'text-secondary bg-secondary/8 font-bold'
                      : 'text-on-surface-variant hover:text-secondary hover:bg-surface-muted'
                    }`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{icon}</span>
                  {label}
                  {isActive(path) && (
                    <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-secondary rounded-full" />
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* Right: Search + Actions */}
          <div className="flex items-center gap-2">
            {/* Desktop Search */}
            <form onSubmit={handleSearch} className="relative hidden sm:block">
              <input
                className="bg-surface-muted dark:bg-surface-container border border-border-subtle rounded-xl pl-3 pr-10 py-1.5 text-body-md font-body-md focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all w-48 lg:w-56 disabled:opacity-50 text-on-surface placeholder:text-outline"
                placeholder="Cari senyawa..."
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={loading}
              />
              {loading ? (
                <div className="absolute right-3 top-2.5 w-4 h-4 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
              ) : (
                <button type="submit" disabled={!query.trim()} className="absolute right-2 top-1 text-on-surface-variant hover:text-secondary disabled:opacity-50 flex items-center justify-center p-1">
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>search</span>
                </button>
              )}
            </form>

            {/* Analyze Structure Button */}
            <Link
              to="/"
              className="bg-primary dark:bg-secondary text-on-primary dark:text-on-secondary font-button text-button px-4 py-2 rounded-xl hover:brightness-110 transition-all shadow-sm hidden sm:flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>science</span>
              Analyze
            </Link>

            {/* Profile Button */}
            <div className="relative">
              <button
                ref={profileBtnRef}
                aria-label="Profile"
                onClick={() => { setProfileOpen(!profileOpen); setSettingsOpen(false); }}
                className={`p-2 rounded-lg transition-colors flex items-center justify-center
                  ${profileOpen ? 'text-secondary bg-surface-muted' : 'text-on-surface-variant hover:text-secondary hover:bg-surface-muted'}`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>account_circle</span>
              </button>
              <ProfileDropdown isOpen={profileOpen} onClose={() => setProfileOpen(false)} anchorRef={profileBtnRef} />
            </div>

            {/* Settings Button */}
            <button
              aria-label="Settings"
              onClick={() => { setSettingsOpen(true); setProfileOpen(false); }}
              className="p-2 rounded-lg text-on-surface-variant hover:text-secondary hover:bg-surface-muted transition-colors flex items-center justify-center"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>settings</span>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              aria-label="Menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-on-surface-variant hover:text-secondary hover:bg-surface-muted transition-colors flex items-center justify-center"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
                {mobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden animate-fade-in">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-on-surface/30 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Panel */}
          <div
            className="absolute top-16 left-0 right-0 bg-surface-base dark:bg-surface-container-lowest border-b border-border-subtle shadow-xl max-h-[calc(100vh-4rem)] overflow-y-auto"
            style={{ animation: 'slideDown 0.25s ease-out' }}
          >
            {/* Mobile Search */}
            <div className="p-4 border-b border-border-subtle sm:hidden">
              <form onSubmit={handleSearch} className="relative">
                <input
                  className="w-full bg-surface-muted dark:bg-surface-container border border-border-subtle rounded-xl pl-4 pr-10 py-3 text-body-md font-body-md focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all text-on-surface placeholder:text-outline"
                  placeholder="Cari senyawa kimia..."
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  disabled={loading}
                />
                {loading ? (
                  <div className="absolute right-4 top-3.5 w-5 h-5 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <button type="submit" disabled={!query.trim()} className="absolute right-3 top-2.5 text-on-surface-variant hover:text-secondary disabled:opacity-50 p-1">
                    <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>search</span>
                  </button>
                )}
              </form>
            </div>

            {/* Mobile Nav Links */}
            <div className="flex flex-col p-2">
              {NAV_LINKS.map(({ path, label, icon }) => (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-body-md font-body-md transition-all
                    ${isActive(path)
                      ? 'text-secondary bg-secondary/8 font-bold'
                      : 'text-on-surface hover:text-secondary hover:bg-surface-muted'
                    }`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>{icon}</span>
                  {label}
                  {isActive(path) && (
                    <span className="ml-auto w-2 h-2 bg-secondary rounded-full" />
                  )}
                </Link>
              ))}
            </div>

            {/* Mobile Analyze Button */}
            <div className="p-4 pt-0 sm:hidden">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full bg-primary dark:bg-secondary text-on-primary dark:text-on-secondary font-button text-button py-3 rounded-xl hover:brightness-110 transition-all shadow-sm flex justify-center items-center gap-2"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>science</span>
                Analyze Structure
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
};

export default Navbar;
