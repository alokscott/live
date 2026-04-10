# Altura Accounting

A fund deployment tracking application with 0.5% weekly compound interest calculation.

## Features

- Admin authentication via Supabase Auth
- Track fund deployments with amount and date
- Automatic 0.5% weekly compound interest calculation
- Interest only accrues after the first complete Monday-Sunday week
- Dashboard with real-time portfolio value display
- Public API endpoint with CORS support for totals + deposits data

## Interest Calculation

The application calculates 0.5% compound interest per complete week:

- Interest starts after the first complete Monday-Sunday week following the deposit
- Example: If you deposit on Tuesday, Jan 13th:
  - First coming Monday: Jan 19th
  - Interest starts (2nd coming Monday): Jan 26th
- Formula: `Current Value = Principal × 1.005^weeks`

## Setup

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and anon key from Settings > API

### 2. Create the Database Table

Run the following SQL in your Supabase SQL Editor:

```sql
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
```

### 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PUBLIC_API_CORS_ORIGINS=*
```

`PUBLIC_API_CORS_ORIGINS` accepts either `*` or a comma-separated allowlist:
`https://your-site.com,https://dashboard.your-site.com`

`SUPABASE_SERVICE_ROLE_KEY` is required by the server API route and must never be exposed to the client.

### 4. Install Dependencies & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### 5. Create an Admin Account

1. Click "Sign up" on the login page
2. Enter your email and password
3. Confirm your email (check Supabase Auth settings for email confirmation)
4. Log in and start tracking deposits

## Public API

Single endpoint for totals, deposit rows, and related metrics:

`GET /api/public/deposits`

Example:

```bash
curl "http://localhost:3000/api/public/deposits"
```

Response includes:

- `scope`: `all_users`
- `totals`: `principal`, `currentValue`, `interest`
- `stats`: `depositCount`, `averageDeposit`, `firstDepositDate`, `latestDepositDate`
- `deposits`: each deposit with amount, interest, current value, weeks earned, and key date milestones

## Tech Stack

- **Frontend**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Login page
│   ├── dashboard/
│   │   └── page.tsx        # Main dashboard
│   └── globals.css         # Tailwind styles
├── components/
│   ├── AuthGuard.tsx       # Protected route wrapper
│   ├── DepositForm.tsx     # Form to add deposits
│   └── DepositTable.tsx    # Table showing deposits
└── lib/
    ├── supabase.ts         # Supabase client
    └── interest.ts         # Interest calculation utilities
```
