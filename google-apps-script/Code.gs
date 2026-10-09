/**
 * Booking backend for the physiotherapy website.
 *
 *   GET  ?action=slots  → free slots for the next DAYS_AHEAD days, read from your Google Calendar
 *   POST {booking JSON} → re-checks the slot, creates a calendar event, alerts you on WhatsApp + email
 *
 * Setup steps are in README.md. Secrets (WhatsApp API key) go in
 * Project Settings → Script Properties, never in this file.
 */

const CONFIG = {
  CALENDAR_ID: 'primary',          // or the ID of a dedicated "Clinic" calendar
  TIMEZONE: 'Asia/Kolkata',
  TZ_OFFSET: '+05:30',
  SLOT_MINUTES: 30,
  DAYS_AHEAD: 14,
  MIN_NOTICE_MINUTES: 120,

  // Keep in sync with `hours` in config.js. 0 = Sunday … 6 = Saturday.
  HOURS: {
    0: [["08:00", "19:00"]],
    1: [["08:00", "19:00"]],
    2: [["08:00", "19:00"]],
    3: [["08:00", "19:00"]],
    4: [["08:00", "19:00"]],
    5: [["08:00", "19:00"]],
    6: [["08:00", "19:00"]],
  },

  // An all-day event (e.g. "Leave", "Conference") blocks that whole day.
  BLOCK_ALL_DAY_EVENTS: true,

  EVENT_PREFIX: 'Physio',
  NOTIFY_BY_EMAIL: true,           // email to the account that deployed this script
  INVITE_PATIENT: true,            // send a calendar invite if the patient gave an email
};

/* ------------------------------------------------------------------ */

function doGet(e) {
  const r = routeReviewGet_(e); if (r) return r;
  const action = (e && e.parameter && e.parameter.action) || 'slots';
  if (action === 'slots') return json_({ ok: true, slots: availableSlots_() });
  return json_({ ok: false, error: 'unknown_action' });
}

function doPost(e) {
  const r = routeReviewPost_(e); if (r) return r;
  let d;
  try {
    d = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'bad_request' });
  }

  // Honeypot filled in → bot. Pretend it worked.
  if (d.website) return json_({ ok: true });

  const clean = sanitize_(d);
  if (clean.error) return json_({ ok: false, error: 'invalid', message: clean.error });

  // One booking per phone number per 2 minutes
  const cache = CacheService.getScriptCache();
  const rateKey = 'b_' + clean.phone;
  if (cache.get(rateKey)) {
    return json_({ ok: false, error: 'too_many', message: 'You just booked — please wait a couple of minutes before booking again.' });
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return json_({ ok: false, error: 'busy', message: 'Server busy, please try again.' });
  try {
    const free = availableSlots_();
    if ((free[clean.date] || []).indexOf(clean.time) === -1) return json_({ ok: false, error: 'slot_taken' });

    const start = toDate_(clean.date, clean.time);
    const end = new Date(start.getTime() + CONFIG.SLOT_MINUTES * 60000);
    const options = { description: describe_(clean) };
    if (CONFIG.INVITE_PATIENT && clean.email) {
      options.guests = clean.email;
      options.sendInvites = true;
    }
    const event = calendar_().createEvent(
      CONFIG.EVENT_PREFIX + ': ' + clean.name + ' (' + clean.concern + ')', start, end, options
    );
    if (clean.mode.toLowerCase().indexOf('home') > -1) event.setColor(CalendarApp.EventColor.ORANGE);

    cache.put(rateKey, '1', 120);
    notify_(clean, start);
    return json_({ ok: true, id: event.getId() });
  } finally {
    lock.releaseLock();
  }
}

/* ------------------------------------------------------------------ */

function availableSlots_() {
  const tz = CONFIG.TIMEZONE;
  const today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  const lastDay = addDays_(today, CONFIG.DAYS_AHEAD);
  const events = calendar_().getEvents(toDate_(today, '00:00'), toDate_(lastDay, '00:00'));

  const busy = [];
  const blockedDays = {};
  events.forEach(function (ev) {
    if (ev.isAllDayEvent()) {
      if (!CONFIG.BLOCK_ALL_DAY_EVENTS) return;
      let d = Utilities.formatDate(ev.getAllDayStartDate(), tz, 'yyyy-MM-dd');
      const endD = Utilities.formatDate(ev.getAllDayEndDate(), tz, 'yyyy-MM-dd'); // exclusive
      while (d < endD) { blockedDays[d] = true; d = addDays_(d, 1); }
    } else {
      busy.push([ev.getStartTime().getTime(), ev.getEndTime().getTime()]);
    }
  });

  const earliest = Date.now() + CONFIG.MIN_NOTICE_MINUTES * 60000;
  const len = CONFIG.SLOT_MINUTES * 60000;
  const out = {};
  for (let i = 0; i < CONFIG.DAYS_AHEAD; i++) {
    const day = addDays_(today, i);
    const list = [];
    if (!blockedDays[day]) {
      (CONFIG.HOURS[dayOfWeek_(day)] || []).forEach(function (r) {
        for (let m = toMin_(r[0]); m + CONFIG.SLOT_MINUTES <= toMin_(r[1]); m += CONFIG.SLOT_MINUTES) {
          const t = toHHMM_(m);
          const s = toDate_(day, t).getTime();
          if (s < earliest) continue;
          const clash = busy.some(function (b) { return s < b[1] && s + len > b[0]; });
          if (!clash) list.push(t);
        }
      });
    }
    out[day] = list;
  }
  return out;
}

function sanitize_(d) {
  const str = function (v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max); };
  const c = {
    name: str(d.name, 80),
    phone: String(d.phone || '').replace(/\D/g, '').slice(0, 15),
    age: str(d.age, 3),
    concern: str(d.concern, 80),
    mode: str(d.mode, 40) || 'At the clinic',
    notes: String(d.notes || '').trim().slice(0, 600),
    email: str(d.email, 120),
    date: str(d.date, 10),
    time: str(d.time, 5),
  };
  if (c.name.length < 2) return { error: 'Please enter your name.' };
  if (!/^91[6-9]\d{9}$/.test(c.phone)) return { error: 'Please enter a valid 10-digit mobile number.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(c.date) || !/^\d{2}:\d{2}$/.test(c.time)) return { error: 'Please choose a slot.' };
  if (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) c.email = '';
  return c;
}

function describe_(c) {
  return [
    'Patient: ' + c.name + (c.age ? ' (' + c.age + ' yrs)' : ''),
    'Phone: +' + c.phone,
    'WhatsApp: https://wa.me/' + c.phone,
    'Concern: ' + c.concern,
    'Visit: ' + c.mode,
    c.email ? 'Email: ' + c.email : '',
    c.notes ? '\nNotes:\n' + c.notes : '',
    '\nBooked via website',
  ].filter(String).join('\n');
}

function notify_(c, start) {
  const when = Utilities.formatDate(start, CONFIG.TIMEZONE, "EEE, d MMM 'at' h:mm a");
  const msg =
    '🗓️ New booking: ' + when + '\n' +
    '👤 ' + c.name + (c.age ? ', ' + c.age : '') + '\n' +
    '📞 +' + c.phone + '\n' +
    '🩺 ' + c.concern + ' · ' + c.mode +
    (c.notes ? '\n📝 ' + c.notes.slice(0, 200) : '');

  // WhatsApp alert via CallMeBot (free; messages your own number only). See README.
  const props = PropertiesService.getScriptProperties();
  const waPhone = props.getProperty('CALLMEBOT_PHONE');
  const waKey = props.getProperty('CALLMEBOT_APIKEY');
  if (waPhone && waKey) {
    try {
      UrlFetchApp.fetch(
        'https://api.callmebot.com/whatsapp.php?phone=' + encodeURIComponent(waPhone) +
          '&text=' + encodeURIComponent(msg) + '&apikey=' + encodeURIComponent(waKey),
        { muteHttpExceptions: true }
      );
    } catch (err) {
      console.error('WhatsApp alert failed', err);
    }
  }

  if (CONFIG.NOTIFY_BY_EMAIL) {
    try {
      MailApp.sendEmail(Session.getEffectiveUser().getEmail(), 'New booking: ' + c.name + ' — ' + when, msg);
    } catch (err) {
      console.error('Email alert failed', err);
    }
  }
}

/* ---------------------------- utilities ---------------------------- */

function calendar_() {
  return CONFIG.CALENDAR_ID === 'primary' ? CalendarApp.getDefaultCalendar() : CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
}
function toDate_(iso, hhmm) { return new Date(iso + 'T' + hhmm + ':00' + CONFIG.TZ_OFFSET); }
function addDays_(iso, n) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function dayOfWeek_(iso) { return new Date(iso + 'T00:00:00Z').getUTCDay(); }
function toMin_(hhmm) { const p = hhmm.split(':'); return +p[0] * 60 + +p[1]; }
function toHHMM_(m) { return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2); }
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

/** Run this once from the editor to test notifications and grant permissions. */
function testSetup() {
  console.log(JSON.stringify(availableSlots_()).slice(0, 400));
  notify_({ name: 'Test Patient', age: '30', phone: '919999999999', concern: 'Back pain', mode: 'At the clinic', notes: 'This is a test' }, new Date());
}
