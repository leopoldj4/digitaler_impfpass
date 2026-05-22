"""Pydantic Schemas für Impf-Endpunkte."""

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, Field


class VaccinationResponse(BaseModel):
    """Vollständige Impfeintrags-Darstellung für API-Antworten."""

    id: int
    patient_id: int
    vaccine_name: str
    vaccine_type: str | None
    manufacturer: str | None
    batch_number: str | None
    vaccination_date: date | None
    valid_until: date | None
    indication: str | None
    doctor_stamp: str | None
    is_verified: bool
    verified_at: datetime | None
    verified_by: str | None
    confidence_score: float | None
    needs_review: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class VaccinationUpdate(BaseModel):
    """Felder die ein Arzt an einem Impfeintrag ändern darf (alle optional)."""

    vaccine_name: str | None = Field(None, min_length=1, max_length=200)
    vaccine_type: str | None = Field(None, max_length=100)
    manufacturer: str | None = Field(None, max_length=200)
    batch_number: str | None = Field(None, max_length=100)
    vaccination_date: date | None = None
    valid_until: date | None = None
    indication: str | None = Field(None, max_length=200)
    doctor_stamp: str | None = None
    needs_review: bool | None = None


class VerifyResponse(BaseModel):
    """Antwort nach erfolgreicher Verifikation."""

    id: int
    is_verified: bool
    verified_at: datetime
    verified_by: str
    message: str
