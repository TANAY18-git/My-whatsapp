const express = require('express');
const {
  createGroup,
  getGroups,
  getGroupById,
  updateGroup,
  addMembers,
  removeMember,
  makeAdmin,
  removeAdmin,
  deleteGroup
} = require('../controllers/groupController');
const {
  createGroupMessage,
  getGroupMessages,
  markGroupMessagesAsRead,
  deleteGroupMessage,
  addGroupMessageReaction,
  removeGroupMessageReaction,
  forwardGroupMessage
} = require('../controllers/groupMessageController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Group routes
router.post('/', protect, createGroup);
router.get('/', protect, getGroups);
router.get('/:groupId', protect, getGroupById);
router.put('/:groupId', protect, updateGroup);
router.delete('/:groupId', protect, deleteGroup);

// Group member routes
router.put('/:groupId/members', protect, addMembers);
router.delete('/:groupId/members/:userId', protect, removeMember);

// Group admin routes
router.put('/:groupId/admins/:userId', protect, makeAdmin);
router.delete('/:groupId/admins/:userId', protect, removeAdmin);

// Group message routes
router.post('/:groupId/messages', protect, createGroupMessage);
router.get('/:groupId/messages', protect, getGroupMessages);
router.put('/:groupId/messages/read', protect, markGroupMessagesAsRead);
router.delete('/:groupId/messages/:messageId', protect, deleteGroupMessage);
router.post('/:groupId/messages/forward', protect, forwardGroupMessage);

// Group message reaction routes
router.post('/:groupId/messages/:messageId/reactions', protect, addGroupMessageReaction);
router.delete('/:groupId/messages/:messageId/reactions', protect, removeGroupMessageReaction);

module.exports = router;
