import { NextResponse } from 'next/server';
import * as webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/admin';
import { getDailyMotivation, getDailyVerse } from '@/lib/daily-messages';

function configureVapid() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@rotina.app';
  if (!publicKey || !privateKey) {
    throw new Error('VAPID keys not configured');
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

function getLocalClock(timeZone: string) {
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
  const dateStr = `${map.year}-${map.month}-${map.day}`;
  const isoLocal = `${dateStr}T${map.hour}:${map.minute}:${map.second}`;
  return {
    dateStr,
    hour: Number(map.hour),
    nowMs: new Date(`${isoLocal}Z`).getTime(),
  };
}

function toPseudoUtcMs(dateStr: string, timeStr: string) {
  const normalizedTime = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  return new Date(`${dateStr}T${normalizedTime}Z`).getTime();
}

function computeTriggerMs(
  dateStr: string,
  timeStr: string,
  preset: string | null | undefined,
  minutesBefore: number
) {
  if (preset === 'same_day_08') {
    return toPseudoUtcMs(dateStr, '08:00:00');
  }
  if (preset === 'day_before_08') {
    return toPseudoUtcMs(dateStr, '08:00:00') - 24 * 3600_000;
  }
  if (preset === 'day_before_20') {
    return toPseudoUtcMs(dateStr, '20:00:00') - 24 * 3600_000;
  }
  if (preset && preset.startsWith('relative:')) {
    const mins = Number(preset.split(':')[1] || 0);
    return toPseudoUtcMs(dateStr, timeStr) - mins * 60_000;
  }
  return toPseudoUtcMs(dateStr, timeStr) - minutesBefore * 60_000;
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
  const url = new URL(request.url);
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    const querySecret = url.searchParams.get('secret');
    if (authHeader !== `Bearer ${cronSecret}` && querySecret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const forceDaily = url.searchParams.get('forceDaily') === '1';

  configureVapid();
  const admin = createAdminClient();

  const { data: profiles } = await admin
    .from('profiles')
    .select(
      'id, display_name, timezone, notify_tasks, notify_events, last_daily_summary_date, last_daily_inspiration_date'
    );

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

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
  let sentDailySummaries = 0;
  let sentDailyInspirations = 0;

  // 1. Dispatch due events (both one-off and unlimited weekly recurring)
  const { data: pendingEvents } = await admin
    .from('events')
    .select(
      'id, user_id, title, event_date, event_time, location, notes, notify_minutes_before, reminder_preset, recurrence_days, last_notified_date, notified_at'
    )
    .eq('notify_enabled', true);

  for (const ev of pendingEvents ?? []) {
    const isRecurring =
      Array.isArray(ev.recurrence_days) && ev.recurrence_days.length > 0;
    if (!isRecurring && ev.notified_at) continue;

    const prof = profileMap.get(ev.user_id);
    if (prof && !prof.notify_events) continue;
    const subs = subsByUser.get(ev.user_id);
    if (!subs || subs.length === 0) continue;

    const tz = prof?.timezone || 'America/Sao_Paulo';
    const { dateStr, nowMs } = getLocalClock(tz);

    // Determine target date to evaluate
    let targetDate = ev.event_date;
    if (isRecurring) {
      if (dateStr < ev.event_date) continue;
      const dow = new Date(`${dateStr}T12:00:00Z`).getUTCDay();
      if (!ev.recurrence_days.includes(dow)) continue;
      if (ev.last_notified_date === dateStr) continue;
      targetDate = dateStr;
    }

    const eventMs = toPseudoUtcMs(targetDate, ev.event_time || '09:00:00');
    const triggerMs = computeTriggerMs(
      targetDate,
      ev.event_time || '09:00:00',
      ev.reminder_preset,
      ev.notify_minutes_before ?? 15
    );
    const staleCutoffMs = eventMs + 12 * 3600_000;

    if (nowMs >= triggerMs && nowMs <= staleCutoffMs) {
      const timeLabel = (ev.event_time || '').slice(0, 5);
      const bodyParts = [`Às ${timeLabel}`];
      if (ev.location) bodyParts.push(ev.location);
      if (ev.notes) bodyParts.push(ev.notes);

      const delivered = await sendToUserDevices(admin, subs, {
        title: `Compromisso: ${ev.title}`,
        body: bodyParts.join(' · '),
        url: '/agenda',
        tag: `event-${ev.id}-${targetDate}`,
      });

      if (delivered > 0) {
        await admin
          .from('events')
          .update(
            isRecurring
              ? { last_notified_date: targetDate }
              : { notified_at: new Date().toISOString() }
          )
          .eq('id', ev.id);
        sentEvents++;
      }
    }
  }

  // 2. Dispatch due tasks (supports multiple reminder_presets)
  const { data: pendingTasks } = await admin
    .from('tasks')
    .select(
      'id, user_id, title, category, due_date, due_time, reminder_preset, reminder_presets, notified_presets'
    )
    .eq('done', false)
    .eq('notify_enabled', true)
    .not('due_date', 'is', null);

  for (const task of pendingTasks ?? []) {
    if (!task.due_date) continue;
    const prof = profileMap.get(task.user_id);
    if (prof && !prof.notify_tasks) continue;
    const subs = subsByUser.get(task.user_id);
    if (!subs || subs.length === 0) continue;

    const tz = prof?.timezone || 'America/Sao_Paulo';
    const { nowMs } = getLocalClock(tz);
    const taskMs = toPseudoUtcMs(task.due_date, task.due_time || '09:00:00');
    const staleCutoffMs = taskMs + 24 * 3600_000;

    const presets: string[] =
      Array.isArray(task.reminder_presets) && task.reminder_presets.length > 0
        ? task.reminder_presets
        : [task.reminder_preset || 'same_day_08'];
    const alreadyNotified: string[] = Array.isArray(task.notified_presets)
      ? task.notified_presets
      : [];

    const newlyNotified = [...alreadyNotified];
    let sentForTask = false;

    for (const preset of presets) {
      if (alreadyNotified.includes(preset)) continue;
      const triggerMs = computeTriggerMs(
        task.due_date,
        task.due_time || '09:00:00',
        preset,
        0
      );

      if (nowMs >= triggerMs && nowMs <= staleCutoffMs) {
        if (!sentForTask) {
          const delivered = await sendToUserDevices(admin, subs, {
            title: `Tarefa: ${task.title}`,
            body: `${task.category}${
              task.due_time ? ` · ${task.due_time.slice(0, 5)}` : ' · Hoje'
            }`,
            url: '/tarefas',
            tag: `task-${task.id}-${preset}`,
          });
          if (delivered > 0) {
            sentForTask = true;
            sentTasks++;
            newlyNotified.push(preset);
          }
        } else {
          newlyNotified.push(preset);
        }
      }
    }

    if (newlyNotified.length > alreadyNotified.length) {
      await admin
        .from('tasks')
        .update({
          notified_presets: newlyNotified,
          notified_at: new Date().toISOString(),
        })
        .eq('id', task.id);
    }
  }

  // 3. Daily 08:00 AM Summary + Motivational Message + Daily Verse
  for (const prof of profiles ?? []) {
    const subs = subsByUser.get(prof.id);
    if (!subs || subs.length === 0) continue;

    const tz = prof.timezone || 'America/Sao_Paulo';
    const { dateStr, hour } = getLocalClock(tz);
    const firstName = (prof.display_name || 'Você').split(' ')[0];

    const shouldSendSummary =
      forceDaily || (hour >= 8 && prof.last_daily_summary_date !== dateStr);

    if (shouldSendSummary) {
      const [{ data: allUserEvents }, { data: openTasks }] = await Promise.all([
        admin
          .from('events')
          .select('title, event_date, event_time, recurrence_days')
          .eq('user_id', prof.id)
          .order('event_time', { ascending: true }),
        admin
          .from('tasks')
          .select('title, due_date')
          .eq('user_id', prof.id)
          .eq('done', false),
      ]);

      const dow = new Date(`${dateStr}T12:00:00Z`).getUTCDay();
      const todayEvents = (allUserEvents ?? []).filter((e) => {
        if (Array.isArray(e.recurrence_days) && e.recurrence_days.length > 0) {
          return dateStr >= e.event_date && e.recurrence_days.includes(dow);
        }
        return e.event_date === dateStr;
      });

      const evCount = todayEvents?.length ?? 0;
      const todayTasks = (openTasks ?? []).filter((t) => t.due_date === dateStr);
      const totalOpen = openTasks?.length ?? 0;

      const summaryParts: string[] = [];
      if (evCount > 0) {
        const evList = todayEvents!
          .map((e) => `${e.event_time.slice(0, 5)} ${e.title}`)
          .join(', ');
        summaryParts.push(`Agenda (${evCount}): ${evList}`);
      } else {
        summaryParts.push('Sem compromissos hoje');
      }

      if (todayTasks.length > 0) {
        const tList = todayTasks.map((t) => t.title).join(', ');
        summaryParts.push(`Tarefas de hoje (${todayTasks.length}): ${tList}`);
      } else if (totalOpen > 0) {
        summaryParts.push(`${totalOpen} tarefas em aberto`);
      } else {
        summaryParts.push('Tarefas em dia');
      }

      const delivered = await sendToUserDevices(admin, subs, {
        title: `☀️ Bom dia, ${firstName}! Resumo do dia`,
        body: summaryParts.join(' · '),
        url: '/',
        tag: `daily-summary-${dateStr}`,
      });

      if (delivered > 0) {
        await admin
          .from('profiles')
          .update({ last_daily_summary_date: dateStr })
          .eq('id', prof.id);
        sentDailySummaries++;
      }
    }

    const shouldSendInspiration =
      forceDaily || (hour >= 8 && prof.last_daily_inspiration_date !== dateStr);

    if (shouldSendInspiration) {
      const motivation = getDailyMotivation(dateStr);
      const verse = getDailyVerse(dateStr);

      const d1 = await sendToUserDevices(admin, subs, {
        title: `✨ Mensagem do dia, ${firstName}`,
        body: motivation,
        url: '/',
        tag: `daily-motivation-${dateStr}`,
      });

      await new Promise((r) => setTimeout(r, 800));

      const d2 = await sendToUserDevices(admin, subs, {
        title: `📖 Versículo do dia · ${verse.reference}`,
        body: `"${verse.text}"`,
        url: '/',
        tag: `daily-verse-${dateStr}`,
      });

      if (d1 > 0 || d2 > 0) {
        await admin
          .from('profiles')
          .update({ last_daily_inspiration_date: dateStr })
          .eq('id', prof.id);
        sentDailyInspirations++;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    sentEvents,
    sentTasks,
    sentDailySummaries,
    sentDailyInspirations,
  });
}
