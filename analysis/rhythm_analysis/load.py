"""Load session logs: the JSON array the app/admin page downloads (one session per file), JSONL, or {"events": [...]}."""
import json
from collections import defaultdict


def read_events(path):
    with open(path, encoding="utf-8") as f:
        text = f.read().strip()
    if not text:
        return []
    try:
        obj = json.loads(text)
    except json.JSONDecodeError:
        return [json.loads(line) for line in text.splitlines() if line.strip()]   # JSONL
    if isinstance(obj, dict):
        return obj.get("events", [obj])
    return obj


def load_sessions(paths):
    """-> {session_id: [events sorted by seq]}. Duplicate (session_id, seq) rows are dropped (uploads are idempotent)."""
    by = defaultdict(dict)
    for p in paths:
        for e in read_events(p):
            by[e["session_id"]][e["seq"]] = e
    return {sid: [rows[k] for k in sorted(rows)] for sid, rows in by.items()}
