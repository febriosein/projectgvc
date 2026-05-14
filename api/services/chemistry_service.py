"""
Chemistry service — pure PubChem REST API (no RDKit).
This keeps the serverless function lightweight for Vercel deployment.
"""
import os
import requests
import pubchempy as pcp
from google import genai

PUBCHEM_REST = "https://pubchem.ncbi.nlm.nih.gov/rest/pug"

# Lazy-init Gemini client for translation
_gemini_client = None


def _get_gemini_client():
    global _gemini_client
    if _gemini_client is None:
        api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        if not api_key:
            return None
        _gemini_client = genai.Client(api_key=api_key)
    return _gemini_client


def _translate_to_indonesian(text: str) -> str:
    """Translate English chemical description to Indonesian using Gemini."""
    try:
        client = _get_gemini_client()
        if not client:
            return text

        prompt = (
            "Terjemahkan deskripsi senyawa kimia berikut ke dalam Bahasa Indonesia yang mudah dipahami. "
            "Pertahankan istilah-istilah kimia teknis (seperti nama IUPAC, nama gugus fungsi, dll) dalam bahasa aslinya. "
            "Berikan HANYA hasil terjemahan, tanpa penjelasan tambahan.\n\n"
            f"{text}"
        )

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[prompt]
        )
        translated = response.text.strip() if response.text else text
        return translated if translated else text
    except Exception as e:
        print(f"Translation error: {e}")
        return text


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


def _get_description_from_pubchem(cid: int) -> str | None:
    """Fetch a textual description of the compound from PubChem by CID and translate to Indonesian."""
    try:
        url = f"{PUBCHEM_REST}/compound/cid/{cid}/description/JSON"
        resp = requests.get(url, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            infos = data.get("InformationList", {}).get("Information", [])
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

        # ── Textual description from PubChem ──
        result["metadata"]["description"] = _get_description_from_pubchem(comp.cid)

    except Exception as e:
        print(f"Chemistry service error: {e}")
        result["error"] = str(e)

    return result
