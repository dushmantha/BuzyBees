# 🔧 Fix Edge Function 500 Error

## 🚨 The Problem
The Edge Function is returning a 500 error because the `RESEND_API_KEY` environment variable is not set in Supabase.

## ✅ The Solution

### Step 1: Set the Resend API Key in Supabase
```bash
npx supabase secrets set RESEND_API_KEY=re_Uv4AnqNp_9xJmJKWLgpLgK8rNSZrqCYxt
```

### Step 2: Deploy the Updated Edge Function
```bash
npx supabase functions deploy send-email
```

### Step 3: Test the Edge Function
```bash
curl -L -X POST 'https://fezdmxvqurczeqmqvgzm.supabase.co/functions/v1/send-email' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlemRteHZxdXJjemVxbXF2Z3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODIyODAsImV4cCI6MjA2ODc1ODI4MH0.uVHCEmNjpbkjFtOkwb9ColGd1zORc5HdWvBygKPEkm0' \
  -H 'apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlemRteHZxdXJjemVxbXF2Z3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODIyODAsImV4cCI6MjA2ODc1ODI4MH0.uVHCEmNjpbkjFtOkwb9ColGd1zORc5HdWvBygKPEkm0' \
  -H 'Content-Type: application/json' \
  --data '{
    "to": "tdmihiran@gmail.com",
    "subject": "✅ Test Email",
    "html": "<h1>Test</h1>",
    "type": "booking_confirmation"
  }'
```

## 🔍 What I've Added for Better Debugging

### Enhanced Error Messages
- Better logging in the Edge Function
- Shows available environment variables
- Shows exactly which fields are missing

### Improved Client Logging  
- More detailed payload logging
- Better error context in the app

## 🎯 Expected Result After Fix

After running the commands above, you should see:
- ✅ Successful email sending for verified addresses
- ✅ Clear error messages for domain verification issues
- ✅ No more 500 errors from the Edge Function

## 🚀 Quick Fix Script

I've created a deployment script you can run:
```bash
./deploy-edge-function.sh
```

This will:
1. Set the Resend API key
2. Deploy the function  
3. Test it automatically

**The 500 error should be completely resolved after setting the environment variable!**