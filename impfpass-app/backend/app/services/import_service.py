"""Business-Logik für den Impfpass-Import."""

from sqlalchemy.orm import Session

from app.models.models import AuditLog, Patient, Vaccination
from app.schemas.import_schema import ImportRequest


def find_or_create_patient(db: Session, payload: ImportRequest) -> tuple[Patient, bool]:
    """Sucht einen Patienten anhand von Name + Geburtsdatum oder legt ihn neu an.

    Returns:
        Tuple aus (Patient-Objekt, wurde_neu_angelegt)
    """
    p = payload.patient

    # Exakte Suche: Vor- + Nachname + Geburtsdatum
    existing = (
        db.query(Patient)
        .filter(
            Patient.first_name == p.first_name,
            Patient.last_name == p.last_name,
            Patient.birth_date == p.birth_date,
        )
        .first()
    )

    if existing:
        return existing, False

    # Neuen Patienten anlegen
    new_patient = Patient(
        first_name=p.first_name,
        last_name=p.last_name,
        birth_date=p.birth_date,
    )
    db.add(new_patient)
    db.flush()  # ID wird benötigt bevor Impfungen gespeichert werden
    return new_patient, True


def save_vaccinations(db: Session, patient_id: int, payload: ImportRequest) -> int:
    """Speichert alle Impfeinträge und setzt needs_review basierend auf confidence_score.

    Returns:
        Anzahl der gespeicherten Einträge
    """
    count = 0
    raw_payload = payload.model_dump()  # Original-JSON für raw_json Spalte

    for vac_data in payload.vaccinations:
        # needs_review automatisch setzen wenn confidence_score niedrig
        needs_review = vac_data.needs_review
        if vac_data.confidence_score is not None and vac_data.confidence_score < 0.75:
            needs_review = True

        vaccination = Vaccination(
            patient_id=patient_id,
            vaccine_name=vac_data.vaccine_name,
            vaccine_type=vac_data.vaccine_type,
            manufacturer=vac_data.manufacturer,
            batch_number=vac_data.batch_number,
            vaccination_date=vac_data.vaccination_date,
            valid_until=vac_data.valid_until,
            indication=vac_data.indication,
            doctor_stamp=vac_data.doctor_stamp,
            confidence_score=vac_data.confidence_score,
            needs_review=needs_review,
            is_verified=False,
            raw_json=raw_payload,  # gesamte Import-Payload als Rohdaten
        )
        db.add(vaccination)
        count += 1

    return count


def write_audit_log(db: Session, patient_id: int, vaccinations_count: int, created: bool) -> None:
    """Schreibt einen IMPORT-Eintrag ins Audit-Log."""
    aktion = "IMPORT_NEU" if created else "IMPORT_BESTEHEND"
    log = AuditLog(
        patient_id=patient_id,
        action=aktion,
        field_changed=None,
        old_value=None,
        new_value=f"{vaccinations_count} Impfeinträge importiert",
        performed_by="ocr-import-pipeline",
    )
    db.add(log)


def run_import(db: Session, payload: ImportRequest) -> dict:
    """Führt den vollständigen Import-Prozess durch (Patient + Impfungen + AuditLog).

    Returns:
        Dict mit patient_id, patient_created, vaccinations_imported
    """
    patient, created = find_or_create_patient(db, payload)
    count = save_vaccinations(db, patient.id, payload)
    write_audit_log(db, patient.id, count, created)
    db.commit()

    return {
        "patient_id": patient.id,
        "patient_created": created,
        "vaccinations_imported": count,
    }
