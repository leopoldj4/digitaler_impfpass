#!/usr/bin/env python3
import argparse
import base64
import json
import mimetypes
import os
import re
import shutil
import sys
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from dotenv import dotenv_values
from PIL import Image, ImageDraw
from whoosh import index
from whoosh.fields import ID, TEXT, Schema
from whoosh.qparser import QueryParser

STEP1_PROMPT = """Lese den Impfpass, auf dem Impfpass sind möglicherweise mehrere Impfungen dokumentiert. Jede Impfung ist mit folgenden Elementen tabellarisch dokumentiert: Unterschrift, Stempel, Datum, ggf. Sticker. Finde ALLE Impfungen und gebe die Bounding Boxes sowie die Daten und Namen der Impfungen zurück. Die Bounding-Boxes sollen die GESAMTE SPALTE der Dokumentation enthalten. Als Namen darfst du irgendeinen Hinweis auf den Impftyp geben (manchmal ist es handschriftlich notiert, manchmal steht es auf dem Sticker, manchmal ist es eine Tabelle mit Kreuzen). Sofern die geimpften Krankheiten mit Kreuzen markiert sind sollen dieses im diseases array der Ausgabe gespeichert werden, ansonsten bleibt dieser leer. Zum Beispiel (HiB, Diphterie, ... oder Repevax). Wenn der Name nicht genau richtig ist, ist das nicht schlimm. Das Datum soll immer mit vollem Jahr (19.11.1995, 11.09.2011, etc.) angegeben werden! Die Namen der Impfstoffe sollen ohne Chargennummer angegeben werden. At the very start of the evaluation the following should be considered: If the image is skewed, fuzzy, unclear, rotated, or otherwise deviating from a clear upright view of the passport, it should be marked as unrecognizable. For this simply return a JSON with {"error": "Image content unrecognizable"}"""

STEP1_SCHEMA_HINT = {
    "vaccinations": [
        {
            "box_2d": [100, 200, 300, 400],
            "name": "Beispiel Impfstoff",
            "date": "01.01.2024",
            "diseases": []
        }
    ]
}

STEP2_SCHEMA_HINT = {
    "vaccinations": [
        {
            "id": "vac-234",
            "date": "01.01.2024",
        }
    ]
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Two-stage Impfpass extraction + ID assignment via llama.cpp + Whoosh.",
    )
    parser.add_argument("--image", required=True, help="Input image path")
    parser.add_argument("--output", default="annotated.png", help="Output image path")
    parser.add_argument(
        "--model",
        default="gemma-4-27b-it",
        help="Model name served by llama.cpp",
    )
    parser.add_argument(
        "--env-file",
        default=".env",
        help="Env file with LLAMA_CPP_BASE_URL and optional LLAMA_CPP_API_KEY",
    )
    parser.add_argument(
        "--base-url",
        default=None,
        help="llama.cpp server base URL (overrides env), e.g. http://127.0.0.1:8080",
    )
    parser.add_argument(
        "--db-json",
        required=True,
        help="Path to vaccination JSON records (id, name, diseases)",
    )
    parser.add_argument(
        "--whoosh-dir",
        default=".whoosh_vaccinations",
        help="Whoosh index directory (rebuilt each run)",
    )
    parser.add_argument(
        "--step1-json",
        default="step1_vaccinations.json",
        help="Saved step-1 model JSON output",
    )
    parser.add_argument(
        "--step2-json",
        default="step2_assignments.json",
        help="Saved step-2 model JSON output",
    )
    parser.add_argument(
        "--step1-input-json",
        default=None,
        help="Load step-1 JSON from file and skip step-1 model call",
    )
    parser.add_argument(
        "--think",
        default=True,
        action=argparse.BooleanOptionalAction,
        help="Enable model thinking/reasoning (--no-think to disable)",
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Print prompts/context and stream model thinking/output live",
    )
    return parser.parse_args()


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

    return base_url.strip().rstrip("/"), api_key.strip() if isinstance(api_key, str) and api_key.strip() else None


def validate_box_2d(box: Any) -> list[int]:
    if not isinstance(box, list) or len(box) != 4:
        raise ValueError(f"Invalid box_2d format: {box}")
    if not all(isinstance(v, int) for v in box):
        raise ValueError(f"box_2d must contain integers: {box}")
    return box


def scale_box_to_image(box_2d: list[int], width: int, height: int) -> tuple[int, int, int, int]:
    y1, x1, y2, x2 = box_2d  # Gemma returns [ymin, xmin, ymax, xmax]
    image_x1 = int(x1 / 1000.0 * width)
    image_y1 = int(y1 / 1000.0 * height)
    image_x2 = int(x2 / 1000.0 * width)
    image_y2 = int(y2 / 1000.0 * height)

    image_x1 = max(0, min(width - 1, image_x1))
    image_x2 = max(0, min(width - 1, image_x2))
    image_y1 = max(0, min(height - 1, image_y1))
    image_y2 = max(0, min(height - 1, image_y2))

    return image_x1, image_y1, image_x2, image_y2


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
        diseases = str(item.get("diseases", "")).strip()
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
    parser = QueryParser("name", schema=idx.schema)
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
        # Remove large base64 image payloads and keep other data intact
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


def _iter_sse_lines(resp: Any) -> Any:
    """Yield lines from an SSE response without relying on Python's readline()
    buffer, which silently accumulates data before returning anything."""
    buf = b""
    while True:
        chunk = resp.read(64)
        if not chunk:
            if buf:
                yield buf.decode("utf-8", errors="replace").rstrip("\r")
            break
        buf += chunk
        while b"\n" in buf:
            line_b, buf = buf.split(b"\n", 1)
            yield line_b.decode("utf-8", errors="replace").rstrip("\r")


def _read_streaming_response(resp: Any, debug: bool, debug_title: str) -> dict[str, Any]:
    thinking_parts: list[str] = []
    content_parts: list[str] = []
    in_thinking = False
    in_content = False

    for line in _iter_sse_lines(resp):
        if not line.startswith("data: "):
            continue
        payload_str = line[6:]
        if payload_str.strip() == "[DONE]":
            break
        try:
            chunk = json.loads(payload_str)
        except json.JSONDecodeError:
            continue

        choices = chunk.get("choices")
        if not isinstance(choices, list) or not choices:
            continue
        delta = choices[0].get("delta", {})

        # llama.cpp uses "reasoning_content"; some servers use "thinking"
        thinking_tok = delta.get("reasoning_content") or delta.get("thinking") or ""
        content_tok = delta.get("content") or ""

        if thinking_tok:
            if debug and not in_thinking:
                print(f"\n===== DEBUG: {debug_title} thinking (live) =====", flush=True)
                in_thinking = True
            thinking_parts.append(thinking_tok)
            if debug:
                print(thinking_tok, end="", flush=True)

        if content_tok:
            if debug and not in_content:
                print(f"\n===== DEBUG: {debug_title} response (live) =====", flush=True)
                in_content = True
            content_parts.append(content_tok)
            if debug:
                print(content_tok, end="", flush=True)

    if debug and (in_thinking or in_content):
        print(flush=True)

    return {
        "choices": [
            {
                "message": {
                    "role": "assistant",
                    "content": "".join(content_parts),
                    "thinking": "".join(thinking_parts),
                }
            }
        ]
    }


def call_llama_chat(
    base_url: str,
    api_key: str | None,
    payload: dict[str, Any],
    debug: bool = False,
    debug_title: str = "llama request",
) -> dict[str, Any]:
    # Always stream in debug mode so both thinking and response tokens appear
    # live in the console instead of blocking until the full response arrives.
    use_stream = debug
    payload = {**payload, "stream": use_stream}

    endpoint = f"{base_url}/v1/chat/completions"
    data = json.dumps(payload).encode("utf-8")

    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    req = Request(endpoint, data=data, headers=headers, method="POST")
    debug_print(debug, f"{debug_title} payload", payload)

    try:
        with urlopen(req, timeout=2400) as resp:
            if use_stream:
                return _read_streaming_response(resp, debug, debug_title)
            body = resp.read().decode("utf-8")
    except HTTPError as exc:
        err_body = exc.read().decode("utf-8", errors="replace") if hasattr(exc, "read") else ""
        raise RuntimeError(f"llama.cpp HTTP {exc.code}: {err_body}") from exc
    except URLError as exc:
        raise RuntimeError(f"llama.cpp connection error: {exc}") from exc

    try:
        parsed = json.loads(body)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"llama.cpp returned invalid JSON: {body}") from exc

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
        diseases = [str(d).strip() for d in item.get("diseases", []) if str(d).strip()]
        search_query = _clean_query(name)
        candidates = whoosh_search(whoosh_dir, search_query, limit=limit) if search_query else []
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


def query_step1(
    base_url: str,
    api_key: str | None,
    model: str,
    image_bytes: bytes,
    mime_type: str,
    think: bool = True,
    debug: bool = False,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
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
        "repetition_penalty": 1.2,
        "stream": False,
    }
    if think:
        payload["think"] = True
    else:
        # "think": false is ignored by llama.cpp; reasoning_budget=0 actually stops it
        payload["think"] = False
        payload["reasoning_budget"] = 0

    debug_print(debug, "step1 composed message", payload["messages"])
    response = call_llama_chat(base_url, api_key, payload, debug=debug, debug_title="step1")
    message = extract_assistant_message(response)
    debug_print(debug, "step1 assistant message", message)
    return parse_step1_response(message)


MIN_FUZZY_NAME_SCORE = 30

_QUERY_NOISE_WORDS = frozenset({
    "impfung", "impfstoff", "vaccination", "vaccine", "vaccin",
    "gegen", "immunisierung", "schutzimpfung",
})


def _clean_query(name: str) -> str:
    """Remove generic vaccination terms from a detected vaccine name.

    Splits on both spaces and hyphens so 'FSME-Impfung' → 'FSME'.
    Falls back to the original string if all tokens were noise words."""
    tokens = [t for t in re.split(r"[\s\-]+", name) if t and t.lower() not in _QUERY_NOISE_WORDS]
    return " ".join(tokens) or name


def _disease_coverage(candidate: dict[str, str], detected: list[str]) -> int:
    candidate_diseases = candidate["diseases"].lower()
    return sum(1 for d in detected if d.lower() in candidate_diseases)


_EXACT_TOKEN_BONUS = 40  # added per query token found verbatim in the candidate name


def _exact_token_bonus(query: str, candidate_name: str) -> float:
    # Split on all non-alphanumeric characters (spaces, hyphens, slashes, …) so
    # "FSME-Immun" and "FSME Immun" both produce {"fsme", "immun"}.
    query_tokens = {t for t in re.split(r"\W+", query.lower()) if t}
    name_tokens = {t for t in re.split(r"\W+", candidate_name.lower()) if t}
    matched = len(query_tokens & name_tokens)
    return matched * _EXACT_TOKEN_BONUS


def _fuzzy_search(
    records: list[dict[str, str]],
    query: str,
    limit: int = 5,
    detected_diseases: list[str] | None = None,
) -> list[dict[str, str]]:
    """Gate logic:
    - With detected diseases: name score >= MIN_FUZZY_NAME_SCORE AND disease overlap > 0.
    - Without detected diseases: name score >= MIN_FUZZY_NAME_SCORE only.
    Candidates failing their gate are rejected. Survivors are ranked by fuzzy name
    score plus a bonus for each query token that appears verbatim in the candidate name."""
    q = query.lower()
    try:
        from rapidfuzz import fuzz
        def _name_score(rec: dict[str, str]) -> float:
            return float(fuzz.token_set_ratio(q, rec["name"].lower()))
    except ImportError:
        import difflib
        def _name_score(rec: dict[str, str]) -> float:  # type: ignore[misc]
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
            bonus = _exact_token_bonus(query, rec["name"])
            accepted.append((rec, ns + bonus))

    accepted.sort(key=lambda x: x[1], reverse=True)
    return [rec for rec, _ in accepted[:limit]]


def assign_from_guesses(
    guesses: list[dict[str, Any]],
    records: list[dict[str, str]],
    debug: bool = False,
) -> dict[str, Any]:
    vaccinations = []
    for guess in guesses:
        date = guess.get("date", "")
        candidates = guess.get("candidates", [])
        name = guess.get("name", "")
        diseases = guess.get("diseases", [])

        # Apply disease gate to Whoosh results: when diseases are known, only keep
        # candidates that cover at least one of them.
        if candidates and diseases:
            candidates = [c for c in candidates if _disease_coverage(c, diseases) > 0]
            debug_print(debug, f"step2 whoosh after disease gate for '{name}'", candidates)

        # Fuzzy fallback when Whoosh returned nothing or all were filtered out.
        if not candidates and name:
            candidates = _fuzzy_search(records, _clean_query(name), detected_diseases=diseases or None)
            debug_print(debug, f"step2 fuzzy fallback for '{name}'", candidates)

        # Among surviving candidates, prefer highest disease coverage.
        if len(candidates) > 1 and diseases:
            candidates = sorted(candidates, key=lambda c: _disease_coverage(c, diseases), reverse=True)
            debug_print(debug, f"step2 disease-reranked for '{name}'", candidates)

        entry: dict[str, Any] = {"id": str(candidates[0]["id"]) if candidates else "unbekannt", "date": date}
        if diseases:
            entry["diseases"] = diseases
        vaccinations.append(entry)

    return {"vaccinations": vaccinations}


def draw_boxes(image_path: Path, output_path: Path, step1_data: dict[str, Any]) -> None:
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


def main() -> int:
    args = parse_args()

    image_path = Path(args.image)
    if not image_path.exists():
        print(f"Error: image not found: {image_path}", file=sys.stderr)
        return 1

    db_json_path = Path(args.db_json)
    if not db_json_path.exists():
        print(f"Error: DB JSON not found: {db_json_path}", file=sys.stderr)
        return 1

    env_file = Path(args.env_file)
    try:
        env_base_url, api_key = load_env_config(env_file)
    except RuntimeError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    base_url = args.base_url.strip().rstrip("/") if isinstance(args.base_url, str) and args.base_url.strip() else env_base_url

    output_path = Path(args.output)
    step1_json_path = Path(args.step1_json)
    step2_json_path = Path(args.step2_json)
    whoosh_dir = Path(args.whoosh_dir)

    records = load_vaccination_records(db_json_path)
    rebuild_whoosh_index(records, whoosh_dir)

    mime_type = infer_mime_type(image_path)
    image_bytes = image_path.read_bytes()

    if args.step1_input_json:
        step1_input_path = Path(args.step1_input_json)
        if not step1_input_path.exists():
            print(f"Error: step1 input JSON not found: {step1_input_path}", file=sys.stderr)
            return 1
        try:
            loaded_step1 = json.loads(step1_input_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            print(f"Error: invalid step1 input JSON: {exc}", file=sys.stderr)
            return 1
        if not isinstance(loaded_step1, dict):
            print("Error: step1 input JSON must be an object", file=sys.stderr)
            return 1
        step1_data = validate_step1_data(loaded_step1)
        debug_print(args.debug, "loaded step1 input json", step1_data)
    else:
        step1_data = query_step1(
            base_url,
            api_key,
            args.model,
            image_bytes,
            mime_type,
            think=args.think,
            debug=args.debug,
        )
        step1_json_path.write_text(
            json.dumps(step1_data, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

    initial_guesses = build_initial_guesses(step1_data, whoosh_dir)
    debug_print(args.debug, "initial whoosh guesses", initial_guesses)

    step2_data = assign_from_guesses(initial_guesses, records, debug=args.debug)

    draw_boxes(image_path, output_path, step1_data)
    step2_json_path.write_text(
        json.dumps(step2_data, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    print("Step 1 (detections):")
    print(json.dumps(step1_data, indent=2, ensure_ascii=False))
    print("\nStep 2 (assigned ids):")
    print(json.dumps(step2_data, indent=2, ensure_ascii=False))
    print(f"\nAnnotated image saved to: {output_path}")
    print(f"Step 1 JSON saved to: {step1_json_path}")
    print(f"Step 2 JSON saved to: {step2_json_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
