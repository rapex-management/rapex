import { NextApiRequest, NextApiResponse } from 'next';

const API_BASE = process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/api` : 'http://localhost:8000/api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { params } = req.query;
  
  // Build the path
  let path = '/merchants';
  
  if (params && Array.isArray(params)) {
    if (params.length > 0) {
      // Handle different patterns
      if (params[0] === 'statistics') {
        path += '/statistics/';
      } else if (params[0] === 'batch-action') {
        path += '/batch-action/';
      } else if (params[0] === 'create') {
        path += '/create/';
      } else {
        // Assume first param is merchant ID
        path += `/${params[0]}`;
        if (params.length > 1) {
          if (params[1] === 'status') {
            path += '/status/';
          } else if (params[1] === 'delete') {
            path += '/delete/';
          } else if (params[1] === 'update') {
            path += '/update/';
          } else {
            path += `/${params[1]}/`;
          }
        } else {
          path += '/';
        }
      }
    } else {
      path += '/';
    }
  } else {
    path += '/';
  }

  // Add query parameters for GET requests
  if (req.method === 'GET' && Object.keys(req.query).length > 1) {
    const queryParams = new URLSearchParams();
    Object.entries(req.query).forEach(([key, value]) => {
      if (key !== 'params' && value) {
        if (Array.isArray(value)) {
          value.forEach(v => queryParams.append(key, v));
        } else {
          queryParams.append(key, value);
        }
      }
    });
    
    if (queryParams.toString()) {
      path += `?${queryParams.toString()}`;
    }
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
    res.status(500).json({ error: 'Internal server error' });
  }
}
