# Deployment Guide

## Backend Deployment

### 1. Deploy to Railway (Recommended)
1. Visit [Railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Railway auto-detects Node.js and uses `npm run server`
6. Add environment variables:
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `NODE_ENV`: production

### 2. MongoDB Atlas Setup
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create free M0 cluster
3. Create database user with read/write permissions
4. Network Access → Add IP Address → Allow access from anywhere (0.0.0.0/0)
5. Get connection string from "Connect" → "Connect your application"
6. Replace `<password>` with your database user password

### 3. Test Backend
After deployment, test your backend:
- `GET https://your-backend-url.railway.app/api/health`
- Should return: `{"message": "Server is running", "timestamp": "..."}`

## Frontend Deployment

### 1. Update API URL
Replace `https://your-backend-url.com/api` in `src/services/api.ts` with your actual Railway URL.

### 2. Deploy Frontend
The frontend will be deployed to Bolt Hosting automatically.

## Environment Variables for Backend

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/travel-tickets
NODE_ENV=production
PORT=5050
```

## Troubleshooting

### Backend Issues
- Check Railway logs for errors
- Verify MongoDB connection string
- Ensure all environment variables are set

### Frontend Issues
- Check browser console for API errors
- Verify backend URL is correct
- Test backend endpoints directly

### CORS Issues
If you get CORS errors, the backend is already configured to allow all origins in production.