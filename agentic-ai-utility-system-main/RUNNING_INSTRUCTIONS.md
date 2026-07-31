# 🚀 Valtryek - Agentic AI for Public Utility Fault Detection

A world-class, real-time, mobile-first, production-grade application for detecting and managing public utility faults.

## 🎯 Core Features

- **Real-time Fault Detection** - Instant reporting and tracking via Socket.io
- **AI-Powered Prioritization** - Smart severity scoring and assignment
- **Mobile-First Design** - App-like experience inspired by Instagram, Uber, Google Maps
- **Multi-Role System** - Citizens, Technicians, and Admins
- **Offline Resilience** - Works offline and syncs when back online

## 🛠️ Tech Stack

### Backend (Phase 1 - Monolith)
- Node.js + Express
- MongoDB with Mongoose
- Socket.io for real-time communication
- JWT Authentication
- Winston Logger

### Frontend
- React 19 + Vite
- React Router for navigation
- Socket.io Client
- Axios for API calls
- Context API for state management

## 📋 Prerequisites

- **Node.js** v24+ (recommended) or v18+
- **MongoDB** v7.0+ (local or Atlas)
- **npm** or **yarn**

## 🔧 Installation & Setup

### 1. Clone Repository
```bash
cd n:\agentic-ai-utility-system
```

### 2. Install Dependencies

#### Backend
```bash
cd backend
npm install
```

#### Frontend
```bash
cd frontend
npm install
```

### 3. Configure Environment Variables

#### Backend (.env)
```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb://127.0.0.1:27017/valtryek_001

# Authentication
JWT_SECRET=valtryek_super_secret_key_2024_change_in_production
JWT_EXPIRE=7d

# AI Service
AI_SERVICE_URL=http://localhost:8000

# Redis (optional - set to 'true' to enable)
REDIS_ENABLED=false
REDIS_HOST=localhost
REDIS_PORT=6379

# Logging
LOG_LEVEL=debug
```

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api
```

### 4. Start MongoDB (if using local)

Windows PowerShell:
```powershell
mongod --dbpath "C:\data\db"
```

Or if MongoDB is already installed as a service, it should be running automatically.

## 🚀 Running the Application

### Option 1: Run Both Services (Recommended)

Open **two separate PowerShell windows**:

#### Terminal 1 - Backend
```powershell
cd n:\agentic-ai-utility-system\backend
npm run dev
```

You should see:
```
✅ MongoDB Connected: 127.0.0.1
🚀 Valtryek_001 Server Running
📡 API:     http://localhost:5000
🔌 Socket:  ws://localhost:5000
```

#### Terminal 2 - Frontend
```powershell
cd n:\agentic-ai-utility-system\frontend
npm run dev
```

You should see:
```
➜  Local:   http://localhost:5173/
```

### Option 2: Quick Start Script

Create a `start.ps1` file in the root directory:
```powershell
# Start backend in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; npm run dev"

# Wait 2 seconds
Start-Sleep -Seconds 2

# Start frontend in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; npm run dev"
```

Then run:
```powershell
.\start.ps1
```

## 🌐 Access the Application

Once both services are running:

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000
- **API Health Check:** http://localhost:5000/api/status

## 📱 User Flow

### 1. Splash Screen (2 seconds)
Animated loading screen → Auto transition

### 2. Authentication
- **Register:** Create account with name, email, password
- **Login:** Sign in with credentials
- Default role: `citizen`

### 3. Dashboard
After login, you'll see:
- **Stats Cards** - Total, Critical, High Priority, Resolved faults
- **Quick Actions** - Report Fault, View Map buttons
- **Recent Faults List** - Last 10 faults with severity badges
- **Bottom Navigation** - Home | Map | Report | Profile

### 4. Report a Fault
1. Click "+" button or navigate to Report
2. Select fault type (Electricity, Water, Road, etc.)
3. Choose severity (Low, Medium, High, Critical)
4. Add description and address
5. Submit → Instant real-time update

### 5. View Map
See all faults on an interactive map (placeholder for now)

### 6. Profile
View user info and logout

## 🔌 Real-time Features

The app uses Socket.io for instant updates:

### Events
- `fault:created` - New fault reported
- `fault:updated` - Status changed
- `fault:deleted` - Fault removed

### How It Works
1. User reports fault → Instantly appears on all dashboards
2. Technician assigned → Reporter gets notification
3. Status updated → Everyone sees change immediately

## 🗄️ Database Schema

### User Model
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  role: String (citizen|technician|admin),
  phone: String,
  location: GeoJSON Point
}
```

### Fault Model
```javascript
{
  reportedBy: ObjectId (User),
  type: String (electricity|water|road|sewage|streetlight),
  description: String,
  location: GeoJSON Point,
  severity: String (low|medium|high|critical),
  status: String (reported|analyzing|assigned|in_progress|completed),
  priorityScore: Number,
  images: [String],
  assignedTo: ObjectId (Technician),
  timestamps: Dates
}
```

## 🧪 Testing the Application

### 1. Register a Test Account
1. Go to http://localhost:5173
2. Click "Register"
3. Fill in:
   - Name: Test User
   - Email: test@example.com
   - Password: password123
4. Click "Create Account"

### 2. Report a Fault
1. After login, click "+ Report Fault"
2. Fill in:
   - Type: Electricity
   - Severity: High
   - Description: Power outage in my area
   - Address: 123 Main St
3. Click "Report Fault"

### 3. Verify Real-time Update
1. Open another browser tab/window
2. Login with same account
3. You should see the fault appear instantly without refresh

### 4. Check Backend API
Visit http://localhost:5000/api/faults (requires auth token)

## 🐛 Troubleshooting

### MongoDB Connection Failed
**Error:** `MongoServerError: connect ECONNREFUSED`

**Solution:**
```powershell
# Start MongoDB manually
mongod --dbpath "C:\data\db"
```

Or check if MongoDB service is running:
```powershell
Get-Service -Name "MongoDB"
Start-Service MongoDB
```

### Port Already in Use
**Error:** `EADDRINUSE: address already in use`

**Solution:**
```powershell
# Find process using port 5000
netstat -ano | findstr :5000

# Kill the process (replace PID with actual number)
taskkill /PID <PID> /F
```

### Frontend Won't Load
**Error:** Blank page or loading forever

**Solution:**
1. Check backend is running at http://localhost:5000
2. Check browser console for errors
3. Clear localStorage:
```javascript
localStorage.clear()
location.reload()
```

### Socket.io Connection Failed
**Error:** WebSocket connection failed

**Solution:**
1. Ensure backend is running
2. Check CORS settings in server.js
3. Try polling transport only (update socket config)

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Sign in
- `GET /api/auth/profile` - Get user profile (requires auth)

### Faults
- `POST /api/faults/report` - Report new fault
- `GET /api/faults` - Get all faults
- `GET /api/faults/stats/dashboard` - Get dashboard statistics
- `GET /api/faults/:id` - Get specific fault
- `PUT /api/faults/:id/status` - Update fault status

### Technicians
- `GET /api/technicians/nearby` - Find nearby technicians
- `POST /api/technicians/assign` - Assign technician to fault

## 🔒 Security Notes

### Current (Phase 1)
- ✅ JWT authentication
- ✅ Bcrypt password hashing
- ✅ Protected routes
- ⚠️ Basic input validation

### Production Requirements
- Change JWT_SECRET to strong random value
- Enable HTTPS
- Add rate limiting
- Add CSRF protection
- Sanitize all inputs
- Add request validation middleware

## 🚀 Deployment

### Backend (Render/Railway)
1. Push code to GitHub
2. Connect repository to Render/Railway
3. Set environment variables
4. Deploy

### Frontend (Vercel/Netlify)
1. Build: `npm run build`
2. Deploy `dist` folder
3. Set API URL environment variable

### Database (MongoDB Atlas)
1. Create free cluster at atlas.mongodb.com
2. Whitelist IP addresses
3. Update MONGO_URI in backend .env

## 📈 Performance Optimization

### Implemented
- ✅ Lazy loading components
- ✅ Memoized context values
- ✅ Efficient MongoDB queries
- ✅ Socket.io reconnection logic
- ✅ Offline data caching

### Future (Phase 2+)
- Redis caching layer
- CDN for static assets
- Database indexing
- Query pagination
- Image optimization

## 🎨 UI/UX Features

### Current
- ✅ Dark mode design
- ✅ Mobile-first responsive layout
- ✅ Smooth animations
- ✅ Gesture-friendly interface
- ✅ Loading states
- ✅ Error feedback

### Planned
- Light/dark theme toggle
- Animations and transitions
- Haptic feedback
- Pull-to-refresh
- Swipe gestures

## 🤝 Contributing

This is a learning/demo project. Feel free to:
1. Fork the repository
2. Create feature branches
3. Submit pull requests

## 📝 License

MIT License - Feel free to use this for learning or projects.

## 🙏 Acknowledgments

Inspired by:
- Instagram (auth flow + UI polish)
- Uber (real-time updates)
- Google Maps (map interactions)
- Modern SaaS dashboards

---

**Built with ❤️ by the Valtryek Team**

*Version: 1.0.0 (Phase 1)*
*Last Updated: March 28, 2026*
