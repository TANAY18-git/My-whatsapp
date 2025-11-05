const Message = require('../models/Message');

// @desc    Add a reaction to a message
// @route   POST /api/messages/:messageId/reactions
// @access  Private
const addReaction = async (req, res) => {
  try {
    const { emoji } = req.body;
    const { messageId } = req.params;

    if (!emoji) {
      return res.status(400).json({ message: 'Emoji is required' });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
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
    console.error('Error adding reaction:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Remove a reaction from a message
// @route   DELETE /api/messages/:messageId/reactions
// @access  Private
const removeReaction = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Remove all reactions from this user
    message.reactions = message.reactions.filter(
      reaction => reaction.user.toString() !== req.user._id.toString()
    );

    await message.save();

    res.json(message);
  } catch (error) {
    console.error('Error removing reaction:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { addReaction, removeReaction };
