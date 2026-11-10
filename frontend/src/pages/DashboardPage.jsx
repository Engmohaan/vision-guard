import React, { useState, useEffect, useCallback } from 'react'
import ControlPanel from '../components/ControlPanel.jsx'
import MediaViewport from '../components/MediaViewport.jsx'
import ResultsPanel from '../components/ResultsPanel.jsx'
import { fetchIdentities, uploadImage } from '../api.js'
import { useVideoProcessing } from '../hooks/useVideoProcessing.js'
import { useWebcamSocket } from '../hooks/useWebcamSocket.js'
import { AlertTriangle, X } from 'lucide-react'

export default function DashboardPage() {
  const [mode, setMode] = useState('idle')
  const [imageSrc, setImageSrc] = useState(null)
  const [summary, setSummary] = useState(null)
  const [dbInfo, setDbInfo] = useState(null)
  const [error, setError] = useState(null)

  const video = useVideoProcessing()
  const webcam = useWebcamSocket()

  useEffect(() => {
    fetchIdentities().then(setDbInfo).catch(() => setDbInfo(null))
  }, [])

  // Bug 1 fix - video upload now returns instantly and processing happens
  // in the background; this just reflects whatever state the poller reports.
  useEffect(() => {
    if (video.status === 'uploading' || video.status === 'processing') {
      setMode('loading')
    } else if (video.status === 'done') {
      setSummary(video.summary)
      setMode('video')
    } else if (video.status === 'error') {
      setError(video.error)
      setMode('idle')
    }
  }, [video.status, video.summary, video.error])

  useEffect(() => {
    if (webcam.error) {
      setError(webcam.error)
      setMode('idle')
    }
  }, [webcam.error])

  // Bug fix: Analysis Result panel was never updating during webcam
  // streaming - now every frame's summary (sent alongside the annotated
  // image over the WebSocket) is reflected here live.
  useEffect(() => {
    if (mode === 'webcam' && webcam.summary) {
      setSummary(webcam.summary)
    }
  }, [mode, webcam.summary])

  const handleSelectImage = useCallback(async (file) => {
    setError(null)
    setMode('loading')
    try {
      const data = await uploadImage(file)
      setImageSrc(data.image_base64)
      setSummary(data.summary)
      setMode('image')
    } catch (e) {
      setError(e.message)
      setMode('idle')
    }
  }, [])

  const handleSelectVideo = useCallback((file) => {
    setError(null)
    video.start(file)
  }, [video])

  const handleStartWebcam = useCallback(() => {
    setError(null)
    setSummary(null)
    setMode('webcam')
    webcam.start()
  }, [webcam])

  const handleStop = useCallback(() => {
    webcam.stop()
    video.reset()
    setMode('idle')
    setImageSrc(null)
    setSummary(null)
    setError(null)
  }, [webcam, video])

  const statusLabel = {
    idle: 'Idle',
    loading: video.status === 'processing'
      ? `Processing... ${video.progress}%`
      : 'Processing',
    image: 'Image Analysis',
    video: 'Video Analysis',
    webcam: 'Live Stream',
  }[mode]

  return (
    <div className="flex-1 h-full flex p-5 gap-5 relative">
      <ControlPanel
        mode={mode}
        onSelectImage={handleSelectImage}
        onSelectVideo={handleSelectVideo}
        onStartWebcam={handleStartWebcam}
        onStop={handleStop}
        identityCount={dbInfo?.identity_count}
        embeddingCount={dbInfo?.embedding_count}
        threshold={dbInfo?.similarity_threshold}
        deviceLabel={dbInfo ? 'Backend Connected' : 'Backend Offline'}
      />

      <MediaViewport
        mode={mode}
        status={statusLabel}
        imageSrc={imageSrc}
        videoSrc={video.videoSrc}
        webcamUrl={webcam.displaySrc}
      />
      <ResultsPanel summary={summary} />

      {error && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3
                        bg-surface border border-danger/40 text-ink px-4 py-3 rounded-xl shadow-soft">
          <AlertTriangle size={16} className="text-danger shrink-0" />
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="text-muted hover:text-ink">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
