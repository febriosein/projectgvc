"""
Chemistry service — pure PubChem REST API (no RDKit).
This keeps the serverless function lightweight for Vercel deployment.
"""
import requests
import pubchempy as pcp

PUBCHEM_REST = "https://pubchem.ncbi.nlm.nih.gov/rest/pug"


def _get_3d_sdf_from_pubchem(cid: int) -> str | None:
    """Fetch 3D SDF conformer from PubChem by CID."""
    try:
        url = f"{PUBCHEM_REST}/compound/cid/{cid}/record/SDF/?record_type=3d"
        resp = requests.get(url, timeout=15)
        if resp.status_code == 200:
            return resp.text
    except Exception as e:
        print(f"3D SDF fetch error: {e}")
    return None


def get_chemical_data_from_smiles(smiles: str) -> dict:
    """
    Fetches chemical data for a SMILES string using only PubChem (no RDKit).
    """
    result = {
        "smiles": smiles,
        "valid": False,
        "metadata": {},
        "structure_3d_sdf": None,
    }

    try:
        compounds = pcp.get_compounds(smiles, "smiles")
        if not compounds:
            return result

        comp = compounds[0]
        result["valid"] = True

        # ── Identity ──
        result["metadata"]["iupac_name"] = comp.iupac_name
        result["metadata"]["common_name"] = (
            comp.synonyms[0] if comp.synonyms else comp.iupac_name
        )
        result["metadata"]["formula"] = comp.molecular_formula
        result["metadata"]["molecular_weight"] = (
            round(float(comp.molecular_weight), 2)
            if comp.molecular_weight
            else None
        )
        result["metadata"]["exact_mass"] = (
            round(float(comp.exact_mass), 4) if comp.exact_mass else None
        )

        # ── Structural descriptors ──
        result["metadata"]["complexity"] = comp.complexity
        result["metadata"]["h_bond_donor_count"] = comp.h_bond_donor_count
        result["metadata"]["h_bond_acceptor_count"] = comp.h_bond_acceptor_count

        # ── 3D conformer from PubChem ──
        result["structure_3d_sdf"] = _get_3d_sdf_from_pubchem(comp.cid)

    except Exception as e:
        print(f"Chemistry service error: {e}")
        result["error"] = str(e)

    return result
