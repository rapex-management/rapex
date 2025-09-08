import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'POST') { res.status(405).end(); return }
  try {
    const backendRes = await fetch('http://backend:8000/api/auth/verify-otp/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    })
    const data = await backendRes.json()
    res.status(backendRes.status).json(data); return
  } catch {
    res.status(500).json({ detail: 'proxy error' }); return
  }
}
