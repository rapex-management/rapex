import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const backendUrl = process.env.BACKEND_URL || 'http://backend:8000';
    const token = req.headers.authorization;

    if (!token) {
      res.status(401).json({ error: 'No authorization token provided' });
      return;
    }

    const response = await fetch(`${backendUrl}/api/merchants/dashboard/`, {
      method: 'GET',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
  res.status(response.status).json(data); return;
    }

  res.status(200).json(data); return;
  } catch (error) {
    console.error('Dashboard API error:', error);
  res.status(500).json({ error: 'Internal server error' }); return;
  }
}
