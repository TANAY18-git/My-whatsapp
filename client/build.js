// Build script for Render deployment
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a .env file for production build
const envContent = `VITE_API_URL=https://my-whatsapp-backend-iku0.onrender.com
VITE_FRONTEND_URL=https://my-whatsapp-i0o2.onrender.com
`;

fs.writeFileSync(path.join(__dirname, '.env.production'), envContent);

console.log('Created .env.production file for build');
console.log('Ready to run: npm run build');
