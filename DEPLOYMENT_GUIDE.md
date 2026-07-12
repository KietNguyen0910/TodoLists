# Vercel Deployment Guide - Todo App with MongoDB Atlas

## ✅ Current Setup Status

- ✅ MongoDB Atlas Connected (cluster0.32ggn3e.mongodb.net)
- ✅ Backend Express API running on `http://localhost:5000`
- ✅ Frontend React App running on `http://localhost:3000`
- ✅ Serverless API functions created in `/api` folder
- ✅ Environment variables configured locally in `.env`

## 📋 Deployment Steps

### Step 1: Prepare Local Environment
Already done:
- `.env` file with `MONGO_URI`
- `.gitignore` to prevent `.env` from being committed
- `.env.example` for documentation
- `vercel.json` for build configuration

### Step 2: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit: Todo app with Express + MongoDB Atlas"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

### Step 3: Deploy on Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Configure project settings:
   - **Framework Preset**: Next.js (Vercel serverless functions are compatible)
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
5. Add environment variable:
   - **Name**: `MONGO_URI`
   - **Value**: `mongodb+srv://kietngynit_db_user:Vukiet091001@cluster0.32ggn3e.mongodb.net/todoapp?appName=Cluster0`
6. Click "Deploy"

### Step 4: Update MongoDB Atlas Security
1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Navigate to: **Cluster0** → **Network Access** → **IP Whitelist**
3. Add **0.0.0.0/0** to allow Vercel's dynamic IPs to connect
   - Note: This is less secure but necessary for serverless functions. Consider:
     - Using connection strings with credentials (done ✅)
     - Or requesting Vercel's static IPs from support

## 🌐 API Endpoints (Available After Deploy)

### Health Check
```bash
GET https://your-vercel-domain.vercel.app/api/health
```

### Get All Tasks
```bash
GET https://your-vercel-domain.vercel.app/api/tasks
```

### Create Task
```bash
POST https://your-vercel-domain.vercel.app/api/tasks
Content-Type: application/json

{
  "title": "New Task",
  "status": "todo"
}
```

### Update Task Status
```bash
PATCH https://your-vercel-domain.vercel.app/api/tasks/[TASK_ID]
Content-Type: application/json

{
  "status": "inprogress"
}
```

### Delete Task
```bash
DELETE https://your-vercel-domain.vercel.app/api/tasks/[TASK_ID]
```

## 🔧 Local Development

### Run Backend Only (Express)
```bash
npm run server
```
- Runs on `http://localhost:5000`
- Uses MongoDB Atlas via `.env` MONGO_URI

### Run Frontend Only (React)
```bash
npm start
```
- Runs on `http://localhost:3000`
- Calls backend on `http://localhost:5000`

### Run Both Together
```bash
npm run dev
```
- Requires `concurrently` installed
- Runs both backend and frontend in parallel

## 📝 Environment Variables

### Local Development (`.env`)
```
MONGO_URI=mongodb+srv://kietngynit_db_user:Vukiet091001@cluster0.32ggn3e.mongodb.net/todoapp?appName=Cluster0
```

### Vercel Dashboard
Add as **Environment Variable** (not as a secret):
- **Name**: `MONGO_URI`
- **Value**: Your MongoDB Atlas connection string

## ⚙️ Project Structure

```
.
├── api/                    # Vercel serverless functions
│   ├── health.js          # GET /api/health
│   ├── tasks/
│   │   ├── index.js       # GET/POST /api/tasks
│   │   └── [id].js        # PATCH/DELETE /api/tasks/[id]
│   └── lib/
│       ├── db.js          # MongoDB connection logic
│       └── Task.js        # Mongoose Task model
├── src/                    # React frontend
│   ├── App.js             # Main UI with 3-column board
│   ├── index.js           # React entry point
│   └── index.css          # Styles
├── server/                 # Local Express server (for development)
│   ├── index.js
│   ├── models/
│   ├── routes/
│   └── taskStore.js       # In-memory fallback
├── public/                 # Static assets
├── .env                   # Local environment (DO NOT COMMIT)
├── .env.example           # Template for environment variables
├── .gitignore             # Prevent .env from being committed
├── package.json           # Dependencies and scripts
└── vercel.json            # Vercel build configuration
```

## 🚀 Features

- ✅ Three-column Kanban board (Todo, In Progress, Done)
- ✅ Create new tasks
- ✅ Move tasks between columns
- ✅ Delete tasks
- ✅ MongoDB Atlas persistence
- ✅ CORS-enabled for cross-origin requests
- ✅ Serverless deployment ready

## 🔒 Security Notes

- **Credentials in Connection String**: Your MongoDB credentials are embedded in the connection string. Consider:
  - Using MongoDB Atlas IP Whitelist for additional security
  - Rotating credentials periodically
  - Using Vercel's secret management instead of passing in URL (optional advanced setup)

- **CORS**: Currently set to allow `*` for development. For production, restrict to your Vercel domain.

## ❌ Troubleshooting

### Tasks not loading on Vercel
- Check MongoDB Atlas IP whitelist includes `0.0.0.0/0`
- Verify `MONGO_URI` is set correctly in Vercel dashboard
- Check Vercel function logs: Project → Deployments → [latest] → Functions tab

### Cannot connect to MongoDB locally
- Ensure `.env` file has correct `MONGO_URI`
- Verify MongoDB Atlas cluster is active and network access is open

### Port already in use
- Backend: `npm run server` uses port 5000
- Frontend: `npm start` uses port 3000
- Kill process: `taskkill /F /IM node.exe` (Windows)

## 📖 Next Steps

1. Test the app locally at `http://localhost:3000`
2. Push code to GitHub
3. Connect GitHub repo to Vercel
4. Deploy to production
5. Share your Vercel domain!

---

**Database**: MongoDB Atlas (Cloud)  
**Backend**: Vercel Serverless Functions  
**Frontend**: Vercel Static Hosting  
**Status**: Ready for production deployment ✅
