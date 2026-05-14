"""
AI Provider abstraction layer for Vercel serverless deployment.
Supports automatic fallback: Gemini → Groq when quota is exceeded.
Lightweight version without RDKit.
"""
import os
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


# ─── Base Provider ─────────────────────────────────────────────────────────────

class AIProvider:
    name: str = "base"

    def analyze_image(self, image_bytes: bytes, prompt: str) -> str:
        raise NotImplementedError

    def generate_text(self, prompt: str) -> str:
        raise NotImplementedError

    def is_available(self) -> bool:
        raise NotImplementedError

    @staticmethod
    def _is_quota_error(error: Exception) -> bool:
        err_str = str(error)
        return "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "rate_limit" in err_str.lower()


# ─── Gemini Provider ──────────────────────────────────────────────────────────

class GeminiProvider(AIProvider):
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
        client = self._get_client()
        image_part = {"mime_type": "image/png", "data": image_bytes}
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
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64_image}"}},
                ],
            }],
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

_providers = None

def get_providers():
    global _providers
    if _providers is None:
        all_providers = [GeminiProvider(), GroqProvider()]
        _providers = [p for p in all_providers if p.is_available()]
        names = [p.name for p in _providers]
        print(f"[AIProviders] Available providers: {names}")
    return _providers


def call_with_fallback(fn_name: str, *args, **kwargs) -> str:
    providers = get_providers()
    if not providers:
        raise RuntimeError("ALL_PROVIDERS_EXHAUSTED: No AI providers configured.")

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
                print(f"[AIProviders] ✗ {provider.name} quota exceeded, trying next...")
                continue
            else:
                print(f"[AIProviders] ✗ {provider.name} error: {e}")
                continue

    raise RuntimeError("ALL_PROVIDERS_EXHAUSTED") from last_error
