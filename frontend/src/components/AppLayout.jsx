import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'

export default function AppLayout() {
  return (
    <div className="w-screen h-screen flex overflow-hidden bg-app">
      <Sidebar />
      <main className="flex-1 h-full overflow-hidden flex">
        <Outlet />
      </main>
    </div>
  )
}
