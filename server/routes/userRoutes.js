const express = require('express');
const {
  getUsers,
  getUserById,
  searchUsers,
  getUserContacts,
  addContact
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getUsers);
router.get('/search', protect, searchUsers);
router.get('/contacts', protect, getUserContacts);
router.post('/contacts', protect, addContact);
router.get('/:id', protect, getUserById);

module.exports = router;
