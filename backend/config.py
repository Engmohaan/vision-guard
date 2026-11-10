# ============================================================
# config.py - Vision Guard Backend Configuration
# Dhammaan paths-ka, thresholds-ka, iyo settings-ka guud
# ============================================================

import os

class Settings:
    # --- CORS ---
    FRONTEND_ORIGIN = "http://localhost:5173"

    # --- YOLOv8 Person Detection (Stage 3) ---
    # BEDDEL path-kan si uu ugu habboonaado meesha best.pt ku yaal kombiyuutarkaaga
    YOLO_WEIGHTS_PATH = os.environ.get(
        "YOLO_WEIGHTS_PATH",
        r"models_data/person_detection_best.pt"
    )
    YOLO_CONF_THRESHOLD = 0.35
    YOLO_IMG_SIZE = 640

    # --- ArcFace Face Recognition (Stage 5) ---
    # BEDDEL path-kan si uu ugu habboonaado meesha embeddings-ka ku yaalliin
    EMBEDDINGS_DIR = os.environ.get(
        "EMBEDDINGS_DIR",
        r"models_data/embeddings"
    )
    TRAIN_EMBEDDINGS_FILE = "train_embeddings.npy"
    TRAIN_LABELS_FILE = "train_labels.npy"

    # Reference/thumbnail images (hal sawir identity kasta, la isticmaalo
    # marka la sawiro 50x50 thumbnail-ka verified overlay-ga)
    TRAIN_IMAGES_DIR = os.environ.get(
        "TRAIN_IMAGES_DIR",
        r"models_data/train_images"
    )

    FACE_DET_CONF_THRESHOLD = 0.5
    FACE_MATCH_SIMILARITY_THRESHOLD = 0.55   # tuned from real usage logs - see backend/README.md "Tuning recognition"
    FACE_ALIGN_SIZE = 112

    # Illumination normalization (CLAHE) + mild sharpening on every aligned
    # face crop before ArcFace embedding extraction - improves matches on
    # outdoor/group photos with uneven lighting or small/upscaled faces.
    # Set False to compare behavior against the old raw-crop pipeline.
    ENABLE_FACE_PREPROCESSING = True

    # --- Webcam ---
    WEBCAM_INDEX = 0
    WEBCAM_JPEG_QUALITY = 80
    # Frame-skip optimization for the /ws/webcam WebSocket: the heavy
    # YOLOv8 + SCRFD + ArcFace pipeline runs once every N frames; the
    # frames in between reuse/track the last result instead of re-running
    # the full CPU-heavy inference (see services/frame_tracker.py).
    WEBCAM_FRAME_SKIP = 60

    # Same frame-skip optimization applied to uploaded VIDEO processing -
    # this is what actually cuts wall-clock processing time (not just makes
    # it non-blocking). 3 = full pipeline runs on 1 out of every 3 frames;
    # raise for faster processing at the cost of slightly staler tracked
    # boxes on skipped frames, lower for more accuracy per frame.
    VIDEO_FRAME_SKIP = 60

    # --- Compute device ---
    # "auto" -> isticmaal GPU haddii jiro, haddii kalena CPU
    DEVICE_MODE = "auto"


settings = Settings()
