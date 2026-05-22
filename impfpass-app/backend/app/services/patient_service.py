"""Business-Logik für Patienten-Abfragen."""

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.models import Patient, Vaccination


def search_patients(db: Session, search: str | None) -> list[dict]:
    """Sucht Patienten per ILIKE auf Vor- und Nachname.

    Gibt pro Patient die Gesamtanzahl der Impfungen und die Anzahl
    der Einträge mit needs_review=True zurück.
    """
    # Aggregierte Zähler per Subquery
    total_subq = (
        db.query(Vaccination.patient_id, func.count(Vaccination.id).label("total"))
        .group_by(Vaccination.patient_id)
        .subquery()
    )
    review_subq = (
        db.query(Vaccination.patient_id, func.count(Vaccination.id).label("review_count"))
        .filter(Vaccination.needs_review == True)  # noqa: E712
        .group_by(Vaccination.patient_id)
        .subquery()
    )

    query = (
        db.query(
            Patient,
            func.coalesce(total_subq.c.total, 0).label("vaccination_count"),
            func.coalesce(review_subq.c.review_count, 0).label("needs_review_count"),
        )
        .outerjoin(total_subq, Patient.id == total_subq.c.patient_id)
        .outerjoin(review_subq, Patient.id == review_subq.c.patient_id)
    )

    # Suche auf Vor- und Nachname (case-insensitiv)
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            Patient.first_name.ilike(term) | Patient.last_name.ilike(term)
        )

    query = query.order_by(Patient.last_name, Patient.first_name)
    rows = query.all()

    return [
        {
            "id": patient.id,
            "first_name": patient.first_name,
            "last_name": patient.last_name,
            "birth_date": patient.birth_date,
            "created_at": patient.created_at,
            "vaccination_count": vaccination_count,
            "needs_review_count": needs_review_count,
        }
        for patient, vaccination_count, needs_review_count in rows
    ]


def get_patient_with_vaccinations(db: Session, patient_id: int) -> Patient | None:
    """Lädt einen Patienten mit Impfeinträgen und Dokumenten (eager loading)."""
    return (
        db.query(Patient)
        .options(
            joinedload(Patient.vaccinations),
            joinedload(Patient.documents),
        )
        .filter(Patient.id == patient_id)
        .first()
    )
