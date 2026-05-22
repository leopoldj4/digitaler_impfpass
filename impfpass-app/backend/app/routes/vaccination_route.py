"""FastAPI Router für PUT/PATCH /api/v1/vaccinations."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.vaccination_schema import VaccinationResponse, VaccinationUpdate, VerifyResponse
from app.services.vaccination_service import update_vaccination, verify_vaccination

router = APIRouter(prefix="/api/v1/vaccinations", tags=["Impfeinträge"])


@router.put(
    "/{vaccination_id}",
    response_model=VaccinationResponse,
    summary="Impfeintrag bearbeiten (Arzt-Korrektur)",
)
def edit_vaccination(
    vaccination_id: int,
    data: VaccinationUpdate,
    performed_by: str = Query(..., description="Name/ID des bearbeitenden Arztes"),
    db: Session = Depends(get_db),
) -> VaccinationResponse:
    """Arzt korrigiert OCR-Fehler in einem Impfeintrag.

    Pro geändertem Feld wird ein separater AuditLog-Eintrag geschrieben.
    """
    try:
        vaccination = update_vaccination(db, vaccination_id, data, performed_by)
        if not vaccination:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Impfeintrag mit ID {vaccination_id} nicht gefunden.",
            )
        db.commit()
        db.refresh(vaccination)
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Datenbankfehler beim Speichern: {str(e)}",
        ) from e

    return VaccinationResponse.model_validate(vaccination)


@router.patch(
    "/{vaccination_id}/verify",
    response_model=VerifyResponse,
    summary="Impfeintrag signieren / verifizieren",
)
def verify_entry(
    vaccination_id: int,
    performed_by: str = Query(..., description="Name/ID des signierenden Arztes"),
    db: Session = Depends(get_db),
) -> VerifyResponse:
    """Setzt is_verified=True und verified_at=jetzt.

    Bereits verifizierte Einträge werden ohne Fehler zurückgegeben.
    """
    try:
        vaccination = verify_vaccination(db, vaccination_id, performed_by)
        if not vaccination:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Impfeintrag mit ID {vaccination_id} nicht gefunden.",
            )
        db.commit()
        db.refresh(vaccination)
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Datenbankfehler beim Verifizieren: {str(e)}",
        ) from e

    return VerifyResponse(
        id=vaccination.id,
        is_verified=vaccination.is_verified,
        verified_at=vaccination.verified_at,
        verified_by=vaccination.verified_by,
        message=f"Impfeintrag {vaccination_id} erfolgreich signiert.",
    )
