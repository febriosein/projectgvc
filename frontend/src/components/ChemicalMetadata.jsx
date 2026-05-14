import React from 'react';

const ChemicalMetadata = ({ data }) => {
  if (!data) return null;

  const {
    iupac_name,
    common_name,
    molecular_weight,
    formula,
    exact_mass,
    h_bond_donor_count,
    h_bond_acceptor_count,
    complexity,
    description // Handle description if available
  } = data;

  const metadataItems = [
    { label: "Nama IUPAC", value: iupac_name || "-" },
    { label: "Nama Umum", value: common_name || "-" },
    { label: "Rumus Kimia", value: formula || "-", isMono: true },
    { label: "Berat Molekul", value: molecular_weight ? `${molecular_weight} g/mol` : "-" },
    { label: "Massa Eksak", value: exact_mass ? `${exact_mass} g/mol` : "-" },
    { label: "Kompleksitas", value: complexity || "-" },
    { label: "Donor Ikatan H", value: h_bond_donor_count !== undefined ? h_bond_donor_count : "-" },
    { label: "Akseptor Ikatan H", value: h_bond_acceptor_count !== undefined ? h_bond_acceptor_count : "-" },
  ];

  return (
    <section className="flex flex-col gap-stack-md w-full">
      <h2 className="text-headline-md font-headline-md text-primary flex items-center gap-2 mb-stack-xs">
        <span className="material-symbols-outlined text-secondary" style={{ fontSize: '28px' }}>dataset</span>
        Informasi Kimia & Fisika
      </h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-stack-md">
        {metadataItems.map((item, index) => (
          <div key={index} className="bg-surface-base border border-border-subtle rounded-xl p-stack-md hover:shadow-md transition-shadow duration-200 flex flex-col justify-center">
            <p className="text-label-sm font-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">{item.label}</p>
            <p className={`text-body-lg font-body-lg text-primary font-medium ${item.isMono ? 'font-mono' : ''}`}>
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {description && (
        <div className="bg-surface-base border border-border-subtle rounded-xl p-stack-lg mt-stack-sm shadow-sm">
          <p className="text-label-sm font-label-sm text-on-surface-variant mb-2 uppercase tracking-wider">Deskripsi Singkat</p>
          <p className="text-body-md font-body-md text-on-surface leading-relaxed">
            {description}
          </p>
        </div>
      )}
    </section>
  );
};

export default ChemicalMetadata;
