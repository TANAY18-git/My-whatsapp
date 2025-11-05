import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { API_URL } from '../config';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
// FileUpload component removed
import { isStringTooLargeForLocalStorage } from '../lib/imageUtils';
import { testNotification, initNotifications } from '../lib/notificationSystem';

const ProfilePage = ({ user, setUser }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  // Profile state
  const [profilePhoto, setProfilePhoto] = useState(user?.profilePhoto || '');
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');

  // Load user profile data when component mounts or user changes
  useEffect(() => {
    if (user) {
      setProfilePhoto(user.profilePhoto || '');
      setName(user.name || '');
      setUsername(user.username || '');
      console.log('Loaded user profile data:', {
        name: user.name,
        username: user.username,
        profilePhoto: user.profilePhoto ? 'set' : 'not set'
      });
    }
  }, [user]);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Notification settings
  const [notificationSound, setNotificationSound] = useState(true);
  const [messagePreview, setMessagePreview] = useState(true);

  // Success/error messages
  const [message, setMessage] = useState({ type: '', text: '' });

  // Handle back navigation
  const handleBack = () => {
    navigate('/');
  };

  // Load saved settings on component mount
  useEffect(() => {
    try {
      // Load settings from localStorage
      const savedSettings = localStorage.getItem('whatsapp_settings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setNotificationSound(parsedSettings.notificationSound !== undefined ? parsedSettings.notificationSound : true);
        setMessagePreview(parsedSettings.messagePreview !== undefined ? parsedSettings.messagePreview : true);
      }

      console.log('Settings loaded:', {
        notificationSound: savedSettings ? JSON.parse(savedSettings).notificationSound : 'not set',
        messagePreview: savedSettings ? JSON.parse(savedSettings).messagePreview : 'not set'
      });

      // Initialize notification system
      initNotifications();
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }, []);

  // Auto-clear success/error messages after 5 seconds
  useEffect(() => {
    if (message.text && (message.type === 'success' || message.type === 'error')) {
      const timer = setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [message]);

  // Update profile information
  const updateProfile = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Send update to backend
      const response = await axios.put(`${API_URL}/api/users/profile`, {
        name: name,
        username: username,
        profilePhoto: profilePhoto
      }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });

      console.log('Profile updated on server:', response.data);

      // Get the updated user data from the response
      const updatedUser = response.data;

      // Update localStorage
      const userDataString = JSON.stringify(updatedUser);

      if (isStringTooLargeForLocalStorage(userDataString)) {
        setMessage({
          type: 'warning',
          text: 'Profile photo is quite large. It will be saved for this session only.'
        });
        setUser(updatedUser);
      } else {
        try {
          localStorage.setItem('whatsapp_user', userDataString);
          setUser(updatedUser);
          setMessage({ type: 'success', text: 'Profile updated successfully!' });

          // Log the updated user for debugging
          console.log('User updated in localStorage:', updatedUser);
        } catch (storageError) {
          console.error('localStorage error:', storageError);
          setUser(updatedUser);
          setMessage({
            type: 'warning',
            text: 'Profile updated for this session only. It may not persist after you close the app.'
          });
        }
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  // Change password
  const changePassword = async () => {
    // Validate inputs
    if (!currentPassword) {
      setMessage({ type: 'error', text: 'Please enter your current password.' });
      return;
    }

    if (!newPassword) {
      setMessage({ type: 'error', text: 'Please enter a new password.' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'New password must be at least 6 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Send password change request to backend
      const response = await axios.put(`${API_URL}/api/users/password`, {
        currentPassword,
        newPassword
      }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });

      console.log('Password change response:', response.data);

      // Update the user in localStorage with password change timestamp
      const updatedUser = { ...user, passwordLastChanged: new Date().toISOString() };
      localStorage.setItem('whatsapp_user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      // Clear password fields and show success message
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage({ type: 'success', text: 'Password changed successfully!' });
      console.log('Password changed successfully');

      setLoading(false);
    } catch (error) {
      console.error('Error changing password:', error);
      setMessage({ type: 'error', text: 'Failed to change password. Please check your current password.' });
      setLoading(false);
    }
  };

  // Save notification settings
  const saveSettings = () => {
    setLoading(true);

    try {
      // Save settings to localStorage
      const settings = {
        notificationSound,
        messagePreview
      };

      localStorage.setItem('whatsapp_settings', JSON.stringify(settings));

      console.log('Settings saved:', settings);

      // In a real app, you would also save these to your backend
      setMessage({ type: 'success', text: 'Settings saved successfully!' });

      // Simulate some delay to show loading state
      setTimeout(() => {
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' });
      setLoading(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('whatsapp_user');
    setUser(null);
    navigate('/login');
  };

  // Delete account
  const deleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      // In a real app, you would send a request to delete the account
      // For demo purposes, we'll just log out
      handleLogout();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-primary text-white p-4 flex items-center">
        <button
          onClick={handleBack}
          className="mr-4 p-2 rounded-full hover:bg-white/20"
          aria-label="Back"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="text-xl font-bold">Profile Settings</h1>
      </div>

      {/* Profile content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-4xl mx-auto w-full">
        {/* Profile header with photo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="relative mb-4">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary">
              {profilePhoto ? (
                <img
                  src={profilePhoto}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-3xl font-bold text-gray-500">{name ? name.charAt(0) : '?'}</span>
                </div>
              )}
            </div>
            {/* Photo upload option removed */}
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{name}</h2>
          <p className="text-gray-500 dark:text-gray-400">@{username}</p>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{user?.email}</p>
        </div>

        {/* Message display */}
        {message.text && (
          <div className={`mb-6 p-3 rounded-md ${
            message.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
            message.type === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
            message.type === 'info' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <ul className="flex flex-wrap -mb-px">
            <li className="mr-2">
              <button
                onClick={() => setActiveTab('general')}
                className={`inline-block p-4 rounded-t-lg ${
                  activeTab === 'general'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                General
              </button>
            </li>
            <li className="mr-2">
              <button
                onClick={() => setActiveTab('security')}
                className={`inline-block p-4 rounded-t-lg ${
                  activeTab === 'security'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Security
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`inline-block p-4 rounded-t-lg ${
                  activeTab === 'notifications'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Notifications
              </button>
            </li>
          </ul>
        </div>

        {/* Tab content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          {/* General Settings */}
          {activeTab === 'general' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Profile Information</h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name
                </label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Username
                </label>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Your username"
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">This is your unique username that others will see</p>
              </div>

              <Button
                onClick={updateProfile}
                disabled={loading}
                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white font-medium py-2 px-4 rounded-md shadow-sm transition-colors mt-4 flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </motion.div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Change Password</h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Current Password
                </label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  New Password
                </label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirm New Password
                </label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full"
                />
              </div>

              <Button
                onClick={changePassword}
                disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md shadow-sm transition-colors mt-4 flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                {loading ? 'Changing...' : 'Change Password'}
              </Button>

              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-gray-800 dark:text-white mb-2">Account Management</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Manage your account settings
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="outline"
                    onClick={handleLogout}
                    className="w-full sm:w-auto border-gray-300 hover:bg-gray-100 text-gray-700 font-medium py-2 px-4 rounded-md shadow-sm transition-colors flex items-center justify-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Logout
                  </Button>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-red-600 dark:text-red-400 mb-2">Danger Zone</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  This action is permanent and cannot be undone
                </p>
                <Button
                  variant="destructive"
                  onClick={deleteAccount}
                  className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md shadow-sm transition-colors flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Delete Account
                </Button>
              </div>
            </motion.div>
          )}

          {/* Notification Settings */}
          {activeTab === 'notifications' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Notification Settings</h3>

              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-800 dark:text-white">Notification Sounds</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Notification sounds are always enabled</p>
                  </div>
                  <div className="text-green-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-800 dark:text-white">Message Previews</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Message previews are always enabled</p>
                  </div>
                  <div className="text-green-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                  </div>
                </div>

                {/* Dark Mode toggle removed - theme is permanently set to dark */}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                {/* Save Settings button removed - settings are always enabled */}

                <Button
                  variant="outline"
                  onClick={() => {
                    try {
                      // Directly test the notification without any setup
                      const result = testNotification();
                      console.log('Notification test result:', result);

                      setMessage({
                        type: 'success',
                        text: 'Notification test sent! You should hear a sound and see a notification.'
                      });
                    } catch (error) {
                      console.error('Error testing notification:', error);
                      setMessage({
                        type: 'error',
                        text: 'Error testing notification. Please try again.'
                      });
                    }
                  }}
                  className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md shadow-sm transition-colors flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                  </svg>
                  Test Notification
                </Button>
              </div>
            </motion.div>
          )}

          {/* Advanced Settings section removed */}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
