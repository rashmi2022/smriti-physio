(() => {
  "use strict";

  const cfg = window.SITE_CONFIG || {};
  const TZ = "Asia/Kolkata";
  const TZ_OFFSET = "+05:30"; // India has no daylight saving
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ------------------------------------------------------------------
   * Helpers
   * ------------------------------------------------------------------ */
  const digits = (s) => String(s || "").replace(/\D/g, "");
  const fmtPhone = (n) => {
    n = digits(n);
    return n.length === 12 && n.startsWith("91") ? `+91 ${n.slice(2, 7)} ${n.slice(7)}` : `+${n}`;
  };
  const waLink = (text) => `https://wa.me/${digits(cfg.whatsapp)}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

  const todayISO = () =>
    new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const addDays = (iso, n) => {
    const d = new Date(`${iso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const dayOfWeek = (iso) => new Date(`${iso}T00:00:00Z`).getUTCDay();
  const slotEpoch = (iso, hhmm) => Date.parse(`${iso}T${hhmm}:00${TZ_OFFSET}`);
  const toMin = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
  const toHHMM = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
  const fmtTime = (hhmm) => {
    let [h, m] = hhmm.split(":").map(Number);
    const ap = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${String(m).padStart(2, "0")} ${ap}`;
  };
  const fmtTimeShort = (hhmm) => fmtTime(hhmm).replace(":00 ", " ");
  const fmtDate = (iso, opts) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { timeZone: "UTC", ...opts });
  const friendlyDay = (iso) => {
    const t = todayISO();
    if (iso === t) return "Today";
    if (iso === addDays(t, 1)) return "Tomorrow";
    return fmtDate(iso, { weekday: "short", day: "numeric", month: "short" });
  };
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  /* ------------------------------------------------------------------
   * Fill in config values & links
   * ------------------------------------------------------------------ */
  const derived = {
    ...cfg,
    phoneDisplay: fmtPhone(cfg.phone),
    whatsappDisplay: fmtPhone(cfg.whatsapp),
  };
  $$("[data-cfg]").forEach((el) => {
    const v = derived[el.dataset.cfg];
    if (v !== undefined && v !== "") el.textContent = v;
  });
  document.title = `${cfg.shortName || cfg.name} - Physiotherapy${cfg.city && cfg.city !== "Your City" ? ` in ${cfg.city}` : ""}`;

  const defaultWa = `Hi ${cfg.shortName || ""}, I'd like to book a physiotherapy appointment.`;
  $$('[data-link="wa"]').forEach((a) => (a.href = waLink(a.dataset.waText || defaultWa)));
  $$('[data-link="call"]').forEach((a) => (a.href = `tel:+${digits(cfg.phone)}`));
  $$('[data-link="map"]').forEach(
    (a) => (a.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cfg.mapsQuery || cfg.address || "")}`)
  );

  if (cfg.googleReviewsUrl) {
    $("#reviewsLink").href = cfg.googleReviewsUrl;
    $("#reviewsMore").hidden = false;
  }
  const creds = $("#credentials");
  (cfg.credentials || []).forEach((c) => {
    const s = document.createElement("span");
    s.textContent = c;
    creds.appendChild(s);
  });
  $("#year").textContent = new Date().getFullYear();

  // Visit type options
  const modeSel = $("#fMode");
  (cfg.visitModes && cfg.visitModes.length ? cfg.visitModes : ["At the clinic"]).forEach((m) => modeSel.add(new Option(m, m)));

  // Opening hours (groups consecutive days with the same timings)
  (function renderHours() {
    const hours = cfg.hours || {};
    const order = [1, 2, 3, 4, 5, 6, 0];
    const key = (d) => JSON.stringify(hours[d] || []);
    const groups = [];
    order.forEach((d) => {
      const last = groups[groups.length - 1];
      if (last && last.key === key(d)) last.days.push(d);
      else groups.push({ key: key(d), days: [d] });
    });
    const list = $("#hoursList");
    groups.forEach((g) => {
      const ranges = hours[g.days[0]] || [];
      const label = g.days.length > 1 ? `${DAY_NAMES[g.days[0]]} - ${DAY_NAMES[g.days.at(-1)]}` : DAY_NAMES[g.days[0]];
      const li = document.createElement("li");
      li.innerHTML = `<span>${label}</span><span class="${ranges.length ? "" : "closed"}">${
        ranges.length ? ranges.map(([a, b]) => `${fmtTimeShort(a)} - ${fmtTimeShort(b)}`).join("<br>") : "Closed"
      }</span>`;
      list.appendChild(li);
    });
  })();

  /* ------------------------------------------------------------------
   * Hero illustration: a stylised spine
   * ------------------------------------------------------------------ */
  (function drawSpine() {
    const svg = $("#spineArt");
    if (!svg) return;
    const NS = "http://www.w3.org/2000/svg";
    const el = (tag, attrs) => {
      const e = document.createElementNS(NS, tag);
      Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
      svg.appendChild(e);
      return e;
    };
    [90, 150, 210].forEach((r) => el("circle", { class: "ring", cx: 200, cy: 250, r }));
    const n = 15;
    const top = 60, step = 26;
    const xAt = (i) => 200 + 26 * Math.sin((i / (n - 1)) * Math.PI * 1.6 - 0.4);
    for (let i = 0; i < n; i++) {
      const y = top + i * step;
      const x = xAt(i);
      const w = 34 + i * 2.6;
      const h = 16 + i * 0.35;
      const angle = (Math.atan2(xAt(i + 1) - xAt(i - 1), step * 2) * -180) / Math.PI;
      const g = el("g", { transform: `translate(${x} ${y}) rotate(${angle.toFixed(2)})` });
      const rect = document.createElementNS(NS, "rect");
      Object.entries({ x: -w / 2, y: -h / 2, width: w, height: h, rx: h / 2.4 }).forEach(([k, v]) => rect.setAttribute(k, v));
      g.appendChild(rect);
      if (i < n - 1) {
        const disc = document.createElementNS(NS, "rect");
        Object.entries({ class: "disc", x: -w / 3, y: h / 2 + 1.5, width: (w * 2) / 3, height: 3, rx: 1.5 }).forEach(([k, v]) =>
          disc.setAttribute(k, v)
        );
        disc.style.opacity = i === 10 || i === 3 ? 1 : 0.35;
        g.appendChild(disc);
      }
    }
    // Two "hot spots": neck and lower back
    [3, 10].forEach((i) => {
      const y = top + i * step + 12;
      el("circle", { class: "glow", cx: xAt(i) + 44 + i * 1.3, cy: y, r: 7 });
      el("circle", { cx: xAt(i) + 44 + i * 1.3, cy: y, r: 4, fill: "#fff" });
    });
  })();

  /* ------------------------------------------------------------------
   * Header, mobile nav, reveal-on-scroll, mobile bar
   * ------------------------------------------------------------------ */
  const header = $(".header");
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const nav = $("#nav"), toggle = $("#navToggle");
  const setNav = (open) => {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };
  toggle.addEventListener("click", () => setNav(!nav.classList.contains("is-open")));
  $$("a", nav).forEach((a) => a.addEventListener("click", () => setNav(false)));
  document.addEventListener("keydown", (e) => e.key === "Escape" && setNav(false));

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("is-in");
            io.unobserve(en.target);
          }
        }),
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    $$(".reveal").forEach((el, i) => {
      el.style.transitionDelay = `${(i % 3) * 70}ms`;
      io.observe(el);
    });

    // Hide the mobile action bar while the booking form is on screen
    const mbar = $("#mbar");
    new IntersectionObserver((entries) => entries.forEach((en) => mbar.classList.toggle("is-hidden", en.isIntersecting)), {
      threshold: 0.05,
    }).observe($("#book"));
  } else {
    $$(".reveal").forEach((el) => el.classList.add("is-in"));
  }

  // Reviews carousel
  const track = $("#reviewTrack");
  const scrollReviews = (dir) => {
    const card = $(".review", track);
    track.scrollBy({ left: dir * (card.offsetWidth + 20), behavior: "smooth" });
  };
  $("#revPrev").addEventListener("click", () => scrollReviews(-1));
  $("#revNext").addEventListener("click", () => scrollReviews(1));

  /* ------------------------------------------------------------------
   * Booking
   * ------------------------------------------------------------------ */
  const endpoint = (cfg.bookingEndpoint || "").trim();
  const state = { slots: {}, date: null, time: null, source: "whatsapp" };
  const datesEl = $("#dates"), timesEl = $("#times");
  const form = $("#bookingForm"), submitBtn = $("#submitBtn");
  const concernSel = $("#fConcern");

  // "Book this" buttons on treatment cards
  $$("[data-book]").forEach((b) =>
    b.addEventListener("click", () => {
      const opt = [...concernSel.options].find((o) => o.value === b.dataset.book);
      if (opt) concernSel.value = opt.value;
      $("#book").scrollIntoView({ behavior: "smooth" });
    })
  );

  function localSlots() {
    const out = {};
    const start = todayISO();
    const earliest = Date.now() + (cfg.minNoticeMinutes || 0) * 60000;
    const len = cfg.slotMinutes || 30;
    for (let i = 0; i < (cfg.bookingDaysAhead || 14); i++) {
      const iso = addDays(start, i);
      const ranges = (cfg.hours || {})[dayOfWeek(iso)] || [];
      const list = [];
      ranges.forEach(([a, b]) => {
        for (let m = toMin(a); m + len <= toMin(b); m += len) {
          const t = toHHMM(m);
          if (slotEpoch(iso, t) >= earliest) list.push(t);
        }
      });
      out[iso] = list;
    }
    return out;
  }

  async function loadSlots() {
    if (endpoint) {
      try {
        const res = await fetch(`${endpoint}?action=slots`, { method: "GET" });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "bad response");
        const earliest = Date.now() + (cfg.minNoticeMinutes || 0) * 60000;
        state.slots = {};
        Object.entries(data.slots).forEach(([d, list]) => (state.slots[d] = list.filter((t) => slotEpoch(d, t) >= earliest)));
        state.source = "calendar";
        $("#bookingModeNote").textContent = "Slots are live — you'll get an instant confirmation.";
        return;
      } catch (err) {
        console.warn("Calendar slots unavailable, falling back to WhatsApp booking.", err);
      }
    }
    state.slots = localSlots();
    state.source = "whatsapp";
    $("#bookingModeNote").textContent = "Your request is sent on WhatsApp and confirmed there.";
  }

  function renderDates() {
    datesEl.innerHTML = "";
    const days = Object.keys(state.slots).sort();
    days.forEach((iso) => {
      const n = state.slots[iso].length;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "date";
      b.setAttribute("role", "option");
      b.setAttribute("aria-selected", String(iso === state.date));
      b.disabled = n === 0;
      b.dataset.date = iso;
      const t = todayISO();
      const top = iso === t ? "Today" : iso === addDays(t, 1) ? "Tmrw" : fmtDate(iso, { weekday: "short" });
      b.innerHTML = `<small>${top}</small><strong>${fmtDate(iso, { day: "numeric" })}</strong><span class="date__count">${
        n ? `${n} slot${n > 1 ? "s" : ""}` : fmtDate(iso, { month: "short" })
      }</span>`;
      b.setAttribute("aria-label", `${fmtDate(iso, { weekday: "long", day: "numeric", month: "long" })}, ${n} slots`);
      b.addEventListener("click", () => selectDate(iso));
      datesEl.appendChild(b);
    });
  }

  function renderTimes() {
    timesEl.innerHTML = "";
    if (!state.date) {
      timesEl.innerHTML = `<p class="muted">No slots open in the next ${cfg.bookingDaysAhead || 14} days. Please message on WhatsApp.</p>`;
      return;
    }
    const list = state.slots[state.date] || [];
    const groups = [
      ["Morning", (t) => toMin(t) < 720],
      ["Afternoon", (t) => toMin(t) >= 720 && toMin(t) < 1020],
      ["Evening", (t) => toMin(t) >= 1020],
    ];
    groups.forEach(([label, test]) => {
      const ts = list.filter(test);
      if (!ts.length) return;
      const g = document.createElement("div");
      g.className = "slot-group";
      g.innerHTML = `<h4>${label}</h4><div class="slots"></div>`;
      ts.forEach((t) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "slot";
        b.textContent = fmtTime(t);
        b.setAttribute("aria-pressed", String(t === state.time));
        b.addEventListener("click", () => selectTime(t));
        $(".slots", g).appendChild(b);
      });
      timesEl.appendChild(g);
    });
  }

  function selectDate(iso) {
    state.date = iso;
    state.time = null;
    $$(".date", datesEl).forEach((b) => b.setAttribute("aria-selected", String(b.dataset.date === iso)));
    renderTimes();
    updateSummary();
  }

  function selectTime(t) {
    state.time = t;
    $$(".slot", timesEl).forEach((b) => b.setAttribute("aria-pressed", String(b.textContent === fmtTime(t))));
    updateSummary();
    if (window.matchMedia("(max-width: 979px)").matches) {
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function updateSummary() {
    const s = $("#summary");
    const ready = state.date && state.time;
    s.classList.toggle("is-set", !!ready);
    $("#summaryText").textContent = ready
      ? `${fmtDate(state.date, { weekday: "short", day: "numeric", month: "short" })} · ${fmtTime(state.time)} IST`
      : state.date
      ? "Now pick a time"
      : "Select a date and time";
    submitBtn.disabled = !ready;
    $("#submitLabel").textContent =
      state.source === "calendar" ? "Confirm booking" : "Send booking request on WhatsApp";
  }

  function updateNextSlot() {
    const el = $("#nextSlot");
    const d = Object.keys(state.slots).sort().find((k) => state.slots[k].length);
    el.textContent = d ? `${friendlyDay(d)}, ${fmtTime(state.slots[d][0])}` : "Message to book";
  }

  function readForm() {
    const f = new FormData(form);
    const v = (k) => String(f.get(k) || "").trim();
    let phone = digits(v("phone"));
    if (phone.length === 12 && phone.startsWith("91")) phone = phone.slice(2);
    if (phone.length === 11 && phone.startsWith("0")) phone = phone.slice(1);
    return {
      name: v("name"), phone, age: v("age"), concern: v("concern"), mode: v("mode"),
      notes: v("notes"), email: v("email"), website: v("website"),
    };
  }

  function validate(d) {
    const bad = [];
    $$(".is-invalid", form).forEach((e) => e.classList.remove("is-invalid"));
    if (d.name.length < 2) bad.push(["fName", "your name"]);
    if (!/^[6-9]\d{9}$/.test(d.phone)) bad.push(["fPhone", "a valid 10-digit mobile number"]);
    const age = Number(d.age);
    if (!age || age < 1 || age > 110) bad.push(["fAge", "your age"]);
    if (!d.concern) bad.push(["fConcern", "your concern"]);
    if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) bad.push(["fEmail", "a valid email (or leave it blank)"]);
    bad.forEach(([id]) => {
      const el = $(`#${id}`);
      (id === "fPhone" ? el.parentElement : el).classList.add("is-invalid");
    });
    if (bad.length) {
      showError(`Please enter ${bad.map((b) => b[1]).join(", ")}.`);
      $(`#${bad[0][0]}`).focus();
      return false;
    }
    return true;
  }

  const showError = (msg) => {
    const e = $("#formError");
    e.textContent = msg;
    e.hidden = !msg;
  };

  function bookingText(d) {
    const when = `${fmtDate(state.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}, ${fmtTime(state.time)} IST`;
    return [
      `Hi ${cfg.shortName || ""}, I'd like to book an appointment.`,
      "",
      `📅 ${when}`,
      `👤 ${d.name}, ${d.age} yrs`,
      `📞 +91 ${d.phone}`,
      `🩺 ${d.concern} · ${d.mode}`,
      d.notes ? `📝 ${d.notes}` : "",
    ]
      .filter((l, i) => l || i === 1)
      .join("\n");
  }

  function calendarLink(d) {
    const start = slotEpoch(state.date, state.time);
    const end = start + (cfg.slotMinutes || 30) * 60000;
    const g = (ms) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const p = new URLSearchParams({
      action: "TEMPLATE",
      text: `Physiotherapy — ${cfg.shortName || cfg.name}`,
      dates: `${g(start)}/${g(end)}`,
      details: `${d.concern} (${d.mode}). To reschedule, WhatsApp ${fmtPhone(cfg.whatsapp)}.`,
      location: d.mode.toLowerCase().includes("clinic") ? cfg.address || "" : d.mode,
    });
    return `https://calendar.google.com/calendar/render?${p}`;
  }

  function showDone(d, confirmed) {
    const when = `${fmtDate(state.date, { weekday: "long", day: "numeric", month: "long" })} at ${fmtTime(state.time)}`;
    $("#doneTitle").textContent = confirmed ? "You're booked!" : "Almost done!";
    $("#doneText").textContent = confirmed
      ? `See you on ${when}. ${cfg.shortName} has been notified${d.email ? " and a calendar invite is on its way to your email" : ""}.`
      : `Your request for ${when} is ready in WhatsApp — just tap send. You'll get a confirmation there. If WhatsApp didn't open, use the button below.`;
    $("#doneCal").href = calendarLink(d);
    $("#doneCal").hidden = !confirmed; // only offer "add to calendar" once the slot is actually confirmed
    $("#doneWa").href = waLink(
      confirmed ? `Hi ${cfg.shortName}, I just booked ${when} on your website. — ${d.name}` : bookingText(d)
    );
    $("#doneWa").textContent = confirmed ? "Message on WhatsApp" : "Open WhatsApp again";
    $(".booking__pick").hidden = true;
    form.hidden = true;
    $("#bookingDone").hidden = false;
    $("#book").scrollIntoView({ behavior: "smooth" });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    showError("");
    if (!state.date || !state.time) return showError("Please choose a date and time first.");
    const d = readForm();
    if (!validate(d)) return;

    if (state.source !== "calendar") {
      window.open(waLink(bookingText(d)), "_blank", "noopener");
      showDone(d, false);
      return;
    }

    submitBtn.classList.add("is-loading");
    submitBtn.disabled = true;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        // text/plain keeps this a "simple" request, which Google Apps Script accepts cross-origin
        body: JSON.stringify({ ...d, phone: `91${d.phone}`, date: state.date, time: state.time }),
      });
      const out = await res.json();
      if (out.ok) return showDone(d, true);
      if (out.error === "slot_taken") {
        showError("Sorry, that slot was just taken. Please pick another time.");
        await refreshSlots(true);
      } else {
        showError(out.message || "Couldn't complete the booking. Please try again, or book on WhatsApp.");
      }
    } catch (err) {
      console.error(err);
      showError("Network problem — please try again, or book on WhatsApp instead.");
    } finally {
      submitBtn.classList.remove("is-loading");
      updateSummary();
    }
  });

  $("#bookAnother").addEventListener("click", async () => {
    $("#bookingDone").hidden = true;
    $(".booking__pick").hidden = false;
    form.hidden = false;
    form.reset();
    await refreshSlots(false);
  });

  async function refreshSlots(keepDate) {
    const prev = state.date;
    await loadSlots();
    const days = Object.keys(state.slots).sort();
    const first = days.find((k) => state.slots[k].length) || null;
    state.date = keepDate && prev && state.slots[prev]?.length ? prev : first;
    state.time = null;
    renderDates();
    renderTimes();
    updateSummary();
    updateNextSlot();
    const sel = $(`.date[aria-selected="true"]`, datesEl);
    if (sel) datesEl.scrollLeft = sel.offsetLeft - parseFloat(getComputedStyle(datesEl).paddingLeft);
  }

  refreshSlots(false);
})();
