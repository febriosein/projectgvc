"""
Vercel Serverless Function – FastAPI entry point.
All /api/* requests are routed here by vercel.json rewrites.
"""
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from api.services.nlp_service import translate_and_get_smiles
from api.services.vision_service import process_image_to_smiles
from api.services.chemistry_service import get_chemical_data_from_smiles

app = FastAPI(title="ChemVision AI – Vercel Serverless")

# CORS – allow frontend on same Vercel domain + localhost for dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TextQuery(BaseModel):
    query: str


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}


@app.post("/api/analyze/text")
async def analyze_text(payload: TextQuery):
    query = payload.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    smiles, english_name, search_type = translate_and_get_smiles(query)

    if not smiles:
        raise HTTPException(
            status_code=404,
            detail=f"Senyawa tidak ditemukan untuk: {query}",
        )

    chemical_data = get_chemical_data_from_smiles(smiles)
    chemical_data["search_term"] = query
    chemical_data["english_name"] = english_name
    chemical_data["search_type"] = search_type
    return chemical_data


@app.post("/api/analyze/image")
async def analyze_image(file: UploadFile = File(...)):
    image_bytes = await file.read()

    smiles = process_image_to_smiles(image_bytes)

    if not smiles:
        raise HTTPException(
            status_code=400,
            detail="Struktur kimia tidak terdeteksi dari gambar",
        )

    chemical_data = get_chemical_data_from_smiles(smiles)
    chemical_data["source"] = "Image Recognition"
    return chemical_data
