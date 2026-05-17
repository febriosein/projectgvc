"""
Chat Service — Handles multi-turn chemistry chat with streaming responses.
Supports multiple AI providers (Gemini, Groq, OpenRouter) with model selection.
"""
import os
import json
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


# ─── Provider-specific streaming ───────────────────────────────────────────────

def _stream_gemini(messages: list[dict], system_prompt: str, model_id: str):
    """Stream chat response from Google Gemini API."""
    from google import genai
    from google.genai import types

    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY not set")

    client = genai.Client(api_key=api_key)

    # Build content list for Gemini
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
        model=model_id or "gemini-2.5-flash",
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
        model=model_id or "meta-llama/llama-4-scout-17b-16e-instruct",
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
        model=model_id or "openrouter/auto",
        messages=or_messages,
        stream=True,
        max_tokens=4096,
    )

    for chunk in response:
        if chunk.choices and chunk.choices[0].delta and chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content


# ─── Provider routing ──────────────────────────────────────────────────────────

_PROVIDER_MAP = {
    "gemini": _stream_gemini,
    "groq": _stream_groq,
    "openrouter": _stream_openrouter,
}


def stream_chat(messages: list[dict], provider_id: str, model_id: str | None = None,
                chemical_context: dict | None = None):
    """
    Stream chat response from the selected provider.
    Yields text chunks as they arrive from the AI model.
    """
    system_prompt = build_system_prompt(chemical_context)

    stream_fn = _PROVIDER_MAP.get(provider_id)
    if not stream_fn:
        raise ValueError(f"Unknown provider: {provider_id}")

    yield from stream_fn(messages, system_prompt, model_id or "")


# ─── Available models registry ────────────────────────────────────────────────

def get_available_models() -> list[dict]:
    """Return list of all available AI models grouped by provider."""
    models = []

    # Gemini (direct API)
    if os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY"):
        models.append({
            "id": "gemini-2.5-flash",
            "name": "Gemini 2.5 Flash",
            "provider": "gemini",
            "provider_name": "Google",
            "icon": "auto_awesome",
            "description": "Model cepat dan efisien dari Google",
            "free": True,
        })

    # Groq (direct API)
    if os.environ.get("GROQ_API_KEY"):
        models.append({
            "id": "meta-llama/llama-4-scout-17b-16e-instruct",
            "name": "Llama 4 Scout",
            "provider": "groq",
            "provider_name": "Meta (via Groq)",
            "icon": "bolt",
            "description": "Model open-source cepat via Groq",
            "free": True,
        })

    # OpenRouter models
    if os.environ.get("OPENROUTER_API_KEY"):
        openrouter_models = [
            {
                "id": "openai/gpt-4.1-mini",
                "name": "GPT-4.1 Mini",
                "provider": "openrouter",
                "provider_name": "OpenAI",
                "icon": "psychology",
                "description": "Model cerdas dan efisien dari OpenAI",
                "free": False,
            },
            {
                "id": "openai/gpt-4.1-nano",
                "name": "GPT-4.1 Nano",
                "provider": "openrouter",
                "provider_name": "OpenAI",
                "icon": "psychology",
                "description": "Model ringan dan cepat dari OpenAI",
                "free": False,
            },
            {
                "id": "anthropic/claude-sonnet-4",
                "name": "Claude Sonnet 4",
                "provider": "openrouter",
                "provider_name": "Anthropic",
                "icon": "smart_toy",
                "description": "Model analitis dan kreatif dari Anthropic",
                "free": False,
            },
            {
                "id": "deepseek/deepseek-chat-v3-0324:free",
                "name": "DeepSeek V3 (Free)",
                "provider": "openrouter",
                "provider_name": "DeepSeek",
                "icon": "explore",
                "description": "Model gratis dan powerful dari DeepSeek",
                "free": True,
            },
            {
                "id": "google/gemini-2.5-flash-preview-05-20",
                "name": "Gemini 2.5 Flash Preview",
                "provider": "openrouter",
                "provider_name": "Google (via OpenRouter)",
                "icon": "auto_awesome",
                "description": "Gemini terbaru via OpenRouter",
                "free": False,
            },
            {
                "id": "google/gemma-3-27b-it:free",
                "name": "Gemma 3 27B (Free)",
                "provider": "openrouter",
                "provider_name": "Google",
                "icon": "diamond",
                "description": "Model open-source gratis dari Google",
                "free": True,
            },
            {
                "id": "meta-llama/llama-4-maverick:free",
                "name": "Llama 4 Maverick (Free)",
                "provider": "openrouter",
                "provider_name": "Meta",
                "icon": "bolt",
                "description": "Model Llama terbaru gratis dari Meta",
                "free": True,
            },
        ]
        models.extend(openrouter_models)

    return models
