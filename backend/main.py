import json
import traceback

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import uvicorn
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

from services.nlp_service import translate_and_get_smiles
from services.vision_service import process_image_to_smiles
from services.chemistry_service import get_chemical_data_from_smiles
from services.chat_service import stream_chat_with_fallback

app = FastAPI(title="Chemistry Analysis Platform API")

# Configure CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TextQuery(BaseModel):
    query: str


class ChatRequest(BaseModel):
    messages: list[dict]
    chemical_context: dict | None = None


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}


@app.post("/api/analyze/text")
async def analyze_text(payload: TextQuery):
    query = payload.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    # 1. Translate Indonesian IUPAC to SMILES
    smiles, english_name, search_type = translate_and_get_smiles(query)

    if not smiles:
        raise HTTPException(
            status_code=404,
            detail=f"Senyawa tidak ditemukan untuk: {query}",
        )

    # 2. Get Chemical Data from SMILES
    chemical_data = get_chemical_data_from_smiles(smiles)
    chemical_data["search_term"] = query
    chemical_data["english_name"] = english_name
    chemical_data["search_type"] = search_type

    return chemical_data


@app.post("/api/analyze/image")
async def analyze_image(file: UploadFile = File(...)):
    image_bytes = await file.read()

    # 1. Process Image to SMILES
    try:
        smiles = process_image_to_smiles(image_bytes)
    except RuntimeError as e:
        err_msg = str(e)
        if "QUOTA" in err_msg or "EXHAUSTED" in err_msg:
            raise HTTPException(
                status_code=429,
                detail="Kuota telah habis untuk saat ini. Silakan coba lagi dalam beberapa menit, atau gunakan fitur pencarian teks sebagai alternatif.",
            )
        print(f"Error processing image: {e}")
        raise HTTPException(
            status_code=500,
            detail="Terjadi kesalahan internal saat memproses gambar.",
        )
    except Exception as e:
        print(f"Error processing image: {e}")
        smiles = None

    if not smiles:
        raise HTTPException(
            status_code=400,
            detail="Struktur kimia tidak terdeteksi dari gambar. Coba ambil gambar yang lebih jelas, terang, dan pastikan seluruh molekul terlihat.",
        )

    # 2. Get Chemical Data from SMILES
    chemical_data = get_chemical_data_from_smiles(smiles)
    chemical_data["source"] = "Image Recognition"

    return chemical_data


# ─── Chat AI Endpoint ─────────────────────────────────────────────────────────


@app.post("/api/chat")
async def chat(payload: ChatRequest):
    """Streaming chat with automatic model fallback via SSE."""
    if not payload.messages:
        raise HTTPException(status_code=400, detail="Messages cannot be empty")

    def event_stream():
        try:
            for event_type, data in stream_chat_with_fallback(
                messages=payload.messages,
                chemical_context=payload.chemical_context,
            ):
                if event_type == "model":
                    yield f"data: {json.dumps({'model': data})}\n\n"
                elif event_type == "content":
                    yield f"data: {json.dumps({'content': data})}\n\n"
                elif event_type == "error":
                    yield f"data: {json.dumps({'error': data})}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            traceback.print_exc()
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
