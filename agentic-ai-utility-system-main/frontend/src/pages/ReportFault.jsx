import { useState, useCallback } from 'react';
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ArrowLeft, MapPin, AlertCircle, Image as ImageIcon, Loader } from 'lucide-react';
import axios from 'axios';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

export default function ReportFault() {
  const navigate = useNavigate();
  const { createFault, user } = useApp();
  const [step, setStep] = useState(1); // 1: Details, 2: Location, 3: Photos, 4: Review
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  const [formData, setFormData] = useState({
    type: '', // water, electricity, gas, sewage, other
    severity: 'medium', // low, medium, high, critical
    description: '',
    lat: null,
    lng: null,
    address: 'Will be auto-detected',
    images: []
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const faultTypes = [
    { value: 'water', label: '💧 Water', emoji: '💧' },
    { value: 'electricity', label: '⚡ Electricity', emoji: '⚡' },
    { value: 'gas', label: '🔥 Gas', emoji: '🔥' },
    { value: 'sewage', label: '🚰 Sewage', emoji: '🚰' },
    { value: 'other', label: '🛠️ Other', emoji: '🛠️' }
  ];

  const severityLevels = [
    { value: 'low', label: 'Low', color: 'bg-blue-100 text-blue-700' },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-700' },
    { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-700' }
  ];

  // Get current location
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Location service not available');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setFormData(prev => ({
          ...prev,
          lat: latitude,
          lng: longitude
        }));

        // Try to get address from reverse geocoding
        try {
          // Simple reverse geocoding (you can use a real service like Google Maps)
          setFormData(prev => ({
            ...prev,
            address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
          }));
        } catch {
          console.log('Could not get address');
        }

        setLoading(false);
        setStep(2);
      },
      () => {
        setError('Could not access your location. Please enable location services.');
        setLoading(false);
      }
    );
  }, []);

  // Handle image upload
  const handleImageUpload = useCallback(async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setUploadingImages(true);
    setError('');

    try {
      const uploadedImages = [];
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

      // If Cloudinary is not configured, use fallback
      if (!cloudName || !uploadPreset) {
        console.log('Cloudinary not configured, using local file references');
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, ...files.map((f) => ({
            name: f.name,
            size: f.size,
            type: f.type,
            localPreview: URL.createObjectURL(f)
          }))]
        }));
        setUploadingImages(false);
        return;
      }

      // Upload to Cloudinary
      for (const file of files) {
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        formDataUpload.append('upload_preset', uploadPreset);
        formDataUpload.append('folder', 'valtryek_faults');

        try {
          const response = await axios.post(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
            formDataUpload,
            { timeout: 30000 }
          );

          if (response.data.secure_url) {
            uploadedImages.push({
              url: response.data.secure_url,
              publicId: response.data.public_id,
              uploadedAt: new Date()
            });
          }
        } catch (uploadErr) {
          console.warn(`Failed to upload file ${file.name}:`, uploadErr.message);
          // Still add the file as a fallback
          uploadedImages.push({
            name: file.name,
            size: file.size,
            localFallback: true
          });
        }
      }

      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...uploadedImages]
      }));
    } catch (err) {
      console.error('Image upload error:', err);
      setError('Image upload failed. You can still submit the fault without photos.');
    } finally {
      setUploadingImages(false);
    }
  }, []);

  // Handle form submission
  const handleSubmit = async () => {
    if (!formData.type) {
      setError('Please select a fault type');
      return;
    }

    if (!formData.description.trim()) {
      setError('Please describe the fault');
      return;
    }

    if (!formData.lat || !formData.lng) {
      setError('Please enable location access');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const faultData = {
        ...formData,
        reportedBy: user?._id,
        status: 'pending'
      };

      await createFault(faultData);
      setSuccess(true);

      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to report fault. Please try again.');
      setStep(4); // Go to review to fix
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-24">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200/50"
      >
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={24} className="text-gray-600" />
          </motion.button>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
              Report Fault
            </h1>
            <p className="text-sm text-gray-500">Step {step} of 4</p>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {/* Step 1: Fault Type & Severity */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Fault Type */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">What type of fault?</h2>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {faultTypes.map(type => (
                    <motion.button
                      key={type.value}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setFormData(prev => ({ ...prev, type: type.value }))}
                      className={`p-4 rounded-xl border-2 transition-all text-center ${formData.type === type.value
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                    >
                      <span className="text-3xl block mb-2">{type.emoji}</span>
                      <span className="text-sm font-medium text-gray-700">{type.label.split(' ')[1]}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Severity Level */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">How severe?</h2>
                <div className="grid grid-cols-4 gap-3">
                  {severityLevels.map(level => (
                    <motion.button
                      key={level.value}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setFormData(prev => ({ ...prev, severity: level.value }))}
                      className={`p-3 rounded-xl border-2 font-medium text-sm transition-all ${formData.severity === level.value
                        ? `border-indigo-600 ${level.color}`
                        : 'border-gray-200 bg-white text-gray-700'
                        }`}
                    >
                      {level.label}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Describe the issue</h2>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="What's the problem? Include details like when it started, where, etc."
                  className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none h-32"
                />
              </div>

              {/* Next Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setStep(2)}
                disabled={!formData.type || !formData.description}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Location
              </motion.button>
            </motion.div>
          )}

          {/* Step 2: Location */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-gap-3">
                <AlertCircle className="text-indigo-600 flex-shrink-0" size={20} />
                <p className="text-indigo-700 text-sm">We'll use your device location to pinpoint the fault exactly.</p>
              </div>

              {formData.lat && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3"
                >
                  <span className="text-2xl">✅</span>
                  <div>
                    <p className="font-bold text-green-800">Location captured</p>
                    <p className="text-sm text-green-700">{formData.address}</p>
                  </div>
                </motion.div>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={getCurrentLocation}
                disabled={loading}
                className="w-full py-3 border-2 border-indigo-600 text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <Loader size={20} className="animate-spin" /> : <MapPin size={20} />}
                {loading ? 'Getting location...' : 'Get My Location'}
              </motion.button>

              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 border-2 border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all"
                >
                  Back
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setStep(3)}
                  disabled={!formData.lat}
                  className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next: Photos
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Photos */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Add photos (optional)</h2>
                <p className="text-gray-600 text-sm mb-4">Photos help us understand the fault better</p>
              </div>

              {/* Photo Upload Area */}
              <motion.label
                whileHover={{ scale: 1.02 }}
                className="block p-8 border-2 border-dashed border-indigo-300 rounded-xl bg-indigo-50 cursor-pointer hover:bg-indigo-100 transition-all text-center"
              >
                <ImageIcon className="w-12 h-12 mx-auto text-indigo-600 mb-3" />
                <p className="font-bold text-gray-900">Tap to upload photos</p>
                <p className="text-xs text-gray-600 mt-1">PNG, JPG up to 10MB each</p>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImages}
                  className="hidden"
                />
              </motion.label>

              {uploadingImages && (
                <div className="flex items-center justify-center gap-2 text-indigo-600">
                  <Loader size={20} className="animate-spin" />
                  Uploading...
                </div>
              )}

              {formData.images.length > 0 && (
                <div>
                  <p className="text-sm font-bold text-gray-700 mb-2">{formData.images.length} photo(s) uploaded</p>
                  <div className="flex flex-wrap gap-2">
                    {formData.images.map((img, i) => (
                      <div key={i} className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-2xl">
                        📸
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 border-2 border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all"
                >
                  Back
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setStep(4)}
                  className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-blue-700 transition-all"
                >
                  Review
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Review & Submit */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
                  >
                    ⚠️ {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Success */}
              <AnimatePresence>
                {success && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-12"
                  >
                    <span className="text-6xl block mb-4">✅</span>
                    <p className="text-xl font-bold text-green-700">Fault reported successfully!</p>
                    <p className="text-gray-600 mt-2">Redirecting...</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {!success && (
                <>
                  {/* Summary */}
                  <div className="bg-white rounded-xl p-6 border border-gray-200 space-y-4">
                    <div>
                      <p className="text-sm text-gray-500 uppercase font-bold">Fault Type</p>
                      <p className="text-lg font-bold text-gray-900">
                        {faultTypes.find(t => t.value === formData.type)?.label}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 uppercase font-bold">Severity</p>
                      <p className="text-lg font-bold text-gray-900 capitalize">{formData.severity}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 uppercase font-bold">Description</p>
                      <p className="text-gray-900">{formData.description}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 uppercase font-bold">Location</p>
                      <p className="text-gray-900">{formData.address}</p>
                    </div>
                    {formData.images.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-500 uppercase font-bold">Photos</p>
                        <p className="text-gray-900">{formData.images.length} uploaded</p>
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="flex gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setStep(1)}
                      disabled={loading}
                      className="flex-1 py-3 border-2 border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50"
                    >
                      Edit
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleSubmit}
                      disabled={loading}
                      className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader size={20} className="animate-spin" /> : '🚀'}
                      {loading ? 'Submitting...' : 'Submit Report'}
                    </motion.button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
