// @desc    Upload a voice message
// @route   POST /api/upload/voice
// @access  Private
const uploadVoice = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Create URL for the uploaded file
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const voiceUrl = `${baseUrl}/uploads/voice/${req.file.filename}`;

    res.json({ 
      voiceUrl,
      filename: req.file.filename,
      size: req.file.size
    });
  } catch (error) {
    console.error('Error uploading voice message:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { uploadVoice };
