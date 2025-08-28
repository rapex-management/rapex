import React from 'react'

export default function Sidebar(){
  return (
    <aside className="w-64 bg-gray-100 min-h-screen p-4">
      <div className="mb-6">
        <h2 className="font-bold">App</h2>
      </div>
      <nav>
        <ul>
          <li className="py-2">Dashboard</li>
          <li className="py-2">Settings</li>
        </ul>
      </nav>
    </aside>
  )
}
