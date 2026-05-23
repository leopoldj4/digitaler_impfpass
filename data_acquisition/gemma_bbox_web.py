#!/usr/bin/env python3
import argparse
import asyncio
import json
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from gemma_bbox_core import Extractor, load_env_config, load_vaccination_records


class ErrorResponse(BaseModel):
    error: str


class ExtractionItem(BaseModel):
    id: str
    date: str
    bounding_box: list[float] = Field(min_length=4, max_length=4)
    diseases: list[str] = Field(default_factory=list)


class ExtractionResponse(BaseModel):
    vaccinations: list[ExtractionItem]


class AppState:
    extractor: Extractor | None = None


state = AppState()


app = FastAPI(
    title="extractor",
    version="0.1.0",
    description="Impfpass extraction API",
)


@app.get("/", response_class=JSONResponse)
async def hello() -> dict[str, str]:
    return {"status": "ok"}


@app.post(
    "/extract",
    response_model=ExtractionResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid image upload."},
        408: {"model": ErrorResponse, "description": "Client disconnected during processing."},
        500: {"model": ErrorResponse, "description": "Extraction failed."},
    },
)
async def extract_image(request: Request) -> dict[str, Any]:
    if state.extractor is None:
        raise HTTPException(status_code=500, detail="Server extractor is not initialized")

    content_type = request.headers.get("content-type", "").split(";")[0].strip().lower()
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Content-Type must be image/*")

    image_bytes = await request.body()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Request body must contain image bytes")

    extract_task = asyncio.create_task(state.extractor.extract(image_bytes=image_bytes, mime_type=content_type))

    try:
        while not extract_task.done():
            if await request.is_disconnected():
                extract_task.cancel()
                raise HTTPException(status_code=408, detail="Client disconnected")
            await asyncio.sleep(0.1)

        result = await extract_task
    except asyncio.CancelledError:
        raise HTTPException(status_code=408, detail="Client disconnected")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    if "error" in result:
        raise HTTPException(status_code=400, detail=str(result["error"]))

    return result


@app.get("/openapi.json")
async def openapi_spec() -> dict[str, Any]:
    return app.openapi()


@app.exception_handler(HTTPException)
async def http_error_handler(_: Request, exc: HTTPException) -> JSONResponse:
    detail_text = str(exc.detail) if exc.detail else "HTTP error"
    return JSONResponse(status_code=exc.status_code, content={"error": detail_text})


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run extractor web API")
    parser.add_argument("--host", default="0.0.0.0", help="Server host")
    parser.add_argument("--port", type=int, default=8000, help="Server port")
    parser.add_argument("--model", default="gemma-4-27b-it", help="Model name served by llama.cpp")
    parser.add_argument("--env-file", default=".env", help="Path to env file")
    parser.add_argument("--base-url", default=None, help="llama.cpp base URL override")
    parser.add_argument("--db-json", default="vaccines.json", help="Path to vaccination JSON records")
    parser.add_argument("--whoosh-dir", default=".whoosh_vaccinations_api", help="Whoosh index directory")
    parser.add_argument("--debug", action="store_true", help="Enable debug logging")
    parser.add_argument(
        "--write-openapi",
        default=None,
        help="Optional path to write generated OpenAPI JSON and exit",
    )
    return parser.parse_args()


def init_extractor(args: argparse.Namespace) -> None:
    env_base_url, api_key = load_env_config(Path(args.env_file))
    base_url = args.base_url.strip().rstrip("/") if isinstance(args.base_url, str) and args.base_url.strip() else env_base_url
    records = load_vaccination_records(Path(args.db_json))
    state.extractor = Extractor(
        records=records,
        whoosh_dir=Path(args.whoosh_dir),
        base_url=base_url,
        api_key=api_key,
        model=args.model,
        debug=args.debug,
    )


def main() -> int:
    args = parse_args()

    init_extractor(args)

    if args.write_openapi:
        Path(args.write_openapi).write_text(json.dumps(app.openapi(), ensure_ascii=False), encoding="utf-8")
        return 0

    import uvicorn

    uvicorn.run(app, host=args.host, port=args.port)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
