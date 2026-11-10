# ============================================================
# recognizer_service.py - Face Recognition Service (Stage 5)
# SCRFD (face detection + landmarks) + ArcFace w600k_r50 (embedding)
# + cosine similarity match against the trained identity database
# ============================================================

import os
import cv2
import numpy as np
import torch
from pathlib import Path
from insightface.app import FaceAnalysis
from insightface.model_zoo import get_model
from insightface.utils import face_align
from sklearn.metrics.pairwise import cosine_similarity

from config import settings


def preprocess_face_crop(aligned_bgr):
    """
    Runs on every aligned 112x112 face crop, right after SCRFD landmark
    alignment and before ArcFace embedding extraction. Fixes the "known
    person not verified" issue in outdoor/group photos where lighting is
    uneven (direct sun on some faces, shade on others) and faces are
    naturally small in the source image before being upscaled to 112x112.

    Note this deliberately only runs at QUERY time (webcam/upload), not on
    the clean training photos used to build train_embeddings.npy - those
    are already good quality and don't need it. This narrows the gap
    between "clean training photo" and "messy real-world photo" conditions
    without needing to re-extract the whole embeddings database.
    """
    # 1. CLAHE illumination normalization (LAB color space, L channel only)
    #    - flattens harsh shadow/sunlight contrast so half a face lit by
    #      direct sun and half in shade both stay within a usable range.
    lab = cv2.cvtColor(aligned_bgr, cv2.COLOR_BGR2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l_channel = clahe.apply(l_channel)
    lab = cv2.merge((l_channel, a_channel, b_channel))
    normalized = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)

    # 2. Mild unsharp-mask sharpening - recovers some perceived detail lost
    #    when a small face region (group/outdoor photos) gets upscaled to
    #    112x112 during alignment.
    blurred = cv2.GaussianBlur(normalized, (0, 0), sigmaX=1.0)
    sharpened = cv2.addWeighted(normalized, 1.5, blurred, -0.5, 0)

    return sharpened


class FaceRecognizer:
    """Singleton wrapper: SCRFD detector + ArcFace recognizer + identity database."""

    def __init__(self):
        self.face_app = None
        self.rec_model = None
        self.train_embeddings = None
        self.train_labels = None
        self.thumbnail_cache = {}
        self._load()

    def _load(self):
        gpu_available = torch.cuda.is_available()
        providers = ["CUDAExecutionProvider", "CPUExecutionProvider"] if gpu_available else ["CPUExecutionProvider"]
        ctx_id = 0 if gpu_available else -1

        # --- SCRFD detector (buffalo_l bundle includes det_10g.onnx = SCRFD) ---
        self.face_app = FaceAnalysis(name="buffalo_l", providers=providers)
        self.face_app.prepare(ctx_id=ctx_id, det_size=(640, 640))

        # --- ArcFace recognizer (w600k_r50.onnx) ---
        rec_model_path = os.path.expanduser("~/.insightface/models/buffalo_l/w600k_r50.onnx")
        self.rec_model = get_model(rec_model_path, providers=providers)
        self.rec_model.prepare(ctx_id=ctx_id)

        # --- Identity database (embeddings extracted from Stage 5 training pipeline) ---
        emb_path = os.path.join(settings.EMBEDDINGS_DIR, settings.TRAIN_EMBEDDINGS_FILE)
        labels_path = os.path.join(settings.EMBEDDINGS_DIR, settings.TRAIN_LABELS_FILE)

        if not os.path.exists(emb_path) or not os.path.exists(labels_path):
            raise FileNotFoundError(
                f"Embeddings database ma jiraan: {emb_path} / {labels_path}\n"
                f"Hubi EMBEDDINGS_DIR config.py gudihiisa."
            )

        self.train_embeddings = np.load(emb_path)
        self.train_labels = np.load(labels_path)

        print(f"[FaceRecognizer] Loaded {len(self.train_embeddings)} embeddings, "
              f"{len(set(self.train_labels))} identities (device={'GPU' if gpu_available else 'CPU'})")

    def _get_thumbnail(self, identity):
        """
        Hel/keydi hal sawir tusaale ah (thumbnail) identity kasta -
        loo isticmaalo overlay-ga 50x50 ee "Verified" badge-ka.
        Cached si aan mar walba disk-ka looga akhrin.
        """
        if identity in self.thumbnail_cache:
            return self.thumbnail_cache[identity]

        identity_folder = os.path.join(settings.TRAIN_IMAGES_DIR, identity)
        thumbnail = None

        if os.path.isdir(identity_folder):
            for fname in os.listdir(identity_folder):
                if Path(fname).suffix.lower() in {".jpg", ".jpeg", ".png"}:
                    img = cv2.imread(os.path.join(identity_folder, fname))
                    if img is not None:
                        thumbnail = img
                        break

        self.thumbnail_cache[identity] = thumbnail
        return thumbnail

    def analyze_frame(self, frame_bgr):
        """
        Aad frame kor, hel wejiyada oo dhan, align+crop+embed+match
        kii kasta. Soo celi liis natiijooyin:
        [{"bbox", "identity", "score", "is_match", "thumbnail"}]
        """
        faces = self.face_app.get(frame_bgr)
        valid_faces = [f for f in faces if f.det_score >= settings.FACE_DET_CONF_THRESHOLD]

        results = []
        for face in valid_faces:
            bbox = tuple(face.bbox.tolist())
            kps = face.kps

            aligned = face_align.norm_crop(frame_bgr, landmark=kps, image_size=settings.FACE_ALIGN_SIZE)

            if settings.ENABLE_FACE_PREPROCESSING:
                aligned = preprocess_face_crop(aligned)

            embedding = self.rec_model.get_feat(aligned).flatten()

            similarities = cosine_similarity([embedding], self.train_embeddings)[0]
            best_idx = int(np.argmax(similarities))
            best_score = float(similarities[best_idx])
            closest_identity = str(self.train_labels[best_idx])
            is_match = best_score >= settings.FACE_MATCH_SIMILARITY_THRESHOLD
            identity = closest_identity if is_match else "Unrecognized"

            thumbnail = self._get_thumbnail(closest_identity) if is_match else None

            results.append({
                "bbox": bbox,
                "identity": identity,
                "closest_identity": closest_identity,
                "score": best_score,
                "is_match": is_match,
                "thumbnail": thumbnail,
            })

        return results

    @property
    def identity_count(self):
        return len(set(self.train_labels)) if self.train_labels is not None else 0

    @property
    def embedding_count(self):
        return len(self.train_embeddings) if self.train_embeddings is not None else 0


_recognizer_instance = None


def get_face_recognizer():
    global _recognizer_instance
    if _recognizer_instance is None:
        _recognizer_instance = FaceRecognizer()
    return _recognizer_instance
