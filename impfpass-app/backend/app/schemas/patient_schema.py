"""Pydantic Schemas für Patienten-Endpunkte."""

from datetime import date, datetime

from pydantic import BaseModel

from app.schemas.document_schema import DocumentResponse
from app.schemas.vaccination_schema import VaccinationResponse


class PatientListItem(BaseModel):
    """Kompakte Patientenansicht für die Sidebar-Liste."""

    id: int
    first_name: str
    last_name: str
    birth_date: date
    vaccination_count: int
    needs_review_count: int

    model_config = {"from_attributes": True}


class PatientDetail(BaseModel):
    """Vollständige Patientenansicht inkl. aller Impfeinträge."""

    id: int
    first_name: str
    last_name: str
    birth_date: date
    created_at: datetime
    vaccinations: list[VaccinationResponse]
    documents: list[DocumentResponse] = []

    model_config = {"from_attributes": True}
