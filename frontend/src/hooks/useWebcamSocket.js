import { useRef, useState, useCallback, useEffect } from 'react'
import { webcamSocketUrl } from '../api.js'

// Bug fix - downscaled capture resolution + JPEG quality sent to the
// backend. Smaller frames = less network overhead and less work for the
// backend to decode, on top of the server-side frame-skip optimization.
const CAPTURE_WIDTH = 640
const CAPTURE_HEIGHT = 480
const JPEG_QUALITY = 0.6

/**
 * Captures the local webcam via getUserMedia, downscales + JPEG-compresses
 * each frame on a hidden canvas, and streams the bytes to the backend over
 * a WebSocket (ws://.../ws/webcam). Displays whatever annotated frame the
 * backend sends back (as an object URL) via `displaySrc`.
 *
 * Bug fix - lag that grows over time (movement showing up seconds late):
 * this used to send a new frame on a fixed 120ms timer REGARDLESS of
 * whether the backend had finished processing the previous one. On a CPU
 * where a single frame can take longer than 120ms to run through
 * YOLOv8+SCRFD+ArcFace, frames piled up faster than the backend could
 * drain them, and the visible lag kept growing the longer the stream ran.
 * Now the loop is self-paced: the NEXT frame is only captured and sent
 * after the backend's annotated response for the CURRENT frame has been
 * received, so there is never more than one frame "in flight" and the
 * display naturally tracks the backend's real processing speed.
 */
export function useWebcamSocket() {
  const [displaySrc, setDisplaySrc] = useState(null)
  const [summary, setSummary] = useState(null)
  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState(null)

  const videoRef = useRef(null)       // hidden <video> fed by getUserMedia
  const canvasRef = useRef(null)      // offscreen canvas used to downscale + encode
  const streamRef = useRef(null)      // MediaStream (camera)
  const socketRef = useRef(null)      // WebSocket connection
  const runningRef = useRef(false)    // capture loop should keep going
  const lastObjectUrlRef = useRef(null)

  const cleanup = useCallback(() => {
    runningRef.current = false
    if (socketRef.current) {
      socketRef.current.close()
      socketRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (lastObjectUrlRef.current) {
      URL.revokeObjectURL(lastObjectUrlRef.current)
      lastObjectUrlRef.current = null
    }
    setIsActive(false)
    setDisplaySrc(null)
    setSummary(null)
  }, [])

  const start = useCallback(async () => {
    setError(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: CAPTURE_WIDTH, height: CAPTURE_HEIGHT },
        audio: false,
      })
      streamRef.current = stream

      if (!videoRef.current) videoRef.current = document.createElement('video')
      if (!canvasRef.current) canvasRef.current = document.createElement('canvas')

      const video = videoRef.current
      const canvas = canvasRef.current
      canvas.width = CAPTURE_WIDTH
      canvas.height = CAPTURE_HEIGHT
      const ctx = canvas.getContext('2d')

      video.srcObject = stream
      video.muted = true
      await video.play()

      const socket = new WebSocket(webcamSocketUrl())
      socket.binaryType = 'arraybuffer'
      socketRef.current = socket

      const captureAndSendOneFrame = () => {
        if (!runningRef.current || socket.readyState !== WebSocket.OPEN) return
        ctx.drawImage(video, 0, 0, CAPTURE_WIDTH, CAPTURE_HEIGHT)
        canvas.toBlob(
          (blob) => {
            if (blob && socket.readyState === WebSocket.OPEN) {
              blob.arrayBuffer().then((buf) => socket.send(buf))
            }
          },
          'image/jpeg',
          JPEG_QUALITY
        )
      }

      socket.onopen = () => {
        setIsActive(true)
        runningRef.current = true
        captureAndSendOneFrame()   // kick off the self-paced loop
      }

      socket.onmessage = (event) => {
        // The backend sends TWO messages per frame - a text (JSON) summary
        // message, then a binary (JPEG) image message. Distinguish them so
        // the Analysis Result panel updates live; only advance the capture
        // loop once the binary (image) half of the pair has arrived, so we
        // never race ahead of what the backend has actually finished.
        if (typeof event.data === 'string') {
          try {
            setSummary(JSON.parse(event.data))
          } catch (_) { /* ignore malformed summary frame */ }
          return
        }

        const blob = new Blob([event.data], { type: 'image/jpeg' })
        const url = URL.createObjectURL(blob)
        if (lastObjectUrlRef.current) URL.revokeObjectURL(lastObjectUrlRef.current)
        lastObjectUrlRef.current = url
        setDisplaySrc(url)

        captureAndSendOneFrame()   // this frame is done - now send the next one
      }

      socket.onerror = () => {
        setError('Webcam WebSocket-ka qalad ayaa ka dhacay')
        cleanup()
      }

      socket.onclose = () => {
        cleanup()
      }
    } catch (e) {
      setError(e.message || 'Webcam lama gelin karo')
      cleanup()
    }
  }, [cleanup])

  const stop = useCallback(() => {
    cleanup()
  }, [cleanup])

  useEffect(() => () => cleanup(), [cleanup])

  return { displaySrc, summary, isActive, error, start, stop }
}
