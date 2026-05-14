# pyrefly: ignore [missing-import]
import pubchempy as pcp

# Rule-based dictionary: Indonesian chemical terms → English
ID_TO_EN_DICT = {
    "asam": "acid",
    "asetat": "acetic",
    "klorida": "chloride",
    "natrium": "sodium",
    "kalium": "potassium",
    "air": "water",
    "metana": "methane",
    "etana": "ethane",
    "propana": "propane",
    "butana": "butane",
    "pentana": "pentane",
    "heksana": "hexane",
    "heptana": "heptane",
    "oktana": "octane",
    "nonana": "nonane",
    "dekana": "decane",
    "etanol": "ethanol",
    "metanol": "methanol",
    "benzena": "benzene",
    "toluena": "toluene",
    "fenol": "phenol",
    "hidrogen": "hydrogen",
    "oksigen": "oxygen",
    "nitrogen": "nitrogen",
    "karbon": "carbon",
    "dioksida": "dioxide",
    "monoksida": "monoxide",
    "amonia": "ammonia",
    "sulfat": "sulfate",
    "nitrat": "nitrate",
    "karbonat": "carbonate",
    "glukosa": "glucose",
    "sukrosa": "sucrose",
    "fruktosa": "fructose",
    "urea": "urea",
    "asetilena": "acetylene",
    "gliserol": "glycerol",
    "formaldehida": "formaldehyde",
    "aseton": "acetone",
}


def translate_indonesian_to_english(query: str) -> str:
    """Translates Indonesian chemical name to English via rule-based replacement."""
    words = query.lower().split()
    translated_words = []

    for word in words:
        if word in ID_TO_EN_DICT:
            translated_words.append(ID_TO_EN_DICT[word])
        else:
            word = word.replace("metil", "methyl")
            word = word.replace("etil", "ethyl")
            word = word.replace("propil", "propyl")
            word = word.replace("butil", "butyl")
            translated_words.append(word)

    # Indonesian "Asam X" → English "X acid"
    if translated_words and translated_words[0] == "acid":
        translated_words.append(translated_words.pop(0))

    return " ".join(translated_words)


import re


def _looks_like_formula(text: str) -> bool:
    """Check if the text looks like a chemical formula (e.g. H2O, NaCl, C6H12O6)."""
    pattern = r'^[A-Z][a-z]?(\d+)?([A-Z][a-z]?(\d+)?)*$'
    return bool(re.match(pattern, text.strip()))


def translate_and_get_smiles(query: str):
    """
    Cascade search: tries translated name → direct name → formula.
    Supports IUPAC names, common names (ID/EN), and chemical formulas.
    Returns (SMILES string, matched_name, search_type).
    """
    english_name = translate_indonesian_to_english(query)

    # --- Step 1: Search by translated name ---
    try:
        compounds = pcp.get_compounds(english_name, "name")
        if compounds:
            return compounds[0].isomeric_smiles, english_name, "name"
    except Exception as e:
        print(f"[Step 1] PubChem name search (translated) error: {e}")

    # --- Step 2: Search by original query as name ---
    try:
        compounds_direct = pcp.get_compounds(query, "name")
        if compounds_direct:
            return compounds_direct[0].isomeric_smiles, query, "name"
    except Exception as e:
        print(f"[Step 2] PubChem name search (direct) error: {e}")

    # --- Step 3: Search by formula ---
    if _looks_like_formula(query):
        try:
            compounds_formula = pcp.get_compounds(query, "formula")
            if compounds_formula:
                comp = compounds_formula[0]
                display_name = comp.iupac_name or (
                    comp.synonyms[0] if comp.synonyms else query
                )
                return comp.isomeric_smiles, display_name, "formula"
        except Exception as e:
            print(f"[Step 3] PubChem formula search error: {e}")

    return None, english_name, None
