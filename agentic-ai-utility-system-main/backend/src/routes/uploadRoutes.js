import express from 'express';
import upload, { handleMulterError } from '../middleware/uploadMiddleware.js';
import { uploadImage, uploadMultipleImages, deleteImage } from '../controllers/uploadController.js';
import protect from '../middleware/auth.js';

const router = express.Router();

// All upload routes are protected
router.use(protect);

// Single image upload
router.post(
  '/image',
  upload.single('image'),
  handleMulterError,
  uploadImage
);

// Multiple images upload (up to 5)
router.post(
  '/images',
  upload.array('images', 5),
  handleMulterError,
  uploadMultipleImages
);

// Delete image
router.delete(
  '/image/:publicId',
  deleteImage
);

export default router;
