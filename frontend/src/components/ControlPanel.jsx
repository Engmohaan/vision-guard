import React, { useRef } from 'react'
import { ImageUp, Video, Camera, Square, Cpu } from 'lucide-react'

function ActionButton({ icon: Icon, label, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm font-medium
        transition-colors duration-150
        ${active
          ? 'bg-accent-soft border-accent text-accent'
          : 'bg-app border-border text-ink/80 hover:border-accent/40 hover:text-accent'}
      `}
    >
      <Icon size={17} strokeWidth={2} />
      <span>{label}</span>
    </button>
  )
}

function StatPill({ label, value }) {
  return (
    <div className="bg-app border border-border rounded-xl px-3 py-2.5">
      <p className="text-[10px] text-muted">{label}</p>
      <p className="font-data text-ink text-lg leading-tight mt-0.5">{value ?? '--'}</p>
    </div>
  )
}

export default function ControlPanel({
  mode,
  onSelectImage,
  onSelectVideo,
  onStartWebcam,
  onStop,
  identityCount,
  embeddingCount,
  threshold,
  deviceLabel,
}) {
  const imageInputRef = useRef(null)
  const videoInputRef = useRef(null)

  return (
    <div className="w-64 shrink-0 h-full flex flex-col gap-5 p-5 bg-surface border border-border rounded-2xl shadow-soft">
      <div>
        <p className="text-[11px] uppercase tracking-wider text-muted mb-2">Media Input</p>
        <div className="flex flex-col gap-2">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files[0] && onSelectImage(e.target.files[0])}
          />
          <ActionButton icon={ImageUp} label="Upload Image" active={mode === 'image'} onClick={() => imageInputRef.current?.click()} />

          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => e.target.files[0] && onSelectVideo(e.target.files[0])}
          />
          <ActionButton icon={Video} label="Upload Video" active={mode === 'video'} onClick={() => videoInputRef.current?.click()} />

          <ActionButton icon={Camera} label="Live Webcam Stream" active={mode === 'webcam'} onClick={onStartWebcam} />
        </div>
      </div>

      <button
        onClick={onStop}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                   border border-danger/40 text-danger text-sm font-medium
                   hover:bg-danger/10 transition-colors duration-150"
      >
        <Square size={14} />
        Stop / Clear
      </button>

      <div className="mt-auto pt-4 border-t border-border space-y-3">
        <p className="text-[11px] uppercase tracking-wider text-muted">System Status</p>

        <div className="flex items-center gap-2 text-xs text-muted">
          <Cpu size={13} />
          <span className="font-data">{deviceLabel}</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <StatPill label="Identities" value={identityCount} />
          <StatPill label="Embeddings" value={embeddingCount} />
        </div>

        <StatPill label="Match Threshold" value={threshold} />
      </div>
    </div>
  )
}
