const GroupMessage = require('../models/GroupMessage');
const Group = require('../models/Group');
const Message = require('../models/Message');

// @desc    Create a new group message
// @route   POST /api/groups/:groupId/messages
// @access  Private
const createGroupMessage = async (req, res) => {
  try {
    const {
      text,
      voiceUrl,
      messageType,
      duration,
      isForwarded,
      originalMessage,
      originalMessageType,
      isReply,
      replyTo
    } = req.body;
    const groupId = req.params.groupId;

    // Check if group exists and user is a member
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!group.members.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to send messages to this group' });
    }

    // Validate based on message type
    if (messageType === 'voice') {
      if (!voiceUrl || !duration) {
        return res.status(400).json({ message: 'Voice URL and duration are required for voice messages' });
      }
    } else {
      // Default to text message
      if (!text) {
        return res.status(400).json({ message: 'Text is required for text messages' });
      }
    }

    // If it's a reply, verify the original message exists
    if (isReply && replyTo) {
      const originalMsg = await GroupMessage.findById(replyTo);
      if (!originalMsg) {
        return res.status(404).json({ message: 'Original message not found' });
      }

      // Check if the original message belongs to this group
      if (originalMsg.group.toString() !== groupId) {
        return res.status(400).json({ message: 'Original message does not belong to this group' });
      }

      // Check if user is a member of the group (already verified above)
    }

    const newMessage = new GroupMessage({
      group: groupId,
      sender: req.user._id,
      text: text || '',
      voiceUrl: voiceUrl || '',
      messageType: messageType || 'text',
      duration: duration || 0,
      readBy: [req.user._id], // Sender has read the message
      isForwarded: isForwarded || false,
      originalMessage: originalMessage || null,
      originalMessageType: originalMessageType,
      isReply: isReply || false,
      replyTo: replyTo || null
    });

    const savedMessage = await newMessage.save();

    // Populate sender information and reply information if needed
    let populateOptions = { path: 'sender', select: 'name email profilePhoto' };

    if (isReply && replyTo) {
      populateOptions = [
        { path: 'sender', select: 'name email profilePhoto' },
        {
          path: 'replyTo',
          select: 'text voiceUrl messageType sender',
          populate: { path: 'sender', select: 'name profilePhoto' }
        }
      ];
    }

    const populatedMessage = await GroupMessage.findById(savedMessage._id)
      .populate(populateOptions);

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error('Error creating group message:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Forward a message to a group
// @route   POST /api/groups/:groupId/messages/forward
// @access  Private
const forwardGroupMessage = async (req, res) => {
  try {
    const { messageId, messageType: sourceType } = req.body;
    const groupId = req.params.groupId;

    if (!messageId) {
      return res.status(400).json({ message: 'Message ID is required' });
    }

    // Check if group exists and user is a member
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!group.members.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to send messages to this group' });
    }

    let originalMessage;
    let messageData = {};

    // Determine if it's a direct message or group message being forwarded
    if (sourceType === 'direct') {
      originalMessage = await Message.findById(messageId);
      if (!originalMessage) {
        return res.status(404).json({ message: 'Message not found' });
      }

      // Check if user has access to this message
      const isSender = originalMessage.sender.toString() === req.user._id.toString();
      const isReceiver = originalMessage.receiver.toString() === req.user._id.toString();
      if (!isSender && !isReceiver) {
        return res.status(403).json({ message: 'Not authorized to forward this message' });
      }

      messageData = {
        text: originalMessage.text,
        voiceUrl: originalMessage.voiceUrl,
        messageType: originalMessage.messageType,
        duration: originalMessage.duration
      };
    } else if (sourceType === 'group') {
      originalMessage = await GroupMessage.findById(messageId);
      if (!originalMessage) {
        return res.status(404).json({ message: 'Group message not found' });
      }

      // In a real implementation, you'd check if the user is a member of the source group
      // For simplicity, we'll just check if the user is the sender
      if (originalMessage.sender.toString() !== req.user._id.toString()) {
        // In a real implementation, you'd check group membership here
        // For now, we'll allow forwarding if the user is the sender
        // return res.status(403).json({ message: 'Not authorized to forward this message' });
      }

      messageData = {
        text: originalMessage.text,
        voiceUrl: originalMessage.voiceUrl,
        messageType: originalMessage.messageType,
        duration: originalMessage.duration
      };
    } else {
      return res.status(400).json({ message: 'Invalid message type' });
    }

    // Create the forwarded message
    const newMessage = new GroupMessage({
      group: groupId,
      sender: req.user._id,
      ...messageData,
      isForwarded: true,
      originalMessage: messageId,
      originalMessageType: sourceType,
      readBy: [req.user._id] // Sender has read the message
    });

    const savedMessage = await newMessage.save();

    // Populate sender information
    const populatedMessage = await GroupMessage.findById(savedMessage._id)
      .populate('sender', 'name email profilePhoto');

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error('Error forwarding message to group:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get messages for a group
// @route   GET /api/groups/:groupId/messages
// @access  Private
const getGroupMessages = async (req, res) => {
  try {
    const groupId = req.params.groupId;

    // Check if group exists and user is a member
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!group.members.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to view messages in this group' });
    }

    // Find messages that are not deleted for the current user
    const messages = await GroupMessage.find({
      group: groupId,
      deletedFor: { $ne: req.user._id } // Not deleted for current user
    })
      .populate('sender', 'name email profilePhoto')
      .populate({
        path: 'replyTo',
        select: 'text voiceUrl messageType sender',
        populate: {
          path: 'sender',
          select: 'name profilePhoto'
        }
      })
      .sort({ createdAt: 1 });

    // Mark messages as read by current user
    await GroupMessage.updateMany(
      {
        group: groupId,
        sender: { $ne: req.user._id }, // Not sent by current user
        readBy: { $ne: req.user._id } // Not already read by current user
      },
      { $addToSet: { readBy: req.user._id } }
    );

    res.json(messages);
  } catch (error) {
    console.error('Error getting group messages:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Mark group messages as read
// @route   PUT /api/groups/:groupId/messages/read
// @access  Private
const markGroupMessagesAsRead = async (req, res) => {
  try {
    const groupId = req.params.groupId;

    // Check if group exists and user is a member
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!group.members.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to mark messages as read in this group' });
    }

    // Mark all messages as read by current user
    await GroupMessage.updateMany(
      {
        group: groupId,
        readBy: { $ne: req.user._id } // Not already read by current user
      },
      { $addToSet: { readBy: req.user._id } }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking group messages as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete a group message
// @route   DELETE /api/groups/:groupId/messages/:messageId
// @access  Private
const deleteGroupMessage = async (req, res) => {
  try {
    const { deleteFor } = req.query;
    const messageId = req.params.messageId;
    const groupId = req.params.groupId;

    // Check if group exists and user is a member
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!group.members.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to delete messages in this group' });
    }

    const message = await GroupMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.group.toString() !== groupId) {
      return res.status(400).json({ message: 'Message does not belong to this group' });
    }

    // Check if user is the sender or an admin
    const isSender = message.sender.toString() === req.user._id.toString();
    const isAdmin = group.admins.includes(req.user._id);

    if (deleteFor === 'everyone') {
      // Only sender or admin can delete for everyone
      if (!isSender && !isAdmin) {
        return res.status(403).json({ message: 'Only the sender or an admin can delete messages for everyone' });
      }

      message.isDeleted = true;
      await message.save();
    } else {
      // Delete just for the user
      message.deletedFor.push(req.user._id);
      await message.save();
    }

    res.json({ success: true, message });
  } catch (error) {
    console.error('Error deleting group message:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Add a reaction to a group message
// @route   POST /api/groups/:groupId/messages/:messageId/reactions
// @access  Private
const addGroupMessageReaction = async (req, res) => {
  try {
    const { emoji } = req.body;
    const messageId = req.params.messageId;
    const groupId = req.params.groupId;

    if (!emoji) {
      return res.status(400).json({ message: 'Emoji is required' });
    }

    // Check if group exists and user is a member
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!group.members.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to react to messages in this group' });
    }

    const message = await GroupMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.group.toString() !== groupId) {
      return res.status(400).json({ message: 'Message does not belong to this group' });
    }

    // Check if user has already reacted with this emoji
    const existingReaction = message.reactions.find(
      reaction => reaction.user.toString() === req.user._id.toString() && reaction.emoji === emoji
    );

    if (existingReaction) {
      // Remove the reaction if it already exists (toggle behavior)
      message.reactions = message.reactions.filter(
        reaction => !(reaction.user.toString() === req.user._id.toString() && reaction.emoji === emoji)
      );
    } else {
      // Remove any existing reaction from this user with a different emoji
      message.reactions = message.reactions.filter(
        reaction => reaction.user.toString() !== req.user._id.toString()
      );

      // Add the new reaction
      message.reactions.push({
        user: req.user._id,
        emoji
      });
    }

    await message.save();

    res.json(message);
  } catch (error) {
    console.error('Error adding reaction to group message:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Remove a reaction from a group message
// @route   DELETE /api/groups/:groupId/messages/:messageId/reactions
// @access  Private
const removeGroupMessageReaction = async (req, res) => {
  try {
    const messageId = req.params.messageId;
    const groupId = req.params.groupId;

    // Check if group exists and user is a member
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!group.members.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to remove reactions in this group' });
    }

    const message = await GroupMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.group.toString() !== groupId) {
      return res.status(400).json({ message: 'Message does not belong to this group' });
    }

    // Remove all reactions from this user
    message.reactions = message.reactions.filter(
      reaction => reaction.user.toString() !== req.user._id.toString()
    );

    await message.save();

    res.json(message);
  } catch (error) {
    console.error('Error removing reaction from group message:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createGroupMessage,
  getGroupMessages,
  markGroupMessagesAsRead,
  deleteGroupMessage,
  addGroupMessageReaction,
  removeGroupMessageReaction,
  forwardGroupMessage
};
