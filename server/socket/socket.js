let users = [];

const addUser = (userId, socketId) => {
  !users.some((user) => user.userId === userId) &&
    users.push({ userId, socketId });
};

const removeUser = (socketId) => {
  users = users.filter((user) => user.socketId !== socketId);
};

const getUser = (userId) => {
  return users.find((user) => user.userId === userId);
};

const setupSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('A user connected');

    // Add user when they connect
    socket.on('addUser', (userId) => {
      addUser(userId, socket.id);
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
      console.log('A user disconnected');
      removeUser(socket.id);
      io.emit('getUsers', users);
    });
  });
};

module.exports = setupSocket;
