# 🎯 Quick Start Guide - Valtryek Elite

## 🚀 How to Run

### 1. Start Backend
```bash
cd backend
npm start
```

**Backend runs on:** http://localhost:5000

### 2. Start Frontend  
```bash
cd frontend
npm run dev
```

**Frontend runs on:** http://localhost:5173 (or next available port)

---

## ✨ What's New

### Authentication
- **Email/Password Login** ✅
- **Google OAuth** ✅ (requires GOOGLE_CLIENT_ID in .env)
- **OTP Login** ✅ (mock email/SMS)
- **Register/Signup** ✅
- **Refresh Tokens** ✅

### Premium UI
- **Glassmorphism Design** ✅
- **Smooth Animations** ✅
- **Dark Theme** ✅
- **Loading States** ✅
- **Error Handling** ✅

---

## 🧪 Test the Features

### 1. Register New User
```
Endpoint: POST /api/auth/register
Body: {
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

### 2. Login
```
Endpoint: POST /api/auth/login
Body: {
  "email": "john@example.com",
  "password": "password123"
}
```

### 3. Request OTP
```
Endpoint: POST /api/auth/otp/request
Body: {
  "email": "john@example.com"
}
```

### 4. Verify OTP
```
Endpoint: POST /api/auth/otp/verify
Body: {
  "email": "john@example.com",
  "otp": "123456"
}
```

### 5. Get Profile (Protected)
```
Headers: Authorization: Bearer <accessToken>
Endpoint: GET /api/auth/profile
```

---

## 🎨 UI Components Available

```jsx
// Import in your components
import GlassCard from './components/ui/GlassCard';
import AnimatedButton from './components/ui/AnimatedButton';
import SkeletonLoader from './components/ui/SkeletonLoader';
import StatCard from './components/ui/StatCard';
```

### Usage Examples:

```jsx
<GlassCard hover>
  <h3>Premium Card</h3>
  <p>With glassmorphism effect</p>
</GlassCard>

<AnimatedButton variant="primary" onClick={handleClick}>
  Click Me
</AnimatedButton>

<StatCard 
  icon="⚡"
  title="Total Faults"
  value={stats.total}
  trend="positive"
  trendValue="+12%"
/>

<SkeletonLoader type="card" />
```

---

## 🔒 Security Features

✅ Rate Limiting: 100 requests per 15 minutes
✅ Helmet Security Headers
✅ JWT with Refresh Token Rotation
✅ Password Hashing (bcrypt)
✅ Input Validation
✅ CORS Protection

---

## 📱 Mobile-First Design

All components are:
- Responsive (sm, md, lg, xl breakpoints)
- Touch-friendly
- Safe area aware (notch support)
- Hardware accelerated (60fps)

---

## 🎯 Next Steps

1. **Test the Login Page**
   - Navigate to http://localhost:5173
   - See animated login form
   - Try password or OTP login
   - Check Google OAuth button

2. **Explore Components**
   - Check `frontend/src/components/ui/`
   - All components are reusable
   - Customize as needed

3. **Update Dashboard**
   - Import new components
   - Apply Tailwind classes
   - Add animations

---

## 🐛 Troubleshooting

### Backend won't start:
```bash
# Check MongoDB is running
mongod --version

# Install dependencies
npm install
```

### Frontend won't start:
```bash
# Clear cache
rm -rf node_modules package-lock.json
npm install
```

### Port already in use:
```bash
# Kill process on port 5000 (backend)
# or 5173 (frontend)
npx kill-port 5000
npx kill-port 5173
```

---

## 📞 Support

For issues or questions:
- Check `SESSION_1_SUMMARY.md` for details
- Review `IMPLEMENTATION_PROGRESS.md` for status
- See code comments in controllers/components

---

**Happy Coding! 🚀**
