import React from 'react'
import { UserCheck, UserX, Users } from 'lucide-react'

function IdentityCard({ identity, score }) {
  const pct = Math.round(score * 100)
  return (
    <div className="flex items-center gap-3 bg-app border border-border rounded-xl px-3 py-2.5">
      <div className="w-9 h-9 rounded-lg bg-accent-soft flex items-center justify-center shrink-0">
        <UserCheck size={16} className="text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-ink truncate font-medium">{identity}</p>
        <div className="w-full h-1.5 bg-border rounded-full mt-1.5 overflow-hidden">
          <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <span className="font-data text-xs text-accent shrink-0">{score.toFixed(2)}</span>
    </div>
  )
}

export default function ResultsPanel({ summary }) {
  const hasSummary = !!summary
  const faceCount = summary?.face_count ?? summary?.total_faces_detected ?? 0
  const identified = summary?.identified ?? []
  const uniqueIdentities = summary?.unique_identities ?? identified.map((i) => i.identity)
  const unrecognizedCount = summary?.unrecognized_count ?? 0

  return (
    <div className="w-80 shrink-0 h-full flex flex-col gap-4 p-5 bg-surface border border-border rounded-2xl shadow-soft overflow-y-auto">
      <p className="text-[11px] uppercase tracking-wider text-muted">Analysis Result</p>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-app border border-border rounded-xl px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-muted mb-1">
            <Users size={13} />
            <span className="text-[10px]">Detected</span>
          </div>
          <p className="font-data text-ink text-xl leading-none">{faceCount}</p>
        </div>
        <div className="bg-app border border-border rounded-xl px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-muted mb-1">
            <UserX size={13} />
            <span className="text-[10px]">Unrecognized</span>
          </div>
          <p className="font-data text-ink text-xl leading-none">{unrecognizedCount}</p>
        </div>
      </div>

      <div className="flex-1">
        <p className="text-[11px] uppercase tracking-wider text-muted mb-2">Verified Identities</p>

        {!hasSummary && <p className="text-xs text-muted">No analysis run yet.</p>}

        {hasSummary && identified.length === 0 && uniqueIdentities.length === 0 && (
          <p className="text-xs text-muted">No verified matches in this result.</p>
        )}

        <div className="flex flex-col gap-2">
          {identified.map((item, i) => (
            <IdentityCard key={`${item.identity}-${i}`} identity={item.identity} score={item.score} />
          ))}

          {identified.length === 0 && uniqueIdentities.map((name, i) => (
            <div key={`${name}-${i}`} className="flex items-center gap-3 bg-app border border-border rounded-xl px-3 py-2.5">
              <UserCheck size={16} className="text-accent shrink-0" />
              <p className="text-sm text-ink font-medium truncate">{name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
