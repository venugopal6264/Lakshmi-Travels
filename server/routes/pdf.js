import { Router } from 'express';
import multer, { memoryStorage } from 'multer';
import { parsePdfAndExtractData } from '../utils/pdfParser.js';

const router = Router();

// Configure multer for file upload
const storage = memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Upload and parse PDF endpoint
router.post('/upload', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No PDF file uploaded'
      });
    }

    const result = await parsePdfAndExtractData(req?.file?.buffer);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('PDF upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process PDF file'
    });
  }
});

export default router;
