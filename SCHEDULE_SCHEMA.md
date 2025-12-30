# Schedule/Events Database Schema

This document describes the events/schedule table for the LMS application.

## Required Table

### `events`
Stores scheduled events, classes, and important dates.

```sql
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  type TEXT NOT NULL DEFAULT 'class',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Fields:**
- `id`: Unique identifier
- `subject_id`: Foreign key to subjects table (optional - can be null for general events)
- `title`: Event title
- `description`: Event description/details
- `start_time`: Event start date and time
- `end_time`: Event end date and time (optional)
- `type`: Event type ('class', 'exam', 'assignment_due', 'holiday', 'general')
- `created_by`: User who created the event (for admins)
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

## Event Types

- `class` - Regular class session
- `exam` - Examination/test
- `assignment_due` - Assignment due date (can be auto-generated)
- `holiday` - Holiday/break
- `general` - General event/announcement

## Row Level Security (RLS) Policies

```sql
-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Admins can manage all events
CREATE POLICY "Admins can manage events"
  ON events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Students can view events for their grade
CREATE POLICY "Students can view events"
  ON events
  FOR SELECT
  USING (
    -- Events without subject (general events) are visible to all
    subject_id IS NULL
    OR
    -- Events for subjects in student's grade
    EXISTS (
      SELECT 1 FROM subjects
      WHERE subjects.id = events.subject_id
      AND subjects.target_grade = (
        SELECT grade FROM profiles WHERE id = auth.uid()
      )
    )
  );
```

## Indexes

```sql
-- Index for faster queries
CREATE INDEX idx_events_start_time ON events(start_time);
CREATE INDEX idx_events_subject_id ON events(subject_id);
CREATE INDEX idx_events_type ON events(type);
```

## Auto-Generate Assignment Due Dates (Optional)

You can create a function to automatically create events when assignments are created:

```sql
CREATE OR REPLACE FUNCTION create_assignment_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO events (subject_id, title, start_time, type, created_by)
  VALUES (
    NEW.subject_id,
    'Assignment Due: ' || NEW.title,
    NEW.due_date,
    'assignment_due',
    (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assignment_event_trigger
  AFTER INSERT ON assignments
  FOR EACH ROW
  EXECUTE FUNCTION create_assignment_event();
```

## Usage Notes

1. **Event Creation**: Events can be created manually by admins or automatically via triggers
2. **Subject Association**: Events can be linked to subjects or be general (subject_id = null)
3. **Grade Filtering**: Students only see events for their grade level
4. **Auto-Events**: Assignment due dates can be automatically added as events

## Setup Instructions

Run this SQL in Supabase SQL Editor:

```sql
-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  type TEXT NOT NULL DEFAULT 'class',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_subject_id ON events(subject_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage events"
  ON events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Students can view events"
  ON events FOR SELECT
  USING (
    subject_id IS NULL
    OR
    EXISTS (
      SELECT 1 FROM subjects
      WHERE subjects.id = events.subject_id
      AND subjects.target_grade = (
        SELECT grade FROM profiles WHERE id = auth.uid()
      )
    )
  );
```



