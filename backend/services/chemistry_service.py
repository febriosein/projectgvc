from rdkit import Chem
from rdkit.Chem import Descriptors
from rdkit.Chem import AllChem
import pubchempy as pcp
import requests
import os

from services.ai_providers import call_with_fallback

PUBCHEM_REST = "https://pubchem.ncbi.nlm.nih.gov/rest/pug"


def _translate_to_indonesian(text: str) -> str:
    """Translate English chemical description to Indonesian using AI (Gemini → Groq fallback)."""
    try:
        prompt = (
            "Terjemahkan deskripsi senyawa kimia berikut ke dalam Bahasa Indonesia yang mudah dipahami. "
            "Pertahankan istilah-istilah kimia teknis (seperti nama IUPAC, nama gugus fungsi, dll) dalam bahasa aslinya. "
            "Berikan HANYA hasil terjemahan, tanpa penjelasan tambahan.\n\n"
            f"{text}"
        )

        translated = call_with_fallback("generate_text", prompt).strip()
        return translated if translated else text
    except Exception as e:
        print(f"Translation error: {e}")
        return text  # Fallback to English on error


def _get_description_from_pubchem(cid: int) -> str | None:
    """Fetch a textual description of the compound from PubChem by CID and translate to Indonesian."""
    try:
        url = f"{PUBCHEM_REST}/compound/cid/{cid}/description/JSON"
        resp = requests.get(url, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            infos = data.get("InformationList", {}).get("Information", [])
            # Pick the longest description available (usually the most informative)
            best = ""
            for info in infos:
                desc = info.get("Description", "")
                if len(desc) > len(best):
                    best = desc
            if best:
                return _translate_to_indonesian(best)
    except Exception as e:
        print(f"Description fetch error: {e}")
    return None

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
            
            # Fetch textual description from PubChem
            result["metadata"]["description"] = _get_description_from_pubchem(comp.cid)
            
    except Exception as e:
        print(f"Error in chemistry service: {e}")
        result["error"] = str(e)
        
    return result
