import React, { useEffect, useRef } from 'react';
import { getHistoryCount } from '../pages/HistoryPage';

const ProfileDropdown = ({ isOpen, onClose, anchorRef }) => {
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        anchorRef?.current && !anchorRef.current.contains(e.target)
      ) {
        onClose();
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen) return null;

  const historyCount = getHistoryCount();

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-72 bg-surface-base dark:bg-surface-container-lowest border border-border-subtle rounded-xl shadow-xl overflow-hidden z-[90] animate-fade-in"
      style={{ animation: 'slideUp 0.2s ease-out' }}
    >
      {/* Header */}
      <div className="px-5 py-4 bg-surface-container-low dark:bg-surface-container border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            <span className="material-symbols-outlined text-on-secondary" style={{ fontSize: '22px' }}>science</span>
          </div>
          <div>
            <p className="font-headline-md text-body-md text-on-surface font-semibold">Chem Vision AI</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant">Platform Analisis Kimia</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-5 py-4 flex flex-col gap-stack-sm">
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '18px' }}>history</span>
            <span className="font-body-md text-body-md text-on-surface">Total Pencarian</span>
          </div>
          <span className="bg-surface-container-high text-on-surface px-3 py-1 rounded-full font-label-sm text-label-sm font-bold">
            {historyCount}
          </span>
        </div>

        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '18px' }}>verified</span>
            <span className="font-body-md text-body-md text-on-surface">Versi</span>
          </div>
          <span className="font-label-sm text-label-sm text-on-surface-variant">v1.2.5</span>
        </div>

        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '18px' }}>memory</span>
            <span className="font-body-md text-body-md text-on-surface">Engine</span>
          </div>
          <span className="font-label-sm text-label-sm text-on-surface-variant">Gemini AI + PubChem</span>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border-subtle bg-surface-muted dark:bg-surface-container">
        <p className="font-label-sm text-label-sm text-on-surface-variant text-center">
          © 2026 Chem Vision AI
        </p>
      </div>
    </div>
  );
};

export default ProfileDropdown;
