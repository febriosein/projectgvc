import React from 'react';

const MoleculeViewer2D = ({ smiles }) => {
  // Using an external service for 2D rendering as a placeholder
  // A production app might use RDKit.js or Kekule.js directly in browser
  const imageUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(smiles)}/PNG`;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', borderRadius: '12px' }}>
      {smiles ? (
        <img 
          src={imageUrl} 
          alt="2D Structure" 
          style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      ) : (
        <p style={{ color: 'black' }}>No SMILES provided</p>
      )}
    </div>
  );
};

export default MoleculeViewer2D;
