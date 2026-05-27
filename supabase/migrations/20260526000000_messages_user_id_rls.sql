-- Step 1: add user_id (nullable so backfill can run first)
ALTER TABLE messages
  ADD COLUMN user_id uuid REFERENCES auth.users(id);

-- Step 2: backfill existing rows from their parent conversation
UPDATE messages m
SET user_id = c.user_id
FROM conversations c
WHERE m.conversation_id = c.id;

-- Step 3: lock it down — NOT NULL + auto-populate from JWT on future inserts
ALTER TABLE messages
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Step 4: enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Step 5: policies
CREATE POLICY "Users can view their own messages"
  ON messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);
