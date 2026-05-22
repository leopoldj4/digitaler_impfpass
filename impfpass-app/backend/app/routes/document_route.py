"""FastAPI Router für Impfpass-Dokument-Upload und -Abruf."""

import uuid
from datetime import date as date_type
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import AuditLog, Patient, Vaccination, VaccinationDocument
from app.schemas.document_schema import DocumentResponse, UploadResponse
from app.services.extractor_service import extract_from_image

router = APIRouter(prefix="/api/v1/documents", tags=["Dokumente"])

UPLOAD_ROOT = Path(__file__).parent.parent.parent / "uploads"
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


def _ensure_dir(patient_id: int) -> Path:
    path = UPLOAD_ROOT / str(patient_id)
    path.mkdir(parents=True, exist_ok=True)
    return path


@router.post(
    "/upload",
    response_model=UploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Impfpass-Scan-Fotos hochladen",
)
async def upload_documents(
    patient_id: int = Form(...),
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
) -> UploadResponse:
    """Lädt ein oder mehrere Scan-Fotos für einen Patienten hoch.

    Für Bildformate (JPG, PNG, WEBP) wird automatisch der AI-Extractor aufgerufen
    um Impfeinträge zu extrahieren. Wenn der Extractor nicht läuft, gelingt der
    Upload trotzdem (graceful degradation).
    """
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Patient {patient_id} nicht gefunden.")

    upload_dir = _ensure_dir(patient_id)
    saved: list[VaccinationDocument] = []
    image_payloads: list[bytes] = []

    try:
        for idx, file in enumerate(files):
            if file.content_type not in ALLOWED_TYPES:
                raise HTTPException(
                    status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                    detail=f"Nicht unterstützter Dateityp: {file.content_type}",
                )

            ext = Path(file.filename or "file").suffix.lower() or ".jpg"
            unique_name = f"{uuid.uuid4().hex}{ext}"
            dest = upload_dir / unique_name

            content = await file.read()
            dest.write_bytes(content)

            rel_path = f"{patient_id}/{unique_name}"
            doc = VaccinationDocument(
                patient_id=patient_id,
                file_name=file.filename or unique_name,
                file_path=rel_path,
                file_type=ext.lstrip("."),
                page_number=idx + 1,
            )
            db.add(doc)
            saved.append(doc)

            if file.content_type in IMAGE_TYPES:
                image_payloads.append(content)

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

    # Extractor-Aufruf – schlägt er fehl, bleibt extracted_count=0
    extracted_total = 0
    for image_bytes in image_payloads:
        result = await extract_from_image(image_bytes)
        for v in result.vaccinations:
            vacc_date: date_type | None = None
            try:
                vacc_date = date_type.fromisoformat(v.date) if v.date else None
            except ValueError:
                pass
            db.add(Vaccination(
                patient_id=patient_id,
                vaccine_name=v.name,
                vaccination_date=vacc_date,
                needs_review=True,
                confidence_score=0.7,
                raw_json={"source": "extractor", "extracted_name": v.name},
            ))
            extracted_total += 1

    if extracted_total:
        db.add(AuditLog(
            patient_id=patient_id,
            action="EXTRACT",
            new_value=f"{extracted_total} Impfeinträge per AI extrahiert",
            performed_by="extractor-service",
        ))
        db.commit()

    return UploadResponse(
        documents=[DocumentResponse.model_validate(doc) for doc in saved],
        extracted_count=extracted_total,
    )


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
