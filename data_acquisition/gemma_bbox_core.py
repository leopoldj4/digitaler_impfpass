import asyncio
import base64
import json
import mimetypes
import os
import re
import shutil
from pathlib import Path
from typing import Any

import httpx
from dotenv import dotenv_values
from PIL import Image, ImageDraw
from whoosh import index
from whoosh.fields import ID, TEXT, Schema
from whoosh.qparser import MultifieldParser

STEP1_PROMPT = """Lese den Impfpass, auf dem Impfpass sind möglicherweise mehrere Impfungen dokumentiert. Jede Impfung ist mit folgenden Elementen tabellarisch dokumentiert: Unterschrift, Stempel, Datum, ggf. Sticker. Finde ALLE Impfungen und gebe die Bounding Boxes sowie die Daten und Namen der Impfungen zurück. Die Bounding-Boxes sollen die GESAMTE SPALTE der Dokumentation enthalten. Als Namen darfst du irgendeinen Hinweis auf den Impftyp geben (manchmal ist es handschriftlich notiert, manchmal steht es auf dem Sticker, manchmal ist es eine Tabelle mit Kreuzen). Sofern die geimpften Krankheiten mit Kreuzen markiert sind sollen dieses im diseases array der Ausgabe gespeichert werden, ansonsten bleibt dieser leer. Zum Beispiel (HiB, Diphterie, ... oder Repevax). Wenn der Name nicht genau richtig ist, ist das nicht schlimm. Das Datum soll immer mit vollem Jahr (1995, 2011, etc.) angegeben werden! At the very start of the evaluation the following should be considered: If the image is skewed, fuzzy, unclear, rotated, or otherwise deviating from a clear upright view of the passport, it should be marked as unrecognizable. For this simply return a JSON with {\"error\": \"Image content unrecognizable\"}"""

STEP1_SCHEMA_HINT = {
    "vaccinations": [
        {
            "box_2d": [100, 200, 300, 400],
            "name": "Beispiel Impfstoff",
            "date": "01.01.2024",
            "diseases": [],
        }
    ]
}

MIN_FUZZY_NAME_SCORE = 60


class Extractor:
    def __init__(
        self,
        records: list[dict[str, str]],
        whoosh_dir: Path,
        base_url: str,
        api_key: str | None,
        model: str,
        debug: bool = False,
    ) -> None:
        self.records = records
        self.whoosh_dir = whoosh_dir
        self.base_url = base_url
        self.api_key = api_key
        self.model = model
        self.debug = debug
        rebuild_whoosh_index(self.records, self.whoosh_dir)

    async def extract(self, image_bytes: bytes, mime_type: str) -> dict[str, Any]:
        step1_data = await query_step1(
            base_url=self.base_url,
            api_key=self.api_key,
            model=self.model,
            image_bytes=image_bytes,
            mime_type=mime_type,
            debug=self.debug,
        )
        return self.extract_from_step1(step1_data)

    def extract_from_step1(self, step1_data: dict[str, Any]) -> dict[str, Any]:
        if "error" in step1_data:
            return {
                "error": str(step1_data.get("error", "Unknown extraction error")),
                "vaccinations": [],
            }

        initial_guesses = build_initial_guesses(step1_data, self.whoosh_dir)
        debug_print(self.debug, "initial whoosh guesses", initial_guesses)

        step2_data = assign_from_guesses(initial_guesses, self.records, debug=self.debug)

        merged: list[dict[str, Any]] = []
        step1_vaccinations = step1_data.get("vaccinations", [])
        step2_vaccinations = step2_data.get("vaccinations", [])
        for index_pos, step1_item in enumerate(step1_vaccinations):
            step2_item = step2_vaccinations[index_pos] if index_pos < len(step2_vaccinations) else {}
            merged.append(
                {
                    "id": str(step2_item.get("id", "unbekannt")),
                    "date": str(step1_item.get("date", "")),
                    "name": str(step1_item.get("name", "")),
                    "diseases": ensure_string_list(step1_item.get("diseases", [])),
                    "bounding_box": validate_box_2d(step1_item.get("box_2d")),
                }
            )

        return {"vaccinations": merged}


def infer_mime_type(image_path: Path) -> str:
    mime, _ = mimetypes.guess_type(str(image_path))
    return mime or "image/png"


def load_env_config(env_file: Path) -> tuple[str, str | None]:
    values: dict[str, str] = {}
    if env_file.exists():
        values = {k: v for k, v in dotenv_values(env_file).items() if isinstance(v, str)}

    base_url = os.environ.get("LLAMA_CPP_BASE_URL") or values.get("LLAMA_CPP_BASE_URL")
    api_key = os.environ.get("LLAMA_CPP_API_KEY") or values.get("LLAMA_CPP_API_KEY")

    if not base_url or not base_url.strip():
        raise RuntimeError(
            f"LLAMA_CPP_BASE_URL not found in env file '{env_file}' or process environment"
        )

    clean_api_key = api_key.strip() if isinstance(api_key, str) and api_key.strip() else None
    return base_url.strip().rstrip("/"), clean_api_key


def validate_box_2d(box: Any) -> list[int]:
    if not isinstance(box, list) or len(box) != 4:
        raise ValueError(f"Invalid box_2d format: {box}")
    if not all(isinstance(v, int) for v in box):
        raise ValueError(f"box_2d must contain integers: {box}")
    return box


def scale_box_to_image(box_2d: list[int], width: int, height: int) -> tuple[int, int, int, int]:
    y1, x1, y2, x2 = box_2d
    image_x1 = int(x1 / 1000.0 * width)
    image_y1 = int(y1 / 1000.0 * height)
    image_x2 = int(x2 / 1000.0 * width)
    image_y2 = int(y2 / 1000.0 * height)

    image_x1 = max(0, min(width - 1, image_x1))
    image_x2 = max(0, min(width - 1, image_x2))
    image_y1 = max(0, min(height - 1, image_y1))
    image_y2 = max(0, min(height - 1, image_y2))

    return image_x1, image_y1, image_x2, image_y2


def _normalize_diseases_text(value: Any) -> str:
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, list):
        return ", ".join(str(v).strip() for v in value if str(v).strip())
    return str(value).strip()


def ensure_string_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return []


def load_vaccination_records(db_json_path: Path) -> list[dict[str, str]]:
    try:
        raw = json.loads(db_json_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Invalid DB JSON in {db_json_path}: {exc}") from exc

    if not isinstance(raw, list):
        raise RuntimeError("Vaccination DB JSON must be a list of records")

    records: list[dict[str, str]] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        record_id = str(item.get("id", "")).strip()
        name = str(item.get("name", "")).strip()
        diseases = _normalize_diseases_text(item.get("diseases", ""))
        if record_id and name:
            records.append({"id": record_id, "name": name, "diseases": diseases})

    if not records:
        raise RuntimeError("No valid records found in vaccination DB JSON")

    return records


def rebuild_whoosh_index(records: list[dict[str, str]], whoosh_dir: Path) -> None:
    if whoosh_dir.exists():
        shutil.rmtree(whoosh_dir)
    whoosh_dir.mkdir(parents=True, exist_ok=True)

    schema = Schema(id=ID(stored=True, unique=True), name=TEXT(stored=True), diseases=TEXT(stored=True))
    idx = index.create_in(str(whoosh_dir), schema)

    writer = idx.writer()
    for rec in records:
        writer.add_document(id=rec["id"], name=rec["name"], diseases=rec["diseases"])
    writer.commit()


def whoosh_search(whoosh_dir: Path, query: str, limit: int = 5) -> list[dict[str, str]]:
    idx = index.open_dir(str(whoosh_dir))
    parser = MultifieldParser(["name", "diseases"], schema=idx.schema)
    parsed_query = parser.parse(query)

    with idx.searcher() as searcher:
        results = searcher.search(parsed_query, limit=limit)
        return [
            {
                "id": str(hit.get("id", "")),
                "name": str(hit.get("name", "")),
                "diseases": str(hit.get("diseases", "")),
            }
            for hit in results
        ]


def image_data_url(image_bytes: bytes, mime_type: str) -> str:
    encoded = base64.b64encode(image_bytes).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


def debug_print(debug: bool, title: str, data: Any) -> None:
    if not debug:
        return

    def sanitize(obj: Any) -> Any:
        if isinstance(obj, str):
            if obj.startswith("data:") and ";base64," in obj:
                try:
                    prefix, b64 = obj.split(";base64,", 1)
                    return f"{prefix};base64,<omitted {len(b64)} bytes>"
                except Exception:
                    return "data:<omitted>"
            return obj
        if isinstance(obj, dict):
            return {k: sanitize(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [sanitize(v) for v in obj]
        return obj

    safe = sanitize(data)
    print(f"\n===== DEBUG: {title} =====")
    if isinstance(safe, str):
        print(safe)
    else:
        print(json.dumps(safe, indent=2, ensure_ascii=False))


async def call_llama_chat(
    base_url: str,
    api_key: str | None,
    payload: dict[str, Any],
    debug: bool = False,
    debug_title: str = "llama request",
) -> dict[str, Any]:
    endpoint = f"{base_url}/v1/chat/completions"
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    debug_print(debug, f"{debug_title} payload", payload)

    response_text = ""
    parsed: Any = None
    try:
        async with httpx.AsyncClient(timeout=240) as client:
            response = await client.post(endpoint, headers=headers, json=payload)
            response_text = response.text
            response.raise_for_status()
            parsed = response.json()
    except asyncio.CancelledError:
        raise
    except httpx.HTTPStatusError as exc:
        raise RuntimeError(f"llama.cpp HTTP {exc.response.status_code}: {exc.response.text}") from exc
    except httpx.RequestError as exc:
        raise RuntimeError(f"llama.cpp connection error: {exc}") from exc
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"llama.cpp returned invalid JSON: {response_text}") from exc

    if not isinstance(parsed, dict):
        raise RuntimeError(f"llama.cpp returned unexpected payload type: {type(parsed).__name__}")

    debug_print(debug, f"{debug_title} raw response", parsed)
    return parsed


def extract_json_from_text(text: str) -> dict[str, Any]:
    cleaned = text.strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if not match:
            raise RuntimeError(f"No JSON object found in model output: {text}")
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError as exc:
            raise RuntimeError(f"Invalid JSON object in model output: {text}") from exc


def extract_assistant_message(response: dict[str, Any]) -> dict[str, Any]:
    choices = response.get("choices")
    if not isinstance(choices, list) or not choices:
        raise RuntimeError(f"Invalid llama.cpp response, missing choices: {response}")
    message = choices[0].get("message")
    if not isinstance(message, dict):
        raise RuntimeError(f"Invalid llama.cpp response, missing message: {response}")
    return message


def validate_step1_data(data: dict[str, Any]) -> dict[str, Any]:
    if "error" in data:
        if not isinstance(data["error"], str) or not data["error"].strip():
            raise RuntimeError("Step 1: error must be a non-empty string")
        return {"error": data["error"].strip()}

    if "vaccinations" not in data or not isinstance(data["vaccinations"], list):
        raise RuntimeError("Step 1: response missing 'vaccinations' list")

    for item in data["vaccinations"]:
        if not isinstance(item, dict):
            raise RuntimeError(f"Step 1: invalid vaccination item: {item}")
        validate_box_2d(item.get("box_2d"))
        if not isinstance(item.get("name"), str):
            raise RuntimeError("Step 1: vaccination.name must be string")
        if not isinstance(item.get("date"), str):
            raise RuntimeError("Step 1: vaccination.date must be string")
        diseases = item.get("diseases", [])
        if not isinstance(diseases, list):
            raise RuntimeError("Step 1: vaccination.diseases must be list")

    return data


def parse_step1_response(message: dict[str, Any]) -> dict[str, Any]:
    content = message.get("content")
    if not isinstance(content, str) or not content.strip():
        raise RuntimeError(f"Step 1: missing text output: {message}")

    data = extract_json_from_text(content)
    return validate_step1_data(data)


def build_initial_guesses(
    step1_data: dict[str, Any],
    whoosh_dir: Path,
    limit: int = 5,
) -> list[dict[str, Any]]:
    guesses: list[dict[str, Any]] = []

    for item in step1_data["vaccinations"]:
        name = str(item.get("name", "")).strip()
        date = str(item.get("date", "")).strip()
        diseases = ensure_string_list(item.get("diseases", []))
        candidates = whoosh_search(whoosh_dir, name, limit=limit) if name else []
        guesses.append(
            {
                "name": name,
                "date": date,
                "diseases": diseases,
                "box_2d": item.get("box_2d"),
                "candidates": candidates,
            }
        )

    return guesses


async def query_step1(
    base_url: str,
    api_key: str | None,
    model: str,
    image_bytes: bytes,
    mime_type: str,
    debug: bool = False,
) -> dict[str, Any]:
    payload = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            f"{STEP1_PROMPT}\n\n"
                            "WICHTIG: Gib AUSSCHLIESSLICH valides JSON zurück. "
                            f"Schema-Beispiel: {json.dumps(STEP1_SCHEMA_HINT, ensure_ascii=False)}"
                        ),
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": image_data_url(image_bytes, mime_type)},
                    },
                ],
            }
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0,
        "stream": False,
        "think": True,
    }

    debug_print(debug, "step1 composed message", payload["messages"])
    response = await call_llama_chat(base_url, api_key, payload, debug=debug, debug_title="step1")
    message = extract_assistant_message(response)
    debug_print(debug, "step1 assistant message", message)
    return parse_step1_response(message)


def _disease_coverage(candidate: dict[str, str], detected: list[str]) -> int:
    candidate_diseases = candidate["diseases"].lower()
    return sum(1 for d in detected if d.lower() in candidate_diseases)


def _fuzzy_search(
    records: list[dict[str, str]],
    query: str,
    limit: int = 5,
    detected_diseases: list[str] | None = None,
) -> list[dict[str, str]]:
    q = query.lower()
    try:
        from rapidfuzz import fuzz

        def _name_score(rec: dict[str, str]) -> float:
            return float(fuzz.token_set_ratio(q, rec["name"].lower()))

    except ImportError:
        import difflib

        def _name_score(rec: dict[str, str]) -> float:
            return difflib.SequenceMatcher(None, q, rec["name"].lower()).ratio() * 100

    accepted: list[tuple[dict[str, str], float]] = []
    for rec in records:
        ns = _name_score(rec)
        name_ok = ns >= MIN_FUZZY_NAME_SCORE
        if detected_diseases:
            passes = name_ok and _disease_coverage(rec, detected_diseases) > 0
        else:
            passes = name_ok
        if passes:
            accepted.append((rec, ns))

    accepted.sort(key=lambda x: x[1], reverse=True)
    return [rec for rec, _ in accepted[:limit]]


def assign_from_guesses(
    guesses: list[dict[str, Any]],
    records: list[dict[str, str]],
    debug: bool = False,
) -> dict[str, Any]:
    vaccinations = []
    for guess in guesses:
        date = str(guess.get("date", ""))
        candidates = guess.get("candidates", [])
        name = str(guess.get("name", ""))
        diseases = ensure_string_list(guess.get("diseases", []))

        if not candidates and name:
            candidates = _fuzzy_search(records, name, detected_diseases=diseases or None)
            debug_print(debug, f"step2 fuzzy fallback for '{name}'", candidates)

        if candidates and diseases:
            candidates = sorted(
                candidates,
                key=lambda c: _disease_coverage(c, diseases),
                reverse=True,
            )
            debug_print(debug, f"step2 disease-reranked for '{name}'", candidates)

        entry: dict[str, Any] = {
            "id": str(candidates[0]["id"]) if candidates else "unbekannt",
            "date": date,
            "diseases": diseases,
        }
        vaccinations.append(entry)

    return {"vaccinations": vaccinations}


def draw_boxes(image_path: Path, output_path: Path, step1_data: dict[str, Any]) -> None:
    if "vaccinations" not in step1_data:
        return

    with Image.open(image_path).convert("RGB") as image:
        width, height = image.size
        draw = ImageDraw.Draw(image)

        for i, item in enumerate(step1_data["vaccinations"], start=1):
            box_2d = validate_box_2d(item.get("box_2d"))
            x1, y1, x2, y2 = scale_box_to_image(box_2d, width, height)
            draw.rectangle([x1, y1, x2, y2], outline="red", width=3)
            label = f"{i}: {item.get('name', '')}"
            draw.text((x1 + 4, max(0, y1 - 14)), label, fill="red")

        image.save(output_path)
