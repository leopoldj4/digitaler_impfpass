"""Seed-Daten für Entwicklung: 2 Beispiel-Patienten mit Impfeinträgen."""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from app.database import SessionLocal
from app.models.models import Patient, Vaccination, AuditLog
from datetime import date, datetime, timezone


def seed():
    db = SessionLocal()
    try:
        if db.query(Patient).count() > 0:
            print("Datenbank enthält bereits Daten. Seed übersprungen.")
            return

        p1 = Patient(first_name="Max", last_name="Mustermann", birth_date=date(1985, 3, 12))
        db.add(p1)
        db.flush()
        db.add_all([
            Vaccination(patient_id=p1.id, vaccine_name="Tetanus-Diphtherie", vaccine_type="Toxoid",
                manufacturer="Sanofi", batch_number="AB1234", vaccination_date=date(2021, 6, 15),
                valid_until=date(2031, 6, 15), indication="Auffrischung",
                doctor_stamp="Dr. Müller, München", confidence_score=0.95, needs_review=False,
                is_verified=True, verified_at=datetime.now(timezone.utc), verified_by="Dr. Müller"),
            Vaccination(patient_id=p1.id, vaccine_name="COVID-19 mRNA", vaccine_type="mRNA",
                manufacturer="BioNTech", batch_number="EW1234", vaccination_date=date(2022, 4, 10),
                valid_until=None, indication="Grundimmunisierung",
                doctor_stamp="Dr. Müller, München", confidence_score=0.88, needs_review=False,
                is_verified=False),
            Vaccination(patient_id=p1.id, vaccine_name="Influenza", vaccine_type="Totimpfstoff",
                manufacturer="AstraZeneca", batch_number="FL9901", vaccination_date=date(2023, 10, 5),
                valid_until=date(2024, 10, 5), indication="Saisonale Schutzimpfung",
                doctor_stamp="Dr. Müller, München", confidence_score=0.62, needs_review=True,
                is_verified=False),
        ])
        db.add(AuditLog(patient_id=p1.id, action="IMPORT",
            new_value="3 Impfeinträge importiert", performed_by="ocr-import-pipeline"))

        p2 = Patient(first_name="Anna", last_name="Schmidt", birth_date=date(1992, 7, 24))
        db.add(p2)
        db.flush()
        db.add_all([
            Vaccination(patient_id=p2.id, vaccine_name="Masern-Mumps-Röteln",
                vaccine_type="Lebendimpfstoff", manufacturer="Merck", batch_number="MM5678",
                vaccination_date=date(2005, 9, 1), valid_until=None, indication="Grundimmunisierung",
                doctor_stamp="Dr. Weber, Berlin", confidence_score=0.91, needs_review=False,
                is_verified=True, verified_at=datetime.now(timezone.utc), verified_by="Dr. Weber"),
            Vaccination(patient_id=p2.id, vaccine_name="Hepatitis B", vaccine_type="Totimpfstoff",
                manufacturer="GSK", batch_number="HB3321", vaccination_date=date(2019, 3, 14),
                valid_until=date(2029, 3, 14), indication="Reiseimpfung",
                doctor_stamp="Dr. Weber, Berlin", confidence_score=0.71, needs_review=True,
                is_verified=False),
        ])
        db.add(AuditLog(patient_id=p2.id, action="IMPORT",
            new_value="2 Impfeinträge importiert", performed_by="ocr-import-pipeline"))

        db.commit()
        print("✓ 2 Patienten, 5 Impfeinträge angelegt.")
    except Exception as e:
        db.rollback()
        print(f"Fehler: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
