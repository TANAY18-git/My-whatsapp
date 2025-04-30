const mongoose = require('mongoose');

const groupMessageSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: function() {
        return !this.voiceUrl; // Text is required only if there's no voice message
      },
    },
    voiceUrl: {
      type: String,
      required: function() {
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
      required: function() {
        return this.messageType === 'voice';
      },
    },
    readBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isForwarded: {
      type: Boolean,
      default: false,
    },
    originalMessage: {
      type: mongoose.Schema.Types.Mixed, // Can be a Message or GroupMessage
      ref: function() {
        return this.originalMessageType === 'direct' ? 'Message' : 'GroupMessage';
      }
    },
    originalMessageType: {
      type: String,
      enum: ['direct', 'group'],
      required: function() {
        return !!this.originalMessage;
      }
    },
    isReply: {
      type: Boolean,
      default: false,
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GroupMessage',
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

const GroupMessage = mongoose.model('GroupMessage', groupMessageSchema);

module.exports = GroupMessage;
