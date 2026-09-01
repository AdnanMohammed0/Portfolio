# Telegram notifications for contact messages

When someone submits the contact form, the row lands in `public.messages` and a
database webhook calls the `notify-telegram` Edge Function, which forwards it to
your Telegram bot.

```
Contact form  →  messages table  →  database webhook  →  Edge Function  →  Telegram
```

## Why not just call Telegram from the website

A bot token grants full control of the bot: sending as it, reading its updates,
changing its settings. This portfolio is a static frontend, so every value it
holds is readable by any visitor who opens developer tools. The token therefore
has to sit somewhere the browser cannot see — here, as a Supabase secret.

The same reasoning applies to the Supabase service-role key. Only the anon key
belongs in the frontend.

## Setup

### 1. Install the CLI and link the project

```bash
npm install -g supabase
```

```bash
supabase login
```

```bash
supabase link --project-ref glehfecoemqhodwkxpbm
```

### 2. Create the settings table

Run `supabase/integrations.sql` in the SQL editor. It creates
`integration_settings`, which holds the bot token and chat id.

That table is deliberately separate from `site_content`. `site_content` carries
a public read policy — the public site reads the hero copy from it — so
anything stored there is readable by any visitor through the REST API.
`integration_settings` has no anon policy at all: only a signed-in
administrator can read or write it.

Confirm that yourself with the anon key:

```bash
curl "https://<project>.supabase.co/rest/v1/integration_settings?select=*" -H "apikey: <anon key>"
```

It must return `[]`, never the token.

### 3. Enter the credentials in the dashboard

**/admin → Settings → Telegram notifications**

Paste the bot token and your chat id, switch **Send notifications** on, and
save.

Function secrets still work as a fallback if you would rather not store them in
the database:

```bash
supabase secrets set TELEGRAM_BOT_TOKEN=<token> TELEGRAM_CHAT_ID=<chat id>
```

### 4. Set the webhook secret

```bash
supabase secrets set WEBHOOK_SECRET=<any long random string you invent>
```

`WEBHOOK_SECRET` matters: the function URL is public, so without it anyone who
finds the URL could POST to it and push messages through your bot.

### 5. Deploy the function

`--no-verify-jwt` is required because the caller is a database webhook, not a
signed-in user. The `WEBHOOK_SECRET` header is what authenticates it instead.

```bash
supabase functions deploy notify-telegram --no-verify-jwt
```

### 6. Create the database webhook

In the dashboard: **Database → Webhooks → Create a new hook**

| Field | Value |
| --- | --- |
| Name | `notify-telegram` |
| Table | `public.messages` |
| Events | `Insert` only |
| Type | HTTP Request |
| Method | `POST` |
| URL | `https://glehfecoemqhodwkxpbm.supabase.co/functions/v1/notify-telegram` |
| HTTP Headers | `x-webhook-secret` = the same value you set above |

### 7. Test

Submit the contact form on the site, or insert a row directly:

```sql
insert into public.messages (name, email, message)
values ('Test', 'test@example.com', 'Checking the Telegram hook.');
```

The message should arrive within a second or two.

## Finding your chat id

Message your bot once, then open:

```
https://api.telegram.org/bot<token>/getUpdates
```

Read `result[0].message.chat.id` from the response.

## If nothing arrives

```bash
supabase functions logs notify-telegram
```

| Symptom | Cause |
| --- | --- |
| `401 Unauthorized` | The webhook header does not match `WEBHOOK_SECRET` |
| `Not configured` | A secret is missing — check `supabase secrets list` |
| `Telegram rejected the message` | Wrong token or chat id, or you never messaged the bot first |
| No log entries at all | The webhook is not firing — check it is enabled and set to Insert |

Telegram will not message a user who has never started a conversation with the
bot, so send it `/start` once before testing.

## Note on delivery

Sending is best-effort and deliberately decoupled: the message is already saved
in the database before the webhook runs, so a Telegram outage loses a
notification, never the message itself. Everything remains readable in the
dashboard.
