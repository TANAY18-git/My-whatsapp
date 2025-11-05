import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Button } from './button';
import { API_URL } from '../../config';

const ContactRequestsModal = ({ isOpen, onClose, user, onRequestAccepted }) => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionInProgress, setActionInProgress] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchPendingRequests();
    }
  }, [isOpen, user]);

  const fetchPendingRequests = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await axios.get(`${API_URL}/api/users/requests`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      
      setPendingRequests(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      setError(error.response?.data?.message || 'Failed to fetch pending requests');
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (contactId) => {
    setActionInProgress(contactId);
    setError('');

    try {
      const response = await axios.post(
        `${API_URL}/api/users/requests/accept`,
        { contactId },
        {
          headers: { Authorization: `Bearer ${user.token}` }
        }
      );

      // Remove from pending requests
      setPendingRequests(prev => prev.filter(request => request._id !== contactId));
      
      // Notify parent component
      if (onRequestAccepted) {
        onRequestAccepted(response.data.contact);
      }
      
      setActionInProgress(null);
    } catch (error) {
      console.error('Error accepting request:', error);
      setError(error.response?.data?.message || 'Failed to accept request');
      setActionInProgress(null);
    }
  };

  const handleRejectRequest = async (contactId) => {
    setActionInProgress(contactId);
    setError('');

    try {
      await axios.post(
        `${API_URL}/api/users/requests/reject`,
        { contactId },
        {
          headers: { Authorization: `Bearer ${user.token}` }
        }
      );

      // Remove from pending requests
      setPendingRequests(prev => prev.filter(request => request._id !== contactId));
      setActionInProgress(null);
    } catch (error) {
      console.error('Error rejecting request:', error);
      setError(error.response?.data?.message || 'Failed to reject request');
      setActionInProgress(null);
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
        <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Contact Requests</h3>

        {error && (
          <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full"
            />
          </div>
        ) : pendingRequests.length === 0 ? (
          <div className="text-center py-8">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            <p className="text-gray-500">No pending contact requests</p>
          </div>
        ) : (
          <div className="mb-4 max-h-60 overflow-y-auto">
            {pendingRequests.map((request) => (
              <div
                key={request._id}
                className="flex items-center justify-between p-3 border-b"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden mr-3">
                    {request.profilePhoto ? (
                      <img
                        src={request.profilePhoto}
                        alt={request.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-gray-700">{request.name.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-primary)' }} className="font-medium">{request.name}</div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>@{request.username}</div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRejectRequest(request._id)}
                    disabled={actionInProgress === request._id}
                    className="text-xs px-2 py-1"
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleAcceptRequest(request._id)}
                    disabled={actionInProgress === request._id}
                    className="text-xs px-2 py-1"
                  >
                    Accept
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end mt-4">
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

export default ContactRequestsModal;
