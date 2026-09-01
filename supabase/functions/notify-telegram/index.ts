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
 * Secrets required (set with `supabase secrets set`):
 *   TELEGRAM_BOT_TOKEN   from @BotFather
 *   TELEGRAM_CHAT_ID     the chat to deliver to
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

  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const chatId = Deno.env.get('TELEGRAM_CHAT_ID');
  const webhookSecret = Deno.env.get('WEBHOOK_SECRET');

  if (!botToken || !chatId) {
    console.error('TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set');
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
