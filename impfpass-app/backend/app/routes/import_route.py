"""FastAPI Router für POST /api/v1/import."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.import_schema import ImportRequest, ImportResponse
from app.services.import_service import run_import

router = APIRouter(prefix="/api/v1", tags=["Import"])


@router.post(
    "/import",
    response_model=ImportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Impfpass-JSON importieren",
)
def import_vaccination_data(
    payload: ImportRequest,
    db: Session = Depends(get_db),
) -> ImportResponse:
    """Empfängt das OCR-JSON vom Scan-Team und speichert es in der Datenbank.

    - Sucht den Patienten per Name + Geburtsdatum (oder legt ihn neu an)
    - Speichert alle Impfeinträge inkl. raw_json
    - Schreibt einen AuditLog-Eintrag (action=IMPORT)
    """
    try:
        result = run_import(db, payload)
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Datenbankfehler beim Import: {str(e)}",
        ) from e

    action_label = "neu angelegt" if result["patient_created"] else "bereits vorhanden"
    return ImportResponse(
        patient_id=result["patient_id"],
        patient_created=result["patient_created"],
        vaccinations_imported=result["vaccinations_imported"],
        message=(
            f"Import erfolgreich. Patient {action_label}. "
            f"{result['vaccinations_imported']} Impfeintrag/Einträge gespeichert."
        ),
    )
