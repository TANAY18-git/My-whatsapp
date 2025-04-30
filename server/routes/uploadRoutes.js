const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { uploadVoice } = require('../controllers/uploadController');
const upload = require('../utils/fileUpload');

// Upload voice message
router.post('/voice', protect, upload.single('voice'), uploadVoice);

module.exports = router;
