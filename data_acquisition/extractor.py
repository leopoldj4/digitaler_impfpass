#!/usr/bin/env python3
"""
Extrahiert alle Impfstoffe und ihre Krankheiten aus impfstoffe.db
und gibt sie als JSON-Array aus (Schema wie database.json).
"""

import json
import sqlite3
import sys

DB_PATH = "impfstoffe.db"


def extract(db_path: str = DB_PATH) -> list[dict]:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute("""
        SELECT v.id, v.name, v.brand
        FROM vaccines v
        ORDER BY v.id
    """)
    vaccines = cur.fetchall()

    result = []
    for v in vaccines:
        cur.execute("""
            SELECT d.name
            FROM diseases d
            JOIN immunizes i ON i.disease_id = d.id
            WHERE i.vaccine_id = ?
            ORDER BY d.name
        """, (v["id"],))
        diseases = [row["name"] for row in cur.fetchall()]

        result.append({
            "id":       v["id"],
            "name":     v["name"],
            "brand":    v["brand"],
            "diseases": diseases,
        })

    conn.close()
    return result


OUT_PATH = "vaccines.json"

if __name__ == "__main__":
    db = sys.argv[1] if len(sys.argv) > 1 else DB_PATH
    data = extract(db)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Geschrieben: {OUT_PATH} ({len(data)} Impfstoffe)")
