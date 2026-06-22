/**
 * Upload API Routes — File upload for product images & assets.
 *
 * Routes:
 *  POST   /api/upload/single       — single file upload
 *  POST   /api/upload/batch        — batch file upload (up to 10)
 *
 * Dependencies: multer (already in package.json)
 * Files land in: ../../uploads/  (project root)
 */

import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import { addJob, QUEUE_NAMES } from '../lib/queue-registry';

// ── Multer Config ────────────────────────────────────────────────────────

const projectRoot = path.resolve(process.cwd());
const uploadDir = path.join(projectRoot, 'uploads');

// Ensure upload directory exists (lazy, non-blocking)
import('fs').then((fs) => {
  fs.mkdirSync(uploadDir, { recursive: true });
}).catch(() => {});

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const ext = path.extname(file.originalname) || '.bin';
    cb(null, `${unique}${ext}`);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
});

export const uploadRoutes = Router();

// ── POST /api/upload/single ──────────────────────────────────────────────

uploadRoutes.post(
  '/single',
  (req: Request, res: Response, next: NextFunction) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          return res.status(400).json({ error: `Upload error: ${err.message}` });
        }
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'No file provided. Use field name "file".' });
      }

      // Enqueue background processing
      let jobId: string | null = null;
      try {
        const result = await addJob(
          QUEUE_NAMES.UPLOAD_PROCESSING,
          'process-image',
          {
            filePath: file.path,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            type: file.mimetype.startsWith('video/') ? 'video' : 'image',
          },
        );
        jobId = result.jobId;
      } catch (e: any) {
        console.warn('[Upload] Could not enqueue processing job:', e.message);
      }

      res.status(201).json({
        success: true,
        file: {
          originalName: file.originalname,
          filename: file.filename,
          path: file.path,
          size: file.size,
          mimeType: file.mimetype,
        },
        processingJobId: jobId,
      });
    } catch (e) {
      next(e);
    }
  },
);

// ── POST /api/upload/batch ───────────────────────────────────────────────

uploadRoutes.post(
  '/batch',
  (req: Request, res: Response, next: NextFunction) => {
    upload.array('files', 10)(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          return res.status(400).json({ error: `Upload error: ${err.message}` });
        }
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files provided. Use field name "files".' });
      }

      const results = [];
      for (const file of files) {
        let jobId: string | null = null;
        try {
          const result = await addJob(
            QUEUE_NAMES.UPLOAD_PROCESSING,
            'process-image',
            {
              filePath: file.path,
              originalName: file.originalname,
              mimeType: file.mimetype,
              size: file.size,
              type: file.mimetype.startsWith('video/') ? 'video' : 'image',
            },
          );
          jobId = result.jobId;
        } catch (e: any) {
          console.warn('[Upload] Could not enqueue processing job:', e.message);
        }

        results.push({
          originalName: file.originalname,
          filename: file.filename,
          path: file.path,
          size: file.size,
          mimeType: file.mimetype,
          processingJobId: jobId,
        });
      }

      res.status(201).json({ success: true, files: results });
    } catch (e) {
      next(e);
    }
  },
);
