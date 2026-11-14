-- Runs the notification sender every 5 minutes. Project-specific (uses this project's URL):
-- paste into the SQL Editor once after deploying the send-notifications function.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.unschedule('btg-send-notifications')
where exists (select 1 from cron.job where jobname = 'btg-send-notifications');

select cron.schedule(
  'btg-send-notifications',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://enzodgpgtmqlxxqprdbn.supabase.co/functions/v1/send-notifications',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
