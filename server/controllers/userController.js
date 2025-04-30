const User = require('../models/User');

// @desc    Get all users except current user
// @route   GET /api/users
// @access  Private
const getUsers = async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } }).select('-password');
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Search users by username
// @route   GET /api/users/search
// @access  Private
const searchUsers = async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ message: 'Username parameter is required' });
    }

    // Search for users with username containing the search term (case insensitive)
    // Exclude the current user from results
    const users = await User.find({
      username: { $regex: username, $options: 'i' },
      _id: { $ne: req.user._id }
    }).select('-password');

    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get user's contacts
// @route   GET /api/users/contacts
// @access  Private
const getUserContacts = async (req, res) => {
  try {
    // Find the current user and populate their contacts
    const user = await User.findById(req.user._id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If user has no contacts field, initialize it
    if (!user.contacts) {
      user.contacts = [];
      await user.save();
      return res.json([]);
    }

    // Fetch all contacts with their details
    const contacts = await User.find({
      _id: { $in: user.contacts }
    }).select('-password');

    res.json(contacts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Add a contact
// @route   POST /api/users/contacts
// @access  Private
const addContact = async (req, res) => {
  try {
    const { contactId } = req.body;

    if (!contactId) {
      return res.status(400).json({ message: 'Contact ID is required' });
    }

    // Check if contact exists
    const contactUser = await User.findById(contactId).select('-password');
    if (!contactUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find current user
    const user = await User.findById(req.user._id);

    // Initialize contacts array if it doesn't exist
    if (!user.contacts) {
      user.contacts = [];
    }

    // Check if contact is already added
    if (user.contacts.includes(contactId)) {
      return res.status(400).json({ message: 'Contact already added' });
    }

    // Add contact to user's contacts
    user.contacts.push(contactId);
    await user.save();

    res.json(contactUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getUsers,
  getUserById,
  searchUsers,
  getUserContacts,
  addContact
};
