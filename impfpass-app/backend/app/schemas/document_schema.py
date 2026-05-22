"""Pydantic Schemas für Impfpass-Dokumente (Scan-Fotos)."""

from datetime import datetime
from pydantic import BaseModel, computed_field


class DocumentResponse(BaseModel):
    """Einzelnes Dokument in der API-Antwort."""

    id: int
    patient_id: int
    file_name: str
    file_path: str
    file_type: str
    page_number: int | None
    uploaded_at: datetime

    @computed_field
    @property
    def url(self) -> str:
        """Öffentliche URL zum Abrufen der Datei."""
        return f"/uploads/{self.file_path}"

    model_config = {"from_attributes": True}


class UploadResponse(BaseModel):
    """Antwort nach Dokumenten-Upload, inkl. Anzahl per AI extrahierter Impfeinträge."""

    documents: list[DocumentResponse]
    extracted_count: int
