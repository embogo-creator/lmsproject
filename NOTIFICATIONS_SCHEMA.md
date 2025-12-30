# Notifications Database Schema

This document describes the notifications table required for the LMS application.

## Required Table

### `notifications`
Stores notifications for users about various events.

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
```

**Fields:**
- `id`: Unique identifier
- `user_id`: Foreign key to auth.users (who receives the notification)
- `type`: Type of notification (e.g., 'assignment', 'grade', 'lesson', 'quiz')
- `title`: Notification title/heading
- `message`: Notification message/content
- `link`: Optional link to related page (e.g., '/assignments/123')
- `read`: Whether the notification has been read
- `created_at`: Creation timestamp

## Notification Types

- `assignment_new`: New assignment created
- `assignment_due_soon`: Assignment due soon (24 hours)
- `assignment_overdue`: Assignment is overdue
- `grade_received`: Grade received for assignment
- `quiz_score`: Quiz score available
- `lesson_new`: New lesson available
- `general`: General notification

## Row Level Security (RLS) Policies

```sql
-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can create notifications for any user
CREATE POLICY "Admins can create notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- System can create notifications (via service role or function)
-- Note: This might require a service role key or database function
```

## Indexes

```sql
-- Index for faster queries
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
```

## Database Functions (Optional)

### Function to create notifications for all students in a grade

```sql
CREATE OR REPLACE FUNCTION notify_grade_students(
  p_grade TEXT,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_link TEXT
)
RETURNS void AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, message, link)
  SELECT id, p_type, p_title, p_message, p_link
  FROM profiles
  WHERE grade = p_grade AND role = 'student';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Function to create notification for assignment creation

```sql
CREATE OR REPLACE FUNCTION notify_new_assignment(
  p_assignment_id UUID,
  p_subject_id UUID
)
RETURNS void AS $$
DECLARE
  v_grade TEXT;
  v_title TEXT;
BEGIN
  -- Get the target grade for this assignment
  SELECT target_grade INTO v_grade
  FROM subjects
  WHERE id = p_subject_id;

  -- Get assignment title
  SELECT title INTO v_title
  FROM assignments
  WHERE id = p_assignment_id;

  -- Create notifications for all students in that grade
  INSERT INTO notifications (user_id, type, title, message, link)
  SELECT 
    profiles.id,
    'assignment_new',
    'New Assignment: ' || v_title,
    'A new assignment has been created for your grade.',
    '/assignments/' || p_assignment_id
  FROM profiles
  WHERE grade = v_grade AND role = 'student';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Usage Notes

1. **Notification Creation**: Notifications can be created:
   - Manually by admins
   - Automatically via database triggers
   - Via application code when events occur

2. **Mark as Read**: Users can mark notifications as read individually or all at once.

3. **Cleanup**: Consider adding a cleanup job to delete old read notifications (e.g., older than 30 days).

4. **Real-time Updates**: For real-time notifications, consider using Supabase Realtime subscriptions.



