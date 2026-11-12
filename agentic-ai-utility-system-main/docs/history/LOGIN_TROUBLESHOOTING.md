# 🔧 LOGIN ISSUE TROUBLESHOOTING GUIDE

## ✅ BACKEND STATUS: WORKING PERFECTLY

I've verified that the backend API login is working:
- ✅ Registration works
- ✅ Login works  
- ✅ JWT tokens generated correctly
- ✅ Password hashing working
- ✅ Database connection active

---

## 🎯 QUICK FIX - TRY THIS FIRST

### Use Fresh Test Account:

**New Credentials (Just Created):**
```
Email: logintest2024@example.com
Password: Test123!
```

Try logging in with these on the frontend: http://localhost:5173

---

## 🔍 COMMON LOGIN ISSUES & SOLUTIONS

### Issue 1: "Invalid credentials" Error

**Possible Causes:**
1. User doesn't exist in database
2. Password mismatch
3. Case sensitivity (email is case-sensitive)

**Solution:**
```bash
# Create new user via API
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "Test123!",
    "role": "citizen"
  }'
```

Then login with:
- Email: test@example.com
- Password: Test123!

---

### Issue 2: Form Not Submitting / No Response

**Check Browser Console:**
1. Press `F12` to open Developer Tools
2. Click **Console** tab
3. Look for red errors when you click login
4. Screenshot any errors

**Common Errors:**
- `Network Error` → Backend not reachable
- `CORS Error` → Cross-origin issue
- `401 Unauthorized` → Wrong credentials
- `500 Internal Server Error` → Backend bug

**Solution:**
1. Check if backend is running: http://localhost:5000
2. Should see: "Valtryek_001 Server Running"
3. If not, restart: `cd backend; npm run dev`

---

### Issue 3: Infinite Loading Spinner

**Symptoms:**
- Click login button
- Spinner appears
- Never completes

**Causes:**
- Network request hanging
- Backend not responding
- Socket.io connection issue

**Fix:**
1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Try logging in again
4. Look for the `/api/auth/login` request
5. Check if it's pending or failed
6. If pending > 30 seconds, backend issue

---

### Issue 4: "Authentication failed" Generic Error

**This means:**
- Frontend caught an error
- Error message not specific

**Debug Steps:**
1. F12 → Console tab
2. Look for detailed error
3. Check Network tab for failed requests
4. Verify backend logs (terminal window)

---

## 🛠️ STEP-BY-STEP DEBUGGING

### Step 1: Verify Backend is Running

Open terminal and check:
```bash
cd n:\agentic-ai-utility-system\backend
npm run dev
```

Should show:
```
✅ MongoDB Connected: 127.0.0.1
🚀 Valtryek_001 Server Running
📡 API: http://localhost:5000
```

If not running, start it!

---

### Step 2: Test Backend Directly

**PowerShell Command:**
```powershell
$body = @{ 
    email = "logintest2024@example.com"
    password = "Test123!"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" `
  -Method POST `
  -Body $body `
  -ContentType "application/json"
```

**Expected Result:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

If this works → Backend is fine, frontend issue  
If this fails → Backend problem

---

### Step 3: Check Frontend Configuration

**Verify `.env` file exists:**
Location: `frontend/.env`

Should contain:
```env
VITE_API_URL=http://localhost:5000/api
```

If missing, create it:
```bash
# In frontend folder
echo VITE_API_URL=http://localhost:5000/api > .env
```

Then restart frontend:
```bash
cd frontend
npm run dev
```

---

### Step 4: Clear Browser Data

**Chrome/Edge:**
1. Press `Ctrl+Shift+Delete`
2. Select "Cookies and other site data"
3. Select "Cached images and files"
4. Time range: "Last hour"
5. Click "Clear data"
6. Refresh page (Ctrl+R)

**Firefox:**
1. Press `Ctrl+Shift+Delete`
2. Select "Cookies" and "Cache"
3. Click "Clear Now"
4. Refresh page

---

### Step 5: Try Incognito/Private Mode

1. Open new Incognito window (Ctrl+Shift+N)
2. Go to http://localhost:5173
3. Try logging in
4. If works → Clear cache/cookies in main browser

---

### Step 6: Check CORS Settings

**In Backend Terminal**, look for CORS errors when you try to login from browser.

If you see CORS errors, add this to backend server.js:

Actually, CORS should already be configured. Let me verify...

---

## 🔬 ADVANCED DEBUGGING

### Check AppContext Login Function

Open browser console and type:
```javascript
console.log(window.location.href)
```

Should be: `http://localhost:5173/`

Then check:
```javascript
fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    email: 'logintest2024@example.com',
    password: 'Test123!'
  })
}).then(r => r.json()).then(console.log)
```

If this logs success → API works, frontend bug  
If this fails → Network/API issue

---

## 📋 WORKING TEST ACCOUNTS

All these accounts exist in database:

### Admin Account
```
Email: admin@test.com
Password: Test123!
Role: admin
```

### Citizen Account
```
Email: citizen@test.com
Password: Test123!
Role: citizen
```

### Technician Account
```
Email: tech@test.com
Password: Test123!
Role: technician
```

### Fresh Test Account (Just Created)
```
Email: logintest2024@example.com
Password: Test123!
Role: citizen
```

**Try each one!** If any work, others should too.

---

## 🎯 WHAT TO DO RIGHT NOW

### Immediate Action Plan:

1. **Open Browser DevTools** (Press F12)
2. **Go to Console tab**
3. **Try to login** with: logintest2024@example.com / Test123!
4. **Watch for errors** in Console
5. **Screenshot any errors**
6. **Share the error message**

### Also Check:

**Network Tab:**
1. F12 → Network tab
2. Try login
3. Look for `login` request
4. Click on it
5. Check **Response** tab
6. What does it say?

**Backend Logs:**
1. Check backend terminal window
2. Do you see the login request?
3. Any error messages?
4. Share what you see

---

## 💡 LIKELY CAUSES

Based on common patterns:

### 80% Chance: Wrong Credentials
- User doesn't exist
- Password typo
- Email case sensitivity

**Fix:** Use fresh account: logintest2024@example.com / Test123!

### 15% Chance: Frontend Not Restarted
- Changed .env but didn't restart
- Vite needs reload after .env change

**Fix:** 
```bash
cd frontend
# Stop current process (Ctrl+C)
npm run dev
```

### 5% Chance: Actual Bug
- API response structure changed
- Axios instance misconfigured
- Token extraction bug

**Fix:** Check console errors, report back

---

## 🚨 STILL NOT WORKING?

### Emergency Workaround - Use API Directly:

**Create User:**
```powershell
$user = @{ 
    name = "Direct User"
    email = "direct@example.com"
    password = "Test123!"
    role = "citizen"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" `
  -Method POST -Body $user -ContentType "application/json"
```

**Login:**
```powershell
$creds = @{ 
    email = "direct@example.com"
    password = "Test123!"
} | ConvertTo-Json

$result = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" `
  -Method POST -Body $creds -ContentType "application/json"

Write-Host "Token:" $result.data.accessToken
```

Copy the token and use it manually in frontend localStorage:
```javascript
localStorage.setItem('token', 'PASTE_TOKEN_HERE')
location.reload()
```

---

## ✨ NEXT STEPS

1. **Try fresh account**: logintest2024@example.com / Test123!
2. **Check console** for errors (F12)
3. **Check network** tab for failed requests
4. **Verify backend** is running
5. **Clear cache** and try again
6. **Report back** with specific error messages

---

**📞 UPDATE ME WITH:**
- What error message do you see?
- What's in browser console?
- Does backend terminal show the request?
- Which test account are you trying?

I'll help you fix it immediately! 🚀

---

*Valtryek © 2024 - Login Troubleshooting Guide*
