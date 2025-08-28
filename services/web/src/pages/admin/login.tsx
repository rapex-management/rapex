import { useState } from 'react'
import { useRouter } from 'next/router'

export default function AdminLogin(){
  const router = useRouter()
  const [identifier, setIdentifier] = useState('') // username or email
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent){
    e.preventDefault()
    setError('')
    try{
      const res = await fetch('/api/proxy/admin/login', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({identifier, password})
      })
      const data = await res.json()
      if(!res.ok){
        setError(data.detail || 'Login failed')
        return
      }
      // Store tokens and user data
      localStorage.setItem('token', data.access)
      localStorage.setItem('refresh', data.refresh)
      localStorage.setItem('admin', JSON.stringify({
        id: data.id, 
        username: data.username, 
        email: data.email, 
        first_name: data.first_name,
        last_name: data.last_name
      }))
      router.push('/admin')
    }catch(err: unknown){
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  return (
    <div className="login-container">
      <form onSubmit={submit} className="login-form">
        <h1 className="login-title">Admin Login</h1>
        {error && <div className="error-message">{error}</div>}
        <div className="form-group">
          <label className="form-label">
            Username or Email
          </label>
          <input 
            value={identifier} 
            onChange={e => setIdentifier(e.target.value)} 
            className="form-input" 
            required 
          />
        </div>
        <div className="form-group">
          <label className="form-label">
            Password
          </label>
          <input 
            type="password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            className="form-input" 
            required 
          />
        </div>
        <button type="submit" className="btn btn-primary">Sign in</button>
      </form>
    </div>
  )
}
