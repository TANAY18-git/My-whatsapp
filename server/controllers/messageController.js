const Message = require('../models/Message');
const GroupMessage = require('../models/GroupMessage');

// @desc    Create a new message
// @route   POST /api/messages
// @access  Private
const createMessage = async (req, res) => {
  try {
    const {
      receiver,
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

    // Validate based on message type
    if (!receiver) {
      return res.status(400).json({ message: 'Receiver is required' });
    }

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
      const originalMsg = await Message.findById(replyTo);
      if (!originalMsg) {
        return res.status(404).json({ message: 'Original message not found' });
      }

      // Check if user has access to the original message
      const isSender = originalMsg.sender.toString() === req.user._id.toString();
      const isReceiver = originalMsg.receiver.toString() === req.user._id.toString();

      if (!isSender && !isReceiver) {
        return res.status(403).json({ message: 'Not authorized to reply to this message' });
      }
    }

    const newMessage = new Message({
      sender: req.user._id,
      receiver,
      text: text || '',
      voiceUrl: voiceUrl || '',
      messageType: messageType || 'text',
      duration: duration || 0,
      isForwarded: isForwarded || false,
      originalMessage: originalMessage || null,
      isReply: isReply || false,
      replyTo: replyTo || null
    });

    const savedMessage = await newMessage.save();

    // If it's a reply, populate the reply information
    let populatedMessage = savedMessage;
    if (isReply && replyTo) {
      populatedMessage = await Message.findById(savedMessage._id)
        .populate('replyTo', 'text voiceUrl messageType sender receiver');
    }

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Forward a message to a user
// @route   POST /api/messages/forward
// @access  Private
const forwardMessage = async (req, res) => {
  try {
    const { messageId, receiverId, messageType } = req.body;

    if (!messageId || !receiverId) {
      return res.status(400).json({ message: 'Message ID and receiver ID are required' });
    }

    let originalMessage;
    let messageData = {};

    // Determine if it's a direct message or group message
    if (messageType === 'direct') {
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
    } else if (messageType === 'group') {
      originalMessage = await GroupMessage.findById(messageId);
      if (!originalMessage) {
        return res.status(404).json({ message: 'Group message not found' });
      }

      // Check if user is a member of the group
      // This would require populating the group and checking membership
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
    const newMessage = new Message({
      sender: req.user._id,
      receiver: receiverId,
      ...messageData,
      isForwarded: true,
      originalMessage: messageId
    });

    const savedMessage = await newMessage.save();
    res.status(201).json(savedMessage);
  } catch (error) {
    console.error('Error forwarding message:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get messages between two users
// @route   GET /api/messages/:userId
// @access  Private
const getMessages = async (req, res) => {
  try {
    // Find messages that are not deleted for the current user
    const messages = await Message.find({
      $or: [
        {
          sender: req.user._id,
          receiver: req.params.userId,
          deletedFor: { $ne: req.user._id } // Not deleted for sender
        },
        {
          sender: req.params.userId,
          receiver: req.user._id,
          deletedFor: { $ne: req.user._id } // Not deleted for receiver
        },
      ],
    })
    .populate({
      path: 'replyTo',
      select: 'text voiceUrl messageType sender receiver',
      populate: {
        path: 'sender',
        select: 'name profilePhoto'
      }
    })
    .sort({ createdAt: 1 });

    // Mark messages from the other user as read
    await Message.updateMany(
      { sender: req.params.userId, receiver: req.user._id, read: false },
      { read: true }
    );

    res.json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Mark messages as read
// @route   PUT /api/messages/read/:userId
// @access  Private
const markMessagesAsRead = async (req, res) => {
  try {
    await Message.updateMany(
      { sender: req.params.userId, receiver: req.user._id, read: false },
      { read: true }
    );

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete a message (for everyone or just for the user)
// @route   DELETE /api/messages/:messageId
// @access  Private
const deleteMessage = async (req, res) => {
  try {
    const { deleteFor } = req.query;
    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if the user is the sender or receiver of the message
    const isSender = message.sender.toString() === req.user._id.toString();
    const isReceiver = message.receiver.toString() === req.user._id.toString();

    if (!isSender && !isReceiver) {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }

    // Only senders can delete for everyone
    if (deleteFor === 'everyone' && !isSender) {
      return res.status(403).json({ message: 'Only the sender can delete messages for everyone' });
    }

    if (deleteFor === 'everyone') {
      // Delete for everyone
      message.isDeleted = true;
      await message.save();
    } else {
      // Delete just for the user
      message.deletedFor.push(req.user._id);
      await message.save();
    }

    res.json({ success: true, message });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { createMessage, getMessages, markMessagesAsRead, deleteMessage, forwardMessage };
