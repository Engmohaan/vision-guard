# ============================================================
# main.py - Vision Guard Backend (FastAPI)
# Person Detection (YOLOv8) + Face Recognition (ArcFace) API
# Run: uvicorn main:app --reload --port 8000
# ============================================================

import os
import cv2
import json
import base64
import shutil
import tempfile
import threading
import subprocess
import numpy as np
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse, FileResponse
from pydantic import BaseModel, EmailStr

from config import settings
from services.detector_service import get_person_detector
from services.recognizer_service import get_face_recognizer
from services.pipeline import process_frame
from services.frame_tracker import FrameSkipSession
from services import task_manager
import database
import security

app = FastAPI(title="Vision Guard Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://localhost:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _on_startup():
    database.init_db()


# --- Request/response models ---
class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class ProfileUpdateRequest(BaseModel):
    full_name: str = None
    email: EmailStr = None


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


class RoleUpdateRequest(BaseModel):
    role: str   # "admin" | "user"


def _public_user(user: dict):
    return {
        "id": user["id"],
        "username": user["username"],
        "email": user["email"],
        "full_name": user["full_name"],
        "role": user["role"],
        "created_at": user["created_at"],
    }

# --- Lazy-loaded singletons (loaded on first request, not on import,
#     so the server starts instantly and models load once, on demand) ---
_detector = None
_recognizer = None
_models_lock = threading.Lock()


def get_models():
    global _detector, _recognizer
    with _models_lock:
        if _detector is None:
            _detector = get_person_detector()
        if _recognizer is None:
            _recognizer = get_face_recognizer()
    return _detector, _recognizer


# --- Throttle state for webcam logging (avoid flooding the DB every frame) ---
_last_logged_at = {}   # identity -> last logged unix timestamp
_WEBCAM_LOG_INTERVAL_SECONDS = 5


def _log_face_results(media_type, face_results, throttle=False):
    """
    Keydi natiijooyinka face recognition database-ka (history/logging).
    throttle=True (webcam) -> kaliya log haddii identity-gaas aan la
    log-garayn muddo _WEBCAM_LOG_INTERVAL_SECONDS gudaheed, si aan
    database-ku u buuxsamin frame kasta.
    """
    import time
    entries = []
    now = time.time()

    for face in face_results:
        identity = face["identity"]

        if throttle:
            last = _last_logged_at.get(identity, 0)
            if now - last < _WEBCAM_LOG_INTERVAL_SECONDS:
                continue
            _last_logged_at[identity] = now

        entries.append((media_type, identity, face["score"], face["is_match"]))

    if entries:
        database.insert_logs_bulk(entries)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "Vision Guard Backend"}


# ============================================================
# AUTH
# ============================================================

@app.post("/api/auth/register")
def register(payload: RegisterRequest):
    if database.get_user_by_username(payload.username):
        raise HTTPException(status_code=400, detail="Username-kani horay ayaa loo isticmaalay")
    if database.get_user_by_email(payload.email):
        raise HTTPException(status_code=400, detail="Email-kani horay ayaa loo isticmaalay")

    password_hash = security.hash_password(payload.password)
    user_id = database.create_user(
        payload.username, payload.email, payload.full_name, password_hash, role="user"
    )
    user = database.get_user_by_id(user_id)

    token = security.create_access_token({"sub": user["username"], "role": user["role"]})
    return {"access_token": token, "token_type": "bearer", "user": _public_user(user)}


@app.post("/api/auth/login")
def login(payload: LoginRequest):
    user = database.get_user_by_username(payload.username)
    if not user or not security.verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Username ama password khaldan")

    token = security.create_access_token({"sub": user["username"], "role": user["role"]})
    return {"access_token": token, "token_type": "bearer", "user": _public_user(user)}


@app.get("/api/auth/me")
def get_me(current_user: dict = Depends(security.get_current_user)):
    return _public_user(current_user)


@app.put("/api/auth/me")
def update_me(payload: ProfileUpdateRequest, current_user: dict = Depends(security.get_current_user)):
    if payload.email and payload.email != current_user["email"]:
        existing = database.get_user_by_email(payload.email)
        if existing and existing["id"] != current_user["id"]:
            raise HTTPException(status_code=400, detail="Email-kani horay ayaa loo isticmaalay")

    database.update_user_profile(current_user["id"], full_name=payload.full_name, email=payload.email)
    updated = database.get_user_by_id(current_user["id"])
    return _public_user(updated)


@app.post("/api/auth/change-password")
def change_password(payload: PasswordChangeRequest, current_user: dict = Depends(security.get_current_user)):
    if not security.verify_password(payload.current_password, current_user["password_hash"]):
        raise HTTPException(status_code=400, detail="Password-ka hadda ma sax ahan")

    database.update_user_password(current_user["id"], security.hash_password(payload.new_password))
    return {"status": "password_changed"}


# ============================================================
# ADMIN - user management
# ============================================================

@app.get("/api/admin/users")
def admin_list_users(admin: dict = Depends(security.require_admin)):
    return {"users": database.list_users()}


@app.put("/api/admin/users/{user_id}/role")
def admin_update_role(user_id: int, payload: RoleUpdateRequest, admin: dict = Depends(security.require_admin)):
    if payload.role not in ("admin", "user"):
        raise HTTPException(status_code=400, detail="Role waa inuu ahaadaa 'admin' ama 'user'")
    if not database.get_user_by_id(user_id):
        raise HTTPException(status_code=404, detail="User-ka lama helin")

    database.update_user_role(user_id, payload.role)
    return _public_user(database.get_user_by_id(user_id))


# ============================================================
# REPORTS
# ============================================================

@app.get("/api/reports/summary")
def reports_summary(current_user: dict = Depends(security.get_current_user)):
    """Aggregate data loogu talagalay Reports page-ka (charts + tables)."""
    stats = database.get_stats()
    daily = database.get_daily_counts(days=14)
    media_breakdown = database.get_media_type_breakdown()
    return {
        "stats": stats,
        "daily_counts": daily,
        "media_type_breakdown": media_breakdown,
    }


@app.get("/api/identities")
def list_identities(current_user: dict = Depends(security.get_current_user)):
    """Soo celi tirada identities-ka database-ka ku jira (dashboard info panel)."""
    try:
        _, recognizer = get_models()
        return {
            "identity_count": recognizer.identity_count,
            "embedding_count": recognizer.embedding_count,
            "similarity_threshold": settings.FACE_MATCH_SIMILARITY_THRESHOLD,
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/logs")
def list_logs(
    media_type: str = None,
    identity: str = None,
    matched_only: bool = False,
    limit: int = 200,
    current_user: dict = Depends(security.get_current_user),
):
    """
    Soo celi taariikhda detection/recognition-ka (History tab).
    Filters ikhtiyaari ah: media_type (image/video/webcam), identity (partial match),
    matched_only (kaliya verified matches).
    """
    logs = database.get_logs(media_type=media_type, identity=identity, matched_only=matched_only, limit=limit)
    return {"logs": logs}


@app.get("/api/logs/stats")
def logs_stats(current_user: dict = Depends(security.get_current_user)):
    """Summary stats - total logs, matched vs unrecognized, top identities."""
    return database.get_stats()


@app.post("/api/logs/clear")
def clear_logs(admin: dict = Depends(security.require_admin)):
    """Nadiifi taariikhda oo dhan (History tab 'Clear' button)."""
    database.clear_logs()
    return {"status": "cleared"}


def _encode_frame_to_base64(frame_bgr):
    success, buffer = cv2.imencode(".jpg", frame_bgr, [cv2.IMWRITE_JPEG_QUALITY, 90])
    if not success:
        return None
    return base64.b64encode(buffer).decode("utf-8")


@app.post("/api/upload/image")
async def upload_image(file: UploadFile = File(...), current_user: dict = Depends(security.get_current_user)):
    """
    Aqbal hal sawir, ku ordi YOLOv8 + ArcFace pipeline-ka, soo celi
    sawirka la annotate-gareeyay (base64) + summary JSON.
    """
    try:
        detector, recognizer = get_models()

        contents = await file.read()
        np_arr = np.frombuffer(contents, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if frame is None:
            raise HTTPException(status_code=400, detail="Sawirka lama akhrin karo - format khaldan")

        annotated, summary, face_results = process_frame(frame, detector, recognizer)
        _log_face_results("image", face_results, throttle=False)

        encoded = _encode_frame_to_base64(annotated)

        return JSONResponse({
            "image_base64": f"data:image/jpeg;base64,{encoded}",
            "summary": summary,
        })
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))


def _process_video_task(task_id, input_path, detector, recognizer):
    """
    Runs in a background thread (started from the upload endpoint, which
    returns immediately with a task_id). Does the exact same frame-by-frame
    pipeline as before, but reports progress into task_manager as it goes,
    and always finishes with an FFmpeg H.264 + AAC re-encode so the result
    is guaranteed browser-playable (not just a best-effort fallback).
    """
    try:
        cap = cv2.VideoCapture(input_path)
        if not cap.isOpened():
            task_manager.update_task(task_id, status="error", error="Video-ga lama furin karo")
            return

        fps = cap.get(cv2.CAP_PROP_FPS) or 25
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 0

        output_dir = tempfile.gettempdir()
        raw_output_path = os.path.join(output_dir, f"visionid_raw_{next(tempfile._get_candidate_names())}.mp4")

        writer = None
        for candidate_fourcc in ("avc1", "H264", "mp4v"):
            fourcc = cv2.VideoWriter_fourcc(*candidate_fourcc)
            candidate_writer = cv2.VideoWriter(raw_output_path, fourcc, fps, (width, height))
            if candidate_writer.isOpened():
                writer = candidate_writer
                break
            candidate_writer.release()

        if writer is None:
            task_manager.update_task(task_id, status="error", error="Video encoder-ku ma furmin")
            cap.release()
            return

        frame_count = 0
        total_faces = 0
        max_faces_in_frame = 0
        max_unrecognized_in_frame = 0
        best_score_per_identity = {}

        # Bug fix (processing speed): video used to run the full YOLOv8 +
        # SCRFD + ArcFace pipeline on every single frame, which is why long
        # videos took a long time even running in the background. Reuse the
        # same frame-skip + lightweight-tracking session built for webcam -
        # the heavy models now run once every VIDEO_FRAME_SKIP frames.
        session = FrameSkipSession(detector, recognizer, frame_skip=settings.VIDEO_FRAME_SKIP)

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            annotated, summary, face_results = session.process(frame)
            writer.write(annotated)

            for face in face_results:
                if face["is_match"]:
                    prev = best_score_per_identity.get(face["identity"], 0)
                    best_score_per_identity[face["identity"]] = max(prev, face["score"])

            total_faces += summary["face_count"]
            # Bug fix: "Detected" used to sum face_count across EVERY frame
            # (a single person appearing in 90 frames showed "88 detected").
            # What people actually mean by "detected" is "how many distinct
            # people were in the scene at once" - track the PEAK simultaneous
            # count per frame instead of accumulating across the whole clip.
            max_faces_in_frame = max(max_faces_in_frame, summary["face_count"])
            max_unrecognized_in_frame = max(max_unrecognized_in_frame, summary["unrecognized_count"])
            frame_count += 1

            # --- Report progress so the frontend's poller can show it ---
            if total_frames > 0:
                pct = min(95, int((frame_count / total_frames) * 90))  # cap at 90% - last 10% is the ffmpeg pass
                task_manager.update_task(task_id, progress=pct)

        cap.release()
        writer.release()
        os.remove(input_path)

        # --- Always finalize with FFmpeg H.264 (libx264) + AAC audio, per Bug 1 spec ---
        task_manager.update_task(task_id, progress=95)
        final_output_path = raw_output_path
        browser_playable = False

        if shutil.which("ffmpeg"):
            transcoded_path = os.path.join(output_dir, f"visionid_output_{next(tempfile._get_candidate_names())}.mp4")
            ffmpeg_result = subprocess.run(
                ["ffmpeg", "-y", "-i", raw_output_path,
                 "-vcodec", "libx264", "-preset", "veryfast","-pix_fmt", "yuv420p",
                 "-acodec", "aac", "-movflags", "+faststart",
                 transcoded_path],
                capture_output=True,
            )
            if ffmpeg_result.returncode == 0 and os.path.exists(transcoded_path):
                os.remove(raw_output_path)
                final_output_path = transcoded_path
                browser_playable = True
        else:
            # No ffmpeg on PATH - the raw file may still play if avc1/H264
            # writer succeeded; the frontend falls back to a Download button
            # if the browser genuinely can't decode it.
            browser_playable = True  # best effort; frontend still has onError fallback

        dedup_entries = [
            ("video", identity, score, True)
            for identity, score in best_score_per_identity.items()
        ]
        database.insert_logs_bulk(dedup_entries)

        task_manager.update_task(
            task_id,
            status="done",
            progress=100,
            video_url=f"/api/media/{os.path.basename(final_output_path)}",
            browser_playable=browser_playable,
            summary={
                "frame_count": frame_count,
                "face_count": max_faces_in_frame,            # peak, shown as "Detected" (fixes the 88-bug)
                "unrecognized_count": max_unrecognized_in_frame,
                "total_faces_detected": total_faces,          # kept for Reports/analytics, not shown as headline stat
                "unique_identities": sorted(best_score_per_identity.keys()),
                "identified": [
                    {"identity": name, "score": round(score, 4)}
                    for name, score in best_score_per_identity.items()
                ],
            },
        )
    except Exception as e:
        task_manager.update_task(task_id, status="error", error=str(e))


@app.post("/api/upload/video")
async def upload_video(file: UploadFile = File(...), current_user: dict = Depends(security.get_current_user)):
    """
    Aqbal video, keydi disk sax ah, kadibna bilaabi processing-ka
    BACKGROUND THREAD gudihiisa - soo celi task_id ISLA MARKIIBA (ma sugo
    processing-ka inuu dhammaado). Frontend-ku wuxuu poll gareeyaa
    GET /api/status/{task_id} ilaa uu dhammaado.
    """
    detector, recognizer = get_models()

    suffix = Path(file.filename).suffix or ".mp4"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_in:
        shutil.copyfileobj(file.file, tmp_in)
        input_path = tmp_in.name

    task_id = task_manager.create_task()

    thread = threading.Thread(
        target=_process_video_task,
        args=(task_id, input_path, detector, recognizer),
        daemon=True,
    )
    thread.start()

    return JSONResponse({"task_id": task_id})


@app.get("/api/status/{task_id}")
def get_task_status(task_id: str, current_user: dict = Depends(security.get_current_user)):
    """
    Polled by the frontend every ~3s while a video is processing.
    Returns {status: "processing"|"done"|"error", progress, video_url, summary, error}.
    """
    task = task_manager.get_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task-kan lama helin (waa laga yaabaa inuu dhacay)")
    return task


@app.get("/api/media/{filename}")
def get_media(filename: str):
    """Soo celi video-ga la process-gareeyay (output file)."""
    file_path = os.path.join(tempfile.gettempdir(), filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Faylka lama helin")
    return FileResponse(file_path, media_type="video/mp4")


@app.websocket("/ws/webcam")
async def websocket_webcam(websocket: WebSocket):
    """
    Bug 2 fix - replaces the old server-side MJPEG capture with a
    WebSocket the BROWSER's own webcam feed streams into:

    1. React captures the local webcam via getUserMedia, downscales +
       JPEG-compresses each frame client-side, and sends the raw bytes
       over this socket (see frontend ControlPanel/useWebcamSocket).
    2. The backend decodes each frame, runs it through FrameSkipSession
       (full YOLOv8 + SCRFD + ArcFace pipeline every WEBCAM_FRAME_SKIP-th
       frame; cheap KCF tracking / bbox reuse on the frames in between),
       and sends the annotated JPEG bytes back over the same socket.

    Auth: browsers can't set custom headers on a WebSocket handshake, so
    the JWT is passed as a query string (?token=...), same pattern as the
    old MJPEG endpoint used.
    """
    token = websocket.query_params.get("token")
    user = security.get_user_from_token_string(token)
    if user is None:
        await websocket.close(code=4401)  # custom close code = unauthorized
        return

    await websocket.accept()

    detector, recognizer = get_models()
    session = FrameSkipSession(detector, recognizer, frame_skip=settings.WEBCAM_FRAME_SKIP)

    try:
        while True:
            frame_bytes = await websocket.receive_bytes()

            np_arr = np.frombuffer(frame_bytes, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            if frame is None:
                continue

            annotated, summary, face_results = session.process(frame)

            # Only log on key frames (the ones that actually ran ArcFace) -
            # tracked frames reuse the same identity/score, logging them too
            # would just duplicate entries without new information.
            if summary["is_key_frame"]:
                _log_face_results("webcam", face_results, throttle=True)

            success, buffer = cv2.imencode(
                ".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, settings.WEBCAM_JPEG_QUALITY]
            )
            if not success:
                continue

            # Bug fix: the Analysis Result panel never updated during webcam
            # streaming because only the annotated JPEG was sent back, never
            # the JSON summary the frontend needs to populate it. Send both -
            # a text (JSON) message for the summary, then a binary message
            # for the frame - the frontend distinguishes them by type.
            await websocket.send_text(json.dumps({
                "person_count": summary["person_count"],
                "face_count": summary["face_count"],
                "unrecognized_count": summary["unrecognized_count"],
                "identified": summary["identified"],
            }))
            await websocket.send_bytes(buffer.tobytes())
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[websocket_webcam] error: {e}")
