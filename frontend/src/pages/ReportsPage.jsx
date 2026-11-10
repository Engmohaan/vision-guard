import React, { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, PieChart as PieIcon } from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts'
import { fetchReportsSummary } from '../api.js'

const PIE_COLORS = ['#0D9488', '#94A3B8']

function Card({ title, icon: Icon, children }) {
  return (
    <div className="bg-surface border border-border rounded-2xl shadow-soft p-5">
      <div className="flex items-center gap-2 mb-4">
        {Icon && <Icon size={15} className="text-accent" />}
        <p className="text-sm font-semibold text-ink">{title}</p>
      </div>
      {children}
    </div>
  )
}

export default function ReportsPage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchReportsSummary().then(setData).catch((e) => setError(e.message))
  }, [])

  if (error) return <div className="p-6 text-danger text-sm">{error}</div>
  if (!data) return <div className="p-6 text-muted text-sm">Loading reports...</div>

  const { stats, daily_counts, media_type_breakdown } = data

  const pieData = [
    { name: 'Verified', value: stats.matched_logs },
    { name: 'Unrecognized', value: stats.unrecognized_logs },
  ]

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 flex flex-col gap-5">
      <div>
        <h1 className="text-lg font-semibold text-ink flex items-center gap-2">
          <BarChart3 size={20} className="text-accent" />
          Reports & Insights
        </h1>
        <p className="text-xs text-muted mt-1">Aggregate analytics across all recognition activity.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface border border-border rounded-2xl shadow-soft px-5 py-4">
          <p className="text-[11px] text-muted">Total Events</p>
          <p className="font-data text-3xl text-ink mt-1">{stats.total_logs}</p>
        </div>
        <div className="bg-surface border border-border rounded-2xl shadow-soft px-5 py-4">
          <p className="text-[11px] text-muted">Verified Matches</p>
          <p className="font-data text-3xl text-accent mt-1">{stats.matched_logs}</p>
        </div>
        <div className="bg-surface border border-border rounded-2xl shadow-soft px-5 py-4">
          <p className="text-[11px] text-muted">Unrecognized</p>
          <p className="font-data text-3xl text-ink mt-1">{stats.unrecognized_logs}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card title="Daily Activity (last 14 days)" icon={TrendingUp}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={daily_counts}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--c-border))" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'rgb(var(--c-muted))' }} />
              <YAxis tick={{ fontSize: 10, fill: 'rgb(var(--c-muted))' }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Line type="monotone" dataKey="total" stroke="#0D9488" strokeWidth={2} dot={false} name="Total" />
              <Line type="monotone" dataKey="matched" stroke="#94A3B8" strokeWidth={2} dot={false} name="Verified" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Verified vs Unrecognized" icon={PieIcon}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card title="Events by Media Type">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={media_type_breakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--c-border))" />
              <XAxis dataKey="media_type" tick={{ fontSize: 11, fill: 'rgb(var(--c-muted))' }} />
              <YAxis tick={{ fontSize: 10, fill: 'rgb(var(--c-muted))' }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="total" fill="#0D9488" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Top Identities">
          <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto">
            {stats.top_identities.length === 0 && <p className="text-xs text-muted">No verified matches yet.</p>}
            {stats.top_identities.map((item) => (
              <div key={item.identity} className="flex items-center justify-between bg-app border border-border rounded-lg px-3 py-2">
                <span className="text-sm text-ink font-medium">{item.identity}</span>
                <span className="font-data text-xs text-accent">{item.occurrences}×</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
