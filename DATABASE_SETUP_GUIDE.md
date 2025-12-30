# Database Setup Guide

This guide will help you set up all the required database tables for the LMS application.

## Quick Setup

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to **SQL Editor**

2. **Run the Setup Script**
   - Copy the contents of `DATABASE_SETUP.sql`
   - Paste into the SQL Editor
   - Click **Run** to execute

3. **Verify Tables Created**
   - Go to **Table Editor** in Supabase
   - You should see these new tables:
     - `notifications`
     - `assignments`
     - `submissions`

## Required Tables Checklist

### Core Tables (Should already exist)
- [ ] `profiles` - User profiles with role and grade
- [ ] `subjects` - Subject/course information
- [ ] `lessons` - Lesson content
- [ ] `quizzes` - Quiz information
- [ ] `questions` - Quiz questions
- [ ] `options` - Question options
- [ ] `quiz_submissions` - Quiz attempt records
- [ ] `lesson_progress` - Lesson completion tracking

### New Tables (Created by setup script)
- [ ] `notifications` - User notifications
- [ ] `assignments` - Assignment information
- [ ] `submissions` - Student assignment submissions

## Manual Setup (If Script Fails)

If the script doesn't work, you can create tables manually:

### 1. Notifications Table

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);
```

### 2. Assignments Table

```sql
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMP NOT NULL,
  max_score INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_assignments_subject_id ON assignments(subject_id);

ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

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
```

### 3. Submissions Table

```sql
CREATE TABLE submissions (
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

CREATE INDEX idx_submissions_assignment_id ON submissions(assignment_id);
CREATE INDEX idx_submissions_user_id ON submissions(user_id);

ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

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

## Testing the Setup

After creating the tables, test them:

### Test Notifications
```sql
-- As admin, create a test notification
INSERT INTO notifications (user_id, type, title, message)
SELECT id, 'general', 'Test Notification', 'This is a test'
FROM profiles
WHERE role = 'student'
LIMIT 1;
```

### Test Assignments
```sql
-- As admin, create a test assignment
INSERT INTO assignments (subject_id, title, due_date)
SELECT id, 'Test Assignment', NOW() + INTERVAL '7 days'
FROM subjects
LIMIT 1;
```

### Test Submissions
```sql
-- As student, create a test submission
INSERT INTO submissions (assignment_id, user_id, content)
SELECT 
  (SELECT id FROM assignments LIMIT 1),
  auth.uid(),
  'Test submission content';
```

## Troubleshooting

### Error: "relation does not exist"
- Make sure you've created the referenced tables first (subjects, profiles)
- Check that you're in the correct database schema

### Error: "permission denied"
- Make sure RLS policies are set up correctly
- Verify your user has the correct role in the profiles table

### Error: "foreign key constraint"
- Ensure referenced tables exist
- Check that foreign key values are valid

## Next Steps

After setting up the database:
1. Test creating an assignment as admin
2. Test submitting an assignment as student
3. Test grading a submission as admin
4. Verify notifications are created automatically

For more details, see:
- `DATABASE_SCHEMA.md` - Assignments schema details
- `NOTIFICATIONS_SCHEMA.md` - Notifications schema details



