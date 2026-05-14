import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import MoleculeViewer3D from '../components/MoleculeViewer3D';
import MoleculeViewer2D from '../components/MoleculeViewer2D';
import ChemicalMetadata from '../components/ChemicalMetadata';

const ResultPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { data, imageFile } = location.state || {};

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-stack-md w-full">
        <h2 className="text-headline-md font-headline-md text-on-surface">Tidak ada data untuk ditampilkan</h2>
        <button 
          className="bg-primary text-on-primary font-button text-button px-4 py-2 rounded-lg hover:brightness-110 transition-all shadow-sm" 
          onClick={() => navigate('/')}
        >
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  const { smiles, metadata, structure_3d_sdf, search_term, source } = data;
  
  const compoundName = metadata?.common_name || metadata?.iupac_name || search_term || 'Senyawa Tidak Diketahui';

  return (
    <div className="flex flex-col w-full gap-stack-xl animate-fade-in pb-stack-xl">
      {/* Header Section */}
      <header className="flex flex-col gap-stack-xs pb-stack-lg border-b border-border-subtle">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center justify-center p-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-muted transition-colors border border-border-subtle bg-surface-base"
            aria-label="Kembali"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_back</span>
          </button>
          <h1 className="text-headline-xl font-headline-xl text-primary m-0 p-0 leading-tight">
            {compoundName}
          </h1>
        </div>
        
        <div className="flex items-center gap-stack-sm mt-stack-xs md:ml-[52px]">
          <span className="bg-surface-container-high text-on-surface px-3 py-1.5 rounded-full text-label-sm font-label-sm flex items-center gap-2 border border-border-subtle">
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>science</span>
            SMILES: {smiles}
          </span>
          {source === "Image Recognition" ? (
            <span className="bg-surface-container-highest text-secondary px-3 py-1.5 rounded-full text-label-sm font-label-sm border border-secondary-fixed flex items-center gap-1">
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>auto_awesome</span>
              AI-Recognized
            </span>
          ) : (
            <span className="bg-surface-container-highest text-secondary px-3 py-1.5 rounded-full text-label-sm font-label-sm border border-secondary-fixed">
              Data Verified
            </span>
          )}
        </div>
      </header>

      {/* Two Column Layout: Visualization & Data */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        {/* Left Column: 3D Visualization & 2D fallback */}
        <section className="lg:col-span-7 flex flex-col gap-stack-md">
          <MoleculeViewer3D sdfData={structure_3d_sdf} />
          
          <div className="bg-surface-base border border-border-subtle rounded-xl p-stack-sm h-[300px] flex flex-col">
            <div className="flex items-center gap-2 mb-2 px-2 text-on-surface-variant">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>polyline</span>
              <span className="font-label-sm text-label-sm uppercase tracking-wider">Struktur 2D</span>
            </div>
            <div className="flex-grow rounded-lg overflow-hidden border border-border-subtle relative bg-white">
              <MoleculeViewer2D smiles={smiles} />
            </div>
          </div>
        </section>

        {/* Right Column: Chemical & Physical Info Grid */}
        <section className="lg:col-span-5 flex flex-col gap-stack-md">
          <ChemicalMetadata data={metadata} />
          
          {imageFile && (
            <div className="bg-surface-base border border-border-subtle rounded-xl p-stack-lg mt-stack-sm shadow-sm flex flex-col items-center">
              <p className="text-label-sm font-label-sm text-on-surface-variant mb-2 uppercase tracking-wider self-start">Gambar Input AI</p>
              <img
                src={imageFile}
                alt="Input"
                className="w-full max-h-[250px] object-contain rounded-lg border border-border-subtle bg-surface-muted p-2"
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ResultPage;
