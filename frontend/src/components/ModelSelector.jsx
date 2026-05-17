import React, { useState, useEffect } from 'react';

/**
 * ModelSelector — Dropdown/panel to pick an AI model, grouped by provider.
 */

// Provider color/icon mapping
const PROVIDER_STYLES = {
  'Google': { color: '#4285F4', gradient: 'from-blue-500 to-cyan-400' },
  'OpenAI': { color: '#10a37f', gradient: 'from-emerald-500 to-green-400' },
  'Anthropic': { color: '#d97706', gradient: 'from-amber-500 to-orange-400' },
  'DeepSeek': { color: '#6366f1', gradient: 'from-indigo-500 to-violet-400' },
  'Meta': { color: '#1877F2', gradient: 'from-blue-600 to-sky-400' },
  'Meta (via Groq)': { color: '#f97316', gradient: 'from-orange-500 to-yellow-400' },
  'Google (via OpenRouter)': { color: '#4285F4', gradient: 'from-blue-500 to-cyan-400' },
};

const ModelSelector = ({ models, selectedModel, onSelect, isOpen, onToggle }) => {
  const selectedModelData = models.find(m => m.id === selectedModel);

  // Group models by provider_name
  const grouped = models.reduce((acc, model) => {
    const key = model.provider_name;
    if (!acc[key]) acc[key] = [];
    acc[key].push(model);
    return acc;
  }, {});

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 rounded-xl bg-surface-muted dark:bg-surface-container border border-border-subtle hover:border-secondary/40 transition-all group"
      >
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${PROVIDER_STYLES[selectedModelData?.provider_name]?.gradient || 'from-gray-500 to-gray-400'} flex items-center justify-center`}>
          <span className="material-symbols-outlined text-white" style={{ fontSize: '16px' }}>
            {selectedModelData?.icon || 'smart_toy'}
          </span>
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-medium text-on-surface truncate">
            {selectedModelData?.name || 'Pilih Model'}
          </p>
          <p className="text-[11px] text-on-surface-variant truncate">
            {selectedModelData?.provider_name || 'Belum dipilih'}
          </p>
        </div>
        <span className={`material-symbols-outlined text-on-surface-variant transition-transform ${isOpen ? 'rotate-180' : ''}`} style={{ fontSize: '18px' }}>
          expand_more
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-surface-base dark:bg-surface-container-lowest border border-border-subtle rounded-xl shadow-xl overflow-hidden"
             style={{ animation: 'slideDown 0.2s ease-out', maxHeight: '360px', overflowY: 'auto' }}>
          {Object.entries(grouped).map(([providerName, providerModels]) => (
            <div key={providerName}>
              {/* Provider Header */}
              <div className="px-3 py-2 bg-surface-muted/50 dark:bg-surface-container/50 border-b border-border-subtle">
                <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                  {providerName}
                </span>
              </div>

              {/* Models */}
              {providerModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => { onSelect(model); onToggle(); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 transition-all text-left hover:bg-surface-muted dark:hover:bg-surface-container
                    ${selectedModel === model.id ? 'bg-secondary/8' : ''}`}
                >
                  <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${PROVIDER_STYLES[providerName]?.gradient || 'from-gray-500 to-gray-400'} flex items-center justify-center shrink-0`}>
                    <span className="material-symbols-outlined text-white" style={{ fontSize: '14px' }}>
                      {model.icon}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-on-surface truncate">{model.name}</span>
                      {model.free && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 tracking-wide shrink-0">
                          Free
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-on-surface-variant truncate">{model.description}</p>
                  </div>
                  {selectedModel === model.id && (
                    <span className="material-symbols-outlined text-secondary shrink-0" style={{ fontSize: '18px' }}>check_circle</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ModelSelector;
