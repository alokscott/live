-- Create the deposits table
CREATE TABLE IF NOT EXISTS public.deposits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    deposit_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index for faster queries by user
CREATE INDEX IF NOT EXISTS idx_deposits_user_id ON public.deposits(user_id);

-- Enable Row Level Security
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own deposits
CREATE POLICY "Users can view own deposits" ON public.deposits
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own deposits
CREATE POLICY "Users can insert own deposits" ON public.deposits
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own deposits
CREATE POLICY "Users can update own deposits" ON public.deposits
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own deposits
CREATE POLICY "Users can delete own deposits" ON public.deposits
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create the closures table (frozen snapshots of closed positions)
CREATE TABLE IF NOT EXISTS public.closures (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    deposit_id UUID NOT NULL UNIQUE REFERENCES public.deposits(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    principal DECIMAL(15, 2) NOT NULL,
    interest_redeemed DECIMAL(15, 2) NOT NULL,
    total_payout DECIMAL(15, 2) NOT NULL,
    weeks_elapsed INT NOT NULL,
    closure_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_closures_user_id ON public.closures(user_id);
CREATE INDEX IF NOT EXISTS idx_closures_deposit_id ON public.closures(deposit_id);

-- Enable Row Level Security
ALTER TABLE public.closures ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own closures
CREATE POLICY "Users can view own closures" ON public.closures
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own closures
CREATE POLICY "Users can insert own closures" ON public.closures
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own closures
CREATE POLICY "Users can delete own closures" ON public.closures
    FOR DELETE
    USING (auth.uid() = user_id);
