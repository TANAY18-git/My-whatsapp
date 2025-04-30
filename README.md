# WhatsApp Web Clone

A full-stack WhatsApp-like web application built with React, Vite, Tailwind CSS, Node.js, Socket.io, and MongoDB.

## Features

- Real-time messaging using Socket.io
- User authentication (register/login)
- Responsive design for all devices (mobile, tablet, desktop)
- Online/offline status indicators
- Modern UI with animations using Framer Motion and GSAP
- Secure storage of user credentials only (no message storage in MongoDB)

## Tech Stack

### Frontend
- React (with Vite)
- Tailwind CSS
- Framer Motion
- GSAP
- Socket.io Client
- Axios
- React Router DOM
- shadcn/ui components

### Backend
- Node.js
- Express
- MongoDB
- Socket.io
- JWT Authentication
- Bcrypt

## Project Structure

```
WhatsApp Web/
├── client/                 # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── lib/            # Utility functions
│   │   ├── pages/          # Page components
│   │   └── ...
│   └── ...
│
└── server/                 # Backend (Node.js + Express + Socket.io)
    ├── config/             # Configuration files
    ├── controllers/        # Route controllers
    ├── middleware/         # Express middleware
    ├── models/             # MongoDB models
    ├── routes/             # API routes
    ├── socket/             # Socket.io setup
    ├── utils/              # Utility functions
    └── ...
```

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- MongoDB Atlas account

### Installation

1. Clone the repository
```
git clone <repository-url>
cd WhatsApp-Web
```

2. Install dependencies for both client and server
```
# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install
```

3. Set up environment variables
   - Create a `.env` file in the server directory with the following variables:
   ```
   PORT=5000
   MONGODB_URI=mongodb+srv://gaming182006:tanay4328@cluster0.g7yen.mongodb.net/whatsapp_web
   JWT_SECRET=whatsapp_web_secret_key
   NODE_ENV=development
   ```

### Running the Application

1. Start the server
```
cd server
npm run dev
```

2. Start the client (in a new terminal)
```
cd client
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

## Security Note

This application only stores user credentials (email and password) in the database. Messages, chats, media files, and other user data are not stored in the database for privacy reasons.

## Responsive Design

The application is designed to work on all devices:
- Mobile phones
- Tablets
- Laptops
- Desktop computers

The UI adapts automatically to different screen sizes for the best user experience.
