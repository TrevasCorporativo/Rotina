import { NextResponse } from 'next/server';
import * as webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/admin';

function configureVapid() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@rotina.app';
  if (!publicKey || !privateKey) {
    throw new Error('VAPID keys not configured');
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

function getNowInTimeZone(timeZone: string) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const isoLocal = `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}`;
  return new Date(`${isoLocal}Z`).getTime();
}

function toPseudoUtcMs(dateStr: string, timeStr: string) {
  const normalizedTime = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  return new Date(`${dateStr}T${normalizedTime}Z`).getTime();
}

async function sendToUserDevices(
  admin: ReturnType<typeof createAdminClient>,
  subs: Array<{ id: string; endpoint: string; p256dh: string; auth: string }>,
  payload: { title: string; body: string; url: string; tag: string }
) {
  let delivered = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload)
      );
      delivered++;
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number })?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await admin.from('push_subscriptions').delete().eq('id', sub.id);
      }
    }
  }
  return delivered;
}

export async function GET(request: Request) {
  return handleDispatch(request);
}

export async function POST(request: Request) {
  return handleDispatch(request);
}

async function handleDispatch(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    const url = new URL(request.url);
    const querySecret = url.searchParams.get('secret');
    if (authHeader !== `Bearer ${cronSecret}` && querySecret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  configureVapid();
  const admin = createAdminClient();

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, timezone, notify_tasks, notify_events');

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p])
  );

  const { data: subscriptions } = await admin
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth');

  const subsByUser = new Map<
    string,
    Array<{ id: string; endpoint: string; p256dh: string; auth: string }>
  >();

  for (const sub of subscriptions ?? []) {
    const list = subsByUser.get(sub.user_id) ?? [];
    list.push(sub);
    subsByUser.set(sub.user_id, list);
  }

  let sentEvents = 0;
  let sentTasks = 0;

  // 1. Dispatch due events
  const { data: pendingEvents } = await admin
    .from('events')
    .select('id, user_id, title, event_date, event_time, location, notify_minutes_before')
    .eq('notify_enabled', true)
    .is('notified_at', null);

  for (const ev of pendingEvents ?? []) {
    const prof = profileMap.get(ev.user_id);
    if (prof && !prof.notify_events) continue;
    const subs = subsByUser.get(ev.user_id);
    if (!subs || subs.length === 0) continue;

    const tz = prof?.timezone || 'America/Sao_Paulo';
    const nowMs = getNowInTimeZone(tz);
    const eventMs = toPseudoUtcMs(ev.event_date, ev.event_time || '09:00:00');
    const triggerMs = eventMs - (ev.notify_minutes_before ?? 15) * 60_000;
    const staleCutoffMs = eventMs + 12 * 3600_000;

    if (nowMs >= triggerMs && nowMs <= staleCutoffMs) {
      const timeLabel = (ev.event_time || '').slice(0, 5);
      const bodyParts = [`Às ${timeLabel}`];
      if (ev.location) bodyParts.push(ev.location);

      const delivered = await sendToUserDevices(admin, subs, {
        title: `Compromisso: ${ev.title}`,
        body: bodyParts.join(' · '),
        url: '/?view=calendar',
        tag: `event-${ev.id}`,
      });

      if (delivered > 0) {
        await admin
          .from('events')
          .update({ notified_at: new Date().toISOString() })
          .eq('id', ev.id);
        sentEvents++;
      }
    }
  }

  // 2. Dispatch due tasks
  const { data: pendingTasks } = await admin
    .from('tasks')
    .select('id, user_id, title, category, due_date, due_time')
    .eq('done', false)
    .eq('notify_enabled', true)
    .is('notified_at', null)
    .not('due_date', 'is', null);

  for (const task of pendingTasks ?? []) {
    if (!task.due_date) continue;
    const prof = profileMap.get(task.user_id);
    if (prof && !prof.notify_tasks) continue;
    const subs = subsByUser.get(task.user_id);
    if (!subs || subs.length === 0) continue;

    const tz = prof?.timezone || 'America/Sao_Paulo';
    const nowMs = getNowInTimeZone(tz);
    const taskMs = toPseudoUtcMs(task.due_date, task.due_time || '09:00:00');
    const staleCutoffMs = taskMs + 24 * 3600_000;

    if (nowMs >= taskMs && nowMs <= staleCutoffMs) {
      const delivered = await sendToUserDevices(admin, subs, {
        title: `Tarefa pendente: ${task.title}`,
        body: `${task.category}${task.due_time ? ` · ${task.due_time.slice(0, 5)}` : ' · Hoje'}`,
        url: '/?view=tasks',
        tag: `task-${task.id}`,
      });

      if (delivered > 0) {
        await admin
          .from('tasks')
          .update({ notified_at: new Date().toISOString() })
          .eq('id', task.id);
        sentTasks++;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    sentEvents,
    sentTasks,
  });
}
