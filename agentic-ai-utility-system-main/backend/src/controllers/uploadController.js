import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary.js';

/**
 * Upload single image
 * POST /api/upload/image
 */
export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const result = await uploadToCloudinary(req.file, 'faults');

    res.status(200).json({
      success: true,
      data: {
        url: result.url,
        publicId: result.publicId,
        format: result.format,
        size: result.bytes
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to upload image' 
    });
  }
};

/**
 * Upload multiple images
 * POST /api/upload/images
 */
export const uploadMultipleImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const uploadPromises = req.files.map(file => uploadToCloudinary(file, 'faults'));
    const results = await Promise.all(uploadPromises);

    const uploadedImages = results.map(result => ({
      url: result.url,
      publicId: result.publicId,
      format: result.format,
      size: result.bytes
    }));

    res.status(200).json({
      success: true,
      data: uploadedImages
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to upload images' 
    });
  }
};

/**
 * Delete image
 * DELETE /api/upload/image/:publicId
 */
export const deleteImage = async (req, res) => {
  try {
    const { publicId } = req.params;

    if (!publicId) {
      return res.status(400).json({ message: 'Public ID is required' });
    }

    await deleteFromCloudinary(publicId);

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to delete image' 
    });
  }
};
