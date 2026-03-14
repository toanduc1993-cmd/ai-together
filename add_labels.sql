-- Feature #5: Add labels column to modules table (text array)
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS labels TEXT[] DEFAULT '{}';
