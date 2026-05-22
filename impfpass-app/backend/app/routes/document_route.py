"""FastAPI Router für Impfpass-Dokument-Upload und -Abruf."""

import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import AuditLog, Patient, VaccinationDocument
from app.schemas.document_schema import DocumentResponse

router = APIRouter(prefix="/api/v1/documents", tags=["Dokumente"])

# Uploads-Verzeichnis relativ zum Backend-Root
UPLOAD_ROOT = Path(__file__).parent.parent.parent / "uploads"


def _ensure_dir(patient_id: int) -> Path:
    """Erstellt das Upload-Verzeichnis für einen Patienten falls nötig."""
    path = UPLOAD_ROOT / str(patient_id)
    path.mkdir(parents=True, exist_ok=True)
    return path


@router.post(
    "/upload",
    response_model=list[DocumentResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Impfpass-Scan-Fotos hochladen",
)
async def upload_documents(
    patient_id: int = Form(...),
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
) -> list[DocumentResponse]:
    """Lädt ein oder mehrere Scan-Fotos für einen Patienten hoch.

    Unterstützte Formate: JPG, PNG, WEBP, PDF.
    Jede Datei wird unter uploads/{patient_id}/{uuid}_{originalname} gespeichert.
    """
    # Patient prüfen
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Patient {patient_id} nicht gefunden.")

    ALLOWED = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
    upload_dir = _ensure_dir(patient_id)
    saved: list[VaccinationDocument] = []

    try:
        for idx, file in enumerate(files):
            if file.content_type not in ALLOWED:
                raise HTTPException(
                    status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                    detail=f"Nicht unterstützter Dateityp: {file.content_type}",
                )

            # Eindeutiger Dateiname um Kollisionen zu vermeiden
            ext = Path(file.filename or "file").suffix.lower() or ".jpg"
            unique_name = f"{uuid.uuid4().hex}{ext}"
            dest = upload_dir / unique_name

            # Datei asynchron schreiben
            content = await file.read()
            dest.write_bytes(content)

            # Relativer Pfad für URL-Generierung: {patient_id}/{unique_name}
            rel_path = f"{patient_id}/{unique_name}"
            file_type = ext.lstrip(".")

            doc = VaccinationDocument(
                patient_id=patient_id,
                file_name=file.filename or unique_name,
                file_path=rel_path,
                file_type=file_type,
                page_number=idx + 1,
            )
            db.add(doc)
            saved.append(doc)

        # Audit-Log Eintrag
        db.add(AuditLog(
            patient_id=patient_id,
            action="UPLOAD",
            new_value=f"{len(saved)} Dokument(e) hochgeladen",
            performed_by="arzt-upload",
        ))

        db.commit()
        for doc in saved:
            db.refresh(doc)

    except HTTPException:
        raise
    except (SQLAlchemyError, OSError) as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Fehler beim Hochladen: {str(e)}") from e

    return [DocumentResponse.model_validate(doc) for doc in saved]


@router.get(
    "/{patient_id}",
    response_model=list[DocumentResponse],
    summary="Alle Dokumente eines Patienten abrufen",
)
def list_documents(patient_id: int, db: Session = Depends(get_db)) -> list[DocumentResponse]:
    """Gibt alle hochgeladenen Scan-Dokumente eines Patienten zurück."""
    docs = (
        db.query(VaccinationDocument)
        .filter(VaccinationDocument.patient_id == patient_id)
        .order_by(VaccinationDocument.page_number, VaccinationDocument.uploaded_at)
        .all()
    )
    return [DocumentResponse.model_validate(doc) for doc in docs]
