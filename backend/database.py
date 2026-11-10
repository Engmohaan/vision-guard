# ============================================================
# database.py - SQLite History/Logging Store
# Keydinta natiijooyinka recognition (identity, confidence, media type,
# timestamp) si loo eegi karo taariikhda (History tab) mar dambe
# ============================================================

import sqlite3
import os
import threading
from datetime import datetime, timezone

DB_PATH = os.path.join(os.path.dirname(__file__), "models_data", "visionid_history.db")

_lock = threading.Lock()


def _get_connection():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    with _lock, _get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS detection_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                media_type TEXT NOT NULL,
                identity TEXT NOT NULL,
                confidence REAL NOT NULL,
                matched INTEGER NOT NULL
            )
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON detection_logs(timestamp)
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                email TEXT NOT NULL UNIQUE,
                full_name TEXT NOT NULL DEFAULT '',
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user',
                created_at TEXT NOT NULL
            )
        """)
        conn.commit()
    print(f"[database] Initialized at {DB_PATH}")
    _seed_default_admin()


def _seed_default_admin():
    """Abuur hal admin account default ah, kaliya haddii aan jirin isticmaale."""
    from security import hash_password

    with _lock, _get_connection() as conn:
        count = conn.execute("SELECT COUNT(*) AS c FROM users").fetchone()["c"]
        if count == 0:
            conn.execute(
                "INSERT INTO users (username, email, full_name, password_hash, role, created_at) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (
                    "admin",
                    "admin@visionid.local",
                    "System Administrator",
                    hash_password("admin123"),
                    "admin",
                    datetime.now(timezone.utc).isoformat(timespec="seconds"),
                ),
            )
            conn.commit()
            print("[database] Seeded default admin -> username: admin / password: admin123 (CHANGE THIS)")


def create_user(username, email, full_name, password_hash, role="user"):
    with _lock, _get_connection() as conn:
        cur = conn.execute(
            "INSERT INTO users (username, email, full_name, password_hash, role, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (username, email, full_name, password_hash, role,
             datetime.now(timezone.utc).isoformat(timespec="seconds")),
        )
        conn.commit()
        return cur.lastrowid


def get_user_by_username(username):
    with _lock, _get_connection() as conn:
        row = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    return dict(row) if row else None


def get_user_by_email(email):
    with _lock, _get_connection() as conn:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    return dict(row) if row else None


def get_user_by_id(user_id):
    with _lock, _get_connection() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return dict(row) if row else None


def update_user_profile(user_id, full_name=None, email=None):
    fields, params = [], []
    if full_name is not None:
        fields.append("full_name = ?")
        params.append(full_name)
    if email is not None:
        fields.append("email = ?")
        params.append(email)
    if not fields:
        return
    params.append(user_id)
    with _lock, _get_connection() as conn:
        conn.execute(f"UPDATE users SET {', '.join(fields)} WHERE id = ?", params)
        conn.commit()


def update_user_password(user_id, password_hash):
    with _lock, _get_connection() as conn:
        conn.execute("UPDATE users SET password_hash = ? WHERE id = ?", (password_hash, user_id))
        conn.commit()


def list_users():
    with _lock, _get_connection() as conn:
        rows = conn.execute("SELECT id, username, email, full_name, role, created_at FROM users ORDER BY id").fetchall()
    return [dict(row) for row in rows]


def update_user_role(user_id, role):
    with _lock, _get_connection() as conn:
        conn.execute("UPDATE users SET role = ? WHERE id = ?", (role, user_id))
        conn.commit()


def insert_log(media_type, identity, confidence, matched):
    """Ku dar hal log entry - hal identity/detection event."""
    with _lock, _get_connection() as conn:
        conn.execute(
            "INSERT INTO detection_logs (timestamp, media_type, identity, confidence, matched) "
            "VALUES (?, ?, ?, ?, ?)",
            (
                datetime.now(timezone.utc).isoformat(timespec="seconds"),
                media_type,
                identity,
                float(confidence),
                1 if matched else 0,
            ),
        )
        conn.commit()


def insert_logs_bulk(entries):
    """entries: list of (media_type, identity, confidence, matched) tuples."""
    if not entries:
        return
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    rows = [(now, mt, ident, float(conf), 1 if m else 0) for (mt, ident, conf, m) in entries]
    with _lock, _get_connection() as conn:
        conn.executemany(
            "INSERT INTO detection_logs (timestamp, media_type, identity, confidence, matched) "
            "VALUES (?, ?, ?, ?, ?)",
            rows,
        )
        conn.commit()


def get_logs(media_type=None, identity=None, matched_only=False, limit=200):
    """Soo celi log entries, tan ugu dambeysay marka hore, filters ikhtiyaari ah."""
    query = "SELECT id, timestamp, media_type, identity, confidence, matched FROM detection_logs WHERE 1=1"
    params = []

    if media_type:
        query += " AND media_type = ?"
        params.append(media_type)
    if identity:
        query += " AND identity LIKE ?"
        params.append(f"%{identity}%")
    if matched_only:
        query += " AND matched = 1"

    query += " ORDER BY timestamp DESC LIMIT ?"
    params.append(limit)

    with _lock, _get_connection() as conn:
        rows = conn.execute(query, params).fetchall()

    return [dict(row) for row in rows]


def get_stats():
    """Summary stats - inta jeer ee identity kasta la ogaaday, total logs."""
    with _lock, _get_connection() as conn:
        total = conn.execute("SELECT COUNT(*) AS c FROM detection_logs").fetchone()["c"]
        matched = conn.execute("SELECT COUNT(*) AS c FROM detection_logs WHERE matched = 1").fetchone()["c"]
        top_identities = conn.execute("""
            SELECT identity, COUNT(*) AS occurrences
            FROM detection_logs
            WHERE matched = 1
            GROUP BY identity
            ORDER BY occurrences DESC
            LIMIT 10
        """).fetchall()

    return {
        "total_logs": total,
        "matched_logs": matched,
        "unrecognized_logs": total - matched,
        "top_identities": [dict(row) for row in top_identities],
    }


def get_daily_counts(days=14):
    """Tirada logs-ka maalin kasta (ugu dambeeya `days` maalmood) - loo isticmaalo chart-ka Reports."""
    with _lock, _get_connection() as conn:
        rows = conn.execute("""
            SELECT substr(timestamp, 1, 10) AS day,
                   COUNT(*) AS total,
                   SUM(matched) AS matched
            FROM detection_logs
            WHERE substr(timestamp, 1, 10) >= date('now', ?)
            GROUP BY day
            ORDER BY day ASC
        """, (f"-{days} days",)).fetchall()
    return [dict(row) for row in rows]


def get_media_type_breakdown():
    with _lock, _get_connection() as conn:
        rows = conn.execute("""
            SELECT media_type, COUNT(*) AS total
            FROM detection_logs
            GROUP BY media_type
        """).fetchall()
    return [dict(row) for row in rows]


def clear_logs():
    with _lock, _get_connection() as conn:
        conn.execute("DELETE FROM detection_logs")
        conn.commit()
