# Vision Guard — Backend (FastAPI)

Person Detection (YOLOv8, Stage 3) + Face Recognition (SCRFD + ArcFace, Stage 5) API.

## 1. Install dependencies

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

pip install -r requirements.txt
```

> Your machine is CPU-only (i7 8th Gen, 8GB RAM) — this is fine. Inference will be a
> few hundred ms per frame on CPU rather than a few tens of ms on GPU. The webcam
> stream will feel closer to ~2–5 fps on CPU, which is normal and demo-safe.

## 2. Wire up your trained models

Copy these from Google Drive / Colab into `backend/models_data/`:

```
backend/models_data/
  person_detection_best.pt        <- Stage 3: runs/person_detection_custom_aug/weights/best.pt
  embeddings/
    train_embeddings.npy          <- Stage 5: embeddings/train_embeddings.npy
    train_labels.npy              <- Stage 5: embeddings/train_labels.npy
  train_images/
    <Identity Name>/photo.jpg     <- one representative photo per identity, used for
    <Identity Name 2>/photo.jpg      the 50x50 "Verified" thumbnail overlay. You can
    ...                               just copy your Images_aligned_112_split/train/
                                      folders here directly (any one image per identity).
```

If your files live elsewhere, set environment variables instead of moving files:

```bash
set YOLO_WEIGHTS_PATH=D:\thesis\best.pt
set EMBEDDINGS_DIR=D:\thesis\embeddings
set TRAIN_IMAGES_DIR=D:\thesis\Images_aligned_112_split\train
```

(`export` instead of `set` on macOS/Linux)

## 3. Run the server

```bash
uvicorn main:app --reload --port 8000
```

First request to any endpoint will trigger model loading (a few seconds). Health check:

```
GET http://localhost:8000/api/health
```

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/health` | — | Liveness check |
| POST | `/api/auth/register` | — | Create a new account (always role `user`) |
| POST | `/api/auth/login` | — | Returns a JWT access token |
| GET | `/api/auth/me` | user | Current user profile |
| PUT | `/api/auth/me` | user | Update full name / email |
| POST | `/api/auth/change-password` | user | Change your own password |
| GET | `/api/admin/users` | **admin** | List all accounts |
| PUT | `/api/admin/users/{id}/role` | **admin** | Promote/demote a user |
| GET | `/api/identities` | user | Identity/embedding counts + threshold |
| POST | `/api/upload/image` | user | Upload one image, returns annotated JPEG (base64) + summary |
| POST | `/api/upload/video` | user | Kicks off background processing, returns `{task_id}` instantly |
| GET | `/api/status/{task_id}` | user | Poll for progress/result of a video processing task |
| GET | `/api/media/{filename}` | — | Serves the processed video file |
| WS | `/ws/webcam?token=...` | user (query token) | Browser streams webcam frames in, gets annotated frames back |
| GET | `/api/logs?media_type=&identity=&matched_only=&limit=` | user | History table |
| GET | `/api/logs/stats` | user | Total/matched/unrecognized counts, top identities |
| POST | `/api/logs/clear` | **admin** | Wipes the history table |
| GET | `/api/reports/summary` | user | Daily counts + media-type breakdown + top identities, for the Reports page |

## Accounts & roles

On first run, a default **admin** account is seeded automatically:

```
username: admin
password: admin123
```

**Change this password immediately** (Profile page, or `/api/auth/change-password`)
once you've logged in — it's printed to the server console as a reminder every
time the database initializes for the first time.

New sign-ups via `/register` always get the `user` role. An admin promotes other
accounts to `admin` from the **Manage Users** page (`/app/users`, admin-only).

Regular `user` accounts can use the dashboard, history, and reports; only
`admin` accounts can clear history and manage other users' roles.

Set `VISIONID_SECRET_KEY` as an environment variable in production — the
default in `security.py` is a development placeholder.

## Known people not getting "Verified" in group/outdoor photos

Group photos taken outdoors often have harsh, uneven lighting (direct sun on
some faces, shade on others) and faces that are naturally small in the source
image before being upscaled to the 112×112 crop ArcFace expects - both hurt
embedding quality and can push a real match's similarity score below the
threshold even though the person is genuinely in the database.

Every aligned face crop is now run through a preprocessing step
(`preprocess_face_crop` in `recognizer_service.py`) before the embedding is
extracted:
1. **CLAHE illumination normalization** (on the L channel in LAB color space)
   flattens harsh shadow/sunlight contrast.
2. **Mild unsharp-mask sharpening** recovers some perceived detail lost when
   a small face region gets upscaled to 112×112.

This only runs at query time (webcam/upload), not on the clean training
photos already baked into `train_embeddings.npy` - narrowing the gap between
"posed training photo" and "messy real-world photo" without needing to
re-extract the whole embeddings database. Toggle it off in `config.py`
(`ENABLE_FACE_PREPROCESSING = False`) if you want to compare against the raw
pipeline.

## Tuning recognition (threshold, "Unrecognized" false negatives)

`FACE_MATCH_SIMILARITY_THRESHOLD` in `config.py` (currently `0.55`, tuned from
real usage logs) controls how close a face embedding must be (cosine
similarity) to count as a verified match.

From analyzing this project's actual History logs: webcam captures of a known
person landed mostly in the **0.50–0.72** range (much lower than clean
training-photo matches, which score 0.79–0.99), while strangers in crowd
photos mostly scored **0.16–0.42**, with a handful of outliers up to ~0.70.
There's real overlap in the 0.50–0.70 band — no single threshold perfectly
separates "known person under bad webcam lighting" from "stranger, unlucky
match" — `0.55` is a practical balance, not a guarantee.

If you still see real people rejected too often, lower it slightly (e.g.
`0.50`); if you see strangers getting falsely "Verified", raise it (e.g.
`0.60`). Every "Unrecognized" box shows its closest match and score in small
text (e.g. `Unrecognized (closest: Ahmed 0.34)`) so you can keep collecting
data points before adjusting further. The most durable fix long-term is adding
more webcam-condition (not just posed/clean) photos per identity to the
training set, since embedding quality — not the threshold — is the root cause
of the gap between clean-photo and webcam scores.

## Video preview not playing in the browser (async processing + FFmpeg)

Video processing now runs as a **background thread**: `POST /api/upload/video`
returns a `task_id` instantly instead of blocking until the whole video is
processed. The frontend polls `GET /api/status/{task_id}` every 3 seconds
(`useVideoProcessing` hook) until the backend reports `status: "done"` (with
`video_url` + `summary`) or `status: "error"`.

The output is always finalized with **FFmpeg** (`libx264` video + `AAC`
audio, `+faststart` for instant playback) if `ffmpeg` is on your system PATH —
this is what actually fixes "Preview isn't supported in this browser": OpenCV's
own `mp4v`/`avc1` writers are not reliably decodable by Chrome/Edge, but a
proper H.264+AAC MP4 from FFmpeg always is. If `ffmpeg` isn't installed, the
raw OpenCV-written file is served as a best-effort fallback, and the frontend
falls back further to a **Download video** button if the browser still can't
play it inline.

**Install FFmpeg** and confirm `ffmpeg -version` works from the same terminal
you run `uvicorn` from, to get guaranteed in-browser playback.

## Live webcam lag / stuttering (WebSocket + frame-skip + tracking)

The webcam pipeline was rearchitected from server-side MJPEG capture to a
**WebSocket** the browser's own webcam streams into (`GET /ws/webcam`,
`services/frame_tracker.py`):

- The **frontend** (`useWebcamSocket` hook) captures your camera via
  `getUserMedia`, downscales to 640×480 and JPEG-compresses each frame on a
  hidden canvas before sending it — much less data than the old approach.
- The **backend** only runs the full YOLOv8 + SCRFD + ArcFace pipeline once
  every `WEBCAM_FRAME_SKIP` frames (default `5`, in `config.py`). On the
  frames in between, it reuses the last detection and updates face positions
  with a lightweight OpenCV KCF tracker (falls back to simply holding the last
  known position if the tracker isn't available in your OpenCV build —
  `requirements.txt` now installs `opencv-contrib-python`, which includes it).

If it's still choppy on your machine, raise `WEBCAM_FRAME_SKIP` (e.g. `8`) for
fewer full-pipeline runs per second, or lower `CAPTURE_WIDTH`/`CAPTURE_HEIGHT`
in `frontend/src/hooks/useWebcamSocket.js` to send smaller frames.

### Growing lag ("movement shows up seconds late")

The capture loop used to send a new frame on a fixed 120ms timer regardless
of whether the backend had finished the previous one. On CPU, a single
full-pipeline frame can easily take longer than 120ms, so frames piled up
faster than they could be processed and the visible delay kept growing the
longer the stream ran (classic buffer bloat). The loop is now **self-paced**:
the frontend only captures and sends the next frame after receiving the
backend's response for the current one, so there's never more than one frame
in flight and the displayed lag stays roughly constant (bounded by one
round-trip) instead of accumulating over time.

## History / logging

Every recognition event is written to a local SQLite database at
`backend/models_data/visionid_history.db` (created automatically on first run,
see `database.py`):

- **Image uploads** — every detected face is logged individually.
- **Video uploads** — deduplicated to one row per unique identity per video
  (using its best confidence score across all frames), so a long video doesn't
  flood the table with one row per frame.
- **Webcam** — throttled to at most one log entry per identity every 5 seconds
  (`_WEBCAM_LOG_INTERVAL_SECONDS` in `main.py`), since the live stream would
  otherwise generate a row per frame.

The frontend's **History** tab (switch in the sidebar) reads from these
endpoints with filters for source, identity name, and verified-only.

## Notes on the visualization

`services/drawing_utils.py` draws **corner-bracket reticles** instead of solid
rectangles (per the design brief): emerald for a verified match (with a name badge
and a 50x50 reference thumbnail placed `X_max + 10px` to the right of the box),
muted slate-gray with an "Unrecognized" tag otherwise. Person boxes from YOLOv8 are
drawn as thin, quiet gray brackets so they don't visually compete with face results.
