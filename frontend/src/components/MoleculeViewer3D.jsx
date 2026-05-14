import React, { useEffect, useRef, useState } from 'react';

const MoleculeViewer3D = ({ sdfData }) => {
  const containerRef = useRef(null);
  const viewerInstanceRef = useRef(null);
  const [ready, setReady] = useState(!!window.$3Dmol);
  const [isSpinning, setIsSpinning] = useState(true);

  // Wait until the global $3Dmol object is available
  useEffect(() => {
    if (window.$3Dmol) {
      setReady(true);
      return;
    }
    const id = setInterval(() => {
      if (window.$3Dmol) {
        setReady(true);
        clearInterval(id);
      }
    }, 200);
    return () => clearInterval(id);
  }, []);

  // Create / update the viewer when data or readiness changes
  useEffect(() => {
    if (!ready || !sdfData || !containerRef.current) return;

    // Destroy the previous viewer if it exists
    if (viewerInstanceRef.current) {
      viewerInstanceRef.current.clear();
    }
    containerRef.current.innerHTML = '';

    const viewer = window.$3Dmol.createViewer(containerRef.current, {
      backgroundColor: '#ffffff', // Matching bg-surface-base
    });
    viewerInstanceRef.current = viewer;

    viewer.addModel(sdfData, 'sdf');
    viewer.setStyle(
      {},
      {
        stick: { radius: 0.15, colorscheme: 'Jmol' },
        sphere: { scale: 0.3, colorscheme: 'Jmol' },
      }
    );
    viewer.zoomTo();
    viewer.render();
    viewer.spin(isSpinning);
  }, [ready, sdfData]);

  const handleZoomIn = () => {
    if (viewerInstanceRef.current) {
      viewerInstanceRef.current.zoom(1.2);
    }
  };

  const handleZoomOut = () => {
    if (viewerInstanceRef.current) {
      viewerInstanceRef.current.zoom(0.8);
    }
  };

  const handleToggleSpin = () => {
    if (viewerInstanceRef.current) {
      const newSpinState = !isSpinning;
      setIsSpinning(newSpinState);
      viewerInstanceRef.current.spin(newSpinState);
    }
  };

  if (!sdfData) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-surface-muted rounded-xl border border-border-subtle">
        <p className="text-on-surface-variant font-body-md text-body-md">Data 3D belum tersedia</p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="w-full h-full flex flex-col gap-stack-md items-center justify-center bg-surface-muted rounded-xl border border-border-subtle">
        <div className="w-8 h-8 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-on-surface-variant font-body-md text-body-md">Memuat 3D Viewer…</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-base border border-border-subtle rounded-xl overflow-hidden shadow-sm h-[500px] relative group p-stack-sm w-full">
      <div className="absolute inset-0 flex items-center justify-center bg-surface-base rounded-xl">
        <div style={{ width: '100%', height: '100%' }} ref={containerRef} />
      </div>

      {/* Interactive Mode Badge */}
      <div className="absolute top-stack-lg left-stack-lg z-10 pointer-events-none">
        <span className="bg-surface-base text-on-surface px-3 py-1.5 rounded-lg text-label-sm font-label-sm border border-border-subtle shadow-sm flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-secondary"></div>
          Interactive Mode
        </span>
      </div>

      {/* Overlay Controls */}
      <div className="absolute bottom-stack-lg right-stack-lg flex gap-stack-sm bg-surface-base p-2 rounded-xl border border-border-subtle shadow-md z-10">
        <button 
          onClick={handleToggleSpin}
          aria-label="Rotate" 
          className={`p-2 rounded-lg transition-colors flex items-center justify-center ${isSpinning ? 'text-secondary bg-surface-muted' : 'text-on-surface-variant hover:text-secondary hover:bg-surface-muted'}`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>360</span>
        </button>
        <button 
          onClick={handleZoomIn}
          aria-label="Zoom In" 
          className="p-2 text-on-surface-variant hover:text-secondary hover:bg-surface-muted rounded-lg transition-colors flex items-center justify-center"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>zoom_in</span>
        </button>
        <button 
          onClick={handleZoomOut}
          aria-label="Zoom Out" 
          className="p-2 text-on-surface-variant hover:text-secondary hover:bg-surface-muted rounded-lg transition-colors flex items-center justify-center"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>zoom_out</span>
        </button>
        <div className="w-px bg-border-subtle my-1 mx-1"></div>
        <button 
          aria-label="Settings" 
          className="p-2 text-on-surface-variant hover:text-secondary hover:bg-surface-muted rounded-lg transition-colors flex items-center justify-center"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>tune</span>
        </button>
      </div>
    </div>
  );
};

export default MoleculeViewer3D;
