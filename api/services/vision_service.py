"""
Vercel serverless function for OCSR using AI providers with fallback.
No RDKit validation here to keep the bundle size small.
"""
import pubchempy as pcp
from api.services.ai_providers import CHEMISTRY_PROMPT, call_with_fallback


def validate_smiles_pubchem(smiles: str) -> bool:
    """Validate SMILES via PubChem (for Vercel without RDKit)"""
    try:
        compounds = pcp.get_compounds(smiles, 'smiles')
        return len(compounds) > 0
    except:
        return False


def process_image_to_smiles(image_bytes: bytes) -> str | None:
    try:
        raw_text = call_with_fallback("analyze_image", image_bytes, CHEMISTRY_PROMPT)
        
        smiles = raw_text.strip().replace("```smiles", "").replace("```", "").strip()
        
        if smiles == "UNRECOGNIZED" or not smiles:
            return None
            
        # Optional validation
        if validate_smiles_pubchem(smiles):
             return smiles
             
        return smiles  # return it anyway if pubchem validation fails as fallback
        
    except RuntimeError:
        # Re-raise (ALL_PROVIDERS_EXHAUSTED) so the endpoint can handle it
        raise
    except Exception as e:
        print(f"Vercel Vision API error: {e}")
        return None
