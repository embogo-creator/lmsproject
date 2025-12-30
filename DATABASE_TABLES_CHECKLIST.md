# Database Tables Checklist for Performance Dashboard

## Required Tables

The Performance Dashboard uses the following tables. Make sure all of these exist in your Supabase database:

### ✅ Core Tables (Should Already Exist)
- [x] `profiles` - User profiles with grade and role
- [x] `subjects` - Subject/course information
- [x] `lessons` - Lesson content
- [x] `lesson_progress` - Tracks which lessons users have completed
- [x] `quiz_submissions` - Quiz attempt records with scores

### ⚠️ Optional Tables (For Full Functionality)
- [ ] `assignments` - Assignment information (for assignment stats)
- [ ] `submissions` - Student assignment submissions (for assignment stats)

## What Works Without Optional Tables

The Performance Dashboard will still work without `assignments` and `submissions` tables:
- ✅ Lessons completed count
- ✅ Quiz average score
- ❌ Assignment average (will show "N/A")

## Database Setup

If you need to create the optional tables, run this SQL in Supabase SQL Editor:

```sql
-- Create assignments table
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMP NOT NULL,
  max_score INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  file_url TEXT,
  submitted_at TIMESTAMP DEFAULT NOW(),
  score INTEGER,
  feedback TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(assignment_id, user_id)
);

-- Enable RLS
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assignments
CREATE POLICY "Admins can manage assignments"
  ON assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Students can view assignments"
  ON assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM subjects
      WHERE subjects.id = assignments.subject_id
      AND subjects.target_grade = (
        SELECT grade FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- RLS Policies for submissions
CREATE POLICY "Students can manage own submissions"
  ON submissions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all submissions"
  ON submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can grade submissions"
  ON submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

## Verification

After setup, verify tables exist:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('assignments', 'submissions', 'quiz_submissions', 'lesson_progress')
ORDER BY table_name;
```

## Current Status

The Performance Dashboard widget on the main dashboard will:
- ✅ Always show lessons progress (if you have lessons)
- ✅ Show quiz average (if you have quiz submissions)
- ⚠️ Show "N/A" for assignment average if tables don't exist (this is fine!)

The app handles missing tables gracefully, so it won't crash.



