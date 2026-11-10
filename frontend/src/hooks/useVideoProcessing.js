import { useState, useRef, useCallback, useEffect } from 'react'
import { uploadVideo, getTaskStatus, API_BASE } from '../api.js'

const POLL_INTERVAL_MS = 3000

/**
 * Bug 1 fix - the upload endpoint now returns a task_id instantly (the
 * heavy frame-by-frame pipeline runs in a background thread server-side).
 * This hook uploads the file, then polls /api/status/{task_id} every 3s
 * until the backend reports "done" (video ready) or "error".
 */
export function useVideoProcessing() {
  const [status, setStatus] = useState('idle')   // idle | uploading | processing | done | error
  const [progress, setProgress] = useState(0)
  const [videoSrc, setVideoSrc] = useState(null)
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState(null)

  const pollRef = useRef(null)

  const clearPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    clearPoll()
    setStatus('idle')
    setProgress(0)
    setVideoSrc(null)
    setSummary(null)
    setError(null)
  }, [clearPoll])

  const start = useCallback(async (file) => {
    clearPoll()
    setStatus('uploading')
    setProgress(0)
    setVideoSrc(null)
    setSummary(null)
    setError(null)

    try {
      const { task_id } = await uploadVideo(file)
      setStatus('processing')

      pollRef.current = setInterval(async () => {
        try {
          const task = await getTaskStatus(task_id)
          setProgress(task.progress ?? 0)

          if (task.status === 'done') {
            clearPoll()
            setVideoSrc(`${API_BASE}${task.video_url}`)
            setSummary(task.summary)
            setStatus('done')
          } else if (task.status === 'error') {
            clearPoll()
            setError(task.error || 'Video-ga processing-kiisu wuu fashilmay')
            setStatus('error')
          }
        } catch (e) {
          clearPoll()
          setError(e.message)
          setStatus('error')
        }
      }, POLL_INTERVAL_MS)
    } catch (e) {
      setError(e.message)
      setStatus('error')
    }
  }, [clearPoll])

  useEffect(() => () => clearPoll(), [clearPoll])

  return { status, progress, videoSrc, summary, error, start, reset }
}
