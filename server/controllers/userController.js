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

// @desc    Send a contact request
// @route   POST /api/users/requests
// @access  Private
const sendContactRequest = async (req, res) => {
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

    // Initialize arrays if they don't exist
    if (!user.sentRequests) user.sentRequests = [];
    if (!user.contacts) user.contacts = [];
    if (!contactUser.pendingRequests) contactUser.pendingRequests = [];

    // Check if contact is already added
    if (user.contacts.includes(contactId)) {
      return res.status(400).json({ message: 'Contact already added' });
    }

    // Check if request is already sent
    if (user.sentRequests.includes(contactId)) {
      return res.status(400).json({ message: 'Request already sent' });
    }

    // Check if user already has a pending request from this contact
    if (user.pendingRequests && user.pendingRequests.includes(contactId)) {
      // Auto-accept the request since both users want to connect
      user.contacts.push(contactId);
      contactUser.contacts.push(user._id);

      // Remove from pending/sent requests
      user.pendingRequests = user.pendingRequests.filter(id => id.toString() !== contactId.toString());
      contactUser.sentRequests = contactUser.sentRequests.filter(id => id.toString() !== user._id.toString());

      await Promise.all([user.save(), contactUser.save()]);

      return res.status(200).json({
        message: 'Contact request automatically accepted',
        contact: contactUser,
        autoAccepted: true
      });
    }

    // Add to sent requests for current user
    user.sentRequests.push(contactId);

    // Add to pending requests for contact user
    contactUser.pendingRequests.push(user._id);

    await Promise.all([user.save(), contactUser.save()]);

    res.status(200).json({
      message: 'Contact request sent successfully',
      contact: contactUser
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Accept a contact request
// @route   POST /api/users/requests/accept
// @access  Private
const acceptContactRequest = async (req, res) => {
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

    // Check if request exists
    if (!user.pendingRequests || !user.pendingRequests.includes(contactId)) {
      return res.status(400).json({ message: 'No pending request from this user' });
    }

    // Add to contacts for both users
    if (!user.contacts) user.contacts = [];
    if (!contactUser.contacts) contactUser.contacts = [];

    user.contacts.push(contactId);
    contactUser.contacts.push(user._id);

    // Remove from pending/sent requests
    user.pendingRequests = user.pendingRequests.filter(id => id.toString() !== contactId.toString());
    contactUser.sentRequests = contactUser.sentRequests.filter(id => id.toString() !== user._id.toString());

    await Promise.all([user.save(), contactUser.save()]);

    res.status(200).json({
      message: 'Contact request accepted',
      contact: contactUser
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Reject a contact request
// @route   POST /api/users/requests/reject
// @access  Private
const rejectContactRequest = async (req, res) => {
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

    // Check if request exists
    if (!user.pendingRequests || !user.pendingRequests.includes(contactId)) {
      return res.status(400).json({ message: 'No pending request from this user' });
    }

    // Remove from pending/sent requests
    user.pendingRequests = user.pendingRequests.filter(id => id.toString() !== contactId.toString());
    contactUser.sentRequests = contactUser.sentRequests.filter(id => id.toString() !== user._id.toString());

    await Promise.all([user.save(), contactUser.save()]);

    res.status(200).json({ message: 'Contact request rejected' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get pending contact requests
// @route   GET /api/users/requests
// @access  Private
const getPendingRequests = async (req, res) => {
  try {
    // Find current user and populate pending requests
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('pendingRequests', 'name username email profilePhoto');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user.pendingRequests || []);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Cancel a sent contact request
// @route   POST /api/users/requests/cancel
// @access  Private
const cancelContactRequest = async (req, res) => {
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

    // Check if request exists
    if (!user.sentRequests || !user.sentRequests.includes(contactId)) {
      return res.status(400).json({ message: 'No sent request to this user' });
    }

    // Remove from pending/sent requests
    user.sentRequests = user.sentRequests.filter(id => id.toString() !== contactId.toString());
    contactUser.pendingRequests = contactUser.pendingRequests.filter(id => id.toString() !== user._id.toString());

    await Promise.all([user.save(), contactUser.save()]);

    res.status(200).json({ message: 'Contact request cancelled' });
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
  sendContactRequest,
  acceptContactRequest,
  rejectContactRequest,
  getPendingRequests,
  cancelContactRequest
};
