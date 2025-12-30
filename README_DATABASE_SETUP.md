# Database Setup Required ⚠️

## Issue
You're seeing 404 errors because the following database tables don't exist yet:
- `notifications`
- `assignments`
- `submissions`

## Quick Fix

1. **Open Supabase Dashboard**
   - Go to your Supabase project: https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run the Setup Script**
   - Open the file `DATABASE_SETUP.sql` in this project
   - Copy ALL the contents
   - Paste into the SQL Editor
   - Click "Run" (or press Ctrl+Enter)

4. **Verify Tables Created**
   - Go to "Table Editor" in Supabase
   - You should now see:
     - ✅ `notifications`
     - ✅ `assignments`
     - ✅ `submissions`

## What the Script Does

The setup script will:
- Create the 3 missing tables
- Set up Row Level Security (RLS) policies
- Create necessary indexes for performance
- Set up automatic timestamp updates

## After Setup

Once the tables are created:
1. Refresh your application
2. The 404 errors should disappear
3. You can now:
   - Create assignments (as admin)
   - Submit assignments (as student)
   - Receive notifications
   - Grade submissions (as admin)

## Need Help?

See `DATABASE_SETUP_GUIDE.md` for:
- Detailed setup instructions
- Manual table creation (if script fails)
- Troubleshooting tips
- Testing queries

## Current Status

The application will continue to work, but these features won't function until tables are created:
- ❌ Notifications (bell icon will show 0)
- ❌ Assignments (page will be empty)
- ❌ Submissions (can't submit assignments)

All other features (lessons, quizzes, dashboard) should work fine!



