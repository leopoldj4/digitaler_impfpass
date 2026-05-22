"""FastAPI Router für PUT/PATCH /api/v1/vaccinations."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.auth import AuthenticatedUser, get_current_user, verify_password
from app.database import get_db
from app.schemas.vaccination_schema import (
    SignVaccinationsRequest,
    SignVaccinationsResponse,
    VaccinationResponse,
    VaccinationUpdate,
    VerifyResponse,
)
from app.services.vaccination_service import sign_vaccinations, update_vaccination, verify_vaccination

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


@router.post(
    "/sign",
    response_model=SignVaccinationsResponse,
    summary="Mehrere Impfeinträge mit Arzt-Passwort digital signieren",
)
def sign_entries(
    payload: SignVaccinationsRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> SignVaccinationsResponse:
    """Prüft das Passwort des eingeloggten Arztes und speichert einen Signatur-Hash."""
    if not verify_password(payload.password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Passwort ist nicht korrekt",
        )

    try:
        vaccinations, signature_hash, signed_at = sign_vaccinations(
            db=db,
            vaccination_ids=payload.vaccination_ids,
            performed_by=current_user.full_name,
            signer_id=current_user.id,
            signer_email=current_user.email,
        )
        if not vaccinations:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Mindestens ein Impfeintrag wurde nicht gefunden.",
            )
        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Datenbankfehler beim Signieren: {str(e)}",
        ) from e

    signed_ids = [vaccination.id for vaccination in vaccinations]
    return SignVaccinationsResponse(
        signed_count=len(vaccinations),
        signature_hash=signature_hash,
        signed_at=signed_at,
        signed_by=current_user.full_name,
        vaccination_ids=signed_ids,
        message=f"{len(vaccinations)} Impfeintrag/Einträge erfolgreich digital signiert.",
    )
