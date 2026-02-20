-- Migration: E2E Encryption v2
-- Adds signature column to messages table for ECDSA sender authentication
-- Ensures is_encrypted and public_key columns exist

-- 1. Add signature column to messages (stores ECDSA-P256 signature as base64)
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS signature TEXT;

COMMENT ON COLUMN public.messages.signature IS 'ECDSA-P256 digital signature of encrypted content (base64)';

-- 2. Ensure is_encrypted column exists (may already exist from original schema)
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT false;

-- 3. Ensure public_key column exists on profiles (stores JSON with encryption + signing keys)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS public_key TEXT;

COMMENT ON COLUMN public.profiles.public_key IS 'JSON containing RSA encryption key and ECDSA signing key (v2 format)';

-- 4. Create index for faster filtering of encrypted messages
CREATE INDEX IF NOT EXISTS idx_messages_is_encrypted 
ON public.messages(is_encrypted) 
WHERE is_encrypted = true;
