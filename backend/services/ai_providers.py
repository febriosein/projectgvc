"""
AI Provider abstraction layer for vision (image → SMILES) and text tasks.
Supports automatic fallback: Gemini → Groq when quota is exceeded.
"""
import os
import io
import re
import time
import base64
import traceback


# ─── Shared Chemistry Prompt ───────────────────────────────────────────────────

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


# ─── Base Provider ─────────────────────────────────────────────────────────────

class AIProvider:
    """Base class for AI providers."""
    name: str = "base"

    def analyze_image(self, image_bytes: bytes, prompt: str) -> str:
        """Send image + prompt to the AI model. Returns raw text response."""
        raise NotImplementedError

    def generate_text(self, prompt: str) -> str:
        """Send text prompt to the AI model. Returns raw text response."""
        raise NotImplementedError

    def is_available(self) -> bool:
        """Check if this provider has the required API key configured."""
        raise NotImplementedError

    @staticmethod
    def _is_quota_error(error: Exception) -> bool:
        """Check if an exception is a rate-limit / quota error."""
        err_str = str(error)
        return "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "rate_limit" in err_str.lower()


# ─── Gemini Provider ──────────────────────────────────────────────────────────

class GeminiProvider(AIProvider):
    """Google Gemini API provider (primary)."""
    name = "Gemini"

    def __init__(self):
        self._client = None

    def _get_client(self):
        if self._client is None:
            from google import genai
            api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
            if not api_key:
                raise RuntimeError("GEMINI_API_KEY not set")
            self._client = genai.Client(api_key=api_key)
        return self._client

    def is_available(self) -> bool:
        key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        return bool(key)

    def analyze_image(self, image_bytes: bytes, prompt: str) -> str:
        from google.genai import types
        client = self._get_client()
        image_part = types.Part.from_bytes(data=image_bytes, mime_type="image/png")
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[image_part, prompt]
        )
        return response.text or ""

    def generate_text(self, prompt: str) -> str:
        client = self._get_client()
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[prompt]
        )
        return response.text or ""


# ─── Groq Provider ────────────────────────────────────────────────────────────

class GroqProvider(AIProvider):
    """Groq API provider (fallback). Uses Llama 4 Scout with vision."""
    name = "Groq"
    MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"

    def __init__(self):
        self._client = None

    def _get_client(self):
        if self._client is None:
            from groq import Groq
            api_key = os.environ.get("GROQ_API_KEY")
            if not api_key:
                raise RuntimeError("GROQ_API_KEY not set")
            self._client = Groq(api_key=api_key)
        return self._client

    def is_available(self) -> bool:
        return bool(os.environ.get("GROQ_API_KEY"))

    def analyze_image(self, image_bytes: bytes, prompt: str) -> str:
        client = self._get_client()
        b64_image = base64.b64encode(image_bytes).decode("utf-8")

        response = client.chat.completions.create(
            model=self.MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{b64_image}"
                            },
                        },
                    ],
                }
            ],
            max_tokens=256,
        )
        return response.choices[0].message.content or ""

    def generate_text(self, prompt: str) -> str:
        client = self._get_client()
        response = client.chat.completions.create(
            model=self.MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1024,
        )
        return response.choices[0].message.content or ""


# ─── Provider Manager ─────────────────────────────────────────────────────────

# Singleton instances (lazy-init per provider)
_providers: list[AIProvider] | None = None


def get_providers() -> list[AIProvider]:
    """Return list of available AI providers in priority order (Gemini → Groq)."""
    global _providers
    if _providers is None:
        all_providers = [GeminiProvider(), GroqProvider()]
        _providers = [p for p in all_providers if p.is_available()]
        names = [p.name for p in _providers]
        print(f"[AIProviders] Available providers: {names}")
    return _providers


def call_with_fallback(fn_name: str, *args, **kwargs) -> str:
    """
    Call a method on each provider in order until one succeeds.
    Falls back to the next provider on quota/rate-limit errors.
    
    Usage:
        result = call_with_fallback("analyze_image", image_bytes, prompt)
        result = call_with_fallback("generate_text", prompt)
    """
    providers = get_providers()
    if not providers:
        raise RuntimeError("API_QUOTA_EXCEEDED: No AI providers configured. Set GEMINI_API_KEY or GROQ_API_KEY.")

    last_error = None
    for provider in providers:
        try:
            method = getattr(provider, fn_name)
            result = method(*args, **kwargs)
            print(f"[AIProviders] ✓ {provider.name} succeeded for {fn_name}")
            return result
        except Exception as e:
            last_error = e
            if AIProvider._is_quota_error(e):
                print(f"[AIProviders] ✗ {provider.name} quota exceeded, trying next provider...")
                continue
            else:
                # Non-quota error — still try next provider but log warning
                print(f"[AIProviders] ✗ {provider.name} error ({type(e).__name__}): {e}")
                traceback.print_exc()
                continue

    # All providers failed
    print(f"[AIProviders] All providers exhausted for {fn_name}")
    raise RuntimeError("ALL_PROVIDERS_EXHAUSTED") from last_error
