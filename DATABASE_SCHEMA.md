# Database Schema Documentation

This document describes the database tables required for the LMS application. These tables should be created in your Supabase project.

## Required Tables

### 1. `assignments`
Stores assignment information created by admins.

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
```

**Fields:**
- `id`: Unique identifier
- `subject_id`: Foreign key to subjects table
- `title`: Assignment title
- `description`: Assignment instructions/description
- `due_date`: Due date and time
- `max_score`: Maximum possible score (optional)
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

### 2. `submissions`
Stores student submissions for assignments.

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
```

**Fields:**
- `id`: Unique identifier
- `assignment_id`: Foreign key to assignments table
- `user_id`: Foreign key to auth.users (student who submitted)
- `content`: Submission text content
- `file_url`: Optional file attachment URL (for future file upload feature)
- `submitted_at`: Submission timestamp
- `score`: Grade/score given by admin (null until graded)
- `feedback`: Feedback from admin (optional)
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp
- **Unique constraint**: One submission per user per assignment

## Row Level Security (RLS) Policies

### Assignments Table

```sql
-- Enable RLS
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage assignments"
  ON assignments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Students can view assignments for their grade
CREATE POLICY "Students can view assignments"
  ON assignments
  FOR SELECT
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

### Submissions Table

```sql
-- Enable RLS
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Students can view and create their own submissions
CREATE POLICY "Students can manage own submissions"
  ON submissions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all submissions
CREATE POLICY "Admins can view all submissions"
  ON submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can update submissions (for grading)
CREATE POLICY "Admins can grade submissions"
  ON submissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

## Indexes (Optional but Recommended)

```sql
-- Index for faster queries
CREATE INDEX idx_assignments_subject_id ON assignments(subject_id);
CREATE INDEX idx_assignments_due_date ON assignments(due_date);
CREATE INDEX idx_submissions_assignment_id ON submissions(assignment_id);
CREATE INDEX idx_submissions_user_id ON submissions(user_id);
CREATE INDEX idx_submissions_submitted_at ON submissions(submitted_at);
```

## Notes

1. **File Uploads**: The `file_url` field in submissions is prepared for future file upload functionality using Supabase Storage.

2. **Grading**: Admins can update submissions to add scores and feedback. Once graded, students can view but not edit their submissions.

3. **Unique Constraint**: The unique constraint on `(assignment_id, user_id)` ensures each student can only submit once per assignment. If you want to allow resubmissions, you can remove this constraint.

4. **Cascade Deletes**: Assignments are deleted when a subject is deleted. Submissions are deleted when an assignment is deleted.

5. **Timestamps**: Consider adding triggers to automatically update `updated_at` fields:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```



