import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Button } from './button';
import { Input } from './input';

const ForwardMessageModal = ({ isOpen, onClose, user, message, onMessageForwarded }) => {
  const [contacts, setContacts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch contacts and groups
  useEffect(() => {
    const fetchData = async () => {
      if (!isOpen) return;

      setLoading(true);
      try {
        // Fetch contacts
        const contactsResponse = await axios.get('http://localhost:5000/api/users', {
          headers: { Authorization: `Bearer ${user.token}` }
        });

        // Fetch groups
        const groupsResponse = await axios.get('http://localhost:5000/api/groups', {
          headers: { Authorization: `Bearer ${user.token}` }
        });

        setContacts(contactsResponse.data);
        setGroups(groupsResponse.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load contacts and groups');
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, user.token]);

  const handleForward = async () => {
    if (selectedRecipients.length === 0) {
      setError('Please select at least one recipient');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const forwardPromises = selectedRecipients.map(async (recipient) => {
        if (recipient.type === 'contact') {
          // Forward to direct contact
          return axios.post(
            'http://localhost:5000/api/messages/forward',
            {
              messageId: message._id,
              receiverId: recipient.id,
              messageType: message.group ? 'group' : 'direct'
            },
            {
              headers: { Authorization: `Bearer ${user.token}` }
            }
          );
        } else {
          // Forward to group
          return axios.post(
            `http://localhost:5000/api/groups/${recipient.id}/messages/forward`,
            {
              messageId: message._id,
              messageType: message.group ? 'group' : 'direct'
            },
            {
              headers: { Authorization: `Bearer ${user.token}` }
            }
          );
        }
      });

      await Promise.all(forwardPromises);

      setSuccess('Message forwarded successfully');
      setLoading(false);

      // Notify parent component
      onMessageForwarded();

      // Close modal after a short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error forwarding message:', error);
      setError(error.response?.data?.message || 'Failed to forward message');
      setLoading(false);
    }
  };

  const toggleRecipient = (id, type) => {
    const existingIndex = selectedRecipients.findIndex(r => r.id === id && r.type === type);

    if (existingIndex >= 0) {
      // Remove if already selected
      setSelectedRecipients(prev => prev.filter((_, index) => index !== existingIndex));
    } else {
      // Add if not selected
      setSelectedRecipients(prev => [...prev, { id, type }]);
    }
  };

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ background: { duration: 0 } }}
        className="rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--bg-panel)', color: 'var(--text-primary)' }}
      >
        <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Forward Message</h3>

        {error && (
          <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-2 bg-green-100 border border-green-400 text-green-700 rounded">
            {success}
          </div>
        )}

        <div className="mb-4">
          <div className="p-3 rounded mb-4" style={{ backgroundColor: 'var(--bg-hover)' }}>
            <p className="text-sm font-medium mb-1">Message to forward:</p>
            <div className="pl-2 border-l-2 border-primary">
              {message?.messageType === 'voice' ? (
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
                  {message?.text}
                </p>
              )}
            </div>
          </div>

          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contacts and groups..."
            className="w-full mb-4"
          />

          <div className="max-h-60 overflow-y-auto border rounded" style={{ borderColor: 'var(--border-color)' }}>
            {loading ? (
              <div className="flex justify-center items-center h-20">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <>
                {filteredGroups.length > 0 && (
                  <div className="mb-2">
                    <div className="px-3 py-2 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      GROUPS
                    </div>
                    {filteredGroups.map((group) => (
                      <div
                        key={`group-${group._id}`}
                        className="flex items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                        onClick={() => toggleRecipient(group._id, 'group')}
                      >
                        <input
                          type="checkbox"
                          checked={selectedRecipients.some(r => r.id === group._id && r.type === 'group')}
                          onChange={() => { }}
                          className="mr-2"
                        />
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden mr-2">
                            {group.groupPhoto ? (
                              <img
                                src={group.groupPhoto}
                                alt={group.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-sm font-semibold text-primary">{group.name.charAt(0)}</span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{group.name}</p>
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                              {group.members.length} members
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {filteredContacts.length > 0 && (
                  <div>
                    <div className="px-3 py-2 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      CONTACTS
                    </div>
                    {filteredContacts.map((contact) => (
                      <div
                        key={`contact-${contact._id}`}
                        className="flex items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                        onClick={() => toggleRecipient(contact._id, 'contact')}
                      >
                        <input
                          type="checkbox"
                          checked={selectedRecipients.some(r => r.id === contact._id && r.type === 'contact')}
                          onChange={() => { }}
                          className="mr-2"
                        />
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden mr-2">
                            {contact.profilePhoto ? (
                              <img
                                src={contact.profilePhoto}
                                alt={contact.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-sm font-semibold text-gray-700">{contact.name.charAt(0)}</span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{contact.name}</p>
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{contact.email}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {filteredContacts.length === 0 && filteredGroups.length === 0 && (
                  <div className="p-4 text-center" style={{ color: 'var(--text-secondary)' }}>
                    No contacts or groups found
                  </div>
                )}
              </>
            )}
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
            onClick={handleForward}
            disabled={loading || selectedRecipients.length === 0}
          >
            {loading ? 'Forwarding...' : `Forward (${selectedRecipients.length})`}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default ForwardMessageModal;
