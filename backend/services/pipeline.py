# ============================================================
# pipeline.py - Unified per-frame AI pipeline
# YOLOv8 person detection + ArcFace face recognition + cyberpunk overlays
# ============================================================

from services.drawing_utils import draw_face_result, draw_person_box


def process_frame(frame_bgr, detector, recognizer, run_person_detection=True):
    """
    Ku shaqee hal frame:
    1. YOLOv8 person detection (optional, thin gray brackets)
    2. SCRFD + ArcFace face recognition (emerald=verified, gray=unrecognized)
    Soo celi (annotated_frame, summary_dict)
    """
    annotated = frame_bgr.copy()

    person_detections = []
    if run_person_detection:
        person_detections = detector.detect(frame_bgr)
        for det in person_detections:
            annotated = draw_person_box(annotated, det["bbox"], label="Person", conf=det["confidence"])

    face_results = recognizer.analyze_frame(frame_bgr)
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
    }

    return annotated, summary, face_results
