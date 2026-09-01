-- =====================================================================
--  Database webhook: new contact message -> notify-telegram function
--
--  The dashboard has moved its "Database Webhooks" screen between Supabase
--  versions (Database -> Webhooks, then Integrations -> Database Webhooks).
--  This does the same thing in SQL, so it works regardless of where the UI
--  currently keeps it. A dashboard webhook is itself only a trigger calling
--  pg_net, which is exactly what this creates.
--
--  Run after integrations.sql, and after deploying the Edge Function.
-- =====================================================================

-- pg_net performs the outbound HTTP call asynchronously, so the insert is
-- never blocked waiting on Telegram.
create extension if not exists pg_net with schema extensions;

/**
 * The shared secret the Edge Function checks.
 *
 * Kept in Supabase Vault rather than written into the trigger body: function
 * source is readable from pg_catalog, and this value is what stops anyone who
 * finds the public function URL from pushing messages through your bot.
 *
 * Replace the value, then run this block once.
 */
-- select vault.create_secret('<the same value you gave WEBHOOK_SECRET>', 'telegram_webhook_secret');

-- To rotate it later:
-- select vault.update_secret(
--   (select id from vault.secrets where name = 'telegram_webhook_secret'),
--   '<new value>'
-- );

create or replace function public.notify_telegram_on_message()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  secret text;
begin
  select decrypted_secret into secret
  from vault.decrypted_secrets
  where name = 'telegram_webhook_secret';

  perform net.http_post(
    url := 'https://glehfecoemqhodwkxpbm.supabase.co/functions/v1/notify-telegram',
    headers := jsonb_build_object(
      'Content-Type',      'application/json',
      'x-webhook-secret',  coalesce(secret, '')
    ),
    -- Shape matches what the Edge Function expects.
    body := jsonb_build_object(
      'type',   'INSERT',
      'table',  'messages',
      'record', to_jsonb(new)
    )
  );

  return new;
exception
  when others then
    -- Never let a notification failure roll back the message itself.
    raise warning 'notify_telegram_on_message failed: %', sqlerrm;
    return new;
end;
$$;

drop trigger if exists on_message_created on public.messages;
create trigger on_message_created
  after insert on public.messages
  for each row
  execute function public.notify_telegram_on_message();

-- ---------------------------------------------------------------------
--  Checks
-- ---------------------------------------------------------------------

-- The trigger exists:
-- select tgname from pg_trigger where tgrelid = 'public.messages'::regclass;

-- Fire it:
-- insert into public.messages (name, email, message)
-- values ('Test', 'test@example.com', 'Checking the Telegram hook.');

-- What pg_net actually sent, and what came back:
-- select id, created, status_code, content
-- from net._http_response order by created desc limit 5;
