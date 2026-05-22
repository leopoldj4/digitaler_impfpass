"""Business-Logik für Impfeintrag-Bearbeitung und Verifikation."""

from datetime import datetime, timezone
from hashlib import sha256
import json

from sqlalchemy.orm import Session

from app.models.models import AuditLog, Vaccination
from app.schemas.vaccination_schema import VaccinationUpdate

# Felder die der Arzt editieren darf (für Audit-Log-Iteration)
EDITABLE_FIELDS = [
    "vaccine_name", "vaccine_type", "manufacturer", "batch_number",
    "vaccination_date", "valid_until", "indication", "doctor_stamp", "needs_review",
]


def update_vaccination(
    db: Session,
    vaccination_id: int,
    data: VaccinationUpdate,
    performed_by: str,
) -> Vaccination | None:
    """Aktualisiert einen Impfeintrag und schreibt pro geändertem Feld einen AuditLog-Eintrag.

    Returns:
        Aktualisiertes Vaccination-Objekt oder None wenn nicht gefunden.
    """
    vaccination = db.query(Vaccination).filter(Vaccination.id == vaccination_id).first()
    if not vaccination:
        return None

    # Nur geänderte Felder verarbeiten
    changed_fields = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}

    for field, new_value in changed_fields.items():
        old_value = getattr(vaccination, field)

        # Kein AuditLog wenn der Wert identisch ist
        if str(old_value) == str(new_value):
            continue

        setattr(vaccination, field, new_value)

        # Pro Feldänderung einen separaten AuditLog-Eintrag (DSGVO-konform)
        db.add(AuditLog(
            patient_id=vaccination.patient_id,
            action="UPDATE",
            field_changed=field,
            old_value=str(old_value) if old_value is not None else None,
            new_value=str(new_value),
            performed_by=performed_by,
        ))

    return vaccination


def verify_vaccination(
    db: Session,
    vaccination_id: int,
    performed_by: str,
) -> Vaccination | None:
    """Setzt is_verified=True und schreibt einen VERIFY AuditLog-Eintrag.

    Returns:
        Aktualisiertes Vaccination-Objekt oder None wenn nicht gefunden.
    """
    vaccination = db.query(Vaccination).filter(Vaccination.id == vaccination_id).first()
    if not vaccination:
        return None

    # Bereits verifizierte Einträge nicht nochmals verarbeiten
    if vaccination.is_verified:
        return vaccination

    now = datetime.now(timezone.utc)
    vaccination.is_verified = True
    vaccination.verified_at = now
    vaccination.verified_by = performed_by
    vaccination.needs_review = False

    db.add(AuditLog(
        patient_id=vaccination.patient_id,
        action="VERIFY",
        field_changed="is_verified",
        old_value="False",
        new_value="True",
        performed_by=performed_by,
    ))

    return vaccination


def sign_vaccinations(
    db: Session,
    vaccination_ids: list[int],
    performed_by: str,
    signer_id: str,
    signer_email: str,
) -> tuple[list[Vaccination], str, datetime]:
    """Signiert mehrere Impfungen und speichert einen prüfbaren Hash-Nachweis."""
    unique_ids = list(dict.fromkeys(vaccination_ids))
    vaccinations = (
        db.query(Vaccination)
        .filter(Vaccination.id.in_(unique_ids))
        .order_by(Vaccination.id)
        .all()
    )
    if len(vaccinations) != len(unique_ids):
        return [], "", datetime.now(timezone.utc)

    now = datetime.now(timezone.utc)
    signature_payload = {
        "signed_at": now.isoformat(),
        "signed_by": performed_by,
        "signer_id": signer_id,
        "signer_email": signer_email,
        "vaccinations": [
            {
                "id": vaccination.id,
                "patient_id": vaccination.patient_id,
                "vaccine_name": vaccination.vaccine_name,
                "batch_number": vaccination.batch_number,
                "vaccination_date": vaccination.vaccination_date.isoformat()
                if vaccination.vaccination_date
                else None,
                "valid_until": vaccination.valid_until.isoformat()
                if vaccination.valid_until
                else None,
            }
            for vaccination in vaccinations
        ],
    }
    encoded_payload = json.dumps(signature_payload, sort_keys=True, separators=(",", ":"))
    signature_hash = sha256(encoded_payload.encode("utf-8")).hexdigest()

    for vaccination in vaccinations:
        vaccination.is_verified = True
        vaccination.verified_at = now
        vaccination.verified_by = performed_by
        vaccination.needs_review = False
        vaccination.digital_signature_hash = signature_hash
        vaccination.digital_signature_payload = signature_payload
        vaccination.digital_signed_at = now
        vaccination.digital_signed_by = performed_by

        db.add(AuditLog(
            patient_id=vaccination.patient_id,
            action="SIGN",
            field_changed="digital_signature_hash",
            old_value=None,
            new_value=signature_hash,
            performed_by=performed_by,
        ))

    return vaccinations, signature_hash, now
