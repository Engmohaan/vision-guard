import React, { useState, useEffect } from 'react'
import { ScanFace, Loader2, Download, VideoOff } from 'lucide-react'

export default function MediaViewport({ mode, status, imageSrc, videoSrc, webcamUrl }) {
  const isLive = mode === 'webcam'
  const [videoFailed, setVideoFailed] = useState(false)

  useEffect(() => { setVideoFailed(false) }, [videoSrc])

  return (
    <div className="relative flex-1 h-full rounded-2xl border border-border bg-surface shadow-soft overflow-hidden">
      {/* Status pill */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-surface/90 border border-border
                      rounded-full px-3 py-1.5 backdrop-blur-sm shadow-soft">
        <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-success animate-pulseline' : 'bg-muted'}`} />
        <span className="text-[11px] font-medium text-ink">{status}</span>
      </div>

      {/* Content */}
      <div className="w-full h-full flex items-center justify-center p-8 bg-app/40">
        {mode === 'idle' && (
          <div className="flex flex-col items-center gap-3 text-muted">
            <div className="w-16 h-16 rounded-2xl bg-accent-soft flex items-center justify-center">
              <ScanFace size={30} strokeWidth={1.5} className="text-accent" />
            </div>
            <p className="text-sm font-medium text-ink">Awaiting media input</p>
            <p className="text-xs text-muted max-w-xs text-center">
              Upload an image, upload a video, or start the live webcam stream from the console on the left.
            </p>
          </div>
        )}

        {mode === 'loading' && (
          <div className="flex flex-col items-center gap-3 text-accent">
            <Loader2 size={36} className="animate-spin" />
            <p className="text-sm font-medium">Running detection pipeline...</p>
          </div>
        )}

        {mode === 'image' && imageSrc && (
          <img src={imageSrc} alt="Analysis result" className="max-w-full max-h-full rounded-xl object-contain shadow-soft" />
        )}

        {mode === 'video' && videoSrc && !videoFailed && (
          <video
            src={videoSrc}
            controls
            autoPlay
            loop
            className="max-w-full max-h-full rounded-xl shadow-soft"
            onError={() => setVideoFailed(true)}
          />
        )}

        {mode === 'video' && videoSrc && videoFailed && (
          <div className="flex flex-col items-center gap-3 text-muted">
            <div className="w-16 h-16 rounded-2xl bg-accent-soft flex items-center justify-center">
              <VideoOff size={26} className="text-accent" />
            </div>
            <p className="text-sm font-medium text-ink">Preview isn't supported in this browser</p>
            <p className="text-xs text-muted max-w-xs text-center">
              The analysis finished successfully — download the annotated video to play it locally (e.g. VLC).
            </p>
            <a
              href={videoSrc}
              download
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium
                         hover:bg-accent-hover transition-colors shadow-soft"
            >
              <Download size={15} /> Download video
            </a>
          </div>
        )}

        {mode === 'webcam' && webcamUrl && (
          <img src={webcamUrl} alt="Live webcam feed" className="max-w-full max-h-full rounded-xl object-contain shadow-soft" />
        )}
      </div>
    </div>
  )
}
