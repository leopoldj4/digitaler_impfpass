"""SQLAlchemy ORM-Modelle für die Impfpass-Datenbank."""

from datetime import date, datetime
from typing import Any

from sqlalchemy import JSON, Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Patient(Base):
    """Repräsentiert einen Patienten in der Datenbank."""

    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    birth_date: Mapped[date] = mapped_column(Date, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Beziehungen
    vaccinations: Mapped[list["Vaccination"]] = relationship(
        "Vaccination", back_populates="patient", cascade="all, delete-orphan"
    )
    audit_logs: Mapped[list["AuditLog"]] = relationship(
        "AuditLog", back_populates="patient", cascade="all, delete-orphan"
    )
    documents: Mapped[list["VaccinationDocument"]] = relationship(
        "VaccinationDocument", back_populates="patient", cascade="all, delete-orphan"
    )


class Vaccination(Base):
    """Repräsentiert einen einzelnen Impfeintrag eines Patienten."""

    __tablename__ = "vaccinations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    patient_id: Mapped[int] = mapped_column(Integer, ForeignKey("patients.id"), nullable=False, index=True)

    # Impfdaten (aus OCR)
    vaccine_name: Mapped[str] = mapped_column(String(200), nullable=False)
    vaccine_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    manufacturer: Mapped[str | None] = mapped_column(String(200), nullable=True)
    batch_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    vaccination_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    valid_until: Mapped[date | None] = mapped_column(Date, nullable=True)
    indication: Mapped[str | None] = mapped_column(String(200), nullable=True)
    doctor_stamp: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Verifikations-Status
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    verified_by: Mapped[str | None] = mapped_column(String(200), nullable=True)

    # OCR-Qualität
    confidence_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    needs_review: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Rohdaten vom Scan-Team
    raw_json: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Beziehung
    patient: Mapped["Patient"] = relationship("Patient", back_populates="vaccinations")


class AuditLog(Base):
    """Protokolliert alle Änderungen an Impfeinträgen (DSGVO-konform)."""

    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    patient_id: Mapped[int] = mapped_column(Integer, ForeignKey("patients.id"), nullable=False, index=True)

    action: Mapped[str] = mapped_column(String(50), nullable=False)      # z.B. "UPDATE", "VERIFY", "IMPORT"
    field_changed: Mapped[str | None] = mapped_column(String(100), nullable=True)
    old_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    new_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    performed_by: Mapped[str] = mapped_column(String(200), nullable=False)
    performed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Beziehung
    patient: Mapped["Patient"] = relationship("Patient", back_populates="audit_logs")


class VaccinationDocument(Base):
    """Speichert hochgeladene Impfpass-Scan-Fotos eines Patienten."""

    __tablename__ = "vaccination_documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    patient_id: Mapped[int] = mapped_column(Integer, ForeignKey("patients.id"), nullable=False, index=True)

    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)  # relativer Pfad ab uploads/
    file_type: Mapped[str] = mapped_column(String(50), nullable=False)   # jpg, png, pdf, …
    page_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Beziehung
    patient: Mapped["Patient"] = relationship("Patient", back_populates="documents")
