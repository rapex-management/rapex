import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'POST') { res.status(405).json({ detail: 'Method not allowed' }); return }

  try {
    const response = await fetch('http://backend:8000/api/auth/logout/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    })

  const data = await response.json()
  res.status(response.status).json(data); return
  } catch (error) {
    console.error('Logout proxy error:', error)
  res.status(500).json({ detail: 'Internal server error' }); return
  }
}
