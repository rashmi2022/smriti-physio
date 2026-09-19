/*
 * ------------------------------------------------------------------
 *  SITE SETTINGS — edit this file, not the HTML.
 *  Everything marked  ← CHANGE  is a placeholder.
 * ------------------------------------------------------------------
 */
window.SITE_CONFIG = {
  name: "Dr. Smriti (PT)",            // ← CHANGE  full display name
  shortName: "Dr. Smriti",            // used inside sentences
  brand: "Smriti Physio",             // logo text
  city: "Your City",                  // ← CHANGE  shown in the hero

  // Phone numbers: country code + number, digits only (no +, spaces or dashes)
  phone: "910000000000",              // ← CHANGE  for "Call" buttons
  whatsapp: "910000000000",           // ← CHANGE  for WhatsApp buttons & booking requests

  email: "",                          // optional, shown in Contact if set
  address: "Clinic name, Street, Area, City – 000000",   // ← CHANGE
  mapsQuery: "",                      // optional, text to search on Google Maps; defaults to address
  googleReviewsUrl: "",               // optional, link to your Google Business reviews

  credentials: [],                    // e.g. ["BPT", "MPT (Musculoskeletal)"] — shown in About
  consultationFee: 500,
  consultationMinutes: 30,

  /*
   * BOOKING
   * Leave bookingEndpoint empty and bookings are sent to you as a WhatsApp message
   * (the patient taps "send").
   * Paste your Google Apps Script web-app URL here (see README.md) and slots are read
   * live from your Google Calendar, each booking becomes a calendar event, and you get
   * an automatic WhatsApp alert.
   */
  bookingEndpoint: "",
  bookingDaysAhead: 14,
  slotMinutes: 30,
  minNoticeMinutes: 120,              // earliest bookable slot = now + this

  // Working hours in India time. 0 = Sunday … 6 = Saturday. [] = closed.
  // Used for the hours shown on the page, and for slots when no endpoint is set.
  // If you use Google Calendar, keep HOURS in google-apps-script/Code.gs the same.
  hours: {
    0: [],
    1: [["09:00", "13:00"], ["16:00", "20:00"]],
    2: [["09:00", "13:00"], ["16:00", "20:00"]],
    3: [["09:00", "13:00"], ["16:00", "20:00"]],
    4: [["09:00", "13:00"], ["16:00", "20:00"]],
    5: [["09:00", "13:00"], ["16:00", "20:00"]],
    6: [["09:00", "13:00"]],
  },

  visitModes: ["At the clinic", "Home visit", "Online (video call)"],
};
