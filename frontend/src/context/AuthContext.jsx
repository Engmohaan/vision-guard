import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

export const API_BASE = 'http://localhost:8000'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('vision-guard-token'))
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const authFetch = useCallback(async (path, options = {}) => {
    const headers = { ...(options.headers || {}) }
    const currentToken = localStorage.getItem('vision-guard-token')
    if (currentToken) headers['Authorization'] = `Bearer ${currentToken}`

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
    if (res.status === 401) {
      localStorage.removeItem('vision-guard-token')
      setToken(null)
      setUser(null)
    }
    return res
  }, [])

  const loadMe = useCallback(async () => {
    const currentToken = localStorage.getItem('vision-guard-token')
    if (!currentToken) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const res = await authFetch('/api/auth/me')
      if (res.ok) {
        setUser(await res.json())
      } else {
        setUser(null)
      }
    } catch (_) {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [authFetch])

  useEffect(() => { loadMe() }, [loadMe])

  const login = useCallback(async (username, password) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || 'Login-ku wuu fashilmay')
    }
    const data = await res.json()
    localStorage.setItem('vision-guard-token', data.access_token)
    setToken(data.access_token)
    setUser(data.user)
    return data.user
  }, [])

  const register = useCallback(async ({ username, email, fullName, password }) => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, full_name: fullName, password }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || 'Diiwaan-gelintu wuu fashilmay')
    }
    const data = await res.json()
    localStorage.setItem('vision-guard-token', data.access_token)
    setToken(data.access_token)
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('vision-guard-token')
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, authFetch, refreshUser: loadMe, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
