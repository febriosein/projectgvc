import React, { useEffect, useRef } from 'react';

const SettingsModal = ({ isOpen, onClose }) => {
  const modalRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Close on click outside
  const handleBackdropClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };

  const isDark = document.documentElement.classList.contains('dark');

  const toggleDarkMode = () => {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
      html.classList.remove('dark');
      localStorage.setItem('chemvision_theme', 'light');
    } else {
      html.classList.add('dark');
      localStorage.setItem('chemvision_theme', 'dark');
    }
    // Force re-render by triggering state update in parent via close/reopen or just re-render this
    onClose();
  };

  const clearHistory = () => {
    if (window.confirm('Apakah Anda yakin ingin menghapus semua riwayat pencarian?')) {
      localStorage.removeItem('chemvision_history');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-fade-in"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="bg-surface-base dark:bg-surface-container-lowest border border-border-subtle rounded-xl shadow-xl w-full max-w-md flex flex-col overflow-hidden"
        style={{ animation: 'slideUp 0.3s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-secondary" style={{ fontSize: '24px' }}>settings</span>
            <h2 className="font-headline-md text-headline-md text-on-surface">Pengaturan</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-muted transition-colors"
            aria-label="Tutup"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-stack-sm p-6">
          {/* Theme Toggle */}
          <div className="flex items-center justify-between p-4 bg-surface-muted dark:bg-surface-container rounded-xl">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '22px' }}>
                {isDark ? 'dark_mode' : 'light_mode'}
              </span>
              <div>
                <p className="font-body-md text-body-md text-on-surface">Tema Gelap</p>
                <p className="font-label-sm text-label-sm text-on-surface-variant">
                  {isDark ? 'Mode gelap aktif' : 'Mode terang aktif'}
                </p>
              </div>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${isDark ? 'bg-secondary' : 'bg-outline-variant'}`}
              aria-label="Toggle dark mode"
            >
              <div
                className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${isDark ? 'translate-x-[22px]' : 'translate-x-0.5'}`}
              />
            </button>
          </div>

          {/* Clear History */}
          <button
            onClick={clearHistory}
            className="flex items-center gap-3 p-4 bg-surface-muted dark:bg-surface-container rounded-xl hover:bg-error-container hover:text-on-error-container transition-colors text-left group"
          >
            <span className="material-symbols-outlined text-on-surface-variant group-hover:text-on-error-container" style={{ fontSize: '22px' }}>
              delete_sweep
            </span>
            <div>
              <p className="font-body-md text-body-md text-on-surface group-hover:text-on-error-container">Hapus Riwayat</p>
              <p className="font-label-sm text-label-sm text-on-surface-variant group-hover:text-on-error-container/80">
                Hapus semua riwayat pencarian tersimpan
              </p>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border-subtle text-center">
          <p className="font-label-sm text-label-sm text-on-surface-variant">
            Chem Vision AI v1.0.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
