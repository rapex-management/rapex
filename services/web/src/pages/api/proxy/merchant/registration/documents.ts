import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';

// Use BACKEND_URL environment variable set in docker-compose
const API_BASE_URL = process.env.BACKEND_URL || 'http://localhost:8000';

// Configure to parse multipart form data
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const form = formidable({
        maxFileSize: 2 * 1024 * 1024, // 2MB max file size (consistent with frontend)
        keepExtensions: true,
        uploadDir: '/tmp',
        filter: ({ originalFilename, mimetype }) => {
          // Validate file types
          const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
          const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
          
          if (!mimetype || !allowedTypes.includes(mimetype.toLowerCase())) {
            return false;
          }
          
          if (originalFilename) {
            const ext = originalFilename.toLowerCase().substring(originalFilename.lastIndexOf('.'));
            if (!allowedExtensions.includes(ext)) {
              return false;
            }
          }
          
          return true;
        }
      });

      const [fields, files] = await form.parse(req);
      const sessionId = Array.isArray(fields.session_id) ? fields.session_id[0] : fields.session_id;

      console.log('Document upload - Session ID:', sessionId);
      console.log('Document upload - Files received:', Object.keys(files));

      if (!sessionId) {
        return res.status(400).json({ detail: 'Session ID is required' });
      }

      // Check if any files were uploaded
      const fileEntries = Object.entries(files);
      if (fileEntries.length === 0) {
        return res.status(400).json({ detail: 'No files were uploaded' });
      }

      // Prepare document info for storage in cache
      const documentsInfo = {
        uploaded_files: [] as string[],
        file_details: {} as Record<string, {
          originalName: string;
          size: number;
          mimetype: string;
          uploadedAt: string;
        }>
      };

      // Process uploaded files
      for (const [fieldName, fileArray] of fileEntries) {
        const file = Array.isArray(fileArray) ? fileArray[0] : fileArray;
        if (file && file.size > 0) {
          documentsInfo.uploaded_files.push(fieldName);
          documentsInfo.file_details[fieldName] = {
            originalName: file.originalFilename || 'unknown',
            size: file.size,
            mimetype: file.mimetype || 'application/octet-stream',
            uploadedAt: new Date().toISOString()
          };
        }
      }

      console.log('Document upload - Processed documents:', documentsInfo);

      // Save step 3 data to cache
      const stepResponse = await fetch(`${API_BASE_URL}/api/auth/merchant/registration/step/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          step: 3,
          session_id: sessionId,
          data: {
            documents_info: documentsInfo
          }
        }),
      });

      const stepData = await stepResponse.json();
      console.log('Document upload - Backend response:', stepResponse.status, stepData);

      if (stepResponse.ok) {
        res.status(200).json({
          message: 'Documents processed successfully',
          session_id: sessionId,
          otp_sent: true,
          next_step: 'verification'
        });
      } else {
        console.error('Document upload - Backend error:', stepData);
        res.status(stepResponse.status).json(stepData);
      }
    } catch (error) {
      console.error('Document upload error:', error);
      
      // Handle specific formidable errors
      if (error instanceof Error) {
        if (error.message.includes('maxFileSize')) {
          return res.status(400).json({ 
            detail: 'File size exceeds the 2MB limit',
            error: 'FILE_TOO_LARGE'
          });
        }
        if (error.message.includes('filter')) {
          return res.status(400).json({ 
            detail: 'Invalid file type. Only PDF, JPG, JPEG, and PNG files are allowed',
            error: 'INVALID_FILE_TYPE'
          });
        }
      }
      
      res.status(500).json({ 
        detail: 'Internal server error during document upload',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
