-- Use this SQL in your Supabase SQL Editor to reset the admin password.
-- Run this ONCE manually in https://supabase.com/dashboard/project/mrgkjzsmpsqisuzhlyox/sql/new

-- We need pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Replace 'admin@urlm.app' with the admin's email if different
UPDATE auth.users 
SET encrypted_password = crypt('Admin@7869', gen_salt('bf'))
WHERE email = 'admin@urlm.app';

-- Ensure the admin role is also correct in the profiles table
UPDATE public.profiles
SET role = 'admin',
    status = 'active'
WHERE email = 'admin@urlm.app';
