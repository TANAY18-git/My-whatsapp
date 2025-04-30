import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import axios from 'axios';
import { API_URL, SOCKET_URL } from '../config';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { FileUpload } from '../components/ui/file-upload';
import MessageMenu from '../components/ui/message-menu';
import ChatContextMenu from '../components/ui/chat-context-menu';
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
import AudioWaveform from '../components/ui/audio-waveform';
// isStringTooLargeForLocalStorage import removed (used in ProfilePage instead)
import { playNotificationSound, showNotification } from '../lib/notificationSystem';

const Chat = ({ user, setUser }) => {
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [mobileView, setMobileView] = useState(window.innerWidth < 768);
  // Always show contacts by default - this ensures the contacts view is visible on initial load
  const [showContacts, setShowContacts] = useState(true);
  const [readMessages, setReadMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [isTyping, setIsTyping] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [chatMenuPosition, setChatMenuPosition] = useState({ x: 0, y: 0 });
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

  // Ensure contacts view is shown immediately when component mounts
  useEffect(() => {
    // This will run once when the component first loads
    setShowContacts(true);
  }, []);

  // Handle socket events
  useEffect(() => {
    if (!socket || !user) return;

    // Add user to online users when socket connects
    const addUserToOnline = () => {
      console.log('Socket connected, adding user to online users');
      socket.emit('addUser', user._id);
    };

    // Add user immediately if socket is already connected
    if (socket.connected) {
      addUserToOnline();
    } else {
      // Add user when socket connects
      socket.on('connect', addUserToOnline);
    }

    // Listen for online users updates
    socket.on('getUsers', (users) => {
      console.log('Received online users:', users);
      setOnlineUsers(users);
    });

    socket.on('getMessage', (data) => {
      // Find the contact who sent the message
      const sender = contacts.find(contact => contact._id === data.senderId);

      // Create a complete message object
      const newMessage = {
        sender: data.senderId,
        text: data.text || '',
        createdAt: data.createdAt || Date.now(),
        _id: data.messageId,
        messageType: data.messageType || 'text',
        voiceUrl: data.voiceUrl || '',
        duration: data.duration || 0
      };

      if (selectedContact?._id === data.senderId) {
        // Add message to current conversation
        setMessages((prev) => [...prev, newMessage]);

        // Mark message as read if chat is open
        socket.emit('markMessagesAsRead', {
          senderId: data.senderId,
          receiverId: user._id
        });

        // If the window is not focused, still show notification
        if (!document.hasFocus()) {
          triggerNotification(sender, data);
        }
      } else {
        // Update unread count for the contact
        setContacts(prev =>
          prev.map(contact =>
            contact._id === data.senderId
              ? { ...contact, unreadCount: (contact.unreadCount || 0) + 1 }
              : contact
          )
        );

        // Always show notification for messages from other contacts
        triggerNotification(sender, data);
      }
    });

    // Helper function to trigger notifications
    const triggerNotification = (sender, data) => {
      if (!sender) return;

      try {
        // Always play sound for new messages
        const soundPlayed = playNotificationSound();
        console.log('Notification sound played:', soundPlayed);

        // Format message preview based on message type
        let messagePreview = 'You received a new message';
        if (data.messageType === 'text' && data.text) {
          messagePreview = data.text;
        } else if (data.messageType === 'voice') {
          messagePreview = '🎤 Voice message';
        }

        // Show desktop notification
        const notificationShown = showNotification(
          sender.name || 'New Message',
          messagePreview
        );

        console.log('Notification shown for message from:', sender.name, notificationShown);
      } catch (error) {
        console.error('Error showing notification:', error);
      }
    };

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
      // Find the group
      const group = groups.find(g => g._id === data.groupId);

      if (selectedGroup && selectedGroup._id === data.groupId) {
        setGroupMessages(prev => [...prev, data.message]);

        // Mark message as read
        socket.emit('markGroupMessageRead', {
          groupId: data.groupId,
          messageId: data.message._id
        });

        // If the window is not focused, still show notification
        if (!document.hasFocus()) {
          triggerGroupNotification(group, data);
        }
      } else if (group) {
        // Update unread count for the group
        setGroups(prev =>
          prev.map(g =>
            g._id === data.groupId
              ? { ...g, unreadCount: (g.unreadCount || 0) + 1 }
              : g
          )
        );

        // Always show notification for messages from other groups
        triggerGroupNotification(group, data);
      }
    });

    // Helper function to trigger group notifications
    const triggerGroupNotification = (group, data) => {
      if (!group) return;

      try {
        // Always play sound for new messages
        const soundPlayed = playNotificationSound();
        console.log('Group notification sound played:', soundPlayed);

        // Format message preview based on message type
        const senderName = data.message.sender?.name || 'Someone';
        let messagePreview = 'New message';

        if (data.message.messageType === 'text' && data.message.text) {
          messagePreview = `${senderName}: ${data.message.text}`;
        } else if (data.message.messageType === 'voice') {
          messagePreview = `${senderName}: 🎤 Voice message`;
        }

        // Show desktop notification
        const notificationShown = showNotification(
          `${group.name} (Group)`,
          messagePreview
        );

        console.log('Notification shown for group message in:', group.name, notificationShown);
      } catch (error) {
        console.error('Error showing group notification:', error);
      }
    };

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
      // Remove the connect listener
      socket.off('connect', addUserToOnline);

      // Remove other listeners
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
  }, [socket, user, contacts]);

  // Fetch pending requests count
  const fetchPendingRequestsCount = async () => {
    if (!user || !user.token) return;

    try {
      const response = await axios.get(`${API_URL}/api/users/requests`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });

      if (response.data && Array.isArray(response.data)) {
        setPendingRequestsCount(response.data.length);
        console.log(`Fetched ${response.data.length} pending requests`);
      } else {
        console.error('Invalid response format for pending requests:', response.data);
        setPendingRequestsCount(0);
      }
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      setPendingRequestsCount(0);
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

        // Reset unread count for this contact
        setContacts(prev =>
          prev.map(contact =>
            contact._id === selectedContact._id
              ? { ...contact, unreadCount: 0 }
              : contact
          )
        );
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();

    // On mobile, hide contacts view when a chat is selected
    // This ensures proper navigation flow on mobile devices
    if (mobileView && selectedContact) {
      setShowContacts(false);
    }
  }, [selectedContact, user, socket, mobileView]);

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

        // Reset unread count for this group
        setGroups(prev =>
          prev.map(group =>
            group._id === selectedGroup._id
              ? { ...group, unreadCount: 0 }
              : group
          )
        );
      } catch (error) {
        console.error('Error fetching group messages:', error);
      }
    };

    fetchGroupMessages();

    // On mobile, hide contacts view when a group chat is selected
    if (mobileView && selectedGroup) {
      setShowContacts(false);
    }
  }, [selectedGroup, user, socket, mobileView, selectedContact]);

  // Scroll to bottom of messages without animation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
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

  // Always show contacts view by default when component loads
  useEffect(() => {
    // Force showing contacts view on initial load
    setShowContacts(true);

    // Also show contacts when no chat is selected
    if (!selectedContact && !selectedGroup) {
      setShowContacts(true);
    }
  }, [selectedContact, selectedGroup]);

  // Ensure contacts are shown on mobile when component first loads
  useEffect(() => {
    if (mobileView) {
      setShowContacts(true);
    }
  }, [mobileView]);

  // Handle back button functionality for mobile
  const handleBackNavigation = () => {
    if (selectedContact || selectedGroup) {
      // If in a chat, go back to contacts
      setSelectedContact(null);
      setSelectedGroup(null);
      setShowContacts(true);
    } else {
      // If in contacts view, do nothing (stay on contacts)
      // We've removed the X button that would hide contacts
    }
  };

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

      // Scroll to bottom without animation
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });

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

      // Scroll to bottom without animation
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });

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
    if (!userId || !onlineUsers || !Array.isArray(onlineUsers)) {
      return false;
    }
    return onlineUsers.some((user) => user.userId === userId);
  };

  // Profile photo update functionality moved to ProfilePage component

  // Handle right-click on message to open menu
  const handleMessageContextMenu = (e, message) => {
    e.preventDefault();
    setSelectedMessage(message);
    setMenuPosition({ x: e.clientX, y: e.clientY });
    setMenuOpen(true);
  };

  // Handle right-click on chat header to open chat menu (desktop only)
  const handleChatContextMenu = (e) => {
    if (mobileView) return; // Only for desktop
    e.preventDefault();
    setChatMenuPosition({ x: e.clientX, y: e.clientY });
    setChatMenuOpen(true);
  };

  // Close chat menu
  const handleCloseChatMenu = () => {
    setChatMenuOpen(false);
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

      // Scroll to bottom without animation
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });

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

      // Scroll to bottom without animation
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });

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
      const firstResultRef = searchResultRefs.current[results[0]._id];
      if (firstResultRef) {
        firstResultRef.scrollIntoView({ behavior: 'auto', block: 'center' });
      }
    }
  };

  // Navigate to next search result
  const handleNextSearchResult = () => {
    if (searchResults.length === 0) return;

    const nextIndex = (currentSearchIndex + 1) % searchResults.length;
    setCurrentSearchIndex(nextIndex);

    const nextResultRef = searchResultRefs.current[searchResults[nextIndex]._id];
    if (nextResultRef) {
      nextResultRef.scrollIntoView({ behavior: 'auto', block: 'center' });
    }
  };

  // Navigate to previous search result
  const handlePrevSearchResult = () => {
    if (searchResults.length === 0) return;

    const prevIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
    setCurrentSearchIndex(prevIndex);

    const prevResultRef = searchResultRefs.current[searchResults[prevIndex]._id];
    if (prevResultRef) {
      prevResultRef.scrollIntoView({ behavior: 'auto', block: 'center' });
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

      // Scroll to bottom without animation
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });

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

      // Scroll to bottom without animation
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });

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

  // Mobile bottom navigation is now handled directly with onClick handlers

  return (
    <div className="flex h-screen relative" style={{ backgroundColor: 'var(--bg-main)' }}>
      {/* Sidebar - Contacts */}
      <AnimatePresence>
        {(showContacts || !mobileView) && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`w-full md:w-1/3 lg:w-1/4 xl:w-1/5 border-r flex flex-col ${mobileView ? 'absolute z-10 h-full' : ''} tablet-sidebar-width`}
            style={{
              backgroundColor: 'var(--bg-panel)',
              borderColor: 'var(--border-color)',
              boxShadow: mobileView ? '0 4px 12px rgba(0, 0, 0, 0.15)' : 'none'
            }}
          >
            {/* Top bar removed for mobile view */}

            <div className="p-3 sm:p-4">
              {/* Top bar removed for mobile view */}
              {!mobileView && (
                <div className="flex justify-between items-center mb-3 sm:mb-4">
                  <h2 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Chats</h2>
                  <div className="flex space-x-1 sm:space-x-2">
                    <button
                      onClick={() => navigate('/profile')}
                      className="mobile-btn p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                      title="Settings"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" style={{ color: 'var(--text-primary)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                      </svg>
                    </button>
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
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
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
                  </div>
                </div>
              )}
              {mobileView && (
                <div className="mb-3">
                  <h2 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Chats</h2>
                </div>
              )}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" style={{ color: '#0A85FF' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
                <Input
                  type="text"
                  placeholder="Search contacts and groups..."
                  className="w-full pl-12 pr-4 py-3 mobile-touch-target rounded-full"
                  value={contactSearchQuery}
                  onChange={(e) => setContactSearchQuery(e.target.value)}
                  style={{
                    height: '48px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    backgroundColor: 'white',
                    fontSize: '16px'
                  }}
                />
                {contactSearchQuery && (
                  <button
                    onClick={() => setContactSearchQuery('')}
                    className="absolute inset-y-0 right-0 flex items-center pr-4"
                  >
                    <div className="bg-gray-200 rounded-full p-1 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" style={{ color: '#666' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </div>
                  </button>
                )}

              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="flex flex-col justify-center items-center h-full p-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white rounded-lg shadow-lg p-6 flex flex-col items-center"
                  >
                    <div className="relative mb-4">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                        className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full"
                      />
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: [0, 1, 0] }}
                        transition={{ repeat: Infinity, duration: 2, times: [0, 0.5, 1] }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <div className="w-6 h-6 bg-primary rounded-full opacity-20"></div>
                      </motion.div>
                    </div>
                    <p className="text-gray-600 font-medium">Loading your chats...</p>
                    <div className="mt-2 flex space-x-1">
                      <motion.div
                        animate={{ y: [-3, 3, -3] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                        className="w-2 h-2 bg-primary rounded-full"
                      />
                      <motion.div
                        animate={{ y: [-3, 3, -3] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: 0.2 }}
                        className="w-2 h-2 bg-primary rounded-full"
                      />
                      <motion.div
                        animate={{ y: [-3, 3, -3] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: 0.4 }}
                        className="w-2 h-2 bg-primary rounded-full"
                      />
                    </div>
                  </motion.div>
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
                            className={`mobile-contact-item p-3 sm:p-4 cursor-pointer flex items-center space-x-3 mobile-touch-target rounded-lg mb-1`}
                            style={{
                              borderColor: 'var(--border-color)',
                              backgroundColor: selectedGroup?._id === group._id ? 'var(--bg-hover)' : 'transparent',
                              boxShadow: selectedGroup?._id === group._id ? '0 1px 3px rgba(0,0,0,0.05)' : 'none'
                            }}
                          >
                            <div className="relative">
                              <div className="mobile-avatar w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                                {group.groupPhoto ? (
                                  <img
                                    src={group.groupPhoto}
                                    alt={group.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-xl font-semibold text-primary">{group?.name ? group.name.charAt(0) : '?'}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center">
                                <h3 className="font-medium truncate text-base" style={{ color: 'var(--text-primary)' }}>{group.name}</h3>
                                <div className="flex items-center space-x-1">
                                  {group.unreadCount > 0 && (
                                    <span className="flex items-center justify-center text-xs text-white bg-green-500 rounded-full w-5 h-5 font-medium">
                                      {group.unreadCount > 9 ? '9+' : group.unreadCount}
                                    </span>
                                  )}
                                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                    {group.members.length} members
                                  </span>
                                </div>
                              </div>
                              <p className="text-sm truncate mt-1" style={{ color: 'var(--text-secondary)' }}>
                                Tap to open group chat
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
                            className={`mobile-contact-item p-3 sm:p-4 cursor-pointer flex items-center space-x-3 mobile-touch-target rounded-lg mb-1`}
                            style={{
                              borderColor: 'var(--border-color)',
                              backgroundColor: selectedContact?._id === contact._id ? 'var(--bg-hover)' : 'transparent',
                              boxShadow: selectedContact?._id === contact._id ? '0 1px 3px rgba(0,0,0,0.05)' : 'none'
                            }}
                          >
                            <div className="relative">
                              <div className="mobile-avatar w-14 h-14 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                                {contact.profilePhoto ? (
                                  <img
                                    src={contact.profilePhoto}
                                    alt={contact.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-xl font-semibold text-gray-700">{contact?.name ? contact.name.charAt(0) : '?'}</span>
                                )}
                              </div>
                              {isOnline(contact._id) && (
                                <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center">
                                <h3 className="font-medium truncate text-base" style={{ color: 'var(--text-primary)' }}>{contact.name}</h3>
                                <span className="text-xs text-gray-500 ml-1 whitespace-nowrap">
                                  {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                              <div className="flex justify-between items-center mt-1">
                                <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
                                  {contact.username ? `@${contact.username}` : contact.email}
                                </p>
                                <div className="flex items-center space-x-1">
                                  {contact.unreadCount > 0 && (
                                    <span className="flex items-center justify-center text-xs text-white bg-green-500 rounded-full w-5 h-5 font-medium">
                                      {contact.unreadCount > 9 ? '9+' : contact.unreadCount}
                                    </span>
                                  )}
                                  {isOnline(contact._id) && (
                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full whitespace-nowrap">online</span>
                                  )}
                                </div>
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
      <div className={`flex-1 flex flex-col ${(selectedContact || selectedGroup) && mobileView ? 'absolute inset-0 z-20' : ''}`}>
        {selectedContact ? (
          <>
            <div
              className="mobile-header p-2 border-b flex items-center justify-between"
              style={{ backgroundColor: '#F2F2F7', borderColor: 'var(--border-color)' }}
              onContextMenu={handleChatContextMenu}
            >
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleBackNavigation}
                  className="p-1 rounded-full hover:bg-gray-100/10"
                  aria-label="Back to contacts"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                    {selectedContact.profilePhoto ? (
                      <img
                        src={selectedContact.profilePhoto}
                        alt={selectedContact.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-base font-semibold text-gray-700">{selectedContact?.name ? selectedContact.name.charAt(0) : 'T'}</span>
                    )}
                  </div>
                  {isOnline(selectedContact._id) && (
                    <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-white"></div>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-medium truncate text-sm text-gray-800">{selectedContact.name}</h3>
                  <p className="text-xs truncate text-gray-500">
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
              <div className="flex items-center">
                <button
                  onClick={toggleSearch}
                  className="p-1.5 rounded-full hover:bg-gray-100/10"
                  title="Search messages"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </button>
                {!mobileView && (
                  <button
                    onClick={handleBackNavigation}
                    className="p-1.5 rounded-full hover:bg-gray-100/10 ml-1"
                    title="Close chat"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                )}
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

            <div className={`flex-1 p-2 sm:p-3 overflow-y-auto custom-scrollbar chat-container ${mobileView ? 'has-bottom-nav' : ''} relative`} style={{ backgroundColor: '#FFFFFF' }}>
              <div className="absolute bottom-0 left-0 right-0 text-center py-2 text-xs opacity-60 z-10" style={{ color: 'var(--text-secondary)' }}>
                <div className="flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Messages are end-to-end encrypted
                </div>
              </div>
              <div className="relative z-10">
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
                        <div
                          key={index}
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
                              <div className="voice-message overflow-hidden">
                                <AudioWaveform
                                  audioUrl={message.voiceUrl}
                                  isSender={message.sender === user._id}
                                  timestamp={new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                />
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
                                    className={`flex items-center rounded-full px-2 py-0.5 text-xs ${message.reactions.some(r => r.user === user._id && r.emoji === emoji)
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
                                {message.messageType !== 'voice' && (
                                  <div className="text-xs" style={{
                                    color: message.sender === user._id ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.5)',
                                    textAlign: 'right',
                                    marginTop: '2px',
                                    fontSize: '0.7rem'
                                  }}>
                                    {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    {message.sender === user._id && (
                                      <span className="ml-1">
                                        {message.read || readMessages.includes(message._id) ? (
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 inline text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M18 6L7 17L2 12" />
                                            <path d="M22 10L11 21L9 19" />
                                          </svg>
                                        ) : (
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 inline text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M5 12L10 17L20 7" />
                                          </svg>
                                        )}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
            </div>

            {showVoiceRecorder ? (
              <VoiceRecorder
                onRecordingComplete={handleVoiceRecordingComplete}
                onCancel={() => setShowVoiceRecorder(false)}
              />
            ) : (
              <motion.form
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleSendMessage}
                className="mobile-message-input p-2 border-t flex items-center space-x-2 mobile-safe-area"
                style={{
                  backgroundColor: 'var(--bg-panel)',
                  borderColor: 'var(--border-color)',
                  boxShadow: '0 -2px 6px rgba(0, 0, 0, 0.03)'
                }}
              >
                <div className="flex-1 relative bg-gray-100 rounded-full px-4 py-2 flex items-center">
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
                    className="flex-1 text-sm border-0 bg-transparent focus:ring-0 focus:outline-none"
                    style={{
                      height: '36px',
                      backgroundColor: 'transparent',
                      boxShadow: 'none'
                    }}
                  />

                  {/* Voice message button */}
                  <button
                    type="button"
                    onClick={() => setShowVoiceRecorder(true)}
                    className="ml-2 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="22" />
                    </svg>
                  </button>
                </div>

                {/* Send Button */}
                <motion.div
                  whileHover={{ scale: newMessage.trim() ? 1.05 : 1 }}
                  whileTap={{ scale: newMessage.trim() ? 0.95 : 1 }}
                >
                  <Button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="p-3 rounded-full flex-shrink-0 transition-all duration-200"
                    size="sm"
                    style={{
                      width: '40px',
                      height: '40px',
                      background: '#0A85FF',
                      opacity: newMessage.trim() ? 1 : 0.7
                    }}
                  >
                    <motion.div
                      animate={newMessage.trim() ? { rotate: [0, 15, 0] } : {}}
                      transition={{ duration: 0.5, repeat: 0 }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    </motion.div>
                  </Button>
                </motion.div>
              </motion.form>
            )}
          </>
        ) : selectedGroup ? (
          <>
            <div
              className="mobile-header p-2 border-b flex items-center justify-between"
              style={{ backgroundColor: '#F2F2F7', borderColor: 'var(--border-color)' }}
              onContextMenu={handleChatContextMenu}
            >
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleBackNavigation}
                  className="p-1 rounded-full hover:bg-gray-100/10"
                  aria-label="Back to contacts"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                    {selectedGroup.groupPhoto ? (
                      <img
                        src={selectedGroup.groupPhoto}
                        alt={selectedGroup.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-base font-semibold text-primary">{selectedGroup?.name ? selectedGroup.name.charAt(0) : '?'}</span>
                    )}
                  </div>
                </div>
                <div className="min-w-0">
                  <h3 className="font-medium truncate text-sm text-gray-800">{selectedGroup.name}</h3>
                  <p className="text-xs truncate text-gray-500">
                    {selectedGroup.members.length} members
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={toggleSearch}
                  className="p-1.5 rounded-full hover:bg-gray-100/10"
                  title="Search messages"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </button>
                <button
                  onClick={() => setShowGroupDetailsModal(true)}
                  className="p-1.5 rounded-full hover:bg-gray-100/10"
                  title="Group info"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </button>
                {!mobileView && (
                  <button
                    onClick={handleBackNavigation}
                    className="p-1.5 rounded-full hover:bg-gray-100/10"
                    title="Close chat"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                )}
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

            <div className={`flex-1 p-2 sm:p-3 overflow-y-auto custom-scrollbar chat-container ${mobileView ? 'has-bottom-nav' : ''} relative`} style={{ backgroundColor: '#FFFFFF' }}>
              <div className="absolute bottom-0 left-0 right-0 text-center py-2 text-xs opacity-60 z-10" style={{ color: 'var(--text-secondary)' }}>
                <div className="flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Messages are end-to-end encrypted
                </div>
              </div>
              <div className="relative z-10">
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
                        <div
                          key={index}
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
                              <div className="voice-message overflow-hidden">
                                <AudioWaveform
                                  audioUrl={message.voiceUrl}
                                  isSender={message.sender._id === user._id}
                                  timestamp={new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                />
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
                                    className={`flex items-center rounded-full px-2 py-0.5 text-xs ${message.reactions.some(r => r.user === user._id && r.emoji === emoji)
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

                              {message.messageType !== 'voice' && (
                                <div className="text-xs" style={{
                                  color: message.sender._id === user._id ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.5)',
                                  textAlign: 'right',
                                  marginTop: '2px',
                                  fontSize: '0.7rem'
                                }}>
                                  {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
            </div>

            {showVoiceRecorder ? (
              <VoiceRecorder
                onRecordingComplete={handleGroupVoiceRecordingComplete}
                onCancel={() => setShowVoiceRecorder(false)}
              />
            ) : (
              <motion.form
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleSendGroupMessage}
                className="mobile-message-input p-2 border-t flex items-center space-x-2 mobile-safe-area"
                style={{
                  backgroundColor: 'var(--bg-panel)',
                  borderColor: 'var(--border-color)',
                  boxShadow: '0 -2px 6px rgba(0, 0, 0, 0.03)'
                }}
              >
                <div className="flex-1 relative bg-gray-100 rounded-full px-4 py-2 flex items-center">
                  <Input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 text-sm border-0 bg-transparent focus:ring-0 focus:outline-none"
                    style={{
                      height: '36px',
                      backgroundColor: 'transparent',
                      boxShadow: 'none'
                    }}
                  />

                  {/* Voice message button */}
                  <button
                    type="button"
                    onClick={() => setShowVoiceRecorder(true)}
                    className="ml-2 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="22" />
                    </svg>
                  </button>
                </div>

                {/* Send Button */}
                <motion.div
                  whileHover={{ scale: newMessage.trim() ? 1.05 : 1 }}
                  whileTap={{ scale: newMessage.trim() ? 0.95 : 1 }}
                >
                  <Button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="p-3 rounded-full flex-shrink-0 transition-all duration-200"
                    size="sm"
                    style={{
                      width: '40px',
                      height: '40px',
                      background: '#0A85FF',
                      opacity: newMessage.trim() ? 1 : 0.7
                    }}
                  >
                    <motion.div
                      animate={newMessage.trim() ? { rotate: [0, 15, 0] } : {}}
                      transition={{ duration: 0.5, repeat: 0 }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    </motion.div>
                  </Button>
                </motion.div>
              </motion.form>
            )}
          </>
        ) : (
          <>
            {/* On mobile, automatically show contacts instead of welcome screen */}
            {mobileView ? (
              <div className="hidden">
                {/* This is hidden but we use a useEffect to trigger showing contacts */}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-4 relative overflow-hidden" style={{ backgroundColor: 'var(--bg-panel)' }}>
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-blue-50 to-purple-50 opacity-20"></div>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
                  className="text-center px-4 relative z-10 bg-white bg-opacity-80 py-8 px-6 rounded-xl shadow-lg"
                  style={{ backdropFilter: "blur(8px)" }}
                >
                  <div className="w-32 h-32 sm:w-40 sm:h-40 flex items-center justify-center mx-auto mb-6 sm:mb-8">
                    <div className="w-full h-full rounded-full overflow-hidden bg-gray-900 p-2 shadow-lg" style={{ boxShadow: '0 0 20px rgba(104, 109, 224, 0.5)' }}>
                      <img
                        src="/chat-logo.png"
                        alt="AK Chats Logo"
                        className="w-full h-full object-contain rounded-full"
                      />
                    </div>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: 'var(--text-primary)', background: 'linear-gradient(90deg, #4776E6 0%, #8E54E9 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Welcome to AK Chats
                  </h2>
                  <p className="max-w-md mx-auto text-sm sm:text-base mb-4" style={{ color: 'var(--text-secondary)' }}>
                    Select a contact or group from the sidebar to start messaging
                  </p>
                  <div className="flex justify-center space-x-2 opacity-70">
                    <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                    <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                    <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                  </div>
                </motion.div>
              </div>
            )}
          </>
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

      {/* Chat Context Menu */}
      <ChatContextMenu
        isOpen={chatMenuOpen}
        onClose={handleCloseChatMenu}
        onCloseChat={handleBackNavigation}
        position={chatMenuPosition}
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

      {/* Profile Photo Modal - Removed in favor of dedicated profile page */}

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

      {/* Floating Action Button for new message - Enhanced */}
      {mobileView && showContacts && !selectedContact && !selectedGroup && (
        <motion.button
          onClick={() => setShowAddContactModal(true)}
          className="fixed z-50 bottom-20 right-4 w-14 h-14 rounded-full flex items-center justify-center shadow-xl"
          style={{
            background: 'linear-gradient(135deg, #FF7A59 0%, #FF5A5F 100%)',
            boxShadow: '0 4px 10px rgba(255, 122, 89, 0.5)'
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: 0.2
          }}
        >
          <motion.div
            animate={{ rotate: 180 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </motion.div>
        </motion.button>
      )}

      {/* Mobile Bottom Navigation - Enhanced Style - Only show when not in a chat */}
      {mobileView && showContacts && !selectedContact && !selectedGroup && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="mobile-bottom-nav mobile-safe-area"
          style={{
            backgroundColor: '#004C99',
            borderTopLeftRadius: '16px',
            borderTopRightRadius: '16px',
            boxShadow: '0 -4px 10px rgba(0, 0, 0, 0.1)'
          }}
        >
          <button
            className="mobile-bottom-nav-item relative overflow-hidden group"
            onClick={() => navigate('/profile')}
          >
            <motion.div
              whileTap={{ scale: 0.9 }}
              className="flex flex-col items-center"
            >
              <div className="p-2 rounded-full bg-white bg-opacity-10 mb-1 group-hover:bg-opacity-20 transition-all duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
              </div>
              <span className="text-xs text-white font-medium">Settings</span>
            </motion.div>
          </button>

          <button
            className="mobile-bottom-nav-item relative overflow-hidden group"
            onClick={() => setShowContactRequestsModal(true)}
          >
            <motion.div
              whileTap={{ scale: 0.9 }}
              className="flex flex-col items-center"
            >
              <div className="p-2 rounded-full bg-white bg-opacity-10 mb-1 group-hover:bg-opacity-20 transition-all duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
                {pendingRequestsCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold"
                  >
                    {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                  </motion.span>
                )}
              </div>
              <span className="text-xs text-white font-medium">Requests</span>
            </motion.div>
          </button>

          <button
            className="mobile-bottom-nav-item relative overflow-hidden group"
            onClick={() => setShowCreateGroupModal(true)}
          >
            <motion.div
              whileTap={{ scale: 0.9 }}
              className="flex flex-col items-center"
            >
              <div className="p-2 rounded-full bg-white bg-opacity-10 mb-1 group-hover:bg-opacity-20 transition-all duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="16"></line>
                  <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
              </div>
              <span className="text-xs text-white font-medium">New Group</span>
            </motion.div>
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default Chat;
