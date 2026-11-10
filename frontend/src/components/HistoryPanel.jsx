import React, { useState, useEffect, useCallback } from 'react'
import { Search, Trash2, RefreshCw, UserCheck, UserX, ListChecks } from 'lucide-react'
import { fetchLogs, fetchLogStats, clearLogs } from '../api.js'
import { useAuth } from '../context/AuthContext.jsx'

const MEDIA_TYPES = [
  { value: '', label: 'All Sources' },
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Video' },
  { value: 'webcam', label: 'Webcam' },
]

function formatTimestamp(iso) {
  try {
    const d = new Date(iso)
    return d.toLocaleString(undefined, {
      month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  } catch {
    return iso
  }
}

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="bg-surface border border-border rounded-2xl px-4 py-3.5 shadow-soft">
      <div className="flex items-center gap-1.5 text-muted">
        {Icon && <Icon size={13} />}
        <p className="text-[11px]">{label}</p>
      </div>
      <p className={`font-data text-2xl mt-1 ${accent ? 'text-accent' : 'text-ink'}`}>{value ?? '--'}</p>
    </div>
  )
}

export default function HistoryPanel() {
  const { user } = useAuth()
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState(null)
  const [mediaType, setMediaType] = useState('')
  const [identityFilter, setIdentityFilter] = useState('')
  const [matchedOnly, setMatchedOnly] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [logsData, statsData] = await Promise.all([
        fetchLogs({ mediaType, identity: identityFilter, matchedOnly }),
        fetchLogStats(),
      ])
      setLogs(logsData.logs)
      setStats(statsData)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [mediaType, identityFilter, matchedOnly])

  useEffect(() => { load() }, [load])

  const handleClear = async () => {
    if (!window.confirm('Tirtir dhammaan taariikhda? Tallaabadan lama soo celin karo.')) return
    await clearLogs()
    load()
  }

  return (
    <div className="flex-1 h-full flex flex-col gap-5 p-6 overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-ink flex items-center gap-2">
            <ListChecks size={20} className="text-accent" />
            Detection History
          </h1>
          <p className="text-xs text-muted mt-1">Log of every recognition event across image, video, and webcam sessions.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm text-ink
                       hover:border-accent/40 hover:text-accent transition-colors bg-surface shadow-soft"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={handleClear}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-danger/40 text-danger text-sm
                         hover:bg-danger/10 transition-colors bg-surface shadow-soft"
            >
              <Trash2 size={14} />
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Logged Events" value={stats?.total_logs} />
        <StatCard icon={UserCheck} label="Verified Matches" value={stats?.matched_logs} accent />
        <StatCard icon={UserX} label="Unrecognized" value={stats?.unrecognized_logs} />
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={identityFilter}
            onChange={(e) => setIdentityFilter(e.target.value)}
            placeholder="Search by identity..."
            className="w-full bg-surface border border-border rounded-xl pl-9 pr-3 py-2 text-sm text-ink
                       placeholder:text-muted focus:border-accent outline-none shadow-soft"
          />
        </div>

        <select
          value={mediaType}
          onChange={(e) => setMediaType(e.target.value)}
          className="bg-surface border border-border rounded-xl px-3 py-2 text-sm text-ink outline-none shadow-soft"
        >
          {MEDIA_TYPES.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-sm text-muted cursor-pointer select-none">
          <input
            type="checkbox"
            checked={matchedOnly}
            onChange={(e) => setMatchedOnly(e.target.checked)}
            className="accent-accent"
          />
          Verified only
        </label>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex-1 overflow-y-auto rounded-2xl border border-border bg-surface shadow-soft">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-surface-raised text-muted text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left font-medium px-4 py-2.5">Timestamp</th>
              <th className="text-left font-medium px-4 py-2.5">Source</th>
              <th className="text-left font-medium px-4 py-2.5">Identity</th>
              <th className="text-left font-medium px-4 py-2.5">Confidence</th>
              <th className="text-left font-medium px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-border hover:bg-app/60">
                <td className="px-4 py-2.5 font-data text-muted text-xs">{formatTimestamp(log.timestamp)}</td>
                <td className="px-4 py-2.5 text-ink capitalize">{log.media_type}</td>
                <td className="px-4 py-2.5 text-ink font-medium">{log.identity}</td>
                <td className="px-4 py-2.5 font-data text-ink">{log.confidence.toFixed(3)}</td>
                <td className="px-4 py-2.5">
                  {log.matched ? (
                    <span className="inline-flex items-center gap-1 text-success text-xs font-medium">
                      <UserCheck size={12} /> Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-muted text-xs">
                      <UserX size={12} /> Unrecognized
                    </span>
                  )}
                </td>
              </tr>
            ))}

            {logs.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted text-sm">
                  No log entries match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
