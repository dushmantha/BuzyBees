# 🚀 Deploy BuzyBees Schema to Supabase

## Step 1: Access Supabase SQL Editor
1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/fezdmxvqurczeqmqvgzm
2. Click on "SQL Editor" in the left sidebar
3. Create a new query

## Step 2: Copy and Execute the Schema
1. Open the file: `src/Schema/deploy_all_schemas.sql`
2. Copy the ENTIRE contents (all 801 lines)
3. Paste into the Supabase SQL Editor
4. Click "Run" to execute

## Step 3: Verify Deployment
After running the script, you should see:
- ✅ All tables created successfully
- ✅ Storage buckets configured
- ✅ RLS policies enabled
- ✅ Functions and triggers working
- ✅ Sample data inserted

The script will output a verification message at the end showing:
- Number of tables created
- Storage buckets created
- Functions created

## Quick Copy Command
Run this command to copy the deployment script to clipboard (macOS):

```bash
pbcopy < src/Schema/deploy_all_schemas.sql
```

Then paste directly into Supabase SQL Editor and run!

## What Gets Deployed:
- 📁 **Core Tables**: provider_businesses, shop_staff, shop_services, service_options, etc.
- 🗄️ **Storage Buckets**: shop-images, staff-avatars, service-images  
- 🔐 **Security Policies**: RLS policies for all tables and storage
- ⚡ **Performance**: Indexes for fast queries
- 🔧 **Functions**: create_shop_normalized and update triggers
- 📊 **Sample Data**: Test business for verification

The deployment is **idempotent** - safe to run multiple times!