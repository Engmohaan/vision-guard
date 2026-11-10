import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function RequireAdmin() {
  const { user } = useAuth()

  if (user?.role !== 'admin') {
    return <Navigate to="/app" replace />
  }

  return <Outlet />
}
