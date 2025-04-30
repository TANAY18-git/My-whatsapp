import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from './button';
import { Input } from './input';

const ReplyMessageModal = ({ isOpen, onClose, message, onSendReply }) => {
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    
    setLoading(true);
    try {
      await onSendReply(replyText);
      setReplyText('');
      onClose();
    } catch (error) {
      console.error('Error sending reply:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !message) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ background: { duration: 0 } }}
        className="rounded-lg shadow-xl p-6 w-full max-w-md"
        style={{ backgroundColor: 'var(--bg-panel)', color: 'var(--text-primary)' }}
      >
        <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Reply to Message</h3>
        
        <div className="mb-4">
          <div className="p-3 rounded mb-4" style={{ backgroundColor: 'var(--bg-hover)' }}>
            <p className="text-sm font-medium mb-1">Original message:</p>
            <div className="pl-2 border-l-2 border-primary">
              {message.messageType === 'voice' ? (
                <div className="flex items-center space-x-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                  </svg>
                  <span style={{ color: 'var(--text-secondary)' }}>Voice message</span>
                </div>
              ) : (
                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                  {message.text}
                </p>
              )}
            </div>
          </div>

          <div className="mb-4">
            <Input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your reply..."
              className="w-full"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendReply();
                }
              }}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSendReply}
            disabled={loading || !replyText.trim()}
          >
            {loading ? 'Sending...' : 'Reply'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default ReplyMessageModal;
