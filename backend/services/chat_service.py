"""
Chat Service — Handles multi-turn chemistry chat with streaming responses.
Automatic model fallback: tries models in priority order until one succeeds.
"""
import os
import traceback

# ─── System Prompt ─────────────────────────────────────────────────────────────

CHEMISTRY_SYSTEM_PROMPT = """You are ChemVision AI Assistant, an expert chemistry tutor and researcher.
You are knowledgeable in organic chemistry, inorganic chemistry, physical chemistry, biochemistry, and analytical chemistry.

CAPABILITIES:
- Explain molecular structures, bonding, and functional groups
- Describe chemical reactions, mechanisms, and equilibria
- Discuss physical/chemical properties of compounds
- Help with IUPAC nomenclature and naming conventions
- Interpret SMILES notation and molecular formulas
- Explain spectroscopy, thermodynamics, and kinetics concepts
- Provide safety information about chemicals

RULES:
1. Respond in the SAME LANGUAGE as the user's message (if they write in Indonesian, respond in Indonesian)
2. Use markdown formatting for clarity (bold, lists, code blocks for formulas)
3. When discussing chemical formulas, use proper notation (H₂O, CO₂, etc.)
4. Be accurate and cite well-known chemistry principles
5. If unsure, say so rather than guessing
6. Keep explanations clear and educational
"""


def build_system_prompt(chemical_context: dict | None = None) -> str:
    """Build the system prompt, optionally injecting molecule context data."""
    prompt = CHEMISTRY_SYSTEM_PROMPT

    if chemical_context:
        context_parts = ["\n\nCURRENT MOLECULE CONTEXT (the user is asking about this compound):"]

        if chemical_context.get("name"):
            context_parts.append(f"- Common Name: {chemical_context['name']}")
        if chemical_context.get("iupac_name"):
            context_parts.append(f"- IUPAC Name: {chemical_context['iupac_name']}")
        if chemical_context.get("smiles"):
            context_parts.append(f"- SMILES: {chemical_context['smiles']}")
        if chemical_context.get("formula"):
            context_parts.append(f"- Molecular Formula: {chemical_context['formula']}")
        if chemical_context.get("molecular_weight"):
            context_parts.append(f"- Molecular Weight: {chemical_context['molecular_weight']} g/mol")
        if chemical_context.get("properties"):
            props = chemical_context["properties"]
            if isinstance(props, dict):
                for k, v in props.items():
                    context_parts.append(f"- {k}: {v}")

        context_parts.append("\nUse this context to answer the user's questions about this specific compound.")
        prompt += "\n".join(context_parts)

    return prompt


# ─── Model definitions with priority order ─────────────────────────────────────

# Each entry: (provider, model_id, display_name)
# Order = fallback priority: Gemini first, then GPT, Llama, then others
MODEL_FALLBACK_CHAIN = [
    ("gemini",     "gemini-2.5-flash",                        "Gemini 2.5 Flash"),
    ("openrouter", "openai/gpt-4.1-nano",                     "GPT-4.1 Nano"),
    ("groq",       "meta-llama/llama-4-scout-17b-16e-instruct", "Llama 4 Scout"),
    ("openrouter", "openai/gpt-4.1-mini",                     "GPT-4.1 Mini"),
    ("openrouter", "google/gemma-4-31b-it:free",              "Gemma 4 31B"),
    ("openrouter", "google/gemma-4-26b-a4b-it:free",          "Gemma 4 26B MoE"),
    ("openrouter", "deepseek/deepseek-v4-flash:free",         "DeepSeek V4 Flash"),
    ("openrouter", "anthropic/claude-sonnet-4",               "Claude Sonnet 4"),
    ("openrouter", "google/gemini-3.1-flash-lite",            "Gemini 3.1 Flash Lite"),
    ("openrouter", "meta-llama/llama-4-maverick",             "Llama 4 Maverick"),
]


# ─── Provider-specific streaming (non-fallback, raises on error) ──────────────

def _stream_gemini(messages: list[dict], system_prompt: str, model_id: str):
    """Stream chat response from Google Gemini API."""
    from google import genai
    from google.genai import types

    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY not set")

    client = genai.Client(api_key=api_key)

    contents = []
    for msg in messages:
        role = "user" if msg["role"] == "user" else "model"
        contents.append(types.Content(
            role=role,
            parts=[types.Part.from_text(text=msg["content"])]
        ))

    config = types.GenerateContentConfig(
        system_instruction=system_prompt,
    )

    response = client.models.generate_content_stream(
        model=model_id,
        contents=contents,
        config=config,
    )

    for chunk in response:
        if chunk.text:
            yield chunk.text


def _stream_groq(messages: list[dict], system_prompt: str, model_id: str):
    """Stream chat response from Groq API."""
    from groq import Groq

    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY not set")

    client = Groq(api_key=api_key)

    groq_messages = [{"role": "system", "content": system_prompt}]
    for msg in messages:
        groq_messages.append({"role": msg["role"], "content": msg["content"]})

    response = client.chat.completions.create(
        model=model_id,
        messages=groq_messages,
        stream=True,
        max_tokens=4096,
    )

    for chunk in response:
        delta = chunk.choices[0].delta
        if delta and delta.content:
            yield delta.content


def _stream_openrouter(messages: list[dict], system_prompt: str, model_id: str):
    """Stream chat response from OpenRouter (OpenAI-compatible) API."""
    from openai import OpenAI

    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY not set")

    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=api_key,
        default_headers={
            "HTTP-Referer": "https://chemvision-ai.vercel.app",
            "X-Title": "ChemVision AI",
        },
    )

    or_messages = [{"role": "system", "content": system_prompt}]
    for msg in messages:
        or_messages.append({"role": msg["role"], "content": msg["content"]})

    response = client.chat.completions.create(
        model=model_id,
        messages=or_messages,
        stream=True,
        max_tokens=4096,
    )

    for chunk in response:
        if chunk.choices and chunk.choices[0].delta and chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content


_PROVIDER_FN = {
    "gemini": _stream_gemini,
    "groq": _stream_groq,
    "openrouter": _stream_openrouter,
}


# ─── Auto-fallback streaming ──────────────────────────────────────────────────

def _is_provider_available(provider: str) -> bool:
    """Check if the provider's API key is configured."""
    if provider == "gemini":
        return bool(os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY"))
    if provider == "groq":
        return bool(os.environ.get("GROQ_API_KEY"))
    if provider == "openrouter":
        return bool(os.environ.get("OPENROUTER_API_KEY"))
    return False


def stream_chat_with_fallback(messages: list[dict], chemical_context: dict | None = None):
    """
    Stream chat response with automatic model fallback.
    Tries models in priority order. On failure, moves to next model.
    
    Yields tuples of: (event_type, data)
      - ("model", model_name)   — which model is responding
      - ("content", text_chunk) — streamed text
      - ("error", message)      — all models failed
    """
    system_prompt = build_system_prompt(chemical_context)

    for provider, model_id, model_name in MODEL_FALLBACK_CHAIN:
        if not _is_provider_available(provider):
            print(f"[Chat] Skipping {model_name} — {provider} API key not set")
            continue

        stream_fn = _PROVIDER_FN[provider]

        try:
            print(f"[Chat] Trying {model_name} ({model_id})...")

            # Collect first chunk to verify the model actually works
            # before signaling the model name to the frontend
            stream = stream_fn(messages, system_prompt, model_id)
            first_chunk = next(stream, None)

            if first_chunk is None:
                print(f"[Chat] ✗ {model_name} returned empty response, trying next...")
                continue

            # Model works! Signal which model is responding, then stream
            yield ("model", model_name)
            yield ("content", first_chunk)

            for chunk in stream:
                yield ("content", chunk)

            print(f"[Chat] ✓ {model_name} completed successfully")
            return  # Success — stop trying other models

        except StopIteration:
            print(f"[Chat] ✗ {model_name} returned no content, trying next...")
            continue
        except Exception as e:
            print(f"[Chat] ✗ {model_name} failed: {type(e).__name__}: {e}")
            traceback.print_exc()
            continue  # Try next model

    # All models failed
    yield ("error", "Semua model AI gagal merespons. Silakan coba lagi nanti.")
