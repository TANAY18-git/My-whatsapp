let users = [];

const addUser = (userId, socketId) => {
  // Check if user already exists
  const existingUserIndex = users.findIndex((user) => user.userId === userId);

  if (existingUserIndex !== -1) {
    // Update the socket ID if user already exists
    users[existingUserIndex].socketId = socketId;
    console.log(`Updated socket for user ${userId}`);
  } else {
    // Add new user
    users.push({ userId, socketId });
    console.log(`Added new user ${userId} to online users`);
  }
};

const removeUser = (socketId) => {
  // Find user before removing to log who disconnected
  const userToRemove = users.find((user) => user.socketId === socketId);

  if (userToRemove) {
    console.log(`Removing user ${userToRemove.userId} from online users`);
  }

  // Filter out the disconnected user
  users = users.filter((user) => user.socketId !== socketId);
};

const getUser = (userId) => {
  return users.find((user) => user.userId === userId);
};

const setupSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('A user connected with socket ID:', socket.id);

    // Add user when they connect
    socket.on('addUser', (userId) => {
      if (!userId) {
        console.log('Warning: Received addUser event without userId');
        return;
      }

      console.log(`User ${userId} connected with socket ID ${socket.id}`);
      addUser(userId, socket.id);

      // Broadcast updated online users list to all clients
      io.emit('getUsers', users);
    });

    // Send and receive messages
    socket.on('sendMessage', ({ senderId, receiverId, text, messageId, messageType, voiceUrl, duration }) => {
      const user = getUser(receiverId);
      if (user) {
        io.to(user.socketId).emit('getMessage', {
          senderId,
          text,
          messageId,
          messageType,
          voiceUrl,
          duration,
          createdAt: Date.now(),
        });
      }
    });

    // Send and receive group messages
    socket.on('sendGroupMessage', ({ groupId, message }) => {
      // Find all online users who are members of the group
      users.forEach(user => {
        // Don't send to the sender
        if (user.userId !== message.sender._id) {
          io.to(user.socketId).emit('getGroupMessage', {
            groupId,
            message
          });
        }
      });
    });

    // Mark messages as read
    socket.on('markMessagesAsRead', ({ senderId, receiverId }) => {
      const user = getUser(senderId);
      if (user) {
        io.to(user.socketId).emit('messagesRead', {
          readBy: receiverId,
        });
      }
    });

    // Handle typing indicators
    socket.on('typing', ({ senderId, receiverId }) => {
      const user = getUser(receiverId);
      if (user) {
        io.to(user.socketId).emit('userTyping', {
          senderId,
        });
      }
    });

    // Handle stop typing
    socket.on('stopTyping', ({ senderId, receiverId }) => {
      const user = getUser(receiverId);
      if (user) {
        io.to(user.socketId).emit('userStopTyping', {
          senderId,
        });
      }
    });

    // Handle message deletion
    socket.on('deleteMessage', ({ messageId, receiverId, deleteFor }) => {
      const user = getUser(receiverId);
      if (user) {
        io.to(user.socketId).emit('messageDeleted', {
          messageId,
          deleteFor
        });
      }
    });

    // Handle message reactions
    socket.on('messageReaction', ({ messageId, receiverId, reactions }) => {
      const user = getUser(receiverId);
      if (user) {
        io.to(user.socketId).emit('messageReaction', {
          messageId,
          reactions
        });
      }
    });

    // Handle group message reactions
    socket.on('groupMessageReaction', ({ groupId, messageId, reactions }) => {
      // Notify all online users in the group
      users.forEach(user => {
        io.to(user.socketId).emit('groupMessageReaction', {
          groupId,
          messageId,
          reactions
        });
      });
    });

    // Handle group message deletion
    socket.on('deleteGroupMessage', ({ groupId, messageId, deleteFor }) => {
      // Notify all online users in the group
      users.forEach(user => {
        io.to(user.socketId).emit('groupMessageDeleted', {
          groupId,
          messageId,
          deleteFor
        });
      });
    });

    // Remove user when they disconnect
    socket.on('disconnect', () => {
      console.log(`Socket ${socket.id} disconnected`);

      // Find user before removing to log who disconnected
      const userToRemove = users.find((user) => user.socketId === socket.id);
      if (userToRemove) {
        console.log(`User ${userToRemove.userId} went offline`);
      }

      removeUser(socket.id);

      // Broadcast updated online users list to all clients
      io.emit('getUsers', users);
      console.log(`Current online users: ${users.length}`);
    });
  });
};

module.exports = setupSocket;
