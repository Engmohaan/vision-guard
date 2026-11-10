# ============================================================
# drawing_utils.py - Cyberpunk Target-Reticle Bounding Box Rendering
# Halkii loo isticmaali lahaa laba-jibaaran caadi ah (solid rectangle),
# waxaan ku sawirnaa "corner bracket" style (sida reticle-yada target-ka)
# ============================================================

import cv2
import numpy as np

# --- Brand colors (BGR format - OpenCV) ---
EMERALD_BGR = (129, 199, 74)      # verified match - emerald green
SLATE_GRAY_BGR = (148, 133, 116)  # unrecognized - muted slate gray
WHITE_BGR = (245, 245, 245)
BLACK_BGR = (15, 23, 42)          # navy-black for text backgrounds


def draw_corner_brackets(frame, bbox, color, thickness=3, corner_len_ratio=0.22):
    """
    Ku sawir afar geesood oo bracket ah (target reticle), ma aha
    laba-jibaaran buuxa. x1,y1,x2,y2 = bbox pixel coordinates.
    """
    x1, y1, x2, y2 = [int(v) for v in bbox]
    w = x2 - x1
    h = y2 - y1
    corner_len = int(min(w, h) * corner_len_ratio)
    corner_len = max(corner_len, 10)

    # Top-left
    cv2.line(frame, (x1, y1), (x1 + corner_len, y1), color, thickness)
    cv2.line(frame, (x1, y1), (x1, y1 + corner_len), color, thickness)
    # Top-right
    cv2.line(frame, (x2, y1), (x2 - corner_len, y1), color, thickness)
    cv2.line(frame, (x2, y1), (x2, y1 + corner_len), color, thickness)
    # Bottom-left
    cv2.line(frame, (x1, y2), (x1 + corner_len, y2), color, thickness)
    cv2.line(frame, (x1, y2), (x1, y2 - corner_len), color, thickness)
    # Bottom-right
    cv2.line(frame, (x2, y2), (x2 - corner_len, y2), color, thickness)
    cv2.line(frame, (x2, y2), (x2, y2 - corner_len), color, thickness)

    return frame


def draw_label_badge(frame, text, origin, color, text_color=WHITE_BGR, font_scale=0.55):
    """Ku sawir label badge (background filled rectangle + text) origin sare."""
    x, y = origin
    font = cv2.FONT_HERSHEY_SIMPLEX
    thickness = 1
    (text_w, text_h), baseline = cv2.getTextSize(text, font, font_scale, thickness)

    pad_x, pad_y = 8, 5
    box_x1 = x
    box_y1 = max(y - text_h - 2 * pad_y, 0)
    box_x2 = x + text_w + 2 * pad_x
    box_y2 = box_y1 + text_h + 2 * pad_y

    overlay = frame.copy()
    cv2.rectangle(overlay, (box_x1, box_y1), (box_x2, box_y2), color, -1)
    cv2.addWeighted(overlay, 0.85, frame, 0.15, 0, frame)
    cv2.rectangle(frame, (box_x1, box_y1), (box_x2, box_y2), color, 1)

    cv2.putText(frame, text, (box_x1 + pad_x, box_y2 - pad_y),
                font, font_scale, text_color, thickness, cv2.LINE_AA)
    return frame


def overlay_thumbnail(frame, thumbnail_bgr, bbox, size=50, gap=10):
    """
    Ku dhajiso thumbnail (50x50) exactly `gap` pixels dhinaca midig ee
    bbox-ka (X_max + gap), sida spec-ku sheegay - kaliya marka la match-garay.
    """
    if thumbnail_bgr is None:
        return frame

    x1, y1, x2, y2 = [int(v) for v in bbox]
    thumb = cv2.resize(thumbnail_bgr, (size, size))

    tx1 = x2 + gap
    ty1 = max(y1, 0)
    tx2 = tx1 + size
    ty2 = ty1 + size

    frame_h, frame_w = frame.shape[:2]
    if tx2 > frame_w or ty2 > frame_h:
        return frame  # ka bood haddii thumbnail-ku ka baxsan yahay frame-ka

    # Emerald border hareeraha thumbnail-ka
    cv2.rectangle(frame, (tx1 - 2, ty1 - 2), (tx2 + 2, ty2 + 2), EMERALD_BGR, 2)
    frame[ty1:ty2, tx1:tx2] = thumb
    return frame


def draw_face_result(frame, bbox, identity, score, thumbnail_bgr=None, is_match=False, closest_identity=None):
    """
    Sawir hal natiijo weji ah oo dhamaystiran:
    - Corner brackets (emerald haddii la match-garay, slate gray haddii kale)
    - Label badge ("Verified: Name" ama "Unrecognized (closest: Name 0.xx)")
    - Thumbnail 50x50 (kaliya haddii la match-garay)
    """
    color = EMERALD_BGR if is_match else SLATE_GRAY_BGR
    frame = draw_corner_brackets(frame, bbox, color, thickness=3)

    x1, y1, x2, y2 = [int(v) for v in bbox]
    if is_match:
        label = f"Verified: {identity} ({score:.2f})"
    else:
        label = "Unrecognized"

    frame = draw_label_badge(frame, label, (x1, y1), color)

    if is_match and thumbnail_bgr is not None:
        frame = overlay_thumbnail(frame, thumbnail_bgr, bbox)

    return frame


def draw_person_box(frame, bbox, label="Person", conf=None):
    """
    Sawir bbox-ka qofka (YOLOv8 person detection) - bracket style
    oo khafiif ah (thin, slate/white) si uusan la iskaga qarin
    face recognition brackets-ka.
    """
    color = (200, 200, 200)
    frame = draw_corner_brackets(frame, bbox, color, thickness=1, corner_len_ratio=0.15)
    x1, y1, x2, y2 = [int(v) for v in bbox]
    text = f"{label} {conf:.2f}" if conf is not None else label
    cv2.putText(frame, text, (x1, min(y2 + 16, frame.shape[0] - 4)),
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, color, 1, cv2.LINE_AA)
    return frame
