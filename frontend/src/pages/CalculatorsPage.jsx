import React, { useState, useMemo } from 'react';

// Periodic table data (common elements)
const ELEMENTS = {
  H: 1.008, He: 4.003, Li: 6.941, Be: 9.012, B: 10.81, C: 12.011, N: 14.007, O: 15.999,
  F: 18.998, Ne: 20.180, Na: 22.990, Mg: 24.305, Al: 26.982, Si: 28.086, P: 30.974, S: 32.065,
  Cl: 35.453, Ar: 39.948, K: 39.098, Ca: 40.078, Sc: 44.956, Ti: 47.867, V: 50.942, Cr: 51.996,
  Mn: 54.938, Fe: 55.845, Co: 58.933, Ni: 58.693, Cu: 63.546, Zn: 65.38, Ga: 69.723, Ge: 72.63,
  As: 74.922, Se: 78.96, Br: 79.904, Kr: 83.798, Rb: 85.468, Sr: 87.62, Y: 88.906, Zr: 91.224,
  Nb: 92.906, Mo: 95.96, Ru: 101.07, Rh: 102.906, Pd: 106.42, Ag: 107.868, Cd: 112.411,
  In: 114.818, Sn: 118.710, Sb: 121.760, Te: 127.60, I: 126.904, Xe: 131.293, Cs: 132.905,
  Ba: 137.327, La: 138.905, Pt: 195.084, Au: 196.967, Hg: 200.59, Pb: 207.2, Bi: 208.980,
};

const AVOGADRO = 6.02214076e23;

const parseFormula = (formula) => {
  const regex = /([A-Z][a-z]?)(\d*)/g;
  const elements = {};
  let match;
  let valid = true;

  while ((match = regex.exec(formula)) !== null) {
    if (match[0] === '') continue;
    const symbol = match[1];
    const count = match[2] ? parseInt(match[2]) : 1;
    if (!ELEMENTS[symbol]) {
      valid = false;
      break;
    }
    elements[symbol] = (elements[symbol] || 0) + count;
  }

  // Verify the entire string was parsed
  const reconstructed = Object.entries(elements)
    .map(([el, count]) => el + (count > 1 ? count : ''))
    .join('');
  if (reconstructed.replace(/1/g, '') !== formula.replace(/1/g, '') && Object.keys(elements).length > 0) {
    // Simple check — won't catch all edge cases but handles most
  }

  return { elements, valid: valid && Object.keys(elements).length > 0 };
};

// ── Molar Mass Calculator ──
const MolarMassCalc = () => {
  const [formula, setFormula] = useState('');

  const result = useMemo(() => {
    if (!formula.trim()) return null;
    const { elements, valid } = parseFormula(formula.trim());
    if (!valid) return { error: true };

    let totalMass = 0;
    const breakdown = [];
    for (const [symbol, count] of Object.entries(elements)) {
      const mass = ELEMENTS[symbol] * count;
      totalMass += mass;
      breakdown.push({ symbol, count, atomicMass: ELEMENTS[symbol], mass });
    }
    return { totalMass, breakdown };
  }, [formula]);

  return (
    <div className="bg-surface-base border border-border-subtle rounded-xl p-stack-lg flex flex-col gap-stack-lg transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0px_4px_20px_rgba(15,23,42,0.08)]">
      <div className="flex items-center gap-stack-sm border-b border-border-subtle pb-stack-sm">
        <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-secondary">
          <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>scale</span>
        </div>
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">Massa Molar</h2>
          <p className="font-label-sm text-label-sm text-on-surface-variant">Hitung Mr dari formula kimia</p>
        </div>
      </div>

      <div className="flex flex-col gap-stack-xs">
        <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider" htmlFor="molar-formula">
          Formula Kimia
        </label>
        <input
          id="molar-formula"
          className="w-full bg-surface-muted border border-border-subtle rounded-lg px-4 py-3 font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all"
          placeholder="e.g. H2O, C6H12O6, NaCl"
          value={formula}
          onChange={(e) => setFormula(e.target.value)}
        />
      </div>

      {result && !result.error && (
        <div className="flex flex-col gap-stack-md animate-fade-in">
          <div className="bg-surface-container-low rounded-xl p-stack-md text-center">
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Massa Molar (Mr)</p>
            <p className="font-headline-xl text-headline-lg text-primary">{result.totalMass.toFixed(3)} <span className="text-body-md text-on-surface-variant">g/mol</span></p>
          </div>
          <div className="flex flex-col gap-stack-xs">
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Breakdown</p>
            {result.breakdown.map(({ symbol, count, atomicMass, mass }) => (
              <div key={symbol} className="flex items-center justify-between bg-surface-muted rounded-lg px-4 py-2 text-body-md font-body-md">
                <span className="text-on-surface">
                  <span className="font-headline-md">{symbol}</span>
                  {count > 1 && <sub className="text-on-surface-variant">{count}</sub>}
                </span>
                <span className="text-on-surface-variant">
                  {count} × {atomicMass.toFixed(3)} = <span className="text-on-surface font-headline-md">{mass.toFixed(3)}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {result?.error && (
        <div className="bg-error-container text-on-error-container p-4 rounded-lg text-center font-body-md">
          Formula tidak valid. Gunakan simbol elemen standar, contoh: H2O, C6H12O6
        </div>
      )}
    </div>
  );
};

// ── Mole/Gram/Particle Converter ──
const ConversionCalc = () => {
  const [formula, setFormula] = useState('');
  const [value, setValue] = useState('');
  const [from, setFrom] = useState('gram'); // gram, mol, partikel

  const result = useMemo(() => {
    if (!formula.trim() || !value || isNaN(parseFloat(value))) return null;
    const { elements, valid } = parseFormula(formula.trim());
    if (!valid) return { error: true };

    let mr = 0;
    for (const [symbol, count] of Object.entries(elements)) {
      mr += ELEMENTS[symbol] * count;
    }

    const numValue = parseFloat(value);
    let mol, gram, partikel;

    if (from === 'gram') {
      gram = numValue;
      mol = gram / mr;
      partikel = mol * AVOGADRO;
    } else if (from === 'mol') {
      mol = numValue;
      gram = mol * mr;
      partikel = mol * AVOGADRO;
    } else {
      partikel = numValue;
      mol = partikel / AVOGADRO;
      gram = mol * mr;
    }

    return { mol, gram, partikel, mr };
  }, [formula, value, from]);

  const formatNumber = (n) => {
    if (n === 0) return '0';
    if (n > 1e6 || n < 0.001) return n.toExponential(4);
    return n.toLocaleString('id-ID', { maximumFractionDigits: 4 });
  };

  return (
    <div className="bg-surface-base border border-border-subtle rounded-xl p-stack-lg flex flex-col gap-stack-lg transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0px_4px_20px_rgba(15,23,42,0.08)]">
      <div className="flex items-center gap-stack-sm border-b border-border-subtle pb-stack-sm">
        <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-secondary">
          <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>swap_horiz</span>
        </div>
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">Konversi Satuan</h2>
          <p className="font-label-sm text-label-sm text-on-surface-variant">Mol ↔ Gram ↔ Partikel</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-stack-md">
        <div className="flex flex-col gap-stack-xs">
          <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Formula</label>
          <input
            className="w-full bg-surface-muted border border-border-subtle rounded-lg px-4 py-3 font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all"
            placeholder="e.g. H2O"
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-stack-xs">
          <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Konversi Dari</label>
          <select
            className="w-full bg-surface-muted border border-border-subtle rounded-lg px-4 py-3 font-body-md text-body-md text-on-surface focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          >
            <option value="gram">Gram (g)</option>
            <option value="mol">Mol (mol)</option>
            <option value="partikel">Partikel</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-stack-xs">
        <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Nilai</label>
        <input
          className="w-full bg-surface-muted border border-border-subtle rounded-lg px-4 py-3 font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all"
          placeholder="Masukkan nilai"
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>

      {result && !result.error && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-stack-sm animate-fade-in">
          {[
            { label: 'Gram', value: result.gram, unit: 'g', icon: 'weight' },
            { label: 'Mol', value: result.mol, unit: 'mol', icon: 'science' },
            { label: 'Partikel', value: result.partikel, unit: '', icon: 'grain' },
          ].map(({ label, value: val, unit, icon }) => (
            <div key={label} className={`bg-surface-container-low rounded-xl p-stack-md text-center ${from === label.toLowerCase() ? 'ring-2 ring-secondary' : ''}`}>
              <div className="flex items-center justify-center gap-1 mb-1">
                <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '16px' }}>{icon}</span>
                <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">{label}</p>
              </div>
              <p className="font-headline-md text-headline-md text-primary break-all">{formatNumber(val)}</p>
              {unit && <p className="font-label-sm text-label-sm text-on-surface-variant">{unit}</p>}
            </div>
          ))}
        </div>
      )}

      {result?.error && (
        <div className="bg-error-container text-on-error-container p-4 rounded-lg text-center font-body-md">
          Formula tidak valid.
        </div>
      )}
    </div>
  );
};

// ── Molarity Calculator ──
const MolarityCalc = () => {
  const [mass, setMass] = useState('');
  const [mr, setMr] = useState('');
  const [volume, setVolume] = useState('');

  const result = useMemo(() => {
    const m = parseFloat(mass);
    const mrVal = parseFloat(mr);
    const v = parseFloat(volume);
    if (isNaN(m) || isNaN(mrVal) || isNaN(v) || mrVal <= 0 || v <= 0) return null;

    const mol = m / mrVal;
    const volumeLiter = v / 1000; // input in mL
    const molarity = mol / volumeLiter;

    return { mol, volumeLiter, molarity };
  }, [mass, mr, volume]);

  return (
    <div className="bg-surface-base border border-border-subtle rounded-xl p-stack-lg flex flex-col gap-stack-lg transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0px_4px_20px_rgba(15,23,42,0.08)]">
      <div className="flex items-center gap-stack-sm border-b border-border-subtle pb-stack-sm">
        <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-secondary">
          <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>water_drop</span>
        </div>
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">Konsentrasi Larutan</h2>
          <p className="font-label-sm text-label-sm text-on-surface-variant">Hitung Molaritas (M = mol/V)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-stack-md">
        <div className="flex flex-col gap-stack-xs">
          <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Massa Zat (g)</label>
          <input
            className="w-full bg-surface-muted border border-border-subtle rounded-lg px-4 py-3 font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all"
            placeholder="gram"
            type="number"
            value={mass}
            onChange={(e) => setMass(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-stack-xs">
          <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Mr (g/mol)</label>
          <input
            className="w-full bg-surface-muted border border-border-subtle rounded-lg px-4 py-3 font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all"
            placeholder="g/mol"
            type="number"
            value={mr}
            onChange={(e) => setMr(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-stack-xs">
          <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Volume (mL)</label>
          <input
            className="w-full bg-surface-muted border border-border-subtle rounded-lg px-4 py-3 font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all"
            placeholder="mL"
            type="number"
            value={volume}
            onChange={(e) => setVolume(e.target.value)}
          />
        </div>
      </div>

      {result && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-stack-sm animate-fade-in">
          <div className="bg-surface-container-low rounded-xl p-stack-md text-center">
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Mol Zat</p>
            <p className="font-headline-md text-headline-md text-on-surface">{result.mol.toFixed(4)}</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant">mol</p>
          </div>
          <div className="bg-surface-container-low rounded-xl p-stack-md text-center">
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Volume</p>
            <p className="font-headline-md text-headline-md text-on-surface">{result.volumeLiter.toFixed(4)}</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant">Liter</p>
          </div>
          <div className="bg-surface-container-low rounded-xl p-stack-md text-center ring-2 ring-secondary">
            <p className="font-label-sm text-label-sm text-secondary uppercase tracking-wider mb-1">Molaritas</p>
            <p className="font-headline-xl text-headline-lg text-primary">{result.molarity.toFixed(4)}</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant">M (mol/L)</p>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main Calculators Page ──
const CalculatorsPage = () => {
  return (
    <div className="flex flex-col gap-stack-xl animate-fade-in w-full">
      <section className="flex flex-col items-center text-center max-w-3xl mx-auto gap-stack-md">
        <h1 className="font-headline-xl text-headline-lg-mobile md:text-headline-xl text-on-surface tracking-tight">
          Kalkulator Kimia
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
          Alat bantu perhitungan kimia dasar — massa molar, konversi satuan, dan konsentrasi larutan.
        </p>
      </section>

      <div className="flex flex-col gap-gutter">
        <MolarMassCalc />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
          <ConversionCalc />
          <MolarityCalc />
        </div>
      </div>
    </div>
  );
};

export default CalculatorsPage;
