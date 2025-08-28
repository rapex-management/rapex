import { useRouter } from 'next/router'
import useAuthRedirect from '../../hooks/useAuthRedirect'

export default function AdminDashboard(){
  const router = useRouter()
  useAuthRedirect('admin', '/admin/login')

  const handleLogout = async () => {
    try {
      const refresh = localStorage.getItem('refresh')
      if (refresh) {
        await fetch('/api/proxy/logout', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({refresh})
        })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Clear local storage regardless of API call success
      localStorage.removeItem('token')
      localStorage.removeItem('refresh')
      localStorage.removeItem('admin')
      router.push('/admin/login')
    }
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Admin Dashboard</h1>
        <button 
          onClick={handleLogout}
          className="btn btn-secondary"
        >
          Logout
        </button>
      </div>
      <div className="dashboard-content">
        <p>Welcome to the Admin Dashboard. This is a blank page ready for your content.</p>
      </div>
    </div>
  )
}
