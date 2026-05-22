"""
JSON_to_SQL.py
_______
Liest eine JSON-Datei (beliebige Struktur) ein und schreibt
die Daten in eine SQLite-Datenbank.

Aufruf:
    python JSON_to_SQL.py impfpass_beispiel.json
    python JSON_to_SQL.py impfpass_beispiel.json --db impfpass.db   (optionaler DB-Pfad)

Die Datenbank wird automatisch erstellt, falls sie noch nicht existiert.
Neue JSON-Felder werden automatisch als neue Spalten ergänzt.
Datumsfelder werden automatisch in das Format YYYY-MM-DD umgewandelt.
Es wird nie etwas überschrieben, jeder Import fügt neue Zeilen hinzu.
"""

import sqlite3
import json
import argparse
import logging
import sys
import re
from pathlib import Path
from datetime import datetime

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)s  %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)

# Datumsverarbeitung

# Deutsche und falls notwendig englische Monatsnamen → Monatsnummer
MONTH_NAMES = {
    "jan": "01", "feb": "02", "mar": "03", "mär": "03", "apr": "04",
    "mai": "05", "may": "05", "jun": "06", "jul": "07", "aug": "08",
    "sep": "09", "okt": "10", "oct": "10", "nov": "11", "dez": "12", "dec": "12",
}

def normalize_date(value):
    """
    Erkennt und vereinheitlicht Datumsangaben in YYYY-MM-DD.

    Unterstützte Formate:
        "19. JAN. 2007"  → "2007-01-19"
        "11. MAI 2007"   → "2007-05-11"
        "21.3.2011"      → "2011-03-21"
        "27.6.11"        → "2011-06-27"
        "3.12"           → "unkn-12-03"  (nur Monat bekannt)
        "2007-01-19"     → "2007-01-19"  (bereits korrekt)

    Gibt den Originalwert zurück, wenn kein Datum erkannt wird.
    """
    if not isinstance(value, str):
        return value

    text = value.strip()

    # Bereits im Zielformat
    if re.match(r"^\d{4}-\d{2}-\d{2}$", text):
        return text

    # Format: "19. JAN. 2007" oder "11. MAI 2007"
    m = re.match(
        r"(\d{1,2})[\.\s]+([A-Za-zÄäÖöÜü]{3})\.?\s+(\d{4})",
        text, re.IGNORECASE
    )
    if m:
        day, mon, year = m.group(1), m.group(2).lower()[:3], m.group(3)
        month = MONTH_NAMES.get(mon)
        if month:
            return f"{year}-{month}-{day.zfill(2)}"

    # Format: "21.3.2011" oder "27.6.11"
    m = re.match(r"^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$", text)
    if m:
        day, month, year = m.group(1), m.group(2), m.group(3)
        if len(year) == 2:
            year = "20" + year if int(year) <= 30 else "19" + year
        return f"{year}-{month.zfill(2)}-{day.zfill(2)}"

    # Format: "3.12", nur Tag und Monat, kein Jahr
    m = re.match(r"^(\d{1,2})\.(\d{1,2})$", text)
    if m:
        day, month = m.group(1), m.group(2)
        logger.warning("Datum ohne Jahreszahl: '%s' → Jahr unbekannt", text)
        return f"unkn-{month.zfill(2)}-{day.zfill(2)}"

    # Nichts erkannt, Originalwert behalten, Warnung ausgeben
    logger.warning("Datum nicht erkannt, wird unverändert gespeichert: '%s'", text)
    return text


def normalize_dates_in_record(rec):
    """
    Geht alle Felder eines Datensatzes durch und wandelt Datumsfelder um.
    Erkennt Datumsfelder an Schlüsseln wie 'date', 'datum', 'birth_date' usw.
    """
    DATE_KEYS = {"date", "datum", "birth_date", "geburtsdatum", "vaccination_date",
                 "impfdatum", "dob", "geburtstag"}
    result = {}
    for key, value in rec.items():
        if any(dk in key.lower() for dk in DATE_KEYS):
            result[key] = normalize_date(value)
        else:
            result[key] = value
    return result


# Hilfsfunktionen

def flatten(data, prefix="", sep="__"):
    """
    Wandelt ein verschachteltes Dictionary in ein flaches Dictionary um.
    Listen werden als JSON-Text gespeichert, da SQLite keine Arrays kennt.
    """
    items = {}
    if isinstance(data, dict):
        for key, value in data.items():
            full_key = f"{prefix}{sep}{key}" if prefix else key
            if isinstance(value, dict):
                items.update(flatten(value, full_key, sep))
            elif isinstance(value, list):
                items[full_key] = json.dumps(value, ensure_ascii=False)
            else:
                items[full_key] = value
    return items


def sanitize_column(name):
    """Macht einen beliebigen String zu einem gültigen SQLite-Spaltennamen."""
    result = ""
    for char in str(name):
        if char.isalnum() or char == "_":
            result += char
        else:
            result += "_"
    if result and result[0].isdigit():
        result = "col_" + result
    return result.lower()


def ensure_columns(conn, table, columns):
    """Ergänzt fehlende Spalten automatisch als TEXT."""
    existing = {
        row[1].lower()
        for row in conn.execute(f"PRAGMA table_info({table})")
    }
    for col in columns:
        if col.lower() not in existing:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {col} TEXT")
            logger.info("Neue Spalte hinzugefügt: %s.%s", table, col)


def get_table_name(json_path):
    """Leitet den Tabellennamen aus dem Dateinamen ab."""
    stem = Path(json_path).stem
    name = sanitize_column(stem)
    return name if name else "impfdaten"


# Kern-Importlogik

def import_json(json_path, db_path="impfpass.db"):
    """
    Hauptfunktion: liest JSON ein, legt Tabelle an (oder erweitert sie)
    und fügt alle Datensätze ein.
    """
    json_path = Path(json_path)
    if not json_path.exists():
        logger.error("Datei nicht gefunden: %s", json_path)
        sys.exit(1)

    with open(json_path, encoding="utf-8") as f:
        raw = json.load(f)

    records = normalize(raw)

    if not records:
        logger.warning("Keine Datensätze gefunden in: %s", json_path)
        return

    # Datumsfelder vereinheitlichen
    records = [normalize_dates_in_record(rec) for rec in records]

    # Metaspalten hinzufügen
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    for rec in records:
        rec["_quelldatei"] = json_path.name
        rec["_importiert_am"] = timestamp

    # Spaltennamen bereinigen
    clean_records = []
    for rec in records:
        clean = {sanitize_column(k): v for k, v in rec.items()}
        clean_records.append(clean)

    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL;")

    table = get_table_name(json_path)

    # Alle Spalten aus allen Datensätzen sammeln
    all_columns_set = []
    seen = set()
    for rec in clean_records:
        for col in rec.keys():
            if col not in seen:
                all_columns_set.append(col)
                seen.add(col)

    cols_def = ", ".join(f"{col} TEXT" for col in all_columns_set)
    conn.execute(
        f"CREATE TABLE IF NOT EXISTS {table} "
        f"(id INTEGER PRIMARY KEY AUTOINCREMENT, {cols_def})"
    )
    ensure_columns(conn, table, all_columns_set)

    inserted = 0
    for rec in clean_records:
        ensure_columns(conn, table, list(rec.keys()))
        cols = ", ".join(rec.keys())
        placeholders = ", ".join("?" for _ in rec)
        conn.execute(
            f"INSERT INTO {table} ({cols}) VALUES ({placeholders})",
            list(rec.values()),
        )
        inserted += 1

    conn.commit()
    conn.close()

    logger.info(
        "Import abgeschlossen: %d Datensätze → Tabelle '%s' in '%s'",
        inserted, table, db_path,
    )
    return {"tabelle": table, "eintraege": inserted, "datenbank": db_path}


def normalize(raw):
    """
    Bringt beliebige JSON-Strukturen in eine flache Liste von Dicts.

    Fall 1: [ {...}, {...} ]            → direkt verwenden
    Fall 2: { "feld": "wert" }          → [ {"feld": "wert"} ]
    Fall 3: { "meta": {}, "liste": [] } → Liste extrahieren + Meta anhängen
    """
    if isinstance(raw, list):
        return [flatten(item) if isinstance(item, dict) else {"wert": item} for item in raw]

    if isinstance(raw, dict):
        list_fields   = {k: v for k, v in raw.items() if isinstance(v, list)}
        scalar_fields = {k: v for k, v in raw.items() if not isinstance(v, (list, dict))}
        dict_fields   = {k: v for k, v in raw.items() if isinstance(v, dict)}

        if list_fields:
            main_key, main_list = next(iter(list_fields.items()))
            records = []
            for item in main_list:
                rec = flatten(item) if isinstance(item, dict) else {"wert": item}
                for k, v in scalar_fields.items():
                    rec[f"meta__{k}"] = v
                for k, v in dict_fields.items():
                    rec.update(flatten(v, prefix=f"meta__{k}"))
                records.append(rec)
            return records

        return [flatten(raw)]

    return [{"wert": raw}]


# Kommandozeile

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="JSON-Datei in SQLite-Datenbank importieren"
    )
    parser.add_argument(
        "json_datei",
        help="Pfad zur JSON-Datei (z.B. impfpass_mueller.json)"
    )
    parser.add_argument(
        "--db",
        default="impfpass.db",
        help="Pfad zur SQLite-Datenbank (Standard: impfpass.db)"
    )
    args = parser.parse_args()

    import_json(args.json_datei, args.db)