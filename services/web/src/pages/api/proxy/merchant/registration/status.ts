import { NextApiRequest, NextApiResponse } from 'next';

// Use BACKEND_URL environment variable set in docker-compose
const API_BASE_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method === 'GET') {
    try {
      const queryParams = new URLSearchParams();
      
      if (req.query.session_id) {
        queryParams.append('session_id', req.query.session_id as string);
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/merchant/registration/status/?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (response.ok) {
        res.status(200).json(data);
      } else {
        res.status(response.status).json(data);
      }
    } catch (error) {
      console.error('Registration status error:', error);
      res.status(500).json({ 
        detail: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
