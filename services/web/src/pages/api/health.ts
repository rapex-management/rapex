import { NextApiRequest, NextApiResponse } from 'next';

export default function health(req: NextApiRequest, res: NextApiResponse): void {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'rapex-web',
    version: '1.0.0'
  });
}