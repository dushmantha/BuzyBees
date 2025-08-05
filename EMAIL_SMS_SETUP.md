# 📧📱 Email & SMS Setup Guide for BuzyBees

Complete guide to set up email and SMS functionality for customer communications.

## 🎯 Overview

The BuzyBees app now supports:
- ✅ **Email sending** to selected customers (using Resend API)
- ✅ **SMS sending** to selected customers (using Twilio API)
- ✅ **Communication logging** in Supabase database
- ✅ **Professional templates** with provider branding

## 🚀 Quick Start

### 1. **Database Setup**
Run this SQL in your Supabase SQL Editor:
```sql
-- Copy and paste the contents of:
-- src/screens/Schema/create_communication_logs.sql
```

### 2. **Service Accounts Setup**

#### Email Service (Resend) - Recommended
1. Go to [Resend.com](https://resend.com/)
2. Sign up for a free account (100 emails/day)
3. Verify your domain or use their test domain
4. Get your API key from the dashboard

#### SMS Service (Twilio)
1. Go to [Twilio.com](https://www.twilio.com/)
2. Sign up for a free account ($15 credit)
3. Get a phone number
4. Note your Account SID and Auth Token

### 3. **Deploy Functions**
```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Navigate to your project
cd /path/to/BuzyBees

# Run deployment script
./supabase/deploy-functions.sh
```

### 4. **Environment Variables**
In Supabase Dashboard → Project Settings → Edge Functions, add:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
```

## 📁 Files Created

### Supabase Edge Functions
- `supabase/functions/send-email/index.ts` - Email sending function
- `supabase/functions/send-sms/index.ts` - SMS sending function

### Database Schema
- `src/screens/Schema/create_communication_logs.sql` - Logging tables

### Configuration
- `supabase/functions/.env.example` - Environment variables template
- `supabase/deploy-functions.sh` - Deployment script
- `EMAIL_SMS_SETUP.md` - This setup guide

### App Integration
- Updated `CustomersScreen.tsx` - Real email/SMS sending
- Updated `normalized.ts` - Service methods

## 🔧 How It Works

### Email Flow
1. **User selects customers** → Opens promotion modal
2. **Fills email form** → Subject + message + email type
3. **Taps Send** → Calls `sendEmails()` method
4. **Edge Function** → Processes via Resend API
5. **Database logging** → Saves to `email_logs` table
6. **Success feedback** → Shows results to user

### SMS Flow
1. **User selects customers** → Opens promotion modal  
2. **Fills SMS form** → Message + SMS type
3. **Taps Send** → Calls `sendSMS()` method
4. **Edge Function** → Processes via Twilio API
5. **Database logging** → Saves to `sms_logs` table
6. **Success feedback** → Shows results to user

## 🎨 Features

### Professional Email Templates
- **HTML formatting** with provider branding
- **Responsive design** for all devices
- **Provider signature** with contact info
- **Professional styling** with BuzyBees colors

### Smart SMS Formatting
- **Provider signature** automatically added
- **Character limit** handling
- **International phone** number support
- **Delivery tracking** via Twilio

### Database Logging
- **Complete audit trail** of all communications
- **Provider-specific** logs with RLS
- **Status tracking** (sent, failed, etc.)
- **Message IDs** from service providers

## 🛡️ Security Features

- **Row Level Security** - Providers only see their logs
- **Input validation** - Prevents malicious content
- **Rate limiting** - Built into service providers
- **Error handling** - Graceful failure management

## 💰 Cost Estimation

### Resend (Email)
- **Free tier**: 100 emails/day, 3,000/month
- **Paid plans**: From $20/month for 50,000 emails

### Twilio (SMS)
- **Free credit**: $15 (≈300 SMS in US)
- **SMS cost**: ~$0.0075 per SMS in US
- **International**: Varies by country

## 🧪 Testing

### Test Email Function
```bash
curl -X POST "https://your-project.supabase.co/functions/v1/send-email" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "customers": [{"name": "Test User", "email": "test@example.com"}],
    "subject": "Test Email",
    "message": "Hello from BuzyBees!",
    "providerInfo": {"name": "Test Provider"}
  }'
```

### Test SMS Function  
```bash
curl -X POST "https://your-project.supabase.co/functions/v1/send-sms" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "customers": [{"name": "Test User", "phone": "+1234567890"}],
    "message": "Hello from BuzyBees!",
    "providerInfo": {"name": "Test Provider"}
  }'
```

## 🔍 Troubleshooting

### Common Issues

1. **"Function not found"**
   - Ensure functions are deployed: `./supabase/deploy-functions.sh`

2. **"Email service not configured"**
   - Add `RESEND_API_KEY` in Supabase environment variables

3. **"SMS service not configured"**
   - Add Twilio credentials in Supabase environment variables

4. **"Authentication required"**
   - Make sure user is logged in when calling functions

5. **Database permission errors**
   - Run `create_communication_logs.sql` to set up tables and RLS

### Logs & Debugging
- Check Supabase Functions logs in dashboard
- Monitor database inserts in `email_logs` and `sms_logs` tables
- Use browser console for client-side errors

## 🎉 You're All Set!

Your BuzyBees app now has professional email and SMS capabilities! Users can:
- ✅ Select multiple customers
- ✅ Send branded emails with rich formatting
- ✅ Send SMS messages with provider info
- ✅ Track all communications in the database
- ✅ Get detailed success/failure feedback

Need help? Check the troubleshooting section or contact support!