"""
Vercel serverless function for OCSR using Gemini API.
No RDKit validation here to keep the bundle size small.
"""
import os
from google import genai
import pubchempy as pcp

client = genai.Client()

CHEMISTRY_PROMPT = """
You are a chemistry expert analyzing a chemical structure image.
TASK: Identify the molecular structure in this image and output ONLY the SMILES notation.
RULES:
1. Analyze ALL bonds, atoms, and functional groups carefully
2. Count hydrogens implicitly (do not add explicit H unless necessary)
3. Use canonical SMILES format
4. For aromatic rings, use lowercase letters (c, n, o)
5. Output ONLY the SMILES string, nothing else. DO NOT INCLUDE MARKDOWN FORMATTING OR BACKTICKS.
6. If the image shows a hand-drawn structure, interpret it generously
7. If you cannot identify the structure, output "UNRECOGNIZED"
OUTPUT: [SMILES string only]
"""

def validate_smiles_pubchem(smiles: str) -> bool:
    """Validate SMILES via PubChem (for Vercel without RDKit)"""
    try:
        compounds = pcp.get_compounds(smiles, 'smiles')
        return len(compounds) > 0
    except:
        return False

def process_image_to_smiles(image_bytes: bytes) -> str | None:
    try:
        # For Vercel, we might not have PIL installed to save space,
        # so we pass the bytes directly to Gemini by formatting it properly.
        # Gemini API client can take dict with mime_type and data.
        image_part = {
            "mime_type": "image/jpeg", # Default to jpeg, API handles well usually
            "data": image_bytes
        }
        
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[image_part, CHEMISTRY_PROMPT]
        )
        
        smiles = response.text.strip().replace("```smiles", "").replace("```", "").strip()
        
        if smiles == "UNRECOGNIZED" or not smiles:
            return None
            
        # Optional validation
        if validate_smiles_pubchem(smiles):
             return smiles
             
        return smiles # return it anyway if pubchem validation fails as fallback
        
    except Exception as e:
        print(f"Vercel Gemini Vision API error: {e}")
        return None
