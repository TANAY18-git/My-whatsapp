import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import axios from 'axios';
import { API_URL, SOCKET_URL } from '../config';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { FileUpload } from '../components/ui/file-upload';
import { ThemeToggle } from '../components/ui/theme-toggle';
import MessageMenu from '../components/ui/message-menu';
import ConfirmDialog from '../components/ui/confirm-dialog';
import SearchBar from '../components/ui/search-bar';
import VoiceRecorder from '../components/ui/voice-recorder';
import ReactionPicker from '../components/ui/reaction-picker';
import CreateGroupModal from '../components/ui/create-group-modal';
import GroupDetailsModal from '../components/ui/group-details-modal';
import ForwardMessageModal from '../components/ui/forward-message-modal';
import ReplyMessageModal from '../components/ui/reply-message-modal';
import AddContactModal from '../components/ui/add-contact-modal';
import ContactRequestsModal from '../components/ui/contact-requests-modal';
import { isStringTooLargeForLocalStorage } from '../lib/imageUtils';

const Chat = ({ user, setUser }) => {
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [mobileView, setMobileView] = useState(window.innerWidth < 768);
  const [showContacts, setShowContacts] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [newProfilePhoto, setNewProfilePhoto] = useState('');
  const [readMessages, setReadMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [isTyping, setIsTyping] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
  const [reactionPickerPosition, setReactionPickerPosition] = useState({ x: 0, y: 0 });
  const [messageForReaction, setMessageForReaction] = useState(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);

  // Group chat state
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupMessages, setGroupMessages] = useState([]);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showGroupDetailsModal, setShowGroupDetailsModal] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showContactRequestsModal, setShowContactRequestsModal] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  const searchResultRefs = useRef({});
  const navigate = useNavigate();

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Handle socket events
  useEffect(() => {
    if (!socket || !user) return;

    socket.emit('addUser', user._id);

    socket.on('getUsers', (users) => {
      setOnlineUsers(users);
    });

    socket.on('getMessage', (data) => {
      if (selectedContact?._id === data.senderId) {
        const newMessage = {
          sender: data.senderId,
          text: data.text,
          createdAt: data.createdAt || Date.now(),
          _id: data.messageId
        };
        setMessages((prev) => [...prev, newMessage]);

        // Mark message as read if chat is open
        socket.emit('markMessagesAsRead', {
          senderId: data.senderId,
          receiverId: user._id
        });
      }
    });

    socket.on('messagesRead', (data) => {
      if (data.readBy === selectedContact?._id) {
        setReadMessages((prev) => [...prev, ...messages.filter(m => m.sender === user._id).map(m => m._id)]);
      }
    });

    // Listen for typing indicators
    socket.on('userTyping', (data) => {
      setTypingUsers(prev => ({
        ...prev,
        [data.senderId]: true
      }));
    });

    // Listen for stop typing
    socket.on('userStopTyping', (data) => {
      setTypingUsers(prev => ({
        ...prev,
        [data.senderId]: false
      }));
    });

    // Listen for message deletion
    socket.on('messageDeleted', (data) => {
      if (data.deleteFor === 'everyone') {
        // Mark message as deleted for everyone
        setMessages(prev => prev.map(msg =>
          msg._id === data.messageId
            ? { ...msg, isDeleted: true }
            : msg
        ));
      }
    });

    // Listen for message reactions
    socket.on('messageReaction', (data) => {
      setMessages(prev => prev.map(msg =>
        msg._id === data.messageId
          ? { ...msg, reactions: data.reactions }
          : msg
      ));
    });

    // Listen for group messages
    socket.on('getGroupMessage', (data) => {
      if (selectedGroup && selectedGroup._id === data.groupId) {
        setGroupMessages(prev => [...prev, data.message]);

        // Mark message as read
        socket.emit('markGroupMessageRead', {
          groupId: data.groupId,
          messageId: data.message._id
        });
      }
    });

    // Listen for group message reactions
    socket.on('groupMessageReaction', (data) => {
      if (selectedGroup && selectedGroup._id === data.groupId) {
        setGroupMessages(prev => prev.map(msg =>
          msg._id === data.messageId
            ? { ...msg, reactions: data.reactions }
            : msg
        ));
      }
    });

    // Listen for group message deletions
    socket.on('groupMessageDeleted', (data) => {
      if (selectedGroup && selectedGroup._id === data.groupId) {
        if (data.deleteFor === 'everyone') {
          // Mark message as deleted for everyone
          setGroupMessages(prev => prev.map(msg =>
            msg._id === data.messageId
              ? { ...msg, isDeleted: true }
              : msg
          ));
        }
      }
    });

    return () => {
      socket.off('getUsers');
      socket.off('getMessage');
      socket.off('getGroupMessage');
      socket.off('messagesRead');
      socket.off('userTyping');
      socket.off('userStopTyping');
      socket.off('messageDeleted');
      socket.off('messageReaction');
      socket.off('groupMessageReaction');
      socket.off('groupMessageDeleted');
      socket.off('markGroupMessageRead');
    };
  }, [socket, user, selectedContact, messages]);

  // Fetch pending requests count
  const fetchPendingRequestsCount = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/users/requests`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setPendingRequestsCount(response.data.length);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    }
  };

  // Fetch contacts and groups
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch only added contacts
        const contactsResponse = await axios.get(`${API_URL}/api/users/contacts`, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        setContacts(contactsResponse.data);

        // Fetch groups
        const groupsResponse = await axios.get(`${API_URL}/api/groups`, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        setGroups(groupsResponse.data);

        // Fetch pending requests count
        await fetchPendingRequestsCount();

        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  // Fetch messages when a contact is selected
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedContact || !socket) return;

      try {
        const response = await axios.get(`${API_URL}/api/messages/${selectedContact._id}`, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        setMessages(response.data);

        // Mark messages as read when conversation is opened
        await axios.put(`${API_URL}/api/messages/read/${selectedContact._id}`, {}, {
          headers: { Authorization: `Bearer ${user.token}` }
        });

        // Notify sender that messages have been read
        socket.emit('markMessagesAsRead', {
          senderId: selectedContact._id,
          receiverId: user._id
        });

        // Update read messages state
        setReadMessages(prev => [
          ...prev,
          ...response.data
            .filter(msg => msg.sender === selectedContact._id)
            .map(msg => msg._id)
        ]);
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();
    if (mobileView) {
      setShowContacts(false);
    }
  }, [selectedContact, user, socket]);

  // Fetch group messages when a group is selected
  useEffect(() => {
    const fetchGroupMessages = async () => {
      if (!selectedGroup || !socket) return;

      // Clear selected contact when a group is selected
      if (selectedContact) {
        setSelectedContact(null);
      }

      try {
        const response = await axios.get(`${API_URL}/api/groups/${selectedGroup._id}/messages`, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        setGroupMessages(response.data);

        // Mark messages as read
        await axios.put(`${API_URL}/api/groups/${selectedGroup._id}/messages/read`, {}, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
      } catch (error) {
        console.error('Error fetching group messages:', error);
      }
    };

    fetchGroupMessages();
  }, [selectedGroup, user, socket]);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, groupMessages]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      setMobileView(isMobile);
      if (!isMobile) {
        setShowContacts(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !showVoiceRecorder) || !selectedContact) return;

    if (showVoiceRecorder) {
      // If voice recorder is open, don't send text message
      return;
    }

    const messageData = {
      sender: user._id,
      receiver: selectedContact._id,
      text: newMessage,
      messageType: 'text'
    };

    try {
      const response = await axios.post(`${API_URL}/api/messages`, messageData, {
        headers: { Authorization: `Bearer ${user.token}` }
      });

      // Send message via socket with message ID
      socket.emit('sendMessage', {
        senderId: user._id,
        receiverId: selectedContact._id,
        text: newMessage,
        messageType: 'text',
        messageId: response.data._id
      });

      setMessages([...messages, response.data]);
      setNewMessage('');

      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

      // Stop typing indicator when message is sent
      if (isTyping) {
        setIsTyping(false);
        socket.emit('stopTyping', {
          senderId: user._id,
          receiverId: selectedContact._id
        });

        // Clear any existing timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  // Handle voice recording complete
  const handleVoiceRecordingComplete = async (audioBlob) => {
    if (!selectedContact) return;

    try {
      // Create form data for file upload
      const formData = new FormData();
      formData.append('voice', audioBlob, 'voice-message.webm');

      // Upload the voice file
      const uploadResponse = await axios.post(`${API_URL}/api/upload/voice`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${user.token}`
        }
      });

      const { voiceUrl } = uploadResponse.data;

      // Calculate duration (approximate for now)
      const duration = Math.round(audioBlob.size / 16000); // Rough estimate: size/16kbps

      // Send to server
      const response = await axios.post(`${API_URL}/api/messages`, {
        receiver: selectedContact._id,
        voiceUrl,
        duration,
        messageType: 'voice',
      }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });

      // Add message to UI
      setMessages(prev => [...prev, response.data]);

      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

      // Emit socket event
      socket.emit('sendMessage', {
        ...response.data,
        receiverId: selectedContact._id
      });

      // Hide voice recorder
      setShowVoiceRecorder(false);
    } catch (error) {
      console.error('Error sending voice message:', error);
      alert('Failed to send voice message. Please try again.');
      setShowVoiceRecorder(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('whatsapp_user');
    setUser(null);
    navigate('/login');
  };

  const isOnline = (userId) => {
    return onlineUsers.some((user) => user.userId === userId);
  };

  const updateProfilePhoto = () => {
    if (!newProfilePhoto) return;

    try {
      // Update user object with new profile photo
      const updatedUser = { ...user, profilePhoto: newProfilePhoto };
      const userDataString = JSON.stringify(updatedUser);

      // Check if the data is too large for localStorage
      if (isStringTooLargeForLocalStorage(userDataString)) {
        console.warn('Profile photo is too large for localStorage');
        alert('Your profile photo is quite large. It will be saved for this session only and may not persist after you close the app.');

        // Update state only (session storage)
        setUser(updatedUser);
      } else {
        // Try to update localStorage
        try {
          localStorage.setItem('whatsapp_user', userDataString);
          // Update state
          setUser(updatedUser);
        } catch (storageError) {
          console.error('localStorage error:', storageError);
          // If localStorage fails, we can still update the state
          // This will keep the profile photo for the current session
          alert('Your profile photo was saved for this session only. It may not persist after you close the app.');
          setUser(updatedUser);
        }
      }

      // Close modal
      setShowProfileModal(false);
      setNewProfilePhoto('');
    } catch (error) {
      console.error('Error updating profile photo:', error);
      alert('Failed to update profile photo. Please try again with a smaller image.');
    }
  };

  // Handle right-click on message to open menu
  const handleMessageContextMenu = (e, message) => {
    e.preventDefault();
    setSelectedMessage(message);
    setMenuPosition({ x: e.clientX, y: e.clientY });
    setMenuOpen(true);
  };

  // Close message menu
  const handleCloseMenu = () => {
    setMenuOpen(false);
  };

  // Handle delete for me
  const handleDeleteForMe = () => {
    setDeleteType('me');
    setConfirmDialogOpen(true);
    setMenuOpen(false);
  };

  // Handle delete for everyone
  const handleDeleteForEveryone = () => {
    setDeleteType('everyone');
    setConfirmDialogOpen(true);
    setMenuOpen(false);
  };

  // Handle forward message
  const handleForward = () => {
    setMenuOpen(false);
    setShowForwardModal(true);
  };

  // Handle message forwarded
  const handleMessageForwarded = () => {
    // You could add some notification or feedback here
    console.log('Message forwarded successfully');
  };

  // Handle reply to message
  const handleReply = () => {
    setMenuOpen(false);
    setShowReplyModal(true);
  };

  // Handle send reply for direct messages
  const handleSendReply = async (replyText) => {
    if (!selectedMessage || !selectedContact) return;

    try {
      const messageData = {
        receiver: selectedContact._id,
        text: replyText,
        messageType: 'text',
        isReply: true,
        replyTo: selectedMessage._id
      };

      const response = await axios.post(`${API_URL}/api/messages`, messageData, {
        headers: { Authorization: `Bearer ${user.token}` }
      });

      // Send message via socket
      socket.emit('sendMessage', {
        senderId: user._id,
        receiverId: selectedContact._id,
        text: replyText,
        messageType: 'text',
        messageId: response.data._id,
        isReply: true,
        replyTo: selectedMessage._id
      });

      setMessages([...messages, response.data]);

      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

      return response.data;
    } catch (error) {
      console.error('Error sending reply:', error);
      throw error;
    }
  };

  // Handle send reply for group messages
  const handleSendGroupReply = async (replyText) => {
    if (!selectedMessage || !selectedGroup) return;

    try {
      const messageData = {
        text: replyText,
        messageType: 'text',
        isReply: true,
        replyTo: selectedMessage._id
      };

      const response = await axios.post(`${API_URL}/api/groups/${selectedGroup._id}/messages`, messageData, {
        headers: { Authorization: `Bearer ${user.token}` }
      });

      // Send message via socket
      socket.emit('sendGroupMessage', {
        groupId: selectedGroup._id,
        message: response.data
      });

      setGroupMessages([...groupMessages, response.data]);

      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

      return response.data;
    } catch (error) {
      console.error('Error sending group reply:', error);
      throw error;
    }
  };

  // Search messages
  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    // Filter messages that contain the search query
    const results = messages.filter(message =>
      !message.isDeleted && message.text.toLowerCase().includes(query.toLowerCase())
    );

    setSearchResults(results);
    setCurrentSearchIndex(0);

    // Scroll to first result if there are any
    if (results.length > 0) {
      setTimeout(() => {
        const firstResultRef = searchResultRefs.current[results[0]._id];
        if (firstResultRef) {
          firstResultRef.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  };

  // Navigate to next search result
  const handleNextSearchResult = () => {
    if (searchResults.length === 0) return;

    const nextIndex = (currentSearchIndex + 1) % searchResults.length;
    setCurrentSearchIndex(nextIndex);

    const nextResultRef = searchResultRefs.current[searchResults[nextIndex]._id];
    if (nextResultRef) {
      nextResultRef.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Navigate to previous search result
  const handlePrevSearchResult = () => {
    if (searchResults.length === 0) return;

    const prevIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
    setCurrentSearchIndex(prevIndex);

    const prevResultRef = searchResultRefs.current[searchResults[prevIndex]._id];
    if (prevResultRef) {
      prevResultRef.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setCurrentSearchIndex(0);
  };

  // Toggle search bar
  const toggleSearch = () => {
    setShowSearch(!showSearch);
    if (showSearch) {
      handleClearSearch();
    }
  };

  // Highlight search matches in text
  const highlightSearchText = (text) => {
    if (!searchQuery.trim() || !text) return text;

    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));

    return parts.map((part, index) =>
      part.toLowerCase() === searchQuery.toLowerCase()
        ? <span key={index} className="bg-yellow-300 text-black px-0.5 rounded">{part}</span>
        : part
    );
  };

  // Open reaction picker for a message
  const handleOpenReactionPicker = (e, message) => {
    e.preventDefault();
    e.stopPropagation();

    // Position the picker near the message
    const rect = e.currentTarget.getBoundingClientRect();
    setReactionPickerPosition({
      x: rect.left + rect.width / 2,
      y: rect.bottom + 10
    });

    setMessageForReaction(message);
    setReactionPickerOpen(true);
  };

  // Close reaction picker
  const handleCloseReactionPicker = () => {
    setReactionPickerOpen(false);
    setMessageForReaction(null);
  };

  // Add or remove a reaction
  const handleAddReaction = async (emoji) => {
    if (!messageForReaction) return;

    try {
      if (selectedContact) {
        // Direct message reaction
        const response = await axios.post(
          `${API_URL}/api/messages/${messageForReaction._id}/reactions`,
          { emoji },
          { headers: { Authorization: `Bearer ${user.token}` } }
        );

        // Update message in state
        setMessages(prev => prev.map(msg =>
          msg._id === messageForReaction._id ? response.data : msg
        ));

        // Notify other user via socket
        socket.emit('messageReaction', {
          messageId: messageForReaction._id,
          receiverId: selectedContact._id,
          reactions: response.data.reactions
        });
      } else if (selectedGroup) {
        // Group message reaction
        const response = await axios.post(
          `${API_URL}/api/groups/${selectedGroup._id}/messages/${messageForReaction._id}/reactions`,
          { emoji },
          { headers: { Authorization: `Bearer ${user.token}` } }
        );

        // Update message in state
        setGroupMessages(prev => prev.map(msg =>
          msg._id === messageForReaction._id ? response.data : msg
        ));

        // Notify other users via socket
        socket.emit('groupMessageReaction', {
          groupId: selectedGroup._id,
          messageId: messageForReaction._id,
          reactions: response.data.reactions
        });
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
      alert('Failed to add reaction. Please try again.');
    }
  };

  // Send group message
  const handleSendGroupMessage = async (e) => {
    e.preventDefault();

    if ((!newMessage.trim() && !showVoiceRecorder) || !selectedGroup) return;

    if (showVoiceRecorder) {
      // If voice recorder is open, don't send text message
      return;
    }

    try {
      // Send to server
      const response = await axios.post(`${API_URL}/api/groups/${selectedGroup._id}/messages`, {
        text: newMessage,
        messageType: 'text',
      }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });

      // Add message to UI
      setGroupMessages(prev => [...prev, response.data]);
      setNewMessage('');

      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

      // Emit socket event to notify group members
      socket.emit('sendGroupMessage', {
        groupId: selectedGroup._id,
        message: response.data
      });
    } catch (error) {
      console.error('Error sending group message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  // Handle voice recording for group
  const handleGroupVoiceRecordingComplete = async (audioBlob) => {
    if (!selectedGroup) return;

    try {
      // Create form data for file upload
      const formData = new FormData();
      formData.append('voice', audioBlob, 'voice-message.webm');

      // Upload the voice file
      const uploadResponse = await axios.post(`${API_URL}/api/upload/voice`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${user.token}`
        }
      });

      const { voiceUrl } = uploadResponse.data;

      // Calculate duration (approximate for now)
      const duration = Math.round(audioBlob.size / 16000); // Rough estimate: size/16kbps

      // Send to server
      const response = await axios.post(`${API_URL}/api/groups/${selectedGroup._id}/messages`, {
        voiceUrl,
        duration,
        messageType: 'voice',
      }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });

      // Add message to UI
      setGroupMessages(prev => [...prev, response.data]);

      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

      // Emit socket event
      socket.emit('sendGroupMessage', {
        groupId: selectedGroup._id,
        message: response.data
      });

      // Hide voice recorder
      setShowVoiceRecorder(false);
    } catch (error) {
      console.error('Error sending voice message:', error);
      alert('Failed to send voice message. Please try again.');
      setShowVoiceRecorder(false);
    }
  };

  // Handle group message context menu
  const handleGroupMessageContextMenu = (e, message) => {
    e.preventDefault();
    setSelectedMessage(message);
    setMenuPosition({ x: e.clientX, y: e.clientY });
    setMenuOpen(true);
  };

  // Handle delete group message
  const handleDeleteGroupMessage = async () => {
    if (!selectedMessage || !selectedGroup) return;

    try {
      const deleteFor = deleteType === 'everyone' ? 'everyone' : 'me';

      // Call API to delete message
      await axios.delete(`${API_URL}/api/groups/${selectedGroup._id}/messages/${selectedMessage._id}?deleteFor=${deleteFor}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });

      if (deleteFor === 'everyone') {
        // Update local state
        setGroupMessages(prev => prev.map(msg =>
          msg._id === selectedMessage._id
            ? { ...msg, isDeleted: true }
            : msg
        ));

        // Notify other users via socket
        socket.emit('deleteGroupMessage', {
          groupId: selectedGroup._id,
          messageId: selectedMessage._id,
          deleteFor: 'everyone'
        });
      } else {
        // Remove message from local state for current user only
        setGroupMessages(prev => prev.filter(msg => msg._id !== selectedMessage._id));
      }

      setConfirmDialogOpen(false);
      setSelectedMessage(null);
    } catch (error) {
      console.error('Error deleting group message:', error);

      // Get the error message from the response if available
      const errorMessage = error.response?.data?.message || 'Failed to delete message. Please try again.';

      // Show error message to user
      alert(errorMessage);

      // Close the dialog
      setConfirmDialogOpen(false);
    }
  };

  // Confirm message deletion
  const handleConfirmDelete = async () => {
    if (!selectedMessage) return;

    // Determine if we're in a direct chat or group chat
    if (selectedContact) {
      // Direct message deletion
      try {
        const deleteFor = deleteType === 'everyone' ? 'everyone' : 'me';

        // Call API to delete message
        await axios.delete(`${API_URL}/api/messages/${selectedMessage._id}?deleteFor=${deleteFor}`, {
          headers: { Authorization: `Bearer ${user.token}` }
        });

        if (deleteFor === 'everyone') {
          // Update local state
          setMessages(prev => prev.map(msg =>
            msg._id === selectedMessage._id
              ? { ...msg, isDeleted: true }
              : msg
          ));

          // Notify other user via socket
          socket.emit('deleteMessage', {
            messageId: selectedMessage._id,
            receiverId: selectedContact._id,
            deleteFor: 'everyone'
          });
        } else {
          // Remove message from local state for current user only
          setMessages(prev => prev.filter(msg => msg._id !== selectedMessage._id));
        }

        setConfirmDialogOpen(false);
        setSelectedMessage(null);
      } catch (error) {
        console.error('Error deleting message:', error);

        // Get the error message from the response if available
        const errorMessage = error.response?.data?.message || 'Failed to delete message. Please try again.';

        // Show error message to user
        alert(errorMessage);

        // Close the dialog
        setConfirmDialogOpen(false);
      }
    } else if (selectedGroup) {
      // Group message deletion
      handleDeleteGroupMessage();
    }
  };

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--bg-main)' }}>
      {/* Sidebar - Contacts */}
      <AnimatePresence>
        {(showContacts || !mobileView) && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`w-full md:w-1/3 lg:w-1/4 border-r flex flex-col ${mobileView ? 'absolute z-10 h-full' : ''}`}
            style={{
              backgroundColor: 'var(--bg-panel)',
              borderColor: 'var(--border-color)',
              boxShadow: mobileView ? '0 4px 12px rgba(0, 0, 0, 0.15)' : 'none'
            }}
          >
            <div className="mobile-header p-4 border-b border-gray-200 bg-primary text-white flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div
                  className="mobile-avatar w-10 h-10 rounded-full bg-white/20 flex items-center justify-center overflow-hidden cursor-pointer"
                  onClick={() => setShowProfileModal(true)}
                  title="Update profile photo"
                >
                  {user?.profilePhoto ? (
                    <img
                      src={user.profilePhoto}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-semibold">{user?.name?.charAt(0)}</span>
                  )}
                </div>
                <div>
                  <h2 className="font-semibold text-sm md:text-base">{user?.name}</h2>
                  <p className="text-xs text-white/70 hidden sm:block">Online</p>
                </div>
              </div>
              <div className="flex space-x-1 md:space-x-2">
                {mobileView && (
                  <button
                    onClick={() => setShowContacts(false)}
                    className="mobile-btn p-2 rounded-full hover:bg-white/20"
                    aria-label="Close sidebar"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                )}
                <ThemeToggle />
                <button
                  onClick={handleLogout}
                  className="mobile-btn p-2 rounded-full hover:bg-white/20"
                  aria-label="Logout"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-3 sm:p-4">
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <h2 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Chats</h2>
                <div className="flex space-x-1 sm:space-x-2">
                  <button
                    onClick={() => setShowAddContactModal(true)}
                    className="mobile-btn p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Add Contact"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" style={{ color: 'var(--text-primary)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="8.5" cy="7" r="4" />
                      <line x1="20" y1="8" x2="20" y2="14" />
                      <line x1="23" y1="11" x2="17" y2="11" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setShowContactRequestsModal(true)}
                    className="mobile-btn p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 relative"
                    title="Contact Requests"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" style={{ color: 'var(--text-primary)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="8.5" cy="7" r="4" />
                      <path d="M20 8v6" />
                      <path d="M23 11h-6" />
                    </svg>
                    {pendingRequestsCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                        {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setShowCreateGroupModal(true)}
                    className="mobile-btn p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Create Group"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" style={{ color: 'var(--text-primary)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="16" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                  </button>
                  <ThemeToggle />
                </div>
              </div>
              <div className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <Input
                  type="text"
                  placeholder="Search contacts and groups..."
                  className="w-full pl-10 mobile-input"
                  value={contactSearchQuery}
                  onChange={(e) => setContactSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="flex justify-center items-center h-full">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full"
                  />
                </div>
              ) : contacts.length === 0 && groups.length === 0 ? (
                <div className="text-center p-6 text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-lg font-medium">No contacts or groups found</p>
                  <p className="mt-1">Click the "Add Contact" button to get started</p>
                </div>
              ) : (
                <>
                  {/* Groups */}
                  {groups.length > 0 && (
                    <div className="mb-2">
                      <div className="px-4 py-2 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                        GROUPS
                      </div>
                      {groups
                        .filter(group =>
                          !contactSearchQuery ||
                          (group?.name && group.name.toLowerCase().includes(contactSearchQuery.toLowerCase()))
                        )
                        .map((group) => (
                          <motion.div
                            key={group._id}
                            whileHover={{ backgroundColor: 'var(--bg-hover)' }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              setSelectedGroup(group);
                              setSelectedContact(null);
                              if (mobileView) setShowContacts(false);
                            }}
                            className={`mobile-contact-item p-3 sm:p-4 border-b cursor-pointer flex items-center space-x-3`}
                            style={{
                              borderColor: 'var(--border-color)',
                              backgroundColor: selectedGroup?._id === group._id ? 'var(--bg-hover)' : 'transparent'
                            }}
                          >
                            <div className="relative">
                              <div className="mobile-avatar w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                                {group.groupPhoto ? (
                                  <img
                                    src={group.groupPhoto}
                                    alt={group.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-lg font-semibold text-primary">{group?.name ? group.name.charAt(0) : '?'}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{group.name}</h3>
                              <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
                                {group.members.length} members
                              </p>
                            </div>
                          </motion.div>
                        ))}
                    </div>
                  )}

                  {/* Contacts */}
                  {contacts.length > 0 && (
                    <div>
                      <div className="px-4 py-2 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                        CONTACTS
                      </div>
                      {contacts
                        .filter(contact =>
                          !contactSearchQuery ||
                          (contact?.name && contact.name.toLowerCase().includes(contactSearchQuery.toLowerCase())) ||
                          (contact?.username && contact.username.toLowerCase().includes(contactSearchQuery.toLowerCase())) ||
                          (contact?.email && contact.email.toLowerCase().includes(contactSearchQuery.toLowerCase()))
                        )
                        .map((contact) => (
                          <motion.div
                            key={contact._id}
                            whileHover={{ backgroundColor: 'var(--bg-hover)' }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              setSelectedContact(contact);
                              setSelectedGroup(null);
                              if (mobileView) setShowContacts(false);
                            }}
                            className={`mobile-contact-item p-3 sm:p-4 border-b cursor-pointer flex items-center space-x-3`}
                            style={{
                              borderColor: 'var(--border-color)',
                              backgroundColor: selectedContact?._id === contact._id ? 'var(--bg-hover)' : 'transparent'
                            }}
                          >
                            <div className="relative">
                              <div className="mobile-avatar w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                                {contact.profilePhoto ? (
                                  <img
                                    src={contact.profilePhoto}
                                    alt={contact.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-lg font-semibold text-gray-700">{contact?.name ? contact.name.charAt(0) : '?'}</span>
                                )}
                              </div>
                              {isOnline(contact._id) && (
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center">
                                <h3 className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{contact.name}</h3>
                                <span className="text-xs text-gray-500 ml-1 whitespace-nowrap">
                                  {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
                                  {contact.username ? `@${contact.username}` : contact.email}
                                </p>
                                {isOnline(contact._id) && (
                                  <span className="text-xs text-green-500 ml-1 whitespace-nowrap">online</span>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedContact ? (
          <>
            <div className="mobile-header p-3 sm:p-4 border-b flex items-center justify-between" style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-color)' }}>
              <div className="flex items-center space-x-2 sm:space-x-3">
                {mobileView && (
                  <button
                    onClick={() => setShowContacts(true)}
                    className="mobile-btn p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                    aria-label="Back to contacts"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                )}
                <div className="relative">
                  <div className="mobile-avatar w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                    {selectedContact.profilePhoto ? (
                      <img
                        src={selectedContact.profilePhoto}
                        alt={selectedContact.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-semibold text-gray-700">{selectedContact?.name ? selectedContact.name.charAt(0) : '?'}</span>
                    )}
                  </div>
                  {isOnline(selectedContact._id) && (
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-medium truncate text-sm sm:text-base" style={{ color: 'var(--text-primary)' }}>{selectedContact.name}</h3>
                  <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                    {typingUsers[selectedContact._id] ? (
                      <span className="flex items-center">
                        <span className="mr-1">typing</span>
                        <span className="typing-animation">
                          <span className="dot"></span>
                          <span className="dot"></span>
                          <span className="dot"></span>
                        </span>
                      </span>
                    ) : (
                      isOnline(selectedContact._id) ? 'Online' : 'Offline'
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-1 sm:space-x-2">
                <button
                  onClick={toggleSearch}
                  className="mobile-btn p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Search messages"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Search Bar */}
            {showSearch && (
              <div className="p-2 border-b" style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-color)' }}>
                <div className="flex items-center space-x-2">
                  <div className="flex-1">
                    <SearchBar
                      value={searchQuery}
                      onChange={handleSearch}
                      onClose={handleClearSearch}
                      placeholder="Search in conversation..."
                    />
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {searchResults.length > 0 ? `${currentSearchIndex + 1}/${searchResults.length}` : '0/0'}
                    </span>
                    <button
                      onClick={handlePrevSearchResult}
                      disabled={searchResults.length === 0}
                      className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-50"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="18 15 12 9 6 15" />
                      </svg>
                    </button>
                    <button
                      onClick={handleNextSearchResult}
                      disabled={searchResults.length === 0}
                      className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-50"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex-1 p-3 sm:p-4 overflow-y-auto custom-scrollbar" style={{ backgroundColor: 'var(--chat-bg)' }}>
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full" style={{ color: 'var(--text-secondary)' }}>
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--bg-hover)' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" style={{ color: 'var(--text-secondary)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    </svg>
                  </div>
                  <p className="text-center">No messages yet</p>
                  <p className="text-sm text-center">Send a message to start the conversation</p>
                </div>
              ) : (
                <div className="space-y-1 sm:space-y-3">
                  {messages.map((message, index) => {
                    // Group messages by sender and date
                    const showSenderInfo = index === 0 ||
                      messages[index - 1].sender !== message.sender ||
                      new Date(message.createdAt).getTime() - new Date(messages[index - 1].createdAt).getTime() > 5 * 60 * 1000;

                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, background: { duration: 0 } }}
                        className={`flex ${message.sender === user._id ? 'justify-end' : 'justify-start'} ${showSenderInfo ? 'mt-2' : 'mt-0.5'}`}
                      >
                        <div
                          className={`chat-bubble group ${message.sender === user._id ? 'chat-bubble-sent' : 'chat-bubble-received'}`}
                          onContextMenu={(e) => handleMessageContextMenu(e, message)}
                          style={{
                            opacity: message.isDeleted ? 0.7 : 1,
                            cursor: message.isDeleted ? 'default' : 'context-menu'
                          }}
                        >
                          {message.isForwarded && !message.isDeleted && (
                            <p className="text-xs italic mb-1" style={{ color: 'var(--text-secondary)' }}>
                              Forwarded
                            </p>
                          )}

                          {message.isReply && message.replyTo && !message.isDeleted && (
                            <div className="mb-1 p-1 rounded-md" style={{ backgroundColor: 'var(--bg-hover)' }}>
                              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                                Replying to {message.replyTo.sender === user._id ? 'yourself' : 'message'}
                              </p>
                              <div className="pl-2 border-l-2 border-primary">
                                {message.replyTo.messageType === 'voice' ? (
                                  <div className="flex items-center space-x-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" style={{ color: 'var(--text-secondary)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                      <line x1="12" y1="19" x2="12" y2="22" />
                                    </svg>
                                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Voice message</span>
                                  </div>
                                ) : (
                                  <p className="text-xs truncate max-w-[200px]" style={{ color: 'var(--text-secondary)' }}>
                                    {message.replyTo.text}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {message.isDeleted ? (
                            <p className="italic" style={{ color: 'var(--text-secondary)' }}>
                              This message was deleted
                            </p>
                          ) : message.messageType === 'voice' ? (
                            <div className="flex flex-col space-y-2">
                              <div className="flex items-center space-x-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" style={{ color: 'var(--text-primary)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                  <line x1="12" y1="19" x2="12" y2="22" />
                                </svg>
                                <span style={{ color: 'var(--text-secondary)' }}>
                                  Voice message ({Math.floor(message.duration / 60)}:{(message.duration % 60).toString().padStart(2, '0')})
                                </span>
                              </div>
                              <audio src={message.voiceUrl} controls className="w-full" preload="none" />
                            </div>
                          ) : (
                            <p ref={el => {
                              // Store reference if this message is in search results
                              if (searchResults.some(result => result._id === message._id)) {
                                searchResultRefs.current[message._id] = el;

                                // Add highlight if this is the current search result
                                if (searchResults[currentSearchIndex]?._id === message._id) {
                                  el?.classList.add('ring-2', 'ring-primary', 'ring-offset-1');
                                } else {
                                  el?.classList.remove('ring-2', 'ring-primary', 'ring-offset-1');
                                }
                              }
                            }}>
                              {highlightSearchText(message.text)}
                            </p>
                          )}

                          {/* Reactions display */}
                          {message.reactions && message.reactions.length > 0 && !message.isDeleted && (
                            <div className="flex flex-wrap gap-1 mt-1 mb-1">
                              {/* Group reactions by emoji */}
                              {Object.entries(
                                message.reactions.reduce((acc, reaction) => {
                                  acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
                                  return acc;
                                }, {})
                              ).map(([emoji, count]) => (
                                <div
                                  key={emoji}
                                  className={`flex items-center rounded-full px-2 py-0.5 text-xs ${
                                    message.reactions.some(r => r.user === user._id && r.emoji === emoji)
                                      ? 'bg-primary text-white'
                                      : 'bg-gray-100 dark:bg-gray-700'
                                  }`}
                                >
                                  <span className="mr-1">{emoji}</span>
                                  {count > 1 && <span>{count}</span>}
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-1 space-x-1">
                            <div className="flex items-center">
                              {!message.isDeleted && (
                                <button
                                  onClick={(e) => handleOpenReactionPicker(e, message)}
                                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Add reaction"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                                    <line x1="9" y1="9" x2="9.01" y2="9" />
                                    <line x1="15" y1="9" x2="15.01" y2="9" />
                                  </svg>
                                </button>
                              )}
                            </div>

                            <div className="flex items-center space-x-1">
                              {message.sender === user._id && !message.isDeleted && (
                                <span className="text-xs">
                                  {message.read || readMessages.includes(message._id) ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M18 6L7 17L2 12" />
                                      <path d="M22 10L11 21L9 19" />
                                    </svg>
                                  ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M5 12L10 17L20 7" />
                                    </svg>
                                  )}
                                </span>
                              )}
                              <p className="text-xs text-gray-500">
                                {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {showVoiceRecorder ? (
              <VoiceRecorder
                onRecordingComplete={handleVoiceRecordingComplete}
                onCancel={() => setShowVoiceRecorder(false)}
              />
            ) : (
              <form onSubmit={handleSendMessage} className="mobile-message-input p-2 sm:p-4 border-t flex items-center space-x-1 sm:space-x-2" style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-color)' }}>
                <Input
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);

                    // Handle typing indicator
                    if (socket && selectedContact) {
                      // Clear any existing timeout
                      if (typingTimeoutRef.current) {
                        clearTimeout(typingTimeoutRef.current);
                      }

                      // Only emit typing if not already typing
                      if (!isTyping) {
                        setIsTyping(true);
                        socket.emit('typing', {
                          senderId: user._id,
                          receiverId: selectedContact._id
                        });
                      }

                      // Set timeout to stop typing indicator after 3 seconds of inactivity
                      typingTimeoutRef.current = setTimeout(() => {
                        setIsTyping(false);
                        socket.emit('stopTyping', {
                          senderId: user._id,
                          receiverId: selectedContact._id
                        });
                      }, 3000);
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 mobile-input text-sm sm:text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowVoiceRecorder(true)}
                  className="mobile-btn p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Record voice message"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                  </svg>
                </button>
                <Button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="mobile-btn p-1.5 sm:p-2 rounded-full"
                  size="sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </Button>
              </form>
            )}
          </>
        ) : selectedGroup ? (
          <>
            <div className="mobile-header p-3 sm:p-4 border-b flex items-center justify-between" style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-color)' }}>
              <div className="flex items-center space-x-2 sm:space-x-3">
                {mobileView && (
                  <button
                    onClick={() => setShowContacts(true)}
                    className="mobile-btn p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                    aria-label="Back to contacts"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                )}
                <div className="relative">
                  <div className="mobile-avatar w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                    {selectedGroup.groupPhoto ? (
                      <img
                        src={selectedGroup.groupPhoto}
                        alt={selectedGroup.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-semibold text-primary">{selectedGroup?.name ? selectedGroup.name.charAt(0) : '?'}</span>
                    )}
                  </div>
                </div>
                <div className="min-w-0">
                  <h3 className="font-medium truncate text-sm sm:text-base" style={{ color: 'var(--text-primary)' }}>{selectedGroup.name}</h3>
                  <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                    {selectedGroup.members.length} members
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-1 sm:space-x-2">
                <button
                  onClick={toggleSearch}
                  className="mobile-btn p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Search messages"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </button>
                <button
                  onClick={() => setShowGroupDetailsModal(true)}
                  className="mobile-btn p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Group info"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Search Bar */}
            {showSearch && (
              <div className="p-2 border-b" style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-color)' }}>
                <div className="flex items-center space-x-2">
                  <div className="flex-1">
                    <SearchBar
                      value={searchQuery}
                      onChange={handleSearch}
                      onClose={handleClearSearch}
                      placeholder="Search in group..."
                    />
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {searchResults.length > 0 ? `${currentSearchIndex + 1}/${searchResults.length}` : '0/0'}
                    </span>
                    <button
                      onClick={handlePrevSearchResult}
                      disabled={searchResults.length === 0}
                      className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-50"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="18 15 12 9 6 15" />
                      </svg>
                    </button>
                    <button
                      onClick={handleNextSearchResult}
                      disabled={searchResults.length === 0}
                      className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-50"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex-1 p-3 sm:p-4 overflow-y-auto custom-scrollbar" style={{ backgroundColor: 'var(--chat-bg)' }}>
              {groupMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full" style={{ color: 'var(--text-secondary)' }}>
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--bg-hover)' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" style={{ color: 'var(--text-secondary)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                  <p className="text-center">No messages yet</p>
                  <p className="text-sm text-center">Send a message to start the group conversation</p>
                </div>
              ) : (
                <div className="space-y-1 sm:space-y-3">
                  {groupMessages.map((message, index) => {
                    // Group messages by sender and date
                    const showSenderInfo = index === 0 ||
                      groupMessages[index - 1].sender._id !== message.sender._id ||
                      new Date(message.createdAt).getTime() - new Date(groupMessages[index - 1].createdAt).getTime() > 5 * 60 * 1000;

                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, background: { duration: 0 } }}
                        className={`flex ${message.sender._id === user._id ? 'justify-end' : 'justify-start'} ${showSenderInfo ? 'mt-2' : 'mt-0.5'}`}
                      >
                        {message.sender._id !== user._id && (
                          <div className="flex-shrink-0 mr-2 self-end mb-1">
                            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                              {message.sender.profilePhoto ? (
                                <img
                                  src={message.sender.profilePhoto}
                                  alt={message.sender.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-sm font-semibold text-gray-700">{message.sender?.name ? message.sender.name.charAt(0) : '?'}</span>
                              )}
                            </div>
                          </div>
                        )}
                        <div
                          className={`chat-bubble group ${message.sender._id === user._id ? 'chat-bubble-sent' : 'chat-bubble-received'}`}
                          onContextMenu={(e) => handleGroupMessageContextMenu(e, message)}
                          style={{
                            opacity: message.isDeleted ? 0.7 : 1,
                            cursor: message.isDeleted ? 'default' : 'context-menu'
                          }}
                        >
                          {message.sender._id !== user._id && !message.isDeleted && (
                            <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                              {message.sender.name}
                            </p>
                          )}

                          {message.isForwarded && !message.isDeleted && (
                            <p className="text-xs italic mb-1" style={{ color: 'var(--text-secondary)' }}>
                              Forwarded
                            </p>
                          )}

                          {message.isReply && message.replyTo && !message.isDeleted && (
                            <div className="mb-1 p-1 rounded-md" style={{ backgroundColor: 'var(--bg-hover)' }}>
                              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                                Replying to {message.replyTo.sender._id === user._id ? 'yourself' : message.replyTo.sender.name}
                              </p>
                              <div className="pl-2 border-l-2 border-primary">
                                {message.replyTo.messageType === 'voice' ? (
                                  <div className="flex items-center space-x-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" style={{ color: 'var(--text-secondary)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                      <line x1="12" y1="19" x2="12" y2="22" />
                                    </svg>
                                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Voice message</span>
                                  </div>
                                ) : (
                                  <p className="text-xs truncate max-w-[200px]" style={{ color: 'var(--text-secondary)' }}>
                                    {message.replyTo.text}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {message.isDeleted ? (
                            <p className="italic" style={{ color: 'var(--text-secondary)' }}>
                              This message was deleted
                            </p>
                          ) : message.messageType === 'voice' ? (
                            <div className="flex flex-col space-y-2">
                              <div className="flex items-center space-x-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" style={{ color: 'var(--text-primary)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                  <line x1="12" y1="19" x2="12" y2="22" />
                                </svg>
                                <span style={{ color: 'var(--text-secondary)' }}>
                                  Voice message ({Math.floor(message.duration / 60)}:{(message.duration % 60).toString().padStart(2, '0')})
                                </span>
                              </div>
                              <audio src={message.voiceUrl} controls className="w-full" preload="none" />
                            </div>
                          ) : (
                            <p ref={el => {
                              // Store reference if this message is in search results
                              if (searchResults.some(result => result._id === message._id)) {
                                searchResultRefs.current[message._id] = el;

                                // Add highlight if this is the current search result
                                if (searchResults[currentSearchIndex]?._id === message._id) {
                                  el?.classList.add('ring-2', 'ring-primary', 'ring-offset-1');
                                } else {
                                  el?.classList.remove('ring-2', 'ring-primary', 'ring-offset-1');
                                }
                              }
                            }}>
                              {highlightSearchText(message.text)}
                            </p>
                          )}

                          {/* Reactions display */}
                          {message.reactions && message.reactions.length > 0 && !message.isDeleted && (
                            <div className="flex flex-wrap gap-1 mt-1 mb-1">
                              {/* Group reactions by emoji */}
                              {Object.entries(
                                message.reactions.reduce((acc, reaction) => {
                                  acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
                                  return acc;
                                }, {})
                              ).map(([emoji, count]) => (
                                <div
                                  key={emoji}
                                  className={`flex items-center rounded-full px-2 py-0.5 text-xs ${
                                    message.reactions.some(r => r.user === user._id && r.emoji === emoji)
                                      ? 'bg-primary text-white'
                                      : 'bg-gray-100 dark:bg-gray-700'
                                  }`}
                                >
                                  <span className="mr-1">{emoji}</span>
                                  {count > 1 && <span>{count}</span>}
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-1 space-x-1">
                            <div className="flex items-center">
                              {!message.isDeleted && (
                                <button
                                  onClick={(e) => handleOpenReactionPicker(e, message)}
                                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Add reaction"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                                    <line x1="9" y1="9" x2="9.01" y2="9" />
                                    <line x1="15" y1="9" x2="15.01" y2="9" />
                                  </svg>
                                </button>
                              )}
                            </div>

                            <p className="text-xs text-gray-500">
                              {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {showVoiceRecorder ? (
              <VoiceRecorder
                onRecordingComplete={handleGroupVoiceRecordingComplete}
                onCancel={() => setShowVoiceRecorder(false)}
              />
            ) : (
              <form onSubmit={handleSendGroupMessage} className="mobile-message-input p-2 sm:p-4 border-t flex items-center space-x-1 sm:space-x-2" style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-color)' }}>
                <Input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 mobile-input text-sm sm:text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowVoiceRecorder(true)}
                  className="mobile-btn p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Record voice message"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                  </svg>
                </button>
                <Button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="mobile-btn p-1.5 sm:p-2 rounded-full"
                  size="sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </Button>
              </form>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-4" style={{ backgroundColor: 'var(--bg-panel)' }}>
            {mobileView && (
              <button
                onClick={() => setShowContacts(true)}
                className="absolute top-4 left-4 p-2 rounded-full bg-white shadow-md z-10"
                aria-label="Open contacts"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
            )}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, background: { duration: 0 } }}
              className="text-center px-4"
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-primary bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 sm:h-12 sm:w-12 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Welcome to WhatsApp Web</h2>
              <p className="max-w-md mx-auto text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                {mobileView ? 'Tap the menu button to select a contact' : 'Select a contact or group from the sidebar to start messaging'}
              </p>
              {mobileView && (
                <button
                  onClick={() => setShowContacts(true)}
                  className="mt-6 bg-primary text-white px-4 py-2 rounded-md shadow-md flex items-center justify-center mx-auto"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  View Contacts
                </button>
              )}
            </motion.div>
          </div>
        )}
      </div>

      {/* Message Menu */}
      <MessageMenu
        isOpen={menuOpen}
        onClose={handleCloseMenu}
        onDeleteForMe={handleDeleteForMe}
        onDeleteForEveryone={handleDeleteForEveryone}
        onForward={handleForward}
        onReply={handleReply}
        position={menuPosition}
        isSender={selectedMessage?.sender === user?._id}
      />

      {/* Reaction Picker */}
      <ReactionPicker
        isOpen={reactionPickerOpen}
        onClose={handleCloseReactionPicker}
        onSelectEmoji={handleAddReaction}
        position={reactionPickerPosition}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title={`Delete Message ${deleteType === 'everyone' ? 'for Everyone' : 'for Me'}`}
        message={
          deleteType === 'everyone'
            ? "This message will be deleted for everyone in this chat. This cannot be undone."
            : "This message will be deleted only for you. Other people in the chat will still be able to see it."
        }
      />

      {/* Profile Photo Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ background: { duration: 0 } }}
            className="rounded-lg shadow-xl p-6 w-full max-w-md"
            style={{ backgroundColor: 'var(--bg-panel)', color: 'var(--text-primary)' }}
          >
            <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Update Profile Photo</h3>

            <div className="mb-6 flex justify-center">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary">
                {newProfilePhoto ? (
                  <img
                    src={newProfilePhoto}
                    alt="New profile"
                    className="w-full h-full object-cover"
                  />
                ) : user?.profilePhoto ? (
                  <img
                    src={user.profilePhoto}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <span className="text-3xl font-bold text-gray-500">{user?.name ? user.name.charAt(0) : '?'}</span>
                  </div>
                )}
              </div>
            </div>

            <FileUpload
              onFileSelect={setNewProfilePhoto}
              className="mb-6"
              buttonText="Choose New Photo"
              variant="default"
              size="default"
            />

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowProfileModal(false);
                  setNewProfilePhoto('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={updateProfilePhoto}
                disabled={!newProfilePhoto}
              >
                Save Photo
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        user={user}
        onGroupCreated={(newGroup) => {
          setGroups(prev => [newGroup, ...prev]);
          setSelectedGroup(newGroup);
          setSelectedContact(null);
          setShowCreateGroupModal(false);
        }}
      />

      {/* Add Contact Modal */}
      <AddContactModal
        isOpen={showAddContactModal}
        onClose={() => setShowAddContactModal(false)}
        user={user}
        onContactAdded={(newContact) => {
          // Check if contact already exists
          if (!contacts.some(contact => contact._id === newContact._id)) {
            setContacts(prev => [newContact, ...prev]);
          }
          setShowAddContactModal(false);
        }}
      />

      {/* Contact Requests Modal */}
      <ContactRequestsModal
        isOpen={showContactRequestsModal}
        onClose={() => {
          setShowContactRequestsModal(false);
          fetchPendingRequestsCount(); // Refresh the count after closing
        }}
        user={user}
        onRequestAccepted={(newContact) => {
          // Add the new contact to the contacts list
          if (!contacts.some(contact => contact._id === newContact._id)) {
            setContacts(prev => [newContact, ...prev]);
          }
          // Update the pending requests count
          setPendingRequestsCount(prev => Math.max(0, prev - 1));
        }}
      />

      {/* Group Details Modal */}
      <GroupDetailsModal
        isOpen={showGroupDetailsModal}
        onClose={() => setShowGroupDetailsModal(false)}
        group={selectedGroup}
        user={user}
        onGroupUpdated={(updatedGroup) => {
          setGroups(prev => prev.map(g => g._id === updatedGroup._id ? updatedGroup : g));
          setSelectedGroup(updatedGroup);
        }}
        onLeaveGroup={(groupId) => {
          setGroups(prev => prev.filter(g => g._id !== groupId));
          setSelectedGroup(null);
        }}
      />

      {/* Forward Message Modal */}
      <ForwardMessageModal
        isOpen={showForwardModal}
        onClose={() => setShowForwardModal(false)}
        user={user}
        message={selectedMessage}
        onMessageForwarded={handleMessageForwarded}
      />

      {/* Reply Message Modal */}
      <ReplyMessageModal
        isOpen={showReplyModal}
        onClose={() => setShowReplyModal(false)}
        message={selectedMessage}
        onSendReply={selectedGroup ? handleSendGroupReply : handleSendReply}
      />
    </div>
  );
};

export default Chat;
