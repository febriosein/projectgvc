from rdkit import Chem
from rdkit.Chem import Descriptors
from rdkit.Chem import AllChem
import pubchempy as pcp

def get_chemical_data_from_smiles(smiles: str) -> dict:
    """
    Fetches chemical data based on SMILES string using RDKit and PubChem.
    """
    result = {
        "smiles": smiles,
        "valid": False,
        "metadata": {},
        "structure_3d_sdf": None
    }
    
    try:
        # 1. RDKit validation and basic descriptors
        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            return result
            
        result["valid"] = True
        
        # Calculate some descriptors with RDKit
        result["metadata"]["molecular_weight"] = round(Descriptors.MolWt(mol), 2)
        result["metadata"]["formula"] = Descriptors.rdMolDescriptors.CalcMolFormula(mol)
        
        # Generate 3D Conformer with RDKit
        mol_3d = Chem.AddHs(mol)
        AllChem.EmbedMolecule(mol_3d, AllChem.ETKDG())
        AllChem.UFFOptimizeMolecule(mol_3d)
        result["structure_3d_sdf"] = Chem.MolToMolBlock(mol_3d)
        
        # 2. PubChem for additional data (names, properties)
        compounds = pcp.get_compounds(smiles, 'smiles')
        if compounds:
            comp = compounds[0]
            result["metadata"]["iupac_name"] = comp.iupac_name
            result["metadata"]["common_name"] = comp.synonyms[0] if comp.synonyms else comp.iupac_name
            
            # Additional physical properties if available
            result["metadata"]["exact_mass"] = round(float(comp.exact_mass), 4) if comp.exact_mass else None
            result["metadata"]["complexity"] = comp.complexity
            result["metadata"]["h_bond_donor_count"] = comp.h_bond_donor_count
            result["metadata"]["h_bond_acceptor_count"] = comp.h_bond_acceptor_count
            
    except Exception as e:
        print(f"Error in chemistry service: {e}")
        result["error"] = str(e)
        
    return result
