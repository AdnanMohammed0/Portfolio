/**
 * Forwards a new contact message to Telegram.
 *
 * Runs as a Supabase Edge Function, triggered by a database webhook on INSERT
 * into `public.messages`.
 *
 * Why server-side: a Telegram bot token grants full control of the bot. The
 * portfolio is a static frontend, so anything it holds is readable by every
 * visitor — the token has to live here, as a Supabase secret, and never reach
 * the browser.
 *
 * Credentials are read from `public.integration_settings`, which the dashboard
 * edits and only administrators can access. `TELEGRAM_BOT_TOKEN` and
 * `TELEGRAM_CHAT_ID` function secrets still work as a fallback.
 *
 * Required secret:
 *   WEBHOOK_SECRET       shared value the database webhook sends back
 */

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  created_at: string;
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: ContactMessage | null;
}

interface TelegramSettings {
  enabled: boolean;
  bot_token: string;
  chat_id: string;
}

/**
 * Reads the credentials an administrator saved in the dashboard.
 *
 * Returns null when the table is missing or unreadable, so the function still
 * works from function secrets alone.
 */
async function loadTelegramSettings(): Promise<TelegramSettings | null> {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return null;

  try {
    const response = await fetch(
      `${url}/rest/v1/integration_settings?key=eq.telegram&select=value`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
    );
    if (!response.ok) return null;
    const rows = (await response.json()) as Array<{ value: Partial<TelegramSettings> }>;
    const value = rows[0]?.value;
    if (!value) return null;
    return {
      enabled: value.enabled ?? true,
      bot_token: (value.bot_token ?? '').trim(),
      chat_id: (value.chat_id ?? '').trim(),
    };
  } catch (cause) {
    console.error('Could not read integration_settings:', cause);
    return null;
  }
}

/** Telegram's HTML mode needs these escaped or the message fails to send. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const webhookSecret = Deno.env.get('WEBHOOK_SECRET');

  /**
   * Credentials come from the dashboard first, falling back to function
   * secrets. Reading them needs the service-role key, which Supabase injects
   * into the function environment — `integration_settings` is closed to
   * everyone except administrators and this function.
   */
  const settings = await loadTelegramSettings();

  const botToken = settings?.bot_token || Deno.env.get('TELEGRAM_BOT_TOKEN');
  const chatId = settings?.chat_id || Deno.env.get('TELEGRAM_CHAT_ID');

  if (settings && settings.enabled === false) {
    return new Response('Notifications disabled', { status: 200 });
  }

  if (!botToken || !chatId) {
    console.error('No Telegram bot token or chat id configured');
    return new Response('Not configured', { status: 500 });
  }

  /**
   * The function URL is public, so without this anyone could POST to it and
   * send themselves messages through your bot.
   */
  if (webhookSecret) {
    const provided = request.headers.get('x-webhook-secret');
    if (provided !== webhookSecret) {
      return new Response('Unauthorized', { status: 401 });
    }
  }

  let payload: WebhookPayload;
  try {
    payload = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const record = payload.record;
  if (payload.type !== 'INSERT' || !record) {
    // Nothing to do — acknowledge so the webhook is not retried.
    return new Response('Ignored', { status: 200 });
  }

  const text = [
    '📬 <b>New message from your portfolio</b>',
    '',
    `<b>From:</b> ${escapeHtml(truncate(record.name, 120))}`,
    `<b>Email:</b> ${escapeHtml(truncate(record.email, 160))}`,
    '',
    escapeHtml(truncate(record.message, 3000)),
  ].join('\n');

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error('Telegram rejected the message:', response.status, detail);
    // A 500 makes Supabase retry, which is what we want for a transient fault.
    return new Response('Telegram delivery failed', { status: 500 });
  }

  return new Response('Sent', { status: 200 });
});
