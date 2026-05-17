import React, { useState, useMemo } from 'react';

/**
 * ChatContextSelector — Lets users pick a molecule from search history
 * to use as context in the AI chat conversation.
 */

const HISTORY_KEY = 'chemvision_history';

function getHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

const ChatContextSelector = ({ selectedContext, onSelect, onClear }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const history = useMemo(() => getHistory(), [isOpen]);

  const filtered = useMemo(() => {
    if (!search.trim()) return history;
    const q = search.toLowerCase();
    return history.filter(item =>
      (item.compoundName || '').toLowerCase().includes(q) ||
      (item.smiles || '').toLowerCase().includes(q) ||
      (item.query || '').toLowerCase().includes(q)
    );
  }, [history, search]);

  const handleSelect = (item) => {
    // Extract chemical context from history item
    const context = {
      name: item.compoundName || item.query,
      smiles: item.smiles,
      iupac_name: item.resultData?.metadata?.iupac_name,
      formula: item.resultData?.metadata?.molecular_formula,
      molecular_weight: item.resultData?.metadata?.molecular_weight,
      properties: item.resultData?.metadata?.properties,
    };
    onSelect(context);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className="relative">
      {/* Selected context display / trigger */}
      {selectedContext ? (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-secondary/8 border border-secondary/20">
          <span className="material-symbols-outlined text-secondary" style={{ fontSize: '18px' }}>science</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-secondary truncate">{selectedContext.name}</p>
            <p className="text-[10px] text-on-surface-variant truncate font-mono">{selectedContext.formula || selectedContext.smiles}</p>
          </div>
          <button
            onClick={onClear}
            className="p-1 rounded-lg hover:bg-surface-muted transition-colors shrink-0"
            title="Hapus konteks"
          >
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '16px' }}>close</span>
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center gap-2 p-2.5 rounded-xl border border-dashed border-border-subtle hover:border-secondary/40 transition-all text-left group"
        >
          <span className="material-symbols-outlined text-on-surface-variant group-hover:text-secondary transition-colors" style={{ fontSize: '18px' }}>
            add_circle
          </span>
          <span className="text-xs text-on-surface-variant group-hover:text-secondary transition-colors">
            Tambah konteks molekul
          </span>
        </button>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-surface-base dark:bg-surface-container-lowest border border-border-subtle rounded-xl shadow-xl overflow-hidden"
             style={{ animation: 'slideDown 0.2s ease-out' }}>
          {/* Search */}
          <div className="p-2 border-b border-border-subtle">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-2 text-on-surface-variant" style={{ fontSize: '16px' }}>search</span>
              <input
                type="text"
                placeholder="Cari molekul..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs bg-surface-muted dark:bg-surface-container rounded-lg border border-border-subtle focus:border-secondary focus:outline-none text-on-surface placeholder:text-outline"
                autoFocus
              />
            </div>
          </div>

          {/* List */}
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-4 text-center text-xs text-on-surface-variant">
                {history.length === 0 ? 'Belum ada riwayat pencarian' : 'Tidak ditemukan'}
              </div>
            ) : (
              filtered.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelect(item)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-surface-muted dark:hover:bg-surface-container transition-all text-left border-b border-border-subtle last:border-0"
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-secondary" style={{ fontSize: '14px' }}>
                      {item.type === 'image' ? 'image' : 'science'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-on-surface truncate">{item.compoundName || item.query}</p>
                    <p className="text-[10px] text-on-surface-variant truncate font-mono">{item.smiles || ''}</p>
                  </div>
                  <span className="text-[10px] text-on-surface-variant shrink-0">
                    {item.type === 'image' ? '📷' : '🔍'}
                  </span>
                </button>
              ))
            )}
          </div>

          {/* Close button */}
          <div className="p-2 border-t border-border-subtle">
            <button
              onClick={() => { setIsOpen(false); setSearch(''); }}
              className="w-full text-xs text-on-surface-variant hover:text-on-surface py-1.5 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatContextSelector;
