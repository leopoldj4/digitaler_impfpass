"""Client für den Rust-basierten Image Extractor Service."""

import os
from dataclasses import dataclass, field

import httpx

EXTRACTOR_URL = os.getenv("EXTRACTOR_URL", "http://127.0.0.1:8080")


@dataclass
class ExtractedVaccination:
    name: str
    date: str | None


@dataclass
class ExtractionResult:
    vaccinations: list[ExtractedVaccination] = field(default_factory=list)
    error: str | None = None


async def extract_from_image(image_bytes: bytes) -> ExtractionResult:
    """Sendet ein Bild an den Extractor-Service und gibt strukturierte Impfdaten zurück.

    Gibt ein leeres Ergebnis zurück wenn der Extractor nicht erreichbar ist,
    damit der Upload-Flow nicht blockiert wird.
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{EXTRACTOR_URL}/extract",
                content=image_bytes,
                headers={"Content-Type": "application/octet-stream"},
            )
            resp.raise_for_status()
            data = resp.json()
            vaccinations = [
                ExtractedVaccination(name=v["name"], date=v.get("date"))
                for v in data.get("vaccinations", [])
            ]
            return ExtractionResult(vaccinations=vaccinations)
    except Exception as e:
        return ExtractionResult(error=str(e))
