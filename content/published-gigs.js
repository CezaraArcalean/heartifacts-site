/*
  PUBLIC GIG FEED
  ----------------
  This file is intentionally separate from the rest of the website content so the
  Heartifacts Band Manager publishing bridge can replace it without editing site code.

  Publish ONLY information that is intentionally public. Never export internal booking
  notes, private contact details, fees, availability, negotiation history, or credentials.

  Expected public shape:
  {
    id: "stable-public-id",
    name: "Event name",
    date: "YYYY-MM-DD",
    venue: "Venue name",
    city: "City / public location",
    eventUrl: "https://...",
    ticketUrl: "https://..."
  }
*/
window.HeartifactsPublishedGigs = [];
