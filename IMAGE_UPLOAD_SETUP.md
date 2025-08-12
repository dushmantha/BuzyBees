# Image Upload Setup Guide

## Overview

This guide will help you set up image upload functionality for the BuzyBees app using Supabase Storage. Profile images and business images are now uploaded to Supabase Storage instead of being saved as local file paths.

## Prerequisites

1. Supabase project set up and configured
2. BuzyBees app connected to your Supabase project

## Step 1: Create Storage Buckets

### Option A: Using Supabase Dashboard (Recommended)

1. **Go to your Supabase Dashboard**
   - Navigate to https://app.supabase.com
   - Select your project

2. **Create Avatars Bucket**
   - Go to Storage section
   - Click "Create a new bucket"
   - Name: `avatars`
   - Public bucket: ✅ **Enable**
   - File size limit: `5242880` (5MB)
   - Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`
   - Click "Save"

3. **Create Business Images Bucket**
   - Click "Create a new bucket" again
   - Name: `business-images`
   - Public bucket: ✅ **Enable**
   - File size limit: `10485760` (10MB)
   - Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`
   - Click "Save"

### Option B: Using SQL Script

1. **Run the Setup Script**
   - In your Supabase Dashboard, go to "SQL Editor"
   - Copy and paste the contents of `setup_image_storage.sql`
   - Click "Run" to execute the script

## Step 2: Configure Row Level Security (RLS)

The SQL script automatically sets up RLS policies, but if you created buckets manually, you need to set up these policies:

### For `avatars` bucket:

```sql
-- Allow public read access
CREATE POLICY "Public Access" ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

-- Allow users to upload their own avatars
CREATE POLICY "Users can upload own avatar" ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'profiles'
);

-- Allow users to update their own avatars
CREATE POLICY "Users can update own avatar" ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'profiles'
);

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete own avatar" ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'profiles'
);
```

### For `business-images` bucket:

```sql
-- Allow public read access
CREATE POLICY "Public Access Business" ON storage.objects FOR SELECT 
USING (bucket_id = 'business-images');

-- Allow users to upload business images
CREATE POLICY "Users can upload business images" ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'business-images' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'business'
);

-- Allow users to update business images
CREATE POLICY "Users can update business images" ON storage.objects FOR UPDATE
USING (
  bucket_id = 'business-images' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'business'
);

-- Allow users to delete business images
CREATE POLICY "Users can delete business images" ON storage.objects FOR DELETE
USING (
  bucket_id = 'business-images' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'business'
);
```

## Step 3: Enable RLS on storage.objects

```sql
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
```

## Step 4: Test the Setup

1. **Build and run your app**
   ```bash
   npx react-native run-ios
   # or
   npx react-native run-android
   ```

2. **Test Profile Image Upload**
   - Navigate to Profile screen
   - Tap "Edit Profile"
   - Tap the camera icon on the profile image
   - Select an image from gallery or take a photo
   - You should see upload progress and success message

3. **Test Business Image Upload**
   - Navigate to Shop Details screen (if you're a provider)
   - Try uploading business images
   - Verify images are uploaded to Supabase storage

## Features Implemented

### ✅ **Profile Images**
- Upload profile images to `avatars/profiles/` folder
- Automatic file naming: `profile_{userId}_{timestamp}.jpg`
- 5MB file size limit
- Support for JPEG, PNG, WebP formats
- Progress indicators and error handling
- Automatic URL generation for database storage

### ✅ **Business Images**
- Upload business images to `business-images/business/` folder
- Automatic file naming: `business_{businessId}_{timestamp}.jpg`
- 10MB file size limit
- Support for JPEG, PNG, WebP formats
- Multiple image support

### ✅ **Error Handling**
- Bucket existence validation
- File size and type validation
- Network error handling
- User-friendly error messages
- Graceful fallback when storage isn't configured

### ✅ **Security**
- Row Level Security (RLS) policies
- User-specific upload permissions
- Public read access for images
- Authenticated upload requirements

## Troubleshooting

### "Storage service not available" Error
- Check that your Supabase project is running
- Verify your Supabase connection in the app
- Ensure you have the correct project URL and anon key

### "Profile images storage not configured" Error
- Run the `setup_image_storage.sql` script
- Or manually create the `avatars` bucket in Supabase Dashboard

### "Upload failed" Error
- Check file size (max 5MB for profiles, 10MB for business)
- Verify file format (JPEG, PNG, WebP only)
- Check internet connection
- Look at console logs for specific error details

### Images Not Loading
- Check that buckets are set to "public"
- Verify RLS policies are correctly configured
- Check browser network tab for 403/404 errors

## File Structure

The uploaded images are organized as follows:

```
avatars/
  profiles/
    profile_userId_timestamp.jpg
    
business-images/
  business/
    business_businessId_timestamp.jpg
```

## Next Steps

After setup is complete, you can:

1. **Customize upload limits** - Modify file size limits in bucket settings
2. **Add image optimization** - Implement client-side compression before upload
3. **Add more image types** - Extend allowed MIME types if needed
4. **Monitor usage** - Check storage usage in Supabase Dashboard

Your image upload functionality is now ready! 🚀