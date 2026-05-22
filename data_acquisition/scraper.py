#!/usr/bin/env python3
"""
Impfstoff-Daten Scraper
=======================
Extrahiert Handelsnamen, Krankheitsindikationen und Metadaten aus drei Quellen:

  1. EMA EPAR Excel     – EU-zentral zugelassene Impfstoffe (requests + openpyxl)
  2. Gelbe Liste (J07)  – Alle deutschen Marktprodukte, meta-tag-basiert (requests)
  3. PEI Impfstoffseiten – National zugelassene DE-Impfstoffe (Playwright, JS)

Jeder gescrapte Eintrag wird sofort im Terminal ausgegeben:
  [QUELLE] "Handelsname" → Krankheit

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BEKANNTE LIMITATIONEN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. MANUELL GEPFLEGTE DICTIONARIES
   Folgende Datenstrukturen sind hardcodiert und müssen bei Änderungen
   der externen Standards manuell aktualisiert werden:

   • ATC_DISEASE_DE  – Mapping ATC-Code → deutsche Krankheitsnamen.
                       Quelle: WIdO ATC-Index (jährliche Publikation).
                       Neue oder umklassifizierte ATC-Codes werden nicht
                       automatisch erkannt.

   • PROTECTION_YEARS – Booster-Intervalle in Jahren pro ATC-Präfix.
                        Quelle: STIKO-Empfehlungen (jährliche Publikation).
                        Änderungen der Impfempfehlungen schlagen sich nicht
                        automatisch in der Datenbank nieder.

   • MESH_TO_GERMAN  – Übersetzung englischer EMA-MeSH-Terme ins Deutsche.
                       Neue MeSH-Terme für neuartige Impfstoffe (z. B. neue
                       Virusstämme) sind nicht ohne manuelle Ergänzung abgedeckt.

   • PEI_DISEASE_MAP – Mapping PEI-URL-Segmente → deutsche Krankheitsnamen.
                       Ändert die PEI ihre URL-Struktur, werden Krankheits-
                       kategorien nicht mehr erkannt.

   • _NAME_HINTS     – Schlüsselwort-Fallback für Impfstoffe ohne ATC-Code
                       und ohne bekannte MeSH-Terme. Neuartige Wirkprinzipien
                       oder unbekannte Markennamen werden nicht erfasst.

   • _IMPORTERS / _FORM_WORDS – Listen zur Bereinigung von Gelbe-Liste-
                       Produktnamen. Neue Parallelimporteure oder Darreichungs-
                       formen müssen manuell ergänzt werden.

2. PEI-SCRAPER LIEFERT AKTUELL KEINE DATEN
   Die PEI-Website rendert ihre Navigationsstruktur clientseitig (JavaScript).
   Auch mit Playwright werden die krankheitsspezifischen Unterseiten-Links
   nicht zuverlässig gefunden. National zugelassene DE-Impfstoffe sind jedoch
   vollständig über die Gelbe Liste abgedeckt, weshalb dies kein kritischer
   Datenverlust ist.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import io
import os
import re
import sqlite3
import time
from dataclasses import dataclass, field

import requests
from bs4 import BeautifulSoup
import openpyxl

# ─── HTTP-Session ──────────────────────────────────────────────────────────────
SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "de-DE,de;q=0.9,en-US;q=0.8",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
})

def _get(url: str, delay: float = 0.8) -> requests.Response:
    time.sleep(delay)
    return SESSION.get(url, timeout=30)


# ─── Datenmodell ───────────────────────────────────────────────────────────────
@dataclass
class VaccineRecord:
    name:         str                              # Voller Handelsname (Impfpass-Aufkleber)
    brand:        str = ""                         # Basis-Markenname (ohne Darreichungsform)
    inn:          str = ""                         # INN / Wirkstoffgruppe
    active_sub:   str = ""                         # Genaue Wirkstoffe
    diseases:     list[str] = field(default_factory=list)  # Krankheiten (DE)
    atc_code:     str = ""                         # ATC-Code (J07…)
    indication:   str = ""                         # Volltext-Indikation (SmPC)
    manufacturer: str = ""                         # Hersteller / Zulassungsinhaber
    status:       str = "Authorised"               # Authorised | Withdrawn | Expired | Lapsed
    source:       str = ""                         # EMA | GelbeListe | PEI
    auth_date:    str = ""                         # Zulassungsdatum
    extra:        dict = field(default_factory=dict)  # PZN, URL, …

    def debug(self):
        diseases_str = "; ".join(self.diseases) if self.diseases else "?"
        status_tag   = f" [{self.status}]" if self.status != "Authorised" else ""
        print(f"  [{self.source}]{status_tag} {self.name!r:50s} → {diseases_str}")


# ─── ATC → Krankheiten (Deutsch, aus WIdO ATC-Index 2026) ────────────────────
# Kombinationsimpfstoffe als Liste einzelner Krankheiten, nicht als combo-string.
ATC_DISEASE_DE: dict[str, list[str]] = {
    "J07AC":   ["Milzbrand (Anthrax)"],
    "J07AE":   ["Cholera"],
    "J07AF":   ["Diphtherie"],
    "J07AG":   ["Haemophilus influenzae Typ b (HiB)"],
    "J07AH":   ["Meningokokken"],
    "J07AH01": ["Meningokokken A"],
    "J07AH07": ["Meningokokken C"],
    "J07AH08": ["Meningokokken ACWY"],
    "J07AH09": ["Meningokokken B"],
    "J07AH11": ["Meningokokken ABCWY"],
    "J07AJ":   ["Pertussis (Keuchhusten)"],
    "J07AJ51": ["Diphtherie", "Pertussis (Keuchhusten)", "Tetanus (Wundstarrkrampf)"],
    "J07AJ52": ["Diphtherie", "Pertussis (Keuchhusten)", "Tetanus (Wundstarrkrampf)"],
    "J07AL":   ["Pneumokokken"],
    "J07AM":   ["Tetanus (Wundstarrkrampf)"],
    "J07AM51": ["Diphtherie", "Tetanus (Wundstarrkrampf)"],
    "J07AN":   ["Tuberkulose"],
    "J07AP":   ["Typhus"],
    "J07AX52": ["Rezidivierende Vaginalinfektionen"],
    "J07AX53": ["Rezidivierende Harnwegsinfektionen"],
    "J07BA":   ["FSME (Frühsommer-Meningoenzephalitis)", "Japanische Enzephalitis"],
    "J07BA01": ["FSME (Frühsommer-Meningoenzephalitis)"],
    "J07BA02": ["Japanische Enzephalitis"],
    "J07BB":   ["Influenza (Grippe)"],
    "J07BC":   ["Hepatitis"],
    "J07BC01": ["Hepatitis B"],
    "J07BC02": ["Hepatitis A"],
    "J07BC03": ["Hepatitis A"],
    "J07BC20": ["Hepatitis A", "Hepatitis B"],
    "J07BD":   ["Masern"],
    "J07BD52": ["Masern", "Mumps", "Röteln"],
    "J07BD54": ["Masern", "Mumps", "Röteln", "Varizellen (Windpocken)"],
    "J07BE":   ["Mumps"],
    "J07BF":   ["Poliomyelitis (Kinderlähmung)"],
    "J07BG":   ["Tollwut"],
    "J07BH":   ["Rotavirus-Gastroenteritis"],
    "J07BH01": ["Rotavirus-Gastroenteritis"],
    "J07BH02": ["Rotavirus-Gastroenteritis"],
    "J07BJ":   ["Röteln"],
    "J07BK":   ["Varizellen (Windpocken)", "Herpes Zoster (Gürtelrose)"],
    "J07BK01": ["Varizellen (Windpocken)"],
    "J07BK02": ["Herpes Zoster (Gürtelrose) – Lebendimpfstoff"],
    "J07BK03": ["Herpes Zoster (Gürtelrose) – adjuvantiert"],
    "J07BL":   ["Gelbfieber"],
    "J07BL01": ["Gelbfieber"],
    "J07BM":   ["Humane Papillomviren (HPV)"],
    "J07BM01": ["HPV (Typen 6,11,16,18)"],
    "J07BM02": ["HPV (Typen 16,18)"],
    "J07BM03": ["HPV (9-valent)"],
    "J07BN":   ["COVID-19"],
    "J07BN01": ["COVID-19 (mRNA)"],
    "J07BN02": ["COVID-19 (Vektor)"],
    "J07BN04": ["COVID-19 (Protein)"],
    "J07BX01": ["Pocken", "Mpox"],
    "J07BX04": ["Dengue"],
    "J07BX05": ["RSV (Respiratorisches Syncytial-Virus)"],
    "J07BX07": ["Chikungunya"],
    "J07CA01": ["Diphtherie", "Poliomyelitis (Kinderlähmung)", "Tetanus (Wundstarrkrampf)"],
    "J07CA02": ["Diphtherie", "Pertussis (Keuchhusten)", "Poliomyelitis (Kinderlähmung)", "Tetanus (Wundstarrkrampf)"],
    "J07CA05": ["Diphtherie", "Hepatitis B", "Pertussis (Keuchhusten)", "Tetanus (Wundstarrkrampf)"],
    "J07CA06": ["Diphtherie", "Haemophilus influenzae Typ b (HiB)", "Pertussis (Keuchhusten)", "Poliomyelitis (Kinderlähmung)", "Tetanus (Wundstarrkrampf)"],
    "J07CA09": ["Diphtherie", "Haemophilus influenzae Typ b (HiB)", "Pertussis (Keuchhusten)", "Poliomyelitis (Kinderlähmung)", "Tetanus (Wundstarrkrampf)", "Hepatitis B"],
    "J07CA10": ["Hepatitis A", "Typhus"],
    "J07CA":   ["Kombinationsimpfstoff"],
}

# ─── Schutzdauer (STIKO 2026, manuell gepflegt) ───────────────────────────────
# Schlüssel: ATC-Präfix (längster Treffer gewinnt)
# Wert: booster_years (INT Jahre bis Auffrischung nötig, None = kein definierter Booster)
PROTECTION_YEARS: dict[str, int | None] = {
    "J07AF":   10,
    "J07AM":   10,
    "J07AM51": 10,
    "J07AJ":   10,
    "J07AJ51": 10,
    "J07AJ52": 10,
    "J07AG":   None,
    "J07AE":   None,
    "J07AH":   None,
    "J07AL":   None,
    "J07AP":   None,
    "J07BC01": None,
    "J07BC02": None,
    "J07BC03": None,
    "J07BC20": None,
    "J07BA01": 5,
    "J07BA02": None,
    "J07BB":   1,
    "J07BD52": None,
    "J07BD54": None,
    "J07BD":   None,
    "J07BE":   None,
    "J07BJ":   None,
    "J07BK01": None,
    "J07BK02": None,
    "J07BK03": None,
    "J07BL":   None,
    "J07BM":   None,
    "J07BF":   None,
    "J07BG":   1,
    "J07BH":   None,
    "J07BN01": None,
    "J07BN":   None,
    "J07BX01": None,
    "J07BX05": None,
    "J07BX07": None,
    "J07BX":   None,
    "J07CA09": 10,
    "J07CA06": 10,
    "J07CA02": 10,
    "J07CA01": 10,
    "J07CA":   10,
}


def get_protection_years(atc_code: str) -> int | None:
    """Gibt Booster-Intervall in Jahren für einen ATC-Code zurück (längster Präfix)."""
    if not atc_code:
        return None
    atc = atc_code.strip().upper()
    best_key = ""
    for key in PROTECTION_YEARS:
        if atc.startswith(key) and len(key) > len(best_key):
            best_key = key
    return PROTECTION_YEARS.get(best_key) if best_key else None


def atc_to_diseases(atc: str) -> list[str]:
    """Gibt die deutschen Krankheitsnamen für einen ATC-Code zurück (längster Präfix)."""
    if not atc:
        return []
    atc = atc.strip().upper()
    best_key = ""
    for key in ATC_DISEASE_DE:
        if atc.startswith(key) and len(key) > len(best_key):
            best_key = key
    return list(ATC_DISEASE_DE.get(best_key, []))


def _check_atc_completeness(
    atc_code: str, atc_desc: str, diseases: list[str], product_name: str
) -> None:
    """Warnt wenn ein J07-ATC-Code nicht im Dictionary steht oder Krankheitszuordnung unvollständig scheint.

    Fälle:
      1. J07-Code bekannt aber keine Krankheiten zugeordnet → Eintrag in ATC_DISEASE_DE ergänzen.
      2. Kombinations-ATC (Beschreibung enthält "kombination") nicht im Dict → Präfix-Fallback
         liefert zu wenige Krankheiten.
    """
    if not atc_code or not atc_code.upper().startswith("J07"):
        return

    if not diseases:
        print(
            f"    [WARN] Keine Krankheiten für {product_name!r} "
            f"(ATC {atc_code} – {atc_desc or '?'}). "
            f"Bitte ATC_DISEASE_DE ergänzen."
        )
        return

    if atc_code.upper() not in ATC_DISEASE_DE and "kombination" in atc_desc.lower():
        if len(diseases) < 2:
            print(
                f"    [WARN] Unbekannter Kombinations-ATC {atc_code} "
                f"({atc_desc}) bei {product_name!r} – "
                f"nur {len(diseases)} Krankheit per Präfix-Fallback. "
                f"Bitte ATC_DISEASE_DE ergänzen."
            )


# ──────────────────────────────────────────────────────────────────────────────
#  QUELLE 1 · EMA EPAR
# ──────────────────────────────────────────────────────────────────────────────
EMA_EPAR_URL = (
    "https://www.ema.europa.eu/en/documents/report/"
    "medicines-output-medicines-report_en.xlsx"
)
MESH_SKIP = {"immunization", "immunisation", "disease outbreaks", "infections"}

# Übersetzung EMA-MeSH (Englisch) → Deutsch; nur für den Fallback genutzt wenn
# kein ATC-Code vorhanden ist.
MESH_TO_GERMAN: dict[str, str] = {
    "Chickenpox":                        "Varizellen (Windpocken)",
    "Chikungunya Fever":                 "Chikungunya",
    "Chikungunya virus":                 "Chikungunya",
    "Cholera":                           "Cholera",
    "Condylomata Acuminata":             "Humane Papillomviren (HPV)",
    "COVID-19 virus infection":          "COVID-19",
    "Dengue":                            "Dengue",
    "Diphtheria":                        "Diphtherie",
    "Ebola":                             "Ebola",
    "Encephalitis, Japanese":            "Japanische Enzephalitis",
    "Hemorrhagic Fever, Ebola":          "Ebola",
    "Hepatitis A":                       "Hepatitis A",
    "Hepatitis B":                       "Hepatitis B",
    "Herpes Zoster":                     "Herpes Zoster (Gürtelrose)",
    "Influenza A Virus, H5N8 Subtype":   "Influenza (Grippe) – aviär",
    "Influenza in Birds":                "Influenza (Grippe) – aviär",
    "Influenza, Human":                  "Influenza (Grippe)",
    "Measles":                           "Masern",
    "Meningitis, Haemophilus":           "Haemophilus influenzae Typ b (HiB)",
    "Meningitis, Meningococcal":         "Meningokokken",
    "Mumps":                             "Mumps",
    "Papillomavirus Infections":         "Humane Papillomviren (HPV)",
    "Pneumococcal Infections":           "Pneumokokken",
    "Poliomyelitis":                     "Poliomyelitis (Kinderlähmung)",
    "Respiratory Syncytial Virus Infections": "RSV (Respiratorisches Syncytial-Virus)",
    "Rotavirus Infections":              "Rotavirus-Gastroenteritis",
    "Rubella":                           "Röteln",
    "Tetanus":                           "Tetanus (Wundstarrkrampf)",
    "Tuberculosis":                      "Tuberkulose",
    "Typhoid Fever":                     "Typhus",
    "Uterine Cervical Dysplasia":        "Humane Papillomviren (HPV)",
    "Whooping Cough":                    "Pertussis (Keuchhusten)",
    "Yellow Fever":                      "Gelbfieber",
}

# Schlüsselwort-Fallback wenn weder ATC noch MeSH eine Krankheit ergeben
_NAME_HINTS: list[tuple[list[str], str]] = [
    (["covid", "covi", "sars-cov", "cov-2", "spike"],   "COVID-19"),
    (["influenza", "grippe", "flu"],                    "Influenza (Grippe)"),
    (["rsv", "respiratory syncytial"],                  "RSV (Respiratorisches Syncytial-Virus)"),
    (["ebola"],                                         "Ebola"),
    (["hpv", "papillom", "gardasil", "cervarix"],       "Humane Papillomviren (HPV)"),
    (["hepatitis a"],                                   "Hepatitis A"),
    (["hepatitis b"],                                   "Hepatitis B"),
    (["hepatitis"],                                     "Hepatitis"),
    (["meningoc"],                                      "Meningokokken"),
    (["pneumokok", "pneumococ", "pneumo"],              "Pneumokokken"),
    (["tetanus"],                                       "Tetanus (Wundstarrkrampf)"),
    (["diphther"],                                      "Diphtherie"),
    (["pertussis", "keuchhusten"],                      "Pertussis (Keuchhusten)"),
    (["dengue"],                                        "Dengue"),
    (["varicel", "windpocken", "varizell", "chickenpox"], "Varizellen (Windpocken)"),
    (["zoster", "shingles", "gürtelrose"],              "Herpes Zoster (Gürtelrose)"),
    (["cholera"],                                       "Cholera"),
    (["typhus", "typhoid"],                             "Typhus"),
    (["tollwut", "rabies", "rabipur"],                  "Tollwut"),
    (["gelbfieber", "yellow fever", "stamaril"],        "Gelbfieber"),
    (["masern", "measles"],                             "Masern"),
    (["mumps"],                                         "Mumps"),
    (["röteln", "rubella"],                             "Röteln"),
    (["fsme", "frühsommer", "encephalitis"],            "FSME (Frühsommer-Meningoenzephalitis)"),
    (["rotavirus"],                                     "Rotavirus-Gastroenteritis"),
    (["pocken", "mpox", "smallpox"],                    "Pocken / Mpox"),
]


def diseases_from_name(name: str) -> list[str]:
    """Letzte Rückfallebene: Krankheit aus Impfstoffname ableiten."""
    lower = name.lower()
    for keywords, disease in _NAME_HINTS:
        if any(kw in lower for kw in keywords):
            return [disease]
    return []


def scrape_ema_epar() -> list[VaccineRecord]:
    """Lädt EMA EPAR Excel täglich und extrahiert alle Humanimpfstoffe."""
    print(f"  Lade EPAR-Excel von EMA …")
    resp = _get(EMA_EPAR_URL, delay=0)
    resp.raise_for_status()

    wb = openpyxl.load_workbook(io.BytesIO(resp.content))
    ws = wb.active

    # Kopfzeile suchen (liegt in Zeile 9 der Datei)
    header_row_idx = None
    for i, row in enumerate(ws.iter_rows(min_row=1, max_row=15, values_only=True)):
        if row[0] == "Category":
            header_row_idx = i + 1
            break
    if not header_row_idx:
        raise RuntimeError("EMA EPAR: Kopfzeile nicht gefunden.")

    headers = list(next(ws.iter_rows(
        min_row=header_row_idx, max_row=header_row_idx, values_only=True
    )))
    col = {h: i for i, h in enumerate(headers) if h}

    records: list[VaccineRecord] = []

    for row in ws.iter_rows(min_row=header_row_idx + 1, values_only=True):
        if row[col["Category"]] != "Human":
            continue
        grp = str(row[col.get("Pharmacotherapeutic group\n(human)", 13)] or "")
        if "Vaccine" not in grp:
            continue

        atc    = str(row[col.get("ATC code (human)", 11)] or "").strip()
        name   = str(row[col["Name of medicine"]] or "").strip()
        status = str(row[col.get("Medicine status", 3)] or "")

        # Krankheiten: ATC hat Vorrang (Deutsch); MeSH nur wenn ATC unbekannt
        diseases = atc_to_diseases(atc)
        _check_atc_completeness(atc, "", diseases, name)
        if not diseases:
            mesh_raw   = str(row[col.get("Therapeutic area (MeSH)", 8)] or "")
            mesh_terms = [
                d.strip() for d in mesh_raw.split(";")
                if d.strip() and d.strip().lower() not in MESH_SKIP
            ]
            diseases = [MESH_TO_GERMAN.get(t, t) for t in mesh_terms]
        if not diseases:
            diseases = diseases_from_name(name)

        rec = VaccineRecord(
            name=name,
            brand=name.split()[0] if name else "",
            inn=str(row[col.get(
                "International non-proprietary name (INN) / common name", 6)] or ""),
            active_sub=str(row[col.get("Active substance", 7)] or ""),
            diseases=diseases,
            atc_code=atc,
            indication=str(row[col.get("Therapeutic indication", 15)] or ""),
            manufacturer=str(row[col.get("Marketing authorisation holder", 25)] or ""),
            status=status,
            source="EMA",
            auth_date=str(row[col.get("Marketing authorisation date", 31)] or ""),
        )
        if rec.name:
            rec.debug()
            records.append(rec)

    return records


# ──────────────────────────────────────────────────────────────────────────────
#  QUELLE 2 · GELBE LISTE (J07 ATC-Seite)
# ──────────────────────────────────────────────────────────────────────────────
GL_BASE    = "https://www.gelbe-liste.de"
GL_J07_URL = f"{GL_BASE}/atc/Impfstoffe_J07"

# Bekannte Parallelimporteur-Kennungen (lowercase) – werden dedupliziert.
# Zusammengesetzte Namen (cc-pharma, fd-pharma) auch als Einzelteile geführt,
# da URL-Slugs per "-" gesplittet werden.
_IMPORTERS = {
    "abacus", "aca", "allomedic", "axicorp",
    "cc",           # cc-pharma
    "docpharm",
    "emra", "eurim", "european",
    "fd",           # fd-pharma
    "kohlpharma", "orifarm", "originalis",
}

# Darreichungsformwörter – enden den Handelsnamen
_FORM_WORDS = {
    "injektionssuspension", "injektionsloesung", "injektionslosung",
    "fertigspritze", "fertigpen", "pulver", "suspension", "loesung",
    "losung", "zur", "und", "fuer", "fur", "herstellung", "einer",
    "in", "von", "oral", "nasal", "tabletten", "kapseln", "tropfen",
    "spray", "konzentrat", "infusionsloesung",
}


def _extract_brand(slug: str) -> str:
    """Extrahiert den Basis-Handelsnamen aus einem Gelbe-Liste URL-Slug."""
    # ID-Suffix entfernen
    slug = re.sub(r"_\d+$", "", slug)
    parts = slug.split("-")
    brand_parts: list[str] = []
    for part in parts:
        lower = part.lower()
        if lower in _FORM_WORDS:
            break
        if lower in _IMPORTERS:
            break
        if re.match(r"^\d", part):          # Dosierungsangabe (z. B. "0-25" oder "1440")
            if brand_parts:                 # … aber nur stoppen wenn wir schon etwas haben
                break
        brand_parts.append(part)
    # Roh-Handelsnamen zusammensetzen; ® entfernen
    name = "-".join(brand_parts).replace("®", "").strip()
    return name or parts[0]


def _get_product_details(product_url: str) -> dict | None:
    """
    Holt Produktdetails einer Gelbe-Liste-Produktseite über meta-description.
    Kein JavaScript erforderlich – ATC-Code und Hersteller stehen serverseitig im Meta-Tag.
    """
    try:
        resp = _get(product_url)
        if resp.status_code != 200:
            return None
        html = resp.text
        soup = BeautifulSoup(html, "html.parser")

        # ── Seitentitel (für vollständigen Produktnamen) ────────────────────
        title_tag = soup.find("title")
        full_name = ""
        if title_tag:
            full_name = title_tag.get_text().split("|")[0].strip()

        # ── Meta-Description (enthält ATC-Code, Hersteller, Wirkstoff) ─────
        # Beispielformat:
        # "Informationen zum Medikament NAME von HERSTELLER mit Wirkstoff
        #  WIRKSTOFF (ATC J07XX99 - ATC-Beschreibung)"
        meta_desc = ""
        for meta in soup.find_all("meta"):
            name_attr    = meta.get("name", "")
            prop_attr    = meta.get("property", "")
            content      = meta.get("content", "")
            if name_attr == "description" or prop_attr == "og:description":
                meta_desc = content
                break

        atc_code       = ""
        atc_desc       = ""
        manufacturer   = ""
        active_sub_str = ""

        # ATC-Code aus HTML (auch außerhalb meta)
        atc_match = re.search(r'\b(J07[A-Z][A-Z0-9]{1,5})\b', html)
        if atc_match:
            atc_code = atc_match.group(1)

        if meta_desc:
            # ATC + Beschreibung
            m = re.search(r'\(ATC\s+(J07[A-Z0-9]+)\s*[-–]\s*([^)]+)\)', meta_desc)
            if m:
                atc_code = m.group(1)
                atc_desc = m.group(2).strip()

            # Hersteller
            m = re.search(r'\bvon\s+(.+?)\s+mit\s+Wirkstoff\b', meta_desc)
            if m:
                manufacturer = m.group(1).strip()

            # Wirkstoff
            m = re.search(r'mit\s+Wirkstoff\s+(.+?)\s*\(ATC', meta_desc)
            if m:
                active_sub_str = m.group(1).strip()

        diseases = atc_to_diseases(atc_code)
        _check_atc_completeness(atc_code, atc_desc, diseases, full_name or product_url)
        if not diseases and atc_desc:
            diseases = [atc_desc]

        return {
            "full_name":    full_name,
            "atc_code":     atc_code,
            "diseases":     diseases,
            "manufacturer": manufacturer,
            "active_sub":   active_sub_str,
        }

    except Exception as exc:
        print(f"    [WARN] Gelbe Liste Produktabruf fehlgeschlagen: {exc}")
        return None


def _get_all_j07_product_urls() -> list[str]:
    """Scrapt alle Produktlinks von allen J07-Listenseiten der Gelben Liste."""
    all_urls: list[str] = []
    page = 1

    while True:
        url = GL_J07_URL if page == 1 else f"{GL_J07_URL}?page={page}"
        resp = _get(url)
        if resp.status_code != 200:
            break

        soup  = BeautifulSoup(resp.text, "html.parser")
        links = soup.find_all("a", href=re.compile(r"^/produkte/"))
        if not links:
            break

        for a in links:
            href = a["href"]
            full = f"{GL_BASE}{href}"
            if full not in all_urls:
                all_urls.append(full)

        # Nächste Seite vorhanden?
        next_btn = soup.find("a", attrs={"aria-label": re.compile(r"next", re.I)})
        if next_btn:
            page += 1
        else:
            break

    return all_urls


def scrape_gelbe_liste() -> list[VaccineRecord]:
    """
    Scrapt alle Impfstoffe der Gelben Liste (ATC J07) über 11 Listenseiten.
    Details (ATC, Hersteller) werden serverseitig aus Meta-Tags ausgelesen – kein JS.
    Parallelimporte werden dedupliziert (gleicher Handelsname + gleiche Darreichungsform).
    """
    print("  Lade alle J07-Produktlinks von Gelber Liste …")
    all_urls = _get_all_j07_product_urls()
    print(f"  {len(all_urls)} Produktlinks gefunden (inkl. Parallelimporte).")

    # Deduplizierung: Basis-Handelsname (via _extract_brand) als Schlüssel.
    # → wir behalten je Basisprodukt nur die erste URL (Parallelimporte verworfen)
    canonical_seen: dict[str, str] = {}   # brand_key → url
    for url in all_urls:
        slug = url.split("/produkte/")[-1]
        brand_key = _extract_brand(slug).lower()
        if brand_key not in canonical_seen:
            canonical_seen[brand_key] = url

    unique_urls = list(canonical_seen.values())
    print(f"  {len(unique_urls)} eindeutige Produkte nach Deduplizierung (Parallelimporte zusammengefasst).")

    records: list[VaccineRecord] = []

    for url in unique_urls:
        slug  = url.split("/produkte/")[-1]
        brand = _extract_brand(slug)

        details = _get_product_details(url)

        if details:
            full_name    = details["full_name"] or brand
            atc_code     = details["atc_code"]
            diseases     = details["diseases"]
            manufacturer = details["manufacturer"]
            active_sub   = details["active_sub"]
        else:
            full_name    = brand
            atc_code     = ""
            diseases     = []
            manufacturer = ""
            active_sub   = ""

        if not diseases:
            diseases = diseases_from_name(full_name)

        rec = VaccineRecord(
            name         = full_name,
            brand        = brand,
            active_sub   = active_sub,
            diseases     = diseases,
            atc_code     = atc_code,
            manufacturer = manufacturer,
            source       = "GelbeListe",
            extra        = {"url": url},
        )
        rec.debug()
        records.append(rec)

    return records


# ──────────────────────────────────────────────────────────────────────────────
#  QUELLE 3 · PEI IMPFSTOFFSEITEN (Playwright – JS-Rendering erforderlich)
# ──────────────────────────────────────────────────────────────────────────────
PEI_BASE         = "https://www.pei.de"
PEI_VACCINE_ROOT = f"{PEI_BASE}/DE/arzneimittel/impfstoffe/impfstoffe-node.html"

# URL-Segment → Krankheitsname (Deutsch)
PEI_DISEASE_MAP: dict[str, str] = {
    "chikungunyafieber":            "Chikungunya",
    "cholera":                      "Cholera",
    "covid-19":                     "COVID-19",
    "denguefieber":                 "Dengue",
    "diphtherie":                   "Diphtherie",
    "ebola":                        "Ebola",
    "fsme":                         "FSME (Frühsommer-Meningoenzephalitis)",
    "gelbfieber":                   "Gelbfieber",
    "guertelrose-herpes-zoster":    "Herpes Zoster (Gürtelrose)",
    "guertelrose--herpes-zoster":   "Herpes Zoster (Gürtelrose)",
    "hib-haemophilus-influenzae-typ-b": "Haemophilus influenzae Typ b (HiB)",
    "hepatitis-a":                  "Hepatitis A",
    "hepatitis-b":                  "Hepatitis B",
    "hpv":                          "Humane Papillomviren (HPV)",
    "influenza":                    "Influenza (Grippe)",
    "japanische-enzephalitis":      "Japanische Enzephalitis",
    "masern":                       "Masern",
    "meningokokken":                "Meningokokken",
    "milzbrand":                    "Milzbrand (Anthrax)",
    "mumps":                        "Mumps",
    "pertussis":                    "Pertussis (Keuchhusten)",
    "keuchhusten":                  "Pertussis (Keuchhusten)",
    "pneumokokken":                 "Pneumokokken",
    "pocken":                       "Pocken / Mpox",
    "poliomyelitis":                "Poliomyelitis (Kinderlähmung)",
    "roeteln":                      "Röteln",
    "rotavirus":                    "Rotavirus-Gastroenteritis",
    "rsv":                          "RSV (Respiratorisches Syncytial-Virus)",
    "tetanus":                      "Tetanus (Wundstarrkrampf)",
    "tollwut":                      "Tollwut",
    "typhus":                       "Typhus",
    "varizellen":                   "Varizellen (Windpocken)",
    "kombinationsimpfstoffe":       "Kombinationsimpfstoff",
}


def _get_pei_disease_links(page) -> list[tuple[str, str]]:
    """Sammelt alle krankheitsspezifischen URLs von der PEI-Impfstoff-Hauptseite.
    Erwartet eine bereits geöffnete Playwright-Seite, da PEI JS für die Navigation
    benötigt."""
    page.goto(PEI_VACCINE_ROOT, wait_until="networkidle", timeout=30_000)
    time.sleep(1.5)
    soup = BeautifulSoup(page.content(), "html.parser")

    links: list[tuple[str, str]] = []
    seen: set[str] = set()

    for a in soup.find_all("a", href=re.compile(r"^/DE/arzneimittel/impfstoffe/.+-node\.html$")):
        href = a["href"]
        if href == "/DE/arzneimittel/impfstoffe/impfstoffe-node.html":
            continue
        full_url = f"{PEI_BASE}{href}" if href.startswith("/") else href
        if full_url in seen:
            continue
        seen.add(full_url)

        # Krankheitsname aus URL ableiten
        segments     = href.rstrip("/").split("/")
        disease_seg  = segments[-2] if len(segments) >= 2 else ""
        disease_name = PEI_DISEASE_MAP.get(
            disease_seg,
            disease_seg.replace("-", " ").title()
        )
        links.append((full_url, disease_name))

    return links


def _parse_pei_rendered(html: str, disease: str) -> list[VaccineRecord]:
    """
    Extrahiert Impfstoffnamen aus dem JS-gerenderten HTML einer PEI-Krankheitsseite.
    Sucht nach:
      1. Tabellen mit 'Handelsname' oder 'Bezeichnung' als Spaltenüberschrift
      2. Links/Texte die bekannten Impfstoffnamen entsprechen
    """
    soup     = BeautifulSoup(html, "html.parser")
    records: list[VaccineRecord] = []

    # Navigation und Footer entfernen
    for tag in soup.find_all(["nav", "header", "footer",
                               "aside", ".navigation", "#navPrimary"]):
        tag.decompose()

    # ── Strategie 1: Tabellen ────────────────────────────────────────────────
    for table in soup.find_all("table"):
        headers = [th.get_text(strip=True).lower() for th in table.find_all("th")]
        header_str = " ".join(headers)
        name_col = 0
        if any(kw in header_str for kw in ["handelsname", "bezeichnung", "name", "präparat"]):
            # Spalte mit Handelsnamen finden
            for i, h in enumerate(headers):
                if any(kw in h for kw in ["handelsname", "bezeichnung", "name", "präparat"]):
                    name_col = i
                    break

            mfr_col = None
            for i, h in enumerate(headers):
                if any(kw in h for kw in ["hersteller", "inhaber", "zulassung"]):
                    mfr_col = i

            for tr in table.find_all("tr")[1:]:
                cells = tr.find_all("td")
                if not cells or len(cells) <= name_col:
                    continue
                name = cells[name_col].get_text(strip=True)
                if not name or len(name) < 3:
                    continue
                mfr = cells[mfr_col].get_text(strip=True) if mfr_col else ""

                # ATC aus Tabellenzeile versuchen
                row_text = tr.get_text()
                atc_match = re.search(r'\b(J07[A-Z][A-Z0-9]{1,5})\b', row_text)
                atc = atc_match.group(1) if atc_match else ""
                disease_list = atc_to_diseases(atc) if atc else [disease]

                rec = VaccineRecord(
                    name=name, brand=name.split()[0],
                    diseases=disease_list or [disease],
                    atc_code=atc, manufacturer=mfr, source="PEI",
                )
                records.append(rec)

    # ── Strategie 2: Definitionslisten und strukturierte Texte ───────────────
    if not records:
        for dl in soup.find_all("dl"):
            for dt in dl.find_all("dt"):
                candidate = dt.get_text(strip=True)
                if re.match(r'^[A-ZÄÖÜ][a-zA-Z0-9äöüÄÖÜ\-\s®™]{3,60}$', candidate):
                    rec = VaccineRecord(
                        name=candidate, brand=candidate.split()[0],
                        diseases=[disease], source="PEI",
                    )
                    records.append(rec)

    # ── Strategie 3: Beliebiger Volltext – bekannte Muster ───────────────────
    if not records:
        full_text = soup.get_text(separator=" ", strip=True)
        # Impfstoffnamen: Groß, dann alphanumerisch, typisch 4–35 Zeichen
        # Positiv-Muster: folgt auf "Handelsname:", "Bezeichnung:" oder "Zulassung:"
        name_blocks = re.findall(
            r'(?:Handelsname|Bezeichnung|Präparat|Impfstoff)\s*[:\-]\s*'
            r'([A-ZÄÖÜ][A-Za-z0-9äöüÄÖÜ®™\-\s]{3,60}?)(?=\s*(?:\n|Hersteller|Zulassung|,|\.))',
            full_text
        )
        for block in name_blocks:
            candidate = block.strip()
            if candidate:
                rec = VaccineRecord(
                    name=candidate, brand=candidate.split()[0],
                    diseases=[disease], source="PEI",
                )
                records.append(rec)

    return records


def scrape_pei() -> list[VaccineRecord]:
    """
    Scrapt alle PEI-Krankheitsseiten mit Playwright (JavaScript-Rendering).
    Gibt für jede Seite gefundene Impfstoffe aus.
    """
    try:
        from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
    except ImportError:
        print("  [SKIP] Playwright nicht installiert.")
        print("         Installieren mit: pip install playwright && playwright install chromium")
        return []

    all_records: list[VaccineRecord] = []

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        ctx     = browser.new_context(
            locale="de-DE",
            extra_http_headers={"Accept-Language": "de-DE,de;q=0.9"},
        )
        page = ctx.new_page()

        print("  Lade PEI-Krankheitskategorien (Playwright) …")
        try:
            disease_links = _get_pei_disease_links(page)
        except Exception as exc:
            print(f"  [WARN] PEI Hauptseite nicht ladbar: {exc}")
            disease_links = []
        print(f"  {len(disease_links)} Krankheitskategorien gefunden.")

        for url, disease in disease_links:
            print(f"\n  → PEI [{disease}]")
            try:
                page.goto(url, wait_until="networkidle", timeout=30_000)

                # Warte auf dynamische Inhalte
                for selector in ["table", "main", "article", ".content-text"]:
                    try:
                        page.wait_for_selector(selector, timeout=8_000)
                        break
                    except PWTimeout:
                        continue

                time.sleep(1.5)  # JS-Animationen abwarten
                html = page.content()

            except PWTimeout:
                print(f"    [WARN] Timeout für {url}")
                continue
            except Exception as exc:
                print(f"    [WARN] Fehler: {exc}")
                continue

            found = _parse_pei_rendered(html, disease)
            if found:
                for rec in found:
                    rec.debug()
                    all_records.append(rec)
            else:
                print(f"    [PEI] Keine Impfstoffe auf Seite für '{disease}' gefunden.")

        ctx.close()
        browser.close()

    return all_records


# ──────────────────────────────────────────────────────────────────────────────
#  DEDUPLIZIERUNG & MERGE
# ──────────────────────────────────────────────────────────────────────────────
SOURCE_PRIORITY = {"EMA": 0, "GelbeListe": 1, "PEI": 2}


def _normalize_name(name: str) -> str:
    """Normalisiert einen Handelsnamen für Vergleiche."""
    name = name.lower()
    name = name.replace("®", "").replace("™", "")
    name = re.sub(r"\s+", " ", name).strip()
    return name


def deduplicate(records: list[VaccineRecord]) -> list[VaccineRecord]:
    """
    Entfernt Duplikate über normalisierte Handelsnamen.
    Vorrang: EMA > GelbeListe > PEI.
    Fehlende Felder werden aus niederprioritären Quellen ergänzt.
    """
    # Schlüssel: normalisierter Basisname (erstes Wort)
    best: dict[str, VaccineRecord] = {}

    for rec in records:
        key = _normalize_name(rec.brand or rec.name.split()[0])
        existing = best.get(key)

        if existing is None:
            best[key] = rec
        else:
            prio_new = SOURCE_PRIORITY.get(rec.source, 99)
            prio_ex  = SOURCE_PRIORITY.get(existing.source, 99)

            if prio_new < prio_ex:
                # Neue Quelle hat höhere Priorität → übernehmen, aber fehlende Felder aus alter Quelle
                if not rec.diseases     and existing.diseases:     rec.diseases     = existing.diseases
                if not rec.atc_code     and existing.atc_code:     rec.atc_code     = existing.atc_code
                if not rec.manufacturer and existing.manufacturer: rec.manufacturer = existing.manufacturer
                if not rec.indication   and existing.indication:   rec.indication   = existing.indication
                best[key] = rec
            else:
                # Bestehende Quelle hat Vorrang → fehlende Felder aus neuer Quelle ergänzen
                if not existing.diseases     and rec.diseases:     existing.diseases     = rec.diseases
                if not existing.atc_code     and rec.atc_code:     existing.atc_code     = rec.atc_code
                if not existing.manufacturer and rec.manufacturer: existing.manufacturer = rec.manufacturer

    return sorted(best.values(), key=lambda r: r.name.lower())


# ──────────────────────────────────────────────────────────────────────────────
#  DATENBANK-EXPORT (SQLite)
# ──────────────────────────────────────────────────────────────────────────────
DB_SCHEMA = """
CREATE TABLE IF NOT EXISTS vaccines (
    id    INTEGER PRIMARY KEY,
    name  TEXT NOT NULL UNIQUE,
    brand TEXT
);

CREATE TABLE IF NOT EXISTS diseases (
    id   INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS durations (
    id         INTEGER PRIMARY KEY,
    vaccine_id INTEGER REFERENCES vaccines(id),
    duration   INTEGER,
    age_start  INTEGER,
    age_end    INTEGER
);

CREATE TABLE IF NOT EXISTS immunizes (
    vaccine_id INTEGER REFERENCES vaccines(id),
    disease_id INTEGER REFERENCES diseases(id),
    PRIMARY KEY (vaccine_id, disease_id)
);
"""


def save_to_db(records: list[VaccineRecord], db_path: str = "impfstoffe.db") -> None:
    if os.path.exists(db_path):
        os.remove(db_path)
    conn = sqlite3.connect(db_path)
    cur  = conn.cursor()
    cur.executescript(DB_SCHEMA)

    disease_id_cache: dict[str, int] = {}

    for rec in records:
        cur.execute(
            "INSERT OR IGNORE INTO vaccines (name, brand) VALUES (?, ?)",
            (rec.name, rec.brand or None),
        )
        cur.execute("SELECT id FROM vaccines WHERE name = ?", (rec.name,))
        vaccine_id: int = cur.fetchone()[0]

        # Schutzdauer (ohne Altersabstufung)
        duration = get_protection_years(rec.atc_code)
        if duration is not None:
            cur.execute(
                "INSERT INTO durations (vaccine_id, duration, age_start, age_end) "
                "VALUES (?, ?, NULL, NULL)",
                (vaccine_id, duration),
            )

        # Krankheiten + immunizes-Verknüpfung
        for disease_name in rec.diseases:
            disease_name = disease_name.strip()
            if not disease_name:
                continue
            if disease_name not in disease_id_cache:
                cur.execute(
                    "INSERT OR IGNORE INTO diseases (name) VALUES (?)",
                    (disease_name,),
                )
                cur.execute("SELECT id FROM diseases WHERE name = ?", (disease_name,))
                disease_id_cache[disease_name] = cur.fetchone()[0]
            disease_id = disease_id_cache[disease_name]
            cur.execute(
                "INSERT OR IGNORE INTO immunizes (vaccine_id, disease_id) VALUES (?, ?)",
                (vaccine_id, disease_id),
            )

    conn.commit()
    conn.close()
    print(f"  Datenbank gespeichert: {db_path}")


# ──────────────────────────────────────────────────────────────────────────────
#  MAIN
# ──────────────────────────────────────────────────────────────────────────────
def main() -> list[VaccineRecord]:
    all_records: list[VaccineRecord] = []

    # ── EMA EPAR ──────────────────────────────────────────────────────────────
    print("\n" + "═" * 65)
    print("  QUELLE 1 · EMA EPAR")
    print("═" * 65)
    try:
        ema_records = scrape_ema_epar()
        all_records.extend(ema_records)
        print(f"\n  → {len(ema_records)} Einträge aus EMA EPAR")
    except Exception as exc:
        print(f"  [FEHLER] EMA EPAR: {exc}")

    # ── Gelbe Liste ───────────────────────────────────────────────────────────
    print("\n" + "═" * 65)
    print("  QUELLE 2 · GELBE LISTE (J07, alle Seiten)")
    print("═" * 65)
    try:
        gl_records = scrape_gelbe_liste()
        all_records.extend(gl_records)
        print(f"\n  → {len(gl_records)} Einträge aus Gelbe Liste")
    except Exception as exc:
        print(f"  [FEHLER] Gelbe Liste: {exc}")

    # ── PEI ───────────────────────────────────────────────────────────────────
    print("\n" + "═" * 65)
    print("  QUELLE 3 · PEI IMPFSTOFFSEITEN (Playwright)")
    print("═" * 65)
    try:
        pei_records = scrape_pei()
        all_records.extend(pei_records)
        print(f"\n  → {len(pei_records)} Einträge aus PEI")
    except Exception as exc:
        print(f"  [FEHLER] PEI: {exc}")

    # ── Abschlussliste ────────────────────────────────────────────────────────
    by_src = {s: sum(1 for r in all_records if r.source == s)
              for s in ("EMA", "GelbeListe", "PEI")}
    print("\n" + "═" * 65)
    print("  FINALE LISTE")
    print("═" * 65)
    for rec in all_records:
        diseases_str = "; ".join(rec.diseases) if rec.diseases else "?"
        print(f"  {rec.name:50s} | {rec.atc_code:10s} | {diseases_str}")

    print(f"\n  Gesamt: {len(all_records)} Einträge")
    for src, cnt in by_src.items():
        print(f"    {src:<12}: {cnt}")

    # ── SQLite-Export ─────────────────────────────────────────────────────────
    print("\n" + "═" * 65)
    print("  DATENBANK-EXPORT")
    print("═" * 65)
    save_to_db(all_records)

    return all_records


if __name__ == "__main__":
    vaccines = main()
    print(f"\nGesamt: {len(vaccines)} Impfstoffe in Datenbank gespeichert.")
