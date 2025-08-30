import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  
  try {
    const { email, otp_code, new_password } = req.body
    
    const backendRes = await fetch('http://backend:8000/api/auth/reset-password/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        otp_code,
        new_password,
        user_type: 'admin'
      })
    })
    
    const data = await backendRes.json()
    res.status(backendRes.status).json(data)
  } catch {
    res.status(500).json({ detail: 'proxy error' })
  }
}
