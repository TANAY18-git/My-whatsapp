import React, { useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Button } from './button';
import { Input } from './input';
import { API_URL } from '../../config';

const AddContactModal = ({ isOpen, onClose, user, onContactAdded }) => {
  const [username, setUsername] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSearch = async () => {
    if (!username.trim()) {
      setError('Please enter a username to search');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setSearchResults([]);

    try {
      const response = await axios.get(`${API_URL}/api/users/search?username=${username}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      
      setSearchResults(response.data);
      if (response.data.length === 0) {
        setError('No users found with that username');
      }
      setLoading(false);
    } catch (error) {
      console.error('Error searching for users:', error);
      setError(error.response?.data?.message || 'Failed to search for users');
      setLoading(false);
    }
  };

  const handleAddContact = async (contactId) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(
        `${API_URL}/api/users/contacts`,
        { contactId },
        {
          headers: { Authorization: `Bearer ${user.token}` }
        }
      );

      setSuccess('Contact added successfully!');
      setLoading(false);
      onContactAdded(response.data);
      
      // Clear search results after adding
      setSearchResults([]);
      setUsername('');
    } catch (error) {
      console.error('Error adding contact:', error);
      setError(error.response?.data?.message || 'Failed to add contact');
      setLoading(false);
    }
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
        <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Add New Contact</h3>

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
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            Search by Username
          </label>
          <div className="flex">
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              className="w-full"
            />
            <Button 
              onClick={handleSearch}
              disabled={loading}
              className="ml-2"
            >
              Search
            </Button>
          </div>
        </div>

        {searchResults.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              Search Results
            </label>
            <div className="max-h-40 overflow-y-auto border rounded p-2" style={{ borderColor: 'var(--border-color)' }}>
              {searchResults.map((result) => (
                <div
                  key={result._id}
                  className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden mr-2">
                      {result.profilePhoto ? (
                        <img
                          src={result.profilePhoto}
                          alt={result.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-gray-700">{result.name.charAt(0)}</span>
                      )}
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-primary)' }}>{result.name}</span>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>@{result.username}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleAddContact(result._id)}
                    disabled={loading}
                  >
                    Add
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default AddContactModal;
