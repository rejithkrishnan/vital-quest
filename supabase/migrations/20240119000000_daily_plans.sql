-- Create daily_plans table
create table if not exists public.daily_plans (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) not null,
    date date not null default CURRENT_DATE,
    summary text,
    created_at timestamptz default now() not null,
    unique(user_id, date)
);

-- Create plan_tasks table
create table if not exists public.plan_tasks (
    id uuid default gen_random_uuid() primary key,
    plan_id uuid references public.daily_plans(id) on delete cascade not null,
    description text not null,
    is_completed boolean default false not null,
    xp_reward integer default 10 not null,
    task_type text, -- 'workout', 'nutrition', 'mindfulness', etc.
    created_at timestamptz default now() not null
);

-- Enable RLS
alter table public.daily_plans enable row level security;
alter table public.plan_tasks enable row level security;

-- Policies for daily_plans
create policy "Users can view their own plans"
    on public.daily_plans for select
    using (auth.uid() = user_id);

create policy "Users can insert their own plans"
    on public.daily_plans for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own plans"
    on public.daily_plans for update
    using (auth.uid() = user_id);

-- Policies for plan_tasks
-- We check if the associated plan belongs to the user
create policy "Users can view their own tasks"
    on public.plan_tasks for select
    using (
        exists (
            select 1 from public.daily_plans
            where daily_plans.id = plan_tasks.plan_id
            and daily_plans.user_id = auth.uid()
        )
    );

create policy "Users can insert tasks for their own plans"
    on public.plan_tasks for insert
    with check (
        exists (
            select 1 from public.daily_plans
            where daily_plans.id = plan_tasks.plan_id
            and daily_plans.user_id = auth.uid()
        )
    );

create policy "Users can update their own tasks"
    on public.plan_tasks for update
    using (
        exists (
            select 1 from public.daily_plans
            where daily_plans.id = plan_tasks.plan_id
            and daily_plans.user_id = auth.uid()
        )
    );
