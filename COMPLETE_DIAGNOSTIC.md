# Complete Diagnostic Guide

## Current Status
- ✅ Frontend code is correct
- ✅ Backend code is correct  
- ✅ Database is set up
- ✅ Backend test works (direct HTTP request succeeds)
- ❌ Frontend → Backend connection is failing

## The Problem
The request times out after 10 seconds, which means:
1. The request is not reaching the backend, OR
2. The backend is not responding to the frontend

## Step-by-Step Diagnostic

### Step 1: Verify Backend is Running

**Open Terminal 1:**
```bash
cd dental-backend
node index.js
```

**You MUST see:**
```
Server running at http://localhost:3000
Connected to PostgreSQL!
```

**If you see errors**, the backend is NOT running. Fix those first.

### Step 2: Test Backend Directly

**Keep Terminal 1 running, open Terminal 2:**
```bash
cd dental-backend
node test-exact-format.js
```

**You MUST see:**
```
✓ SUCCESS - Backend is working!
```

**If this fails**, the backend is not responding. Check Terminal 1 for errors.

### Step 3: Check Frontend Port

**Open Terminal 3:**
```bash
cd dental-frontend
npm start
```

**Look for the port number in the output:**
```
Local:   http://localhost:4200/
```

**Write down this port number!**

### Step 4: Open Browser Developer Tools

1. Open browser to the frontend URL (e.g., http://localhost:4200)
2. Press **F12** to open Developer Tools
3. Go to **Network** tab (NOT Console)
4. Check "Preserve log" checkbox
5. Clear the network log (trash icon)

### Step 5: Try Booking

1. Log in as a patient
2. Go through booking steps 1-3
3. On step 4, click "Submit Booking Request"
4. **IMMEDIATELY look at the Network tab**

### Step 6: Analyze Network Tab

Look for a request to `add-appointment`:

**Case A: No request appears**
- Problem: Frontend is not sending the request
- Solution: Check browser console for JavaScript errors

**Case B: Request shows "pending" forever**
- Problem: Request is being sent but not reaching backend
- Possible causes:
  - Wrong URL (check if it says localhost:3000)
  - CORS preflight failing
  - Firewall blocking
  
**Case C: Request shows "failed" or red**
- Click on the request
- Check "Response" tab for error message
- Check "Headers" tab for status code

**Case D: Request shows status 200**
- Backend responded successfully!
- Problem is in frontend error handling

### Step 7: Check Backend Terminal

**While the request is "pending", look at Terminal 1 (backend):**

**If you see:**
```
2026-05-01T... - POST /add-appointment
=== BOOKING REQUEST RECEIVED ===
```
- Backend received the request!
- Check if there's a database error below

**If you see nothing:**
- Backend did NOT receive the request
- Problem is network/CORS/firewall

### Step 8: Check Browser Console

Go to **Console** tab in Developer Tools.

**Look for:**
- Red errors about CORS
- Red errors about network
- "Request timed out" message
- Any JavaScript errors

## Common Issues & Solutions

### Issue 1: CORS Error
**Symptom:** Console shows "CORS policy" error

**Solution:**
```bash
# Stop backend (Ctrl+C)
# Restart it
cd dental-backend
node index.js
```

### Issue 2: Wrong Port
**Symptom:** Network tab shows request to wrong port

**Check:** `dental-frontend/src/environments/environment.ts`
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',  // Must match backend port!
};
```

### Issue 3: Backend Not Running
**Symptom:** "Connection refused" or "Failed to fetch"

**Solution:** Make sure Terminal 1 is running `node index.js`

### Issue 4: Firewall Blocking
**Symptom:** Request times out, backend shows nothing

**Solution:**
- Temporarily disable firewall
- Or add exception for Node.js

### Issue 5: PostgreSQL Not Running
**Symptom:** Backend shows "PostgreSQL connection failed"

**Solution:**
- Start PostgreSQL service
- Check credentials in `dental-backend/db.js`

## What to Report

After following all steps, tell me:

1. **Backend Terminal Output:**
   - Does it show "Server running"?
   - Does it show "=== BOOKING REQUEST RECEIVED ===" when you submit?
   - Any errors?

2. **Network Tab:**
   - Is there a request to `add-appointment`?
   - What's the status? (pending/200/404/500/failed)
   - What URL is it trying to reach?

3. **Console Tab:**
   - Any red errors?
   - What does it say?

4. **Test Script:**
   - Does `node test-exact-format.js` work?

This will tell me EXACTLY where the problem is!
