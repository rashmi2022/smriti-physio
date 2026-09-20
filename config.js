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
  city: "Live Teleconsultation",                  // ← CHANGE  shown in the hero

  // Phone numbers: country code + number, digits only (no +, spaces or dashes)
  phone: "919304184606",              // ← CHANGE  for "Call" buttons
  whatsapp: "919304184606",           // ← CHANGE  for WhatsApp buttons & booking requests

  email: "smritidas1820@gmail.com",                          // optional, shown in Contact if set
  address: "",   // ← CHANGE
  mapsQuery: "",                      // optional, text to search on Google Maps; defaults to address
  googleReviewsUrl: "",               // optional, link to your Google Business reviews

  credentials: ["BPT(NIMS University)"],                    // e.g. ["BPT", "MPT (Musculoskeletal)"] — shown in About
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
    0: [["08:00", "19:00"]],
    1: [["08:00", "19:00"]],
    2: [["08:00", "19:00"]],
    3: [["08:00", "19:00"]],
    4: [["08:00", "19:00"]],
    5: [["08:00", "19:00"]],
    6: [["08:00", "19:00"]],
  },

  visitModes: ["At the clinic", "Home visit", "Online (video call)"],
};
