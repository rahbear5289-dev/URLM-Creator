-- Create sheets table for tracking A4 sheet generations
CREATE TABLE IF NOT EXISTS public.sheets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  photo_count INTEGER DEFAULT 0,
  bg_color TEXT DEFAULT '#ffffff',
  file_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create activity_logs table for tracking user activity
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  file_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subscriptions table for tracking paid plans
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id TEXT NOT NULL DEFAULT 'free',
  billing_cycle TEXT DEFAULT 'monthly',
  razorpay_subscription_id TEXT,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  status TEXT DEFAULT 'active',
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sheets_user_id ON public.sheets(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);

-- Enable Row Level Security
ALTER TABLE public.sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies for users to access their own data
CREATE POLICY "Users can view their own sheets" ON public.sheets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sheets" ON public.sheets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own activity logs" ON public.activity_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity logs" ON public.activity_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own subscriptions" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions" ON public.subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" ON public.subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Add plan and storage columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS storage_used BIGINT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS storage_limit BIGINT DEFAULT 2147483648;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_id TEXT DEFAULT 'free';

-- Create tokens table for tracking deployed tokens
CREATE TABLE IF NOT EXISTS public.tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  supply TEXT NOT NULL,
  network TEXT DEFAULT '11155111',
  contract_address TEXT,
  tx_hash TEXT,
  expiration_date TIMESTAMP WITH TIME ZONE,
  mintable BOOLEAN DEFAULT TRUE,
  burnable BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create policies for tokens table
ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tokens are viewable by everyone" ON public.tokens FOR SELECT USING (true);
CREATE POLICY "Tokens can be inserted by authenticated users" ON public.tokens FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create function to increment storage
CREATE OR REPLACE FUNCTION public.increment_storage(user_id UUID, bytes_to_add BIGINT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles 
  SET storage_used = COALESCE(storage_used, 0) + bytes_to_add
  WHERE id = user_id;
END;
$$;

-- Create function to upgrade user to pro
CREATE OR REPLACE FUNCTION public.upgrade_to_pro(user_id UUID, plan_id TEXT, billing_cycle TEXT, payment_id TEXT, order_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  end_date_val TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate end date based on billing cycle
  IF billing_cycle = 'yearly' THEN
    end_date_val := NOW() + INTERVAL '1 year';
  ELSE
    end_date_val := NOW() + INTERVAL '1 month';
  END IF;
  
  -- Update profiles table
  UPDATE public.profiles 
  SET is_pro = TRUE, plan_id = plan_id
  WHERE id = user_id;
  
  -- Insert subscription record
  INSERT INTO public.subscriptions (user_id, plan_id, billing_cycle, razorpay_order_id, razorpay_payment_id, status, end_date)
  VALUES (user_id, plan_id, billing_cycle, order_id, payment_id, 'active', end_date_val);
END;
$$;

-- Add status field to photos table
ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';
