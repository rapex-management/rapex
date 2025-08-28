import { useState } from 'react'
import { useRouter } from 'next/router'

export default function MerchantLogin(){
  const router = useRouter()
  const [identifier, setIdentifier] = useState('') // username or email
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent){
    e.preventDefault()
    setError('')
    try{
      const res = await fetch('/api/proxy/merchant/login', {
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
      localStorage.setItem('merchant', JSON.stringify({
        id: data.id, 
        username: data.username, 
        email: data.email, 
        merchant_name: data.merchant_name,
        owner_name: data.owner_name
      }))
      router.push('/merchant')
    }catch(err: unknown){
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  return (
    <div className="login-container">
      <form onSubmit={submit} className="login-form">
        <h1 className="login-title">Merchant Login</h1>
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
