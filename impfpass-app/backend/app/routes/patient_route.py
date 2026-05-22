"""FastAPI Router für GET /api/v1/patients."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.patient_schema import PatientDetail, PatientListItem
from app.services.patient_service import get_patient_with_vaccinations, search_patients

router = APIRouter(prefix="/api/v1/patients", tags=["Patienten"])


@router.get(
    "",
    response_model=list[PatientListItem],
    summary="Patientenliste mit optionaler Namenssuche",
)
def list_patients(
    search: str | None = Query(None, description="Suche in Vor- und Nachname (ILIKE)"),
    db: Session = Depends(get_db),
) -> list[PatientListItem]:
    """Gibt alle Patienten zurück, optional gefiltert nach Vor- oder Nachname.

    Enthält pro Patient die Anzahl der Impfeinträge und die Anzahl der
    Einträge die noch geprüft werden müssen.
    """
    try:
        rows = search_patients(db, search)
    except SQLAlchemyError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Datenbankfehler: {str(e)}",
        ) from e

    return [PatientListItem(**row) for row in rows]


@router.get(
    "/{patient_id}",
    response_model=PatientDetail,
    summary="Patient mit allen Impfeinträgen",
)
def get_patient(
    patient_id: int,
    db: Session = Depends(get_db),
) -> PatientDetail:
    """Gibt einen Patienten zusammen mit allen zugehörigen Impfeinträgen zurück."""
    try:
        patient = get_patient_with_vaccinations(db, patient_id)
    except SQLAlchemyError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Datenbankfehler: {str(e)}",
        ) from e

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient mit ID {patient_id} nicht gefunden.",
        )

    return PatientDetail.model_validate(patient)
