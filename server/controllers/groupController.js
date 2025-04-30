const Group = require('../models/Group');
const GroupMessage = require('../models/GroupMessage');
const User = require('../models/User');

// @desc    Create a new group
// @route   POST /api/groups
// @access  Private
const createGroup = async (req, res) => {
  try {
    const { name, description, members } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Group name is required' });
    }

    // Create new group
    const newGroup = new Group({
      name,
      description: description || '',
      creator: req.user._id,
      members: [...new Set([...members, req.user._id])], // Ensure unique members and include creator
      admins: [req.user._id], // Creator is automatically an admin
    });

    const savedGroup = await newGroup.save();

    // Populate members and admins
    const populatedGroup = await Group.findById(savedGroup._id)
      .populate('members', 'name email profilePhoto')
      .populate('admins', 'name email profilePhoto');

    res.status(201).json(populatedGroup);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all groups for a user
// @route   GET /api/groups
// @access  Private
const getGroups = async (req, res) => {
  try {
    // Find all groups where the user is a member
    const groups = await Group.find({ members: req.user._id })
      .populate('members', 'name email profilePhoto')
      .populate('admins', 'name email profilePhoto')
      .sort({ updatedAt: -1 });

    res.json(groups);
  } catch (error) {
    console.error('Error getting groups:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get a single group by ID
// @route   GET /api/groups/:groupId
// @access  Private
const getGroupById = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
      .populate('members', 'name email profilePhoto')
      .populate('admins', 'name email profilePhoto');

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is a member of the group
    if (!group.members.some(member => member._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Not authorized to access this group' });
    }

    res.json(group);
  } catch (error) {
    console.error('Error getting group:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update a group
// @route   PUT /api/groups/:groupId
// @access  Private (Admin only)
const updateGroup = async (req, res) => {
  try {
    const { name, description, groupPhoto } = req.body;
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is an admin of the group
    if (!group.admins.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to update this group' });
    }

    // Update fields
    if (name) group.name = name;
    if (description !== undefined) group.description = description;
    if (groupPhoto) group.groupPhoto = groupPhoto;

    const updatedGroup = await group.save();

    // Populate members and admins
    const populatedGroup = await Group.findById(updatedGroup._id)
      .populate('members', 'name email profilePhoto')
      .populate('admins', 'name email profilePhoto');

    res.json(populatedGroup);
  } catch (error) {
    console.error('Error updating group:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Add members to a group
// @route   PUT /api/groups/:groupId/members
// @access  Private (Admin only)
const addMembers = async (req, res) => {
  try {
    const { members } = req.body;
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is an admin of the group
    if (!group.admins.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to add members to this group' });
    }

    // Add new members
    const currentMembers = group.members.map(id => id.toString());
    const newMembers = members.filter(id => !currentMembers.includes(id));
    
    group.members = [...group.members, ...newMembers];
    
    const updatedGroup = await group.save();

    // Populate members and admins
    const populatedGroup = await Group.findById(updatedGroup._id)
      .populate('members', 'name email profilePhoto')
      .populate('admins', 'name email profilePhoto');

    res.json(populatedGroup);
  } catch (error) {
    console.error('Error adding members:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Remove a member from a group
// @route   DELETE /api/groups/:groupId/members/:userId
// @access  Private (Admin or self-removal)
const removeMember = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    const userId = req.params.userId;

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is an admin or removing themselves
    const isAdmin = group.admins.includes(req.user._id);
    const isSelfRemoval = userId === req.user._id.toString();

    if (!isAdmin && !isSelfRemoval) {
      return res.status(403).json({ message: 'Not authorized to remove members from this group' });
    }

    // Remove member
    group.members = group.members.filter(id => id.toString() !== userId);
    
    // If admin is being removed, also remove from admins
    if (group.admins.includes(userId)) {
      group.admins = group.admins.filter(id => id.toString() !== userId);
    }
    
    // If the group has no members left, delete it
    if (group.members.length === 0) {
      await Group.findByIdAndDelete(group._id);
      return res.json({ message: 'Group deleted as it has no members left' });
    }
    
    // If the group has no admins left, make the oldest member an admin
    if (group.admins.length === 0 && group.members.length > 0) {
      group.admins.push(group.members[0]);
    }
    
    const updatedGroup = await group.save();

    // Populate members and admins
    const populatedGroup = await Group.findById(updatedGroup._id)
      .populate('members', 'name email profilePhoto')
      .populate('admins', 'name email profilePhoto');

    res.json(populatedGroup);
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Make a member an admin
// @route   PUT /api/groups/:groupId/admins/:userId
// @access  Private (Admin only)
const makeAdmin = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    const userId = req.params.userId;

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is an admin
    if (!group.admins.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to make admins in this group' });
    }

    // Check if user is a member
    if (!group.members.some(id => id.toString() === userId)) {
      return res.status(400).json({ message: 'User is not a member of this group' });
    }

    // Add user to admins if not already an admin
    if (!group.admins.includes(userId)) {
      group.admins.push(userId);
    }
    
    const updatedGroup = await group.save();

    // Populate members and admins
    const populatedGroup = await Group.findById(updatedGroup._id)
      .populate('members', 'name email profilePhoto')
      .populate('admins', 'name email profilePhoto');

    res.json(populatedGroup);
  } catch (error) {
    console.error('Error making admin:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Remove admin status from a member
// @route   DELETE /api/groups/:groupId/admins/:userId
// @access  Private (Admin only)
const removeAdmin = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    const userId = req.params.userId;

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is an admin
    if (!group.admins.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to remove admins in this group' });
    }

    // Prevent removing the last admin
    if (group.admins.length <= 1) {
      return res.status(400).json({ message: 'Cannot remove the last admin' });
    }

    // Remove user from admins
    group.admins = group.admins.filter(id => id.toString() !== userId);
    
    const updatedGroup = await group.save();

    // Populate members and admins
    const populatedGroup = await Group.findById(updatedGroup._id)
      .populate('members', 'name email profilePhoto')
      .populate('admins', 'name email profilePhoto');

    res.json(populatedGroup);
  } catch (error) {
    console.error('Error removing admin:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete a group
// @route   DELETE /api/groups/:groupId
// @access  Private (Admin only)
const deleteGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is an admin
    if (!group.admins.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to delete this group' });
    }

    // Delete all messages in the group
    await GroupMessage.deleteMany({ group: group._id });
    
    // Delete the group
    await Group.findByIdAndDelete(group._id);

    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createGroup,
  getGroups,
  getGroupById,
  updateGroup,
  addMembers,
  removeMember,
  makeAdmin,
  removeAdmin,
  deleteGroup
};
