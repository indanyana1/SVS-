-- Add item_details column to support_chat_threads if it doesn't exist
-- Run this in Supabase SQL Editor immediately to enable item context in chat

ALTER TABLE public.support_chat_threads
ADD COLUMN IF NOT EXISTS item_details jsonb;
