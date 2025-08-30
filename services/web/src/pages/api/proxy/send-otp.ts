import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  
  try {
    const { email, purpose, user_type } = req.body
    
    const backendRes = await fetch('http://backend:8000/api/auth/forgot-password/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        purpose: purpose || 'password_reset',
        user_type: user_type || 'merchant'
      })
    })
    
    const data = await backendRes.json()
    res.status(backendRes.status).json(data)
  } catch {
    res.status(500).json({ detail: 'proxy error' })
  }
}
