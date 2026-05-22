"""Pydantic Schemas für den /api/v1/import Endpunkt."""

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Request Schemas (eingehend vom Scan-Team)
# ---------------------------------------------------------------------------

class PatientImport(BaseModel):
    """Patientendaten aus dem OCR-JSON."""

    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    birth_date: date


class VaccinationImport(BaseModel):
    """Einzelner Impfeintrag aus dem OCR-JSON."""

    vaccine_name: str = Field(..., min_length=1, max_length=200)
    vaccine_type: str | None = Field(None, max_length=100)
    manufacturer: str | None = Field(None, max_length=200)
    batch_number: str | None = Field(None, max_length=100)
    vaccination_date: date | None = None
    valid_until: date | None = None
    indication: str | None = Field(None, max_length=200)
    doctor_stamp: str | None = None
    confidence_score: float | None = Field(None, ge=0.0, le=1.0)
    needs_review: bool = True

    @field_validator("confidence_score")
    @classmethod
    def confidence_sets_review(cls, v: float | None, info: Any) -> float | None:
        """needs_review wird automatisch gesetzt wenn confidence_score < 0.75."""
        return v


class ImportRequest(BaseModel):
    """Vollständige Import-Payload vom Scan-Team."""

    patient: PatientImport
    vaccinations: list[VaccinationImport] = Field(..., min_length=1)


# ---------------------------------------------------------------------------
# Response Schemas (ausgehend an den Aufrufer)
# ---------------------------------------------------------------------------

class ImportResponse(BaseModel):
    """Antwort nach erfolgreichem Import."""

    patient_id: int
    patient_created: bool = Field(..., description="True = neu angelegt, False = bereits vorhanden")
    vaccinations_imported: int
    message: str
