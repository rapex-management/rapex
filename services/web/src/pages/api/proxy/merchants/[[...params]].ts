import { NextApiRequest, NextApiResponse } from 'next';

const API_BASE = process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/api` : 'http://localhost:8000/api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { merchant_id, ...pathParts } = req.query;
  
  // Build the path
  let path = '/merchants';
  if (merchant_id) {
    path += `/${merchant_id}`;
    if (pathParts.action) {
      if (pathParts.action === 'status') {
        path += '/status/';
      } else if (pathParts.action === 'delete') {
        path += '/delete/';
      } else if (pathParts.action === 'update') {
        path += '/update/';
      }
    }
  } else if (pathParts.action) {
    if (pathParts.action === 'batch-action') {
      path += '/batch-action/';
    } else if (pathParts.action === 'statistics') {
      path += '/statistics/';
    } else if (pathParts.action === 'create') {
      path += '/create/';
    }
  } else {
    path += '/';
  }

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || '',
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
}
