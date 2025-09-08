import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';

const API_BASE_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  try {
    const form = formidable({
      maxFileSize: 2 * 1024 * 1024,
      keepExtensions: true,
      uploadDir: '/tmp',
      filter: ({ originalFilename, mimetype }) => {
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (!mimetype || !allowedTypes.includes(mimetype.toLowerCase())) return false;
        if (originalFilename) {
          const ext = originalFilename.toLowerCase().substring(originalFilename.lastIndexOf('.'));
          const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
          if (!allowedExtensions.includes(ext)) return false;
        }
        return true;
      },
    });

    const [fields, files] = await form.parse(req);
    const sessionId = Array.isArray(fields.session_id) ? fields.session_id[0] : fields.session_id;

    if (!sessionId) { res.status(400).json({ detail: 'Session ID is required' }); return; }

    const fileEntries = Object.entries(files);
    if (fileEntries.length === 0) { res.status(400).json({ detail: 'No files were uploaded' }); return; }

    const documentsInfo: {
      uploaded_files: string[];
      file_details: Record<string, { originalName: string; size: number; mimetype: string }>;
    } = { uploaded_files: [], file_details: {} };

    for (const [fieldName, fileArray] of fileEntries) {
      const file = Array.isArray(fileArray) ? fileArray[0] : fileArray;
      if (!file) continue;
      documentsInfo.uploaded_files.push(fieldName);
      documentsInfo.file_details[fieldName] = {
        originalName: file.originalFilename || 'unknown',
        size: file.size,
        mimetype: file.mimetype || 'application/octet-stream',
      };
    }

    const stepResponse = await fetch(`${API_BASE_URL}/api/auth/merchant/registration/step/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 3, session_id: sessionId, data: { documents_info: documentsInfo } }),
    });
    const stepData = await stepResponse.json();

    if (stepResponse.ok) {
      res.status(200).json({ message: 'Documents processed successfully', session_id: sessionId, otp_sent: true, next_step: 'verification' });
      return;
    } else {
      res.status(stepResponse.status).json(stepData); return;
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('maxFileSize')) { res.status(400).json({ detail: 'File size exceeds the 2MB limit', error: 'FILE_TOO_LARGE' }); return; }
      if (error.message.includes('filter')) { res.status(400).json({ detail: 'Invalid file type. Only PDF, JPG, JPEG, and PNG files are allowed', error: 'INVALID_FILE_TYPE' }); return; }
    }
    res.status(500).json({ detail: 'Internal server error during document upload', error: error instanceof Error ? error.message : 'Unknown error' });
    return;
  }
}
