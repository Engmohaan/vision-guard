# ============================================================
# frame_tracker.py - Webcam Frame-Skip + Lightweight Tracking
# The full YOLOv8 + SCRFD + ArcFace pipeline is expensive - running it on
# every incoming webcam frame is what causes CPU overload / stutter.
# This class runs the heavy pipeline only every Nth frame, and for the
# frames in between, reuses the last known face/person boxes - updated
# with a cheap OpenCV KCF tracker when available, or simple bbox
# persistence (no re-inference) as a safe fallback otherwise.
# ============================================================

import cv2

from services.pipeline import process_frame
from services.drawing_utils import draw_face_result, draw_person_box


def _make_tracker():
    """
    OpenCV's legacy tracking API (KCF, CSRT, etc.) lives in different places
    depending on how opencv was built. Try the modern location first, fall
    back gracefully, and return None if no tracker implementation is
    available at all (bbox-persistence-only mode still works fine).
    """
    for factory in (
        lambda: cv2.legacy.TrackerKCF_create(),
        lambda: cv2.TrackerKCF_create(),
    ):
        try:
            return factory()
        except Exception:
            continue
    return None


class FrameSkipSession:
    """
    Per-connection state for one webcam WebSocket session. Call
    process(frame_bgr) for every incoming frame; it decides internally
    whether to run the heavy pipeline or reuse/track the previous result.
    """

    def __init__(self, detector, recognizer, frame_skip=5):
        self.detector = detector
        self.recognizer = recognizer
        self.frame_skip = max(1, frame_skip)
        self.frame_count = 0

        self._cached_person_detections = []   # [{"bbox", "confidence"}]
        self._cached_face_results = []        # [{"bbox", "identity", "score", "is_match", "thumbnail", "closest_identity"}]
        self._face_trackers = []               # list of (tracker, face_result) - position-only updates

    def _run_full_pipeline(self, frame_bgr):
        """Every Nth frame: run YOLOv8 + SCRFD + ArcFace for real, cache results + (re)init trackers."""
        person_detections = self.detector.detect(frame_bgr)
        face_results = self.recognizer.analyze_frame(frame_bgr)

        self._cached_person_detections = person_detections
        self._cached_face_results = face_results

        self._face_trackers = []
        for face in face_results:
            x1, y1, x2, y2 = face["bbox"]
            tracker = _make_tracker()
            if tracker is not None:
                try:
                    tracker.init(frame_bgr, (int(x1), int(y1), int(x2 - x1), int(y2 - y1)))
                except Exception:
                    tracker = None
            self._face_trackers.append((tracker, face))

        return person_detections, face_results

    def _track_intermediate(self, frame_bgr):
        """
        Skip-frames: update cached face boxes with the KCF tracker if one
        was created (cheap - a fraction of the ArcFace/SCRFD cost), or just
        reuse the last known position unchanged if tracking isn't available
        or loses the target. Person boxes are simply held static - they
        change little frame-to-frame at video framerates.
        """
        updated_face_results = []
        for tracker, face in self._face_trackers:
            if tracker is not None:
                ok, box = tracker.update(frame_bgr)
                if ok:
                    x, y, w, h = box
                    face = {**face, "bbox": (x, y, x + w, y + h)}
            updated_face_results.append(face)

        self._cached_face_results = updated_face_results
        return self._cached_person_detections, updated_face_results

    def process(self, frame_bgr):
        """
        Main entry point - call once per incoming frame. Returns
        (annotated_frame, summary_dict) exactly like services.pipeline.process_frame,
        so callers don't need to know whether this frame ran the full model
        or was tracked/reused.
        """
        self.frame_count += 1
        is_key_frame = (self.frame_count % self.frame_skip == 1) or (self.frame_skip == 1)

        if is_key_frame:
            person_detections, face_results = self._run_full_pipeline(frame_bgr)
        else:
            person_detections, face_results = self._track_intermediate(frame_bgr)

        annotated = frame_bgr.copy()
        for det in person_detections:
            annotated = draw_person_box(annotated, det["bbox"], label="Person", conf=det["confidence"])
        for face in face_results:
            annotated = draw_face_result(
                annotated,
                bbox=face["bbox"],
                identity=face["identity"],
                score=face["score"],
                thumbnail_bgr=face["thumbnail"],
                is_match=face["is_match"],
                closest_identity=face.get("closest_identity"),
            )

        summary = {
            "person_count": len(person_detections),
            "face_count": len(face_results),
            "identified": [
                {"identity": f["identity"], "score": round(f["score"], 4)}
                for f in face_results if f["is_match"]
            ],
            "unrecognized_count": sum(1 for f in face_results if not f["is_match"]),
            "is_key_frame": is_key_frame,
        }

        return annotated, summary, face_results
