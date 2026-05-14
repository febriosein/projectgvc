import io
import os
import traceback
from PIL import Image, ImageEnhance
from rdkit import Chem

from services.ai_providers import (
    CHEMISTRY_PROMPT,
    STRICT_PROMPT,
    call_with_fallback,
)


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
    """Clean up the SMILES string from AI response."""
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


def _prepare_image(image_bytes: bytes) -> bytes:
    """Preprocess and convert image to PNG bytes for AI providers."""
    processed_img = preprocess_image(image_bytes)
    print(f"[VisionService] Preprocessed image: {processed_img.size}, mode={processed_img.mode}")
    
    buf = io.BytesIO()
    processed_img.save(buf, format="PNG")
    img_png_bytes = buf.getvalue()
    print(f"[VisionService] Converted to PNG: {len(img_png_bytes)} bytes")
    return img_png_bytes


def process_image_to_smiles(image_bytes: bytes) -> str:
    """
    Process image → SMILES using AI providers with automatic fallback.
    Tries Gemini first, falls back to Groq if quota is exceeded.
    """
    print(f"[VisionService] Received {len(image_bytes)} bytes of image data")
    
    # Step 1: Preprocess image
    try:
        img_png_bytes = _prepare_image(image_bytes)
    except Exception as e:
        print(f"[VisionService] Image preprocessing failed: {e}")
        traceback.print_exc()
        return None

    # Step 2: Call AI provider (with automatic fallback)
    try:
        print("[VisionService] Sending to AI provider...")
        raw_text = call_with_fallback("analyze_image", img_png_bytes, CHEMISTRY_PROMPT)
        print(f"[VisionService] AI raw response: '{raw_text}'")
        
        smiles = _clean_smiles(raw_text)
        print(f"[VisionService] Cleaned SMILES: '{smiles}'")

        if smiles == "UNRECOGNIZED" or not smiles:
            print("[VisionService] AI could not recognize the structure")
            return None

        # Validate with RDKit
        if validate_smiles(smiles):
            print(f"[VisionService] SMILES valid! Returning: {smiles}")
            return smiles
        
        print(f"[VisionService] SMILES '{smiles}' invalid by RDKit. Retrying with strict prompt...")
        
        # Retry with strict prompt (also uses fallback cascade)
        retry_raw = call_with_fallback(
            "analyze_image", img_png_bytes, CHEMISTRY_PROMPT + "\n\n" + STRICT_PROMPT
        )
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

    except RuntimeError as e:
        if "EXHAUSTED" in str(e) or "QUOTA" in str(e):
            # All providers quota exceeded
            raise
        print(f"[VisionService] AI error: {e}")
        traceback.print_exc()
        return None
    except Exception as e:
        print(f"[VisionService] Unexpected error: {e}")
        traceback.print_exc()
        return None
