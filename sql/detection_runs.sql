create index if not exists readings_created_at_idx on public.readings (created_at);

create or replace function public.detection_runs(since timestamptz)
returns table (started_at timestamptz, ended_at timestamptz)
language sql stable
as $$
  with r as (
    select
      created_at,
      value > 0 as is_on,
      lag(value > 0) over (order by created_at) as prev_on,
      lead(created_at) over (order by created_at) as next_at
    from public.readings
    where created_at >= since
  ),
  g as (
    select *,
      sum(case when is_on is distinct from prev_on then 1 else 0 end)
        over (order by created_at) as grp
    from r
  )
  select
    min(created_at) as started_at,
    max(created_at + least(coalesce(next_at - created_at, interval '0'), interval '5 seconds')) as ended_at
  from g
  where is_on
  group by grp
  order by started_at desc
  limit 1000;
$$;

grant execute on function public.detection_runs(timestamptz) to anon;
