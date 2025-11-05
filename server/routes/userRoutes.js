const express = require('express');
const {
  getUsers,
  getUserById,
  searchUsers,
  getUserContacts,
  sendContactRequest,
  acceptContactRequest,
  rejectContactRequest,
  getPendingRequests,
  cancelContactRequest,
  updateProfile,
  changePassword
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getUsers);
router.get('/search', protect, searchUsers);
router.get('/contacts', protect, getUserContacts);
// Profile routes
router.put('/profile', protect, updateProfile);
router.put('/password', protect, changePassword);
// Contact request routes
router.get('/requests', protect, getPendingRequests);
router.post('/requests', protect, sendContactRequest);
router.post('/requests/accept', protect, acceptContactRequest);
router.post('/requests/reject', protect, rejectContactRequest);
router.post('/requests/cancel', protect, cancelContactRequest);
router.get('/:id', protect, getUserById);

module.exports = router;
