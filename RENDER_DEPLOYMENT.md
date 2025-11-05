# Deploying to Render

This guide explains how to deploy the WhatsApp Web clone to Render.

## Backend Deployment

1. Go to [render.com](https://render.com/) and sign up/login
2. Click on "New" and select "Web Service"
3. Connect your GitHub repository
4. Configure the server deployment with these settings:
   - Name: my-whatsapp-backend (or any name you prefer)
   - Root Directory: server
   - Runtime: Node
   - Build Command: `npm install`
   - Start Command: `node server.js`
   - Select the appropriate plan (Free tier is available)
5. Add the following environment variables:
   - MONGODB_URI: Your MongoDB connection string
   - JWT_SECRET: Your JWT secret key

## Frontend Deployment

1. From your Render dashboard, click on "New" and select "Static Site"
2. Connect your GitHub repository (if not already connected)
3. Configure the client deployment with these settings:
   - Name: my-whatsapp-frontend (or any name you prefer)
   - Root Directory: client
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist` (this is the default output directory for Vite)
   - Select the appropriate plan (Free tier is available)
4. Add the following environment variable:
   - VITE_API_URL: Your backend URL (e.g., https://my-whatsapp-backend-iku0.onrender.com)

## Important Notes

- The backend URL is already configured in the code to be `https://my-whatsapp-backend-iku0.onrender.com`
- The frontend URL is configured to be `https://my-whatsapp-i0o2.onrender.com`
- If you use different URLs, make sure to update them in the code:
  - Update the CORS configuration in `server/server.js`
  - Update the API URL in `client/src/config.js`
  - Update the environment variable in `client/.env.production`

## Testing the Deployment

After deploying both the backend and frontend, you can test the application by:

1. Visiting your frontend URL (e.g., https://my-whatsapp-frontend.onrender.com)
2. Creating an account and logging in
3. Testing the chat functionality

If you encounter any issues, check the Render logs for both the backend and frontend deployments.
