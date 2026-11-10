# ============================================================
# detector_service.py - YOLOv8 Person Detection Service (Stage 3)
# Wraps the trained best.pt weights for person detection
# ============================================================

import os
import torch
from ultralytics import YOLO
from config import settings


class PersonDetector:
    """Singleton wrapper for the trained YOLOv8 person detection model."""

    def __init__(self):
        self.model = None
        self.device = None
        self._load()

    def _load(self):
        if not os.path.exists(settings.YOLO_WEIGHTS_PATH):
            raise FileNotFoundError(
                f"YOLOv8 weights ma jiraan: {settings.YOLO_WEIGHTS_PATH}\n"
                f"Beddel YOLO_WEIGHTS_PATH config.py gudihiisa, ama env var YOLO_WEIGHTS_PATH."
            )

        if settings.DEVICE_MODE == "auto":
            self.device = 0 if torch.cuda.is_available() else "cpu"
        else:
            self.device = settings.DEVICE_MODE

        self.model = YOLO(settings.YOLO_WEIGHTS_PATH)
        print(f"[PersonDetector] Loaded {settings.YOLO_WEIGHTS_PATH} on device={self.device}")

    def detect(self, frame_bgr):
        """
        Ordi detection frame kor (BGR numpy array).
        Soo celi liis: [{"bbox": (x1,y1,x2,y2), "confidence": float}]
        """
        results = self.model.predict(
            frame_bgr,
            conf=settings.YOLO_CONF_THRESHOLD,
            imgsz=settings.YOLO_IMG_SIZE,
            device=self.device,
            classes=[0],   # class 0 = person
            verbose=False,
        )

        detections = []
        for box in results[0].boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            conf = float(box.conf[0])
            detections.append({"bbox": (x1, y1, x2, y2), "confidence": conf})

        return detections


# Lazy singleton - la load-gareeyaa markii ugu horreysa la codsado
_detector_instance = None


def get_person_detector():
    global _detector_instance
    if _detector_instance is None:
        _detector_instance = PersonDetector()
    return _detector_instance
