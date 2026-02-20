-- Add video_url and document_url columns to hall_of_shame
ALTER TABLE hall_of_shame ADD COLUMN IF NOT EXISTS video_url text;
ALTER TABLE hall_of_shame ADD COLUMN IF NOT EXISTS document_url text;

-- Add 'text' value to proof_type enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'text' AND enumtypid = 'proof_type'::regtype) THEN
    ALTER TYPE proof_type ADD VALUE 'text';
  END IF;
END
$$;
