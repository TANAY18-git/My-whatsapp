const express = require('express');
const { createMessage, getMessages, markMessagesAsRead, deleteMessage, forwardMessage } = require('../controllers/messageController');
const { addReaction, removeReaction } = require('../controllers/reactionController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, createMessage);
router.get('/:userId', protect, getMessages);
router.put('/read/:userId', protect, markMessagesAsRead);
router.delete('/:messageId', protect, deleteMessage);
router.post('/forward', protect, forwardMessage);

// Reaction routes
router.post('/:messageId/reactions', protect, addReaction);
router.delete('/:messageId/reactions', protect, removeReaction);

module.exports = router;
