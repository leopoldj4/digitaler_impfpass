"""FastAPI Applikations-Einstiegspunkt."""

from pathlib import Path

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.auth import get_current_user
from app.routes.auth_route import router as auth_router
from app.routes.document_route import router as document_router
from app.routes.import_route import router as import_router
from app.routes.patient_route import router as patient_router
from app.routes.vaccination_route import router as vaccination_router

# Uploads-Verzeichnis anlegen falls nicht vorhanden
UPLOAD_ROOT = Path(__file__).parent.parent / "uploads"
UPLOAD_ROOT.mkdir(exist_ok=True)

app = FastAPI(
    title="DigitalImpfpass API",
    version="0.1.0",
    description="Backend für die digitale Impfpass-Verarbeitung in Arztpraxen.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Scan-Fotos statisch ausliefern: GET /uploads/{patient_id}/{dateiname}
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_ROOT)), name="uploads")

app.include_router(auth_router)
protected_api = [Depends(get_current_user)]
app.include_router(import_router, dependencies=protected_api)
app.include_router(patient_router, dependencies=protected_api)
app.include_router(vaccination_router, dependencies=protected_api)
app.include_router(document_router, dependencies=protected_api)


@app.get("/health")
def health_check():
    """Einfacher Health-Check Endpunkt."""
    return {"status": "ok"}
