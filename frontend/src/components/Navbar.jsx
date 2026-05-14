import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const Navbar = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const response = await axios.post('/api/analyze/text', { query: query.trim() });
      if (response.data) {
        navigate('/result', { state: { data: response.data } });
        setQuery('');
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Terjadi kesalahan saat mencari senyawa.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <nav className="fixed top-0 w-full z-50 flex justify-between items-center h-16 px-margin-mobile md:px-margin-desktop bg-surface-base border-b border-border-subtle shadow-sm">
      <div className="flex items-center gap-stack-lg max-w-max-width mx-auto w-full justify-between">
        <div className="flex items-center gap-stack-lg">
          <Link to="/" className="text-headline-md font-headline-md text-primary tracking-tight">
            Chem Vision AI
          </Link>
          <div className="hidden md:flex gap-stack-md ml-stack-xl items-center">
            <a className="text-secondary font-bold border-b-2 border-secondary pb-1 text-label-sm font-label-sm px-2 transition-all duration-300 h-full flex items-center mt-1" href="#">Explorer</a>
            <a className="text-on-surface-variant hover:text-secondary transition-colors text-label-sm font-label-sm px-2 py-1" href="#">History</a>
            <a className="text-on-surface-variant hover:text-secondary transition-colors text-label-sm font-label-sm px-2 py-1" href="#">Calculators</a>
            <a className="text-on-surface-variant hover:text-secondary transition-colors text-label-sm font-label-sm px-2 py-1" href="#">API</a>
          </div>
        </div>

        <div className="flex items-center gap-stack-md">
          <form onSubmit={handleSearch} className="relative hidden sm:block">
            <input 
              className="bg-surface-muted border border-border-subtle rounded-xl pl-3 pr-10 py-1 text-body-md font-body-md focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all w-48 disabled:opacity-50" 
              placeholder="Search..." 
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading}
            />
            {loading ? (
              <div className="absolute right-3 top-2.5 w-4 h-4 border-2 border-secondary border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <button type="submit" disabled={!query.trim()} className="absolute right-2 top-1 text-on-surface-variant hover:text-secondary disabled:opacity-50 flex items-center justify-center p-1">
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>search</span>
              </button>
            )}
          </form>

          <button className="bg-primary text-on-primary font-button text-button px-4 py-2 rounded-xl hover:bg-on-surface-variant transition-all shadow-sm hidden sm:block">
            Analyze Structure
          </button>
          
          <button aria-label="account_circle" className="text-on-surface-variant hover:text-secondary transition-colors flex items-center justify-center p-1">
            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>account_circle</span>
          </button>
          
          <button aria-label="settings" className="text-on-surface-variant hover:text-secondary transition-colors flex items-center justify-center p-1">
            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>settings</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
