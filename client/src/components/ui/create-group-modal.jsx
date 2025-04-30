import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Button } from './button';
import { Input } from './input';
import { FileUpload } from './file-upload';
import { API_URL } from '../../config';

const CreateGroupModal = ({ isOpen, onClose, user, onGroupCreated }) => {
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupPhoto, setGroupPhoto] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch contacts
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/users`, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        setContacts(response.data);
      } catch (error) {
        console.error('Error fetching contacts:', error);
        setError('Failed to load contacts');
      }
    };

    if (isOpen) {
      fetchContacts();
    }
  }, [isOpen, user.token]);

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setError('Group name is required');
      return;
    }

    if (selectedMembers.length === 0) {
      setError('Please select at least one member');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(
        `${API_URL}/api/groups`,
        {
          name: groupName,
          description: groupDescription,
          members: selectedMembers,
          groupPhoto
        },
        {
          headers: { Authorization: `Bearer ${user.token}` }
        }
      );

      setLoading(false);
      onGroupCreated(response.data);
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error creating group:', error);
      setError(error.response?.data?.message || 'Failed to create group');
      setLoading(false);
    }
  };

  const toggleMember = (userId) => {
    if (selectedMembers.includes(userId)) {
      setSelectedMembers(selectedMembers.filter(id => id !== userId));
    } else {
      setSelectedMembers([...selectedMembers, userId]);
    }
  };

  const resetForm = () => {
    setGroupName('');
    setGroupDescription('');
    setGroupPhoto('');
    setSelectedMembers([]);
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ background: { duration: 0 } }}
        className="rounded-lg shadow-xl p-6 w-full max-w-md"
        style={{ backgroundColor: 'var(--bg-panel)', color: 'var(--text-primary)' }}
      >
        <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Create New Group</h3>

        {error && (
          <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            Group Name*
          </label>
          <Input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Enter group name"
            className="w-full"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            Description
          </label>
          <Input
            type="text"
            value={groupDescription}
            onChange={(e) => setGroupDescription(e.target.value)}
            placeholder="Enter group description"
            className="w-full"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            Group Photo
          </label>
          <FileUpload
            onFileSelect={setGroupPhoto}
            buttonText="Choose Group Photo"
            variant="outline"
            size="sm"
          />
          {groupPhoto && (
            <div className="mt-2 flex justify-center">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary">
                <img
                  src={groupPhoto}
                  alt="Group"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            Select Members*
          </label>
          <div className="max-h-40 overflow-y-auto border rounded p-2" style={{ borderColor: 'var(--border-color)' }}>
            {contacts.length === 0 ? (
              <p className="text-sm text-center py-2" style={{ color: 'var(--text-secondary)' }}>
                No contacts found
              </p>
            ) : (
              contacts.map((contact) => (
                <div
                  key={contact._id}
                  className="flex items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
                  onClick={() => toggleMember(contact._id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(contact._id)}
                    onChange={() => {}}
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
                    <span style={{ color: 'var(--text-primary)' }}>{contact.name}</span>
                  </div>
                </div>
              ))
            )}
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Selected: {selectedMembers.length} members
          </p>
        </div>

        <div className="flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={() => {
              resetForm();
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateGroup}
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Group'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default CreateGroupModal;
