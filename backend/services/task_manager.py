# ============================================================
# task_manager.py - In-memory background task tracker
# Used so video uploads return instantly with a task_id, while the
# heavy frame-by-frame pipeline runs in a background thread and the
# frontend polls /api/status/{task_id} for progress.
# ============================================================

import threading
import uuid
import time

_lock = threading.Lock()
_tasks = {}

# Tasks older than this are dropped on the next create_task() call, so the
# in-memory dict doesn't grow forever across a long-running server process.
_TASK_TTL_SECONDS = 60 * 60  # 1 hour


def _prune_old_tasks():
    cutoff = time.time() - _TASK_TTL_SECONDS
    stale = [tid for tid, t in _tasks.items() if t.get("created_at", 0) < cutoff]
    for tid in stale:
        del _tasks[tid]


def create_task():
    """Register a new task in the 'queued' state, return its id immediately."""
    task_id = str(uuid.uuid4())
    with _lock:
        _prune_old_tasks()
        _tasks[task_id] = {
            "status": "processing",   # "processing" | "done" | "error"
            "progress": 0,             # 0-100
            "video_url": None,
            "browser_playable": None,
            "summary": None,
            "error": None,
            "created_at": time.time(),
        }
    return task_id


def update_task(task_id, **fields):
    with _lock:
        if task_id in _tasks:
            _tasks[task_id].update(fields)


def get_task(task_id):
    with _lock:
        task = _tasks.get(task_id)
        return dict(task) if task else None
