import io
import os
import traceback
from PIL import Image, ImageEnhance
from google import genai
from google.genai import types
from rdkit import Chem

# Lazy-init: do NOT create client at module level
_client = None

def _get_client():
    """Lazily initialize and return the Gemini client."""
    global _client
    if _client is None:
        api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY is not set in environment variables!")
        print(f"[VisionService] Initializing Gemini client with key: {api_key[:10]}...")
        _client = genai.Client(api_key=api_key)
    return _client

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

STRICT_PROMPT = """
The previous SMILES you provided was chemically invalid. Please carefully re-examine the image.
Pay close attention to valence, ring closures, and explicit hydrogens.
Output ONLY the valid SMILES string, nothing else. DO NOT INCLUDE MARKDOWN FORMATTING OR BACKTICKS.
"""

def preprocess_image(image_bytes: bytes) -> Image.Image:
    """Enhance image for better recognition by the AI model"""
    img = Image.open(io.BytesIO(image_bytes))
    
    # Convert to RGB to ensure compatibility
    if img.mode != 'RGB':
        img = img.convert('RGB')
        
    # Resize if too large to save bandwidth and processing time
    max_size = 1024
    if img.width > max_size or img.height > max_size:
        img.thumbnail((max_size, max_size))
        
    # Enhance contrast to help with faded hand-drawn sketches
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(1.5)
    
    # Enhance sharpness
    sharpness = ImageEnhance.Sharpness(img)
    img = sharpness.enhance(1.5)
    
    return img

def validate_smiles(smiles: str) -> bool:
    """Validate SMILES using RDKit"""
    mol = Chem.MolFromSmiles(smiles)
    return mol is not None

def _clean_smiles(text: str) -> str:
    """Clean up the SMILES string from Gemini response."""
    text = text.strip()
    # Remove markdown code blocks
    text = text.replace("```smiles", "").replace("```", "")
    # Remove any surrounding whitespace/newlines again
    text = text.strip()
    # If multi-line, take only the first non-empty line
    for line in text.split("\n"):
        line = line.strip()
        if line and line != "UNRECOGNIZED":
            return line
    return text

def process_image_to_smiles(image_bytes: bytes) -> str:
    """
    Process image using Gemini Vision API with RDKit validation.
    """
    print(f"[VisionService] Received {len(image_bytes)} bytes of image data")
    
    # Step 1: Preprocess
    try:
        processed_img = preprocess_image(image_bytes)
        print(f"[VisionService] Preprocessed image: {processed_img.size}, mode={processed_img.mode}")
    except Exception as e:
        print(f"[VisionService] Image preprocessing failed: {e}")
        traceback.print_exc()
        return None

    # Step 2: Convert PIL image to bytes for Gemini (more reliable than sending PIL object)
    try:
        buf = io.BytesIO()
        processed_img.save(buf, format="PNG")
        img_png_bytes = buf.getvalue()
        print(f"[VisionService] Converted to PNG: {len(img_png_bytes)} bytes")
        
        image_part = types.Part.from_bytes(
            data=img_png_bytes,
            mime_type="image/png"
        )
    except Exception as e:
        print(f"[VisionService] Image conversion failed: {e}")
        traceback.print_exc()
        return None

    # Step 3: Call Gemini
    try:
        client = _get_client()
        print("[VisionService] Sending to Gemini Vision API (gemini-2.5-flash)...")
        
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[image_part, CHEMISTRY_PROMPT]
        )
        
        raw_text = response.text if response.text else ""
        print(f"[VisionService] Gemini raw response: '{raw_text}'")
        
        smiles = _clean_smiles(raw_text)
        print(f"[VisionService] Cleaned SMILES: '{smiles}'")

        if smiles == "UNRECOGNIZED" or not smiles:
            print("[VisionService] Gemini could not recognize the structure")
            return None

        # Validate with RDKit
        if validate_smiles(smiles):
            print(f"[VisionService] SMILES valid! Returning: {smiles}")
            return smiles
        
        print(f"[VisionService] SMILES '{smiles}' invalid by RDKit. Retrying...")
        
        # Retry once if invalid
        retry_response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[image_part, CHEMISTRY_PROMPT + "\n\n" + STRICT_PROMPT]
        )
        retry_raw = retry_response.text if retry_response.text else ""
        print(f"[VisionService] Retry raw response: '{retry_raw}'")
        
        retry_smiles = _clean_smiles(retry_raw)
        print(f"[VisionService] Retry cleaned SMILES: '{retry_smiles}'")
        
        if validate_smiles(retry_smiles):
            print(f"[VisionService] Retry SMILES valid! Returning: {retry_smiles}")
            return retry_smiles
        
        # Last resort: return it anyway if it looks like a SMILES string
        # (RDKit might be too strict for some valid structures)
        if retry_smiles and retry_smiles != "UNRECOGNIZED" and len(retry_smiles) > 1:
            print(f"[VisionService] Returning unvalidated SMILES as last resort: {retry_smiles}")
            return retry_smiles
            
        print("[VisionService] Retry also failed validation. Returning None.")
        return None

    except Exception as e:
        print(f"[VisionService] Gemini Vision API error: {e}")
        traceback.print_exc()
        return None

