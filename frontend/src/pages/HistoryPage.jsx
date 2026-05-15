import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const HISTORY_KEY = 'chemvision_history';

export const saveToHistory = (entry) => {
  try {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    const newEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      ...entry,
    };
    history.unshift(newEntry);
    // Keep max 50 items
    if (history.length > 50) history.pop();
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.error('Failed to save history:', e);
  }
};

export const getHistoryCount = () => {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]').length;
  } catch {
    return 0;
  }
};

const HistoryPage = () => {
  const [history, setHistory] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'text', 'image'
  const navigate = useNavigate();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    try {
      const data = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      setHistory(data);
    } catch {
      setHistory([]);
    }
  };

  const deleteItem = (id) => {
    const updated = history.filter((item) => item.id !== id);
    setHistory(updated);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  };

  const clearAll = () => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  };

  const openResult = (item) => {
    if (item.resultData) {
      navigate('/result', { state: { data: item.resultData } });
    }
  };

  const filtered = history.filter((item) => {
    if (filter === 'all') return true;
    return item.type === filter;
  });

  const formatTime = (iso) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'Baru saja';
    if (diffMin < 60) return `${diffMin} menit lalu`;
    if (diffHour < 24) return `${diffHour} jam lalu`;
    if (diffDay < 7) return `${diffDay} hari lalu`;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="flex flex-col gap-stack-xl animate-fade-in w-full">
      {/* Header */}
      <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-stack-md">
        <div className="flex flex-col gap-stack-xs">
          <h1 className="font-headline-xl text-headline-lg-mobile md:text-headline-xl text-on-surface tracking-tight">
            Riwayat Pencarian
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {history.length} pencarian tersimpan
          </p>
        </div>
        {history.length > 0 && (
          <button
            onClick={clearAll}
            className="flex items-center gap-2 bg-error-container text-on-error-container font-button text-button px-4 py-2 rounded-xl hover:brightness-95 transition-all"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete_sweep</span>
            Hapus Semua
          </button>
        )}
      </section>

      {/* Filters */}
      {history.length > 0 && (
        <div className="flex gap-stack-sm">
          {[
            { key: 'all', label: 'Semua', icon: 'list' },
            { key: 'text', label: 'Teks', icon: 'match_word' },
            { key: 'image', label: 'Gambar', icon: 'image_search' },
          ].map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-label-sm font-label-sm transition-all border
                ${filter === key
                  ? 'bg-secondary text-on-secondary border-secondary shadow-sm'
                  : 'bg-surface-base text-on-surface-variant border-border-subtle hover:border-secondary hover:text-secondary'
                }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{icon}</span>
              {label}
            </button>
          ))}
        </div>
      )}

      {/* History List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-stack-md text-center">
          <div className="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center">
            <span className="material-symbols-outlined text-outline" style={{ fontSize: '40px' }}>
              {history.length === 0 ? 'history' : 'filter_list_off'}
            </span>
          </div>
          <h2 className="font-headline-md text-headline-md text-on-surface">
            {history.length === 0 ? 'Belum Ada Riwayat' : 'Tidak Ada Hasil'}
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
            {history.length === 0
              ? 'Riwayat pencarian Anda akan muncul di sini setelah Anda menganalisis senyawa kimia.'
              : 'Tidak ada riwayat yang cocok dengan filter ini.'}
          </p>
          {history.length === 0 && (
            <button
              onClick={() => navigate('/')}
              className="bg-primary text-on-primary font-button text-button px-6 py-3 rounded-xl hover:brightness-110 transition-all shadow-sm flex items-center gap-2 mt-stack-sm"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>search</span>
              Mulai Pencarian
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-surface-base border border-border-subtle rounded-xl p-stack-lg flex flex-col gap-stack-md transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0px_4px_20px_rgba(15,23,42,0.08)] group cursor-pointer"
              onClick={() => openResult(item)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-stack-sm">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0
                    ${item.type === 'image' ? 'bg-surface-container-high text-secondary' : 'bg-surface-container text-primary'}`}>
                    <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
                      {item.type === 'image' ? 'image_search' : 'match_word'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <h3 className="font-headline-md text-body-lg text-on-surface truncate group-hover:text-primary transition-colors">
                      {item.compoundName || item.query || 'Senyawa Tidak Diketahui'}
                    </h3>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      {formatTime(item.timestamp)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
                  className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container transition-colors opacity-0 group-hover:opacity-100"
                  aria-label="Hapus"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                </button>
              </div>

              {item.smiles && (
                <div className="flex items-center gap-2 px-3 py-2 bg-surface-muted rounded-lg border border-border-subtle">
                  <span className="material-symbols-outlined text-outline" style={{ fontSize: '16px' }}>science</span>
                  <code className="font-label-sm text-label-sm text-on-surface-variant truncate">{item.smiles}</code>
                </div>
              )}

              <div className="flex items-center justify-between mt-auto">
                <span className={`px-3 py-1 rounded-full text-label-sm font-label-sm border
                  ${item.type === 'image'
                    ? 'bg-surface-container-highest text-secondary border-secondary-fixed'
                    : 'bg-surface-container text-on-surface border-border-subtle'
                  }`}>
                  {item.type === 'image' ? 'Pengenalan Gambar' : 'Pencarian Teks'}
                </span>
                <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors" style={{ fontSize: '20px' }}>
                  arrow_forward
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
