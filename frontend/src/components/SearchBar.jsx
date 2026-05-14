import React, { useState } from 'react';

const SearchBar = ({ onSearch }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <div className="bg-surface-base border border-border-subtle rounded-xl p-stack-lg flex flex-col gap-stack-lg transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0px_4px_20px_rgba(15,23,42,0.08)]">
      <div className="flex items-center gap-stack-sm border-b border-border-subtle pb-stack-sm">
        <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-secondary">
          <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>match_word</span>
        </div>
        <h2 className="font-headline-md text-headline-md text-on-surface">Pencarian Teks</h2>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-stack-md flex-grow justify-center">
        <div className="flex flex-col gap-stack-xs">
          <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider" htmlFor="chemical-input">
            IUPAC Name / Molecular Formula / SMILES String
          </label>
          <input
            className="w-full bg-surface-muted border border-border-subtle rounded-lg px-4 py-3 font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all"
            id="chemical-input"
            placeholder="e.g. Benzena, 2,3-Dimethylbutane, NaCl, C6H12O6, Asam asetat"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <p className="font-label-sm text-label-sm text-on-surface-variant">
          Masukkan pengidentifikasi kimia yang valid untuk menghasilkan model 2D/3D dan mengambil sifat fisikokimia.
        </p>

        <div className="mt-auto pt-stack-sm">
          <button
            type="submit"
            disabled={!query.trim()}
            className="w-full bg-primary text-on-primary font-button text-button py-3 rounded-lg hover:brightness-110 transition-all shadow-sm flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>search</span>
            Analisis Teks
          </button>
        </div>
      </form>
    </div>
  );
};

export default SearchBar;
