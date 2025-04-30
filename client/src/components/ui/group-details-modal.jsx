import React, { useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Button } from './button';
import { Input } from './input';
import { FileUpload } from './file-upload';

const GroupDetailsModal = ({ isOpen, onClose, group, user, onGroupUpdated, onLeaveGroup }) => {
  const [name, setName] = useState(group?.name || '');
  const [description, setDescription] = useState(group?.description || '');
  const [groupPhoto, setGroupPhoto] = useState(group?.groupPhoto || '');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !group) return null;

  const isAdmin = group.admins.some(admin => admin._id === user._id);

  const handleUpdateGroup = async () => {
    if (!name.trim()) {
      setError('Group name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.put(
        `http://localhost:5000/api/groups/${group._id}`,
        {
          name,
          description,
          groupPhoto
        },
        {
          headers: { Authorization: `Bearer ${user.token}` }
        }
      );

      setLoading(false);
      onGroupUpdated(response.data);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating group:', error);
      setError(error.response?.data?.message || 'Failed to update group');
      setLoading(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (window.confirm('Are you sure you want to leave this group?')) {
      try {
        await axios.delete(
          `http://localhost:5000/api/groups/${group._id}/members/${user._id}`,
          {
            headers: { Authorization: `Bearer ${user.token}` }
          }
        );

        onLeaveGroup(group._id);
        onClose();
      } catch (error) {
        console.error('Error leaving group:', error);
        setError(error.response?.data?.message || 'Failed to leave group');
      }
    }
  };

  const handleMakeAdmin = async (memberId) => {
    try {
      const response = await axios.put(
        `http://localhost:5000/api/groups/${group._id}/admins/${memberId}`,
        {},
        {
          headers: { Authorization: `Bearer ${user.token}` }
        }
      );

      onGroupUpdated(response.data);
    } catch (error) {
      console.error('Error making admin:', error);
      setError(error.response?.data?.message || 'Failed to make admin');
    }
  };

  const handleRemoveAdmin = async (adminId) => {
    try {
      const response = await axios.delete(
        `http://localhost:5000/api/groups/${group._id}/admins/${adminId}`,
        {
          headers: { Authorization: `Bearer ${user.token}` }
        }
      );

      onGroupUpdated(response.data);
    } catch (error) {
      console.error('Error removing admin:', error);
      setError(error.response?.data?.message || 'Failed to remove admin');
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (window.confirm('Are you sure you want to remove this member?')) {
      try {
        const response = await axios.delete(
          `http://localhost:5000/api/groups/${group._id}/members/${memberId}`,
          {
            headers: { Authorization: `Bearer ${user.token}` }
          }
        );

        onGroupUpdated(response.data);
      } catch (error) {
        console.error('Error removing member:', error);
        setError(error.response?.data?.message || 'Failed to remove member');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ background: { duration: 0 } }}
        className="rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--bg-panel)', color: 'var(--text-primary)' }}
      >
        {isEditing ? (
          <>
            <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Edit Group</h3>

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
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setName(group.name);
                  setDescription(group.description);
                  setGroupPhoto(group.groupPhoto);
                  setIsEditing(false);
                  setError('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateGroup}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Group Details</h3>
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" style={{ color: 'var(--text-primary)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {error && (
              <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            <div className="flex items-center mb-4">
              <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden mr-4">
                {group.groupPhoto ? (
                  <img
                    src={group.groupPhoto}
                    alt={group.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-semibold text-gray-700">{group.name.charAt(0)}</span>
                )}
              </div>
              <div>
                <h4 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{group.name}</h4>
                {group.description && (
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{group.description}</p>
                )}
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {group.members.length} members • Created {new Date(group.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {isAdmin && (
              <div className="mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="w-full"
                >
                  Edit Group
                </Button>
              </div>
            )}

            <div className="mb-4">
              <h5 className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Admins ({group.admins.length})</h5>
              <div className="space-y-2">
                {group.admins.map(admin => (
                  <div key={admin._id} className="flex items-center justify-between p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden mr-2">
                        {admin.profilePhoto ? (
                          <img
                            src={admin.profilePhoto}
                            alt={admin.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-semibold text-gray-700">{admin.name.charAt(0)}</span>
                        )}
                      </div>
                      <span style={{ color: 'var(--text-primary)' }}>
                        {admin.name} {admin._id === user._id && '(You)'}
                      </span>
                    </div>
                    {isAdmin && admin._id !== user._id && group.admins.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAdmin(admin._id)}
                      >
                        Remove Admin
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <h5 className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Members ({group.members.length})</h5>
              <div className="space-y-2">
                {group.members
                  .filter(member => !group.admins.some(admin => admin._id === member._id))
                  .map(member => (
                    <div key={member._id} className="flex items-center justify-between p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden mr-2">
                          {member.profilePhoto ? (
                            <img
                              src={member.profilePhoto}
                              alt={member.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-semibold text-gray-700">{member.name.charAt(0)}</span>
                          )}
                        </div>
                        <span style={{ color: 'var(--text-primary)' }}>
                          {member.name} {member._id === user._id && '(You)'}
                        </span>
                      </div>
                      {isAdmin && member._id !== user._id && (
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMakeAdmin(member._id)}
                          >
                            Make Admin
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMember(member._id)}
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>

            <div className="pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleLeaveGroup}
                className="w-full"
              >
                Leave Group
              </Button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default GroupDetailsModal;
