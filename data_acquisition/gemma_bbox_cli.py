#!/usr/bin/env python3
import argparse
import asyncio
import json
import sys
from pathlib import Path

from gemma_bbox_core import (
    Extractor,
    debug_print,
    draw_boxes,
    infer_mime_type,
    load_env_config,
    load_vaccination_records,
    validate_step1_data,
)


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
        "--debug",
        action="store_true",
        help="Print prompts/context and raw model thinking/output",
    )
    return parser.parse_args()


async def _run(args: argparse.Namespace) -> int:
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
    extractor = Extractor(
        records=records,
        whoosh_dir=whoosh_dir,
        base_url=base_url,
        api_key=api_key,
        model=args.model,
        debug=args.debug,
    )

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
        extraction = extractor.extract_from_step1(step1_data)
        step2_data = {"vaccinations": [
            {"id": v["id"], "date": v["date"], "diseases": v.get("diseases", [])}
            for v in extraction["vaccinations"]
        ]}
    else:
        extraction = await extractor.extract(image_bytes=image_bytes, mime_type=mime_type)
        step1_data = {
            "vaccinations": [
                {
                    "box_2d": v["bounding_box"],
                    "name": v.get("name", ""),
                    "date": v.get("date", ""),
                    "diseases": v.get("diseases", []),
                }
                for v in extraction["vaccinations"]
            ]
        }
        if "error" in extraction:
            step1_data = {"error": extraction["error"]}

        step1_json_path.write_text(
            json.dumps(step1_data, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

        step2_data = {"vaccinations": [
            {"id": v["id"], "date": v["date"], "diseases": v.get("diseases", [])}
            for v in extraction["vaccinations"]
        ]}

    if "vaccinations" in step1_data:
        draw_boxes(image_path, output_path, step1_data)

    step2_json_path.write_text(
        json.dumps(step2_data, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    print("Step 1 (detections):")
    print(json.dumps(step1_data, indent=2, ensure_ascii=False))
    print("\nStep 2 (assigned ids):")
    print(json.dumps(step2_data, indent=2, ensure_ascii=False))
    if "vaccinations" in step1_data:
        print(f"\nAnnotated image saved to: {output_path}")
    print(f"Step 1 JSON saved to: {step1_json_path}")
    print(f"Step 2 JSON saved to: {step2_json_path}")
    return 0


def main() -> int:
    args = parse_args()
    return asyncio.run(_run(args))


if __name__ == "__main__":
    raise SystemExit(main())
