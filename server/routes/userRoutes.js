const express = require('express');
const { getUsers, getUserById } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getUsers);
router.get('/:id', protect, getUserById);

module.exports = router;
