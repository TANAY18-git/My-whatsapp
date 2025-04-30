const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: function () {
        return !this.voiceUrl; // Text is required only if there's no voice message
      },
    },
    voiceUrl: {
      type: String,
      required: function () {
        return !this.text; // Voice URL is required only if there's no text
      },
    },
    messageType: {
      type: String,
      enum: ['text', 'voice'],
      default: 'text',
    },
    duration: {
      type: Number, // Duration in seconds for voice messages
      required: function () {
        return this.messageType === 'voice';
      },
    },
    read: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isForwarded: {
      type: Boolean,
      default: false,
    },
    originalMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    isReply: {
      type: Boolean,
      default: false,
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    deletedFor: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    reactions: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      emoji: {
        type: String,
        required: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
  },
  { timestamps: true }
);

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
