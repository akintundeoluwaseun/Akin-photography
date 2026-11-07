'use strict';
/* All editable copy and business settings. Nothing here invents a phone number, price, award or testimonial:
   those fields start empty and are filled in from the admin dashboard. */

const SCHEMA = [
  { id: 'business', title: 'Business details', note: 'Contact details appear across the site. Leave a field empty to hide it everywhere.', fields: [
    { k: 'phone', label: 'Phone number (for calls)', type: 'tel', def: '+234 703 012 9673', help: 'Example: +234 800 000 0000' },
    { k: 'whatsapp', label: 'WhatsApp number', type: 'tel', def: '+2347030129673', help: 'International format, e.g. +2348000000000. Floating WhatsApp button and booking messages use this.' },
    { k: 'email', label: 'Email address', type: 'email', def: '' },
    { k: 'address', label: 'Address', type: 'text', def: 'Onala Street, Ado-Ekiti, Ekiti State, Nigeria' },
    { k: 'maps_query', label: 'Google Maps search text', type: 'text', def: 'Onala Street, Ado-Ekiti, Ekiti State, Nigeria', help: 'What the map on the contact page searches for. Use the exact studio name or address for a precise pin.' },
    { k: 'currency', label: 'Currency symbol', type: 'text', def: '₦' },
    { k: 'time_slots', label: 'Booking times offered', type: 'text', def: '09:00, 10:00, 11:00, 12:00, 13:00, 14:00, 15:00, 16:00, 17:00', help: 'Comma-separated. These appear in the booking form.' },
  ] },
  { id: 'social', title: 'Social media', note: 'Paste full links. Empty ones are not shown.', fields: [
    { k: 'instagram', label: 'Instagram link', type: 'url', def: '' },
    { k: 'facebook', label: 'Facebook link', type: 'url', def: '' },
    { k: 'tiktok', label: 'TikTok link', type: 'url', def: '' },
    { k: 'x', label: 'X (Twitter) link', type: 'url', def: '' },
    { k: 'youtube', label: 'YouTube link', type: 'url', def: '' },
  ] },
  { id: 'home', title: 'Home page', note: 'The words visitors see first. The hero photograph is chosen in Gallery.', fields: [
    { k: 'hero_eyebrow', label: 'Small line above the headline', type: 'text', def: 'Photography studio · Ado-Ekiti' },
    { k: 'hero_title', label: 'Headline', type: 'text', def: 'Moments worth keeping.' },
    { k: 'hero_text', label: 'Introduction', type: 'textarea', def: 'Portraits, events, passport photographs and commercial work in Ado-Ekiti, made with care in the studio or on location.' },
    { k: 'why_title', label: '“Why choose us” heading', type: 'text', def: 'Why choose Akin Photography' },
    { k: 'why1_t', label: 'Reason 1: title', type: 'text', def: 'We listen first' },
    { k: 'why1_d', label: 'Reason 1: text', type: 'textarea', def: 'Tell us what you need. We guide you on poses, outfits and location.' },
    { k: 'why2_t', label: 'Reason 2: title', type: 'text', def: 'Studio or on location' },
    { k: 'why2_d', label: 'Reason 2: text', type: 'textarea', def: 'Come to the studio, or we come to you for events and outdoor sessions.' },
    { k: 'why3_t', label: 'Reason 3: title', type: 'text', def: 'Careful finishing' },
    { k: 'why3_d', label: 'Reason 3: text', type: 'textarea', def: 'Every image is checked and edited with restraint, so it looks natural and lasts.' },
    { k: 'why4_t', label: 'Reason 4: title', type: 'text', def: 'Simple booking' },
    { k: 'why4_d', label: 'Reason 4: text', type: 'textarea', def: 'Send a request online or on WhatsApp. We reply to confirm the details.' },
    { k: 'cta_image', label: 'Closing banner photograph', type: 'image', def: '', help: 'Shown behind the “Let’s make your photographs” banner. Pick a photo from your gallery.' },
    { k: 'cta_title', label: 'Closing call to action: heading', type: 'text', def: 'Let’s make your photographs.' },
    { k: 'cta_text', label: 'Closing call to action: text', type: 'textarea', def: 'Tell us what you have in mind and when. We will get back to you to confirm.' },
  ] },
  { id: 'about', title: 'About page', note: 'Only write facts you can stand behind. No invented awards or years of experience.', fields: [
    { k: 'about_image', label: 'About page photograph', type: 'image', def: '', help: 'Pick a photo from your gallery.' },
    { k: 'about_intro', label: 'Introduction', type: 'textarea', def: 'Akin Photography is a professional photography business on Onala Street, Ado-Ekiti, Ekiti State. We photograph people, celebrations and businesses with care, so that every image is something you are proud to keep.' },
    { k: 'about_story', label: 'Our story', type: 'textarea', def: 'Akin Photography serves individuals, families, organisations and businesses in Ado-Ekiti, and further afield on request, with a wide range of services, from passport photographs to events, studio portraits, outdoor sessions, commercial work and photo framing.' },
    { k: 'about_philosophy', label: 'Photography philosophy', type: 'textarea', def: 'A good photograph is honest. We pay attention to light, expression and the small details that make a moment yours, and we edit with restraint so the result looks natural and lasts.' },
    { k: 'about_quality', label: 'Commitment to quality', type: 'textarea', def: 'Every session is prepared, photographed and finished with care. We check each image before it reaches you, and we are glad to talk through your expectations before the day.' },
    { k: 'about_approach', label: 'Professional approach', type: 'textarea', def: 'We are professional and friendly, and we begin by listening. Tell us what you need, and we will guide you on posing, outfits and location, then take care of the rest.' },
    { k: 'about_availability', label: 'Studio and mobile availability', type: 'textarea', def: 'We photograph in our studio on Onala Street, and we also travel for events and outdoor sessions. Choose studio or mobile when you book, and tell us your location for mobile sessions.' },
  ] },
  { id: 'seo', title: 'Search and sharing', note: 'How the site appears on Google and when shared on WhatsApp or Facebook.', fields: [
    { k: 'seo_desc', label: 'Default description', type: 'textarea', def: 'Akin Photography: portrait, event, passport, studio, outdoor and commercial photography in Ado-Ekiti, Ekiti State, Nigeria.' },
  ] },
];

const DEFAULTS = {};
for (const g of SCHEMA) for (const f of g.fields) DEFAULTS[f.k] = f.def;
DEFAULTS.hours = JSON.stringify(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((d) => ({ day: d, text: '' })));
DEFAULTS.hero_image = '';

const CATEGORIES = ['portraits', 'events', 'studio', 'outdoor', 'passport', 'commercial', 'other'];

// services start WITHOUT prices (price_mode 'quote'); the owner sets them in the dashboard
const SEED_SERVICES = [
  ['portrait', 'Portrait Photography', 'Personal, family and professional portraits made with natural light and a relaxed, guided approach.', 'portraits'],
  ['event', 'Event Photography', 'Weddings, birthdays, naming ceremonies, graduations and gatherings: the moments and the people, documented.', 'events'],
  ['passport', 'Passport Photography', 'Clean passport and ID photographs that follow the requirements of the document you are applying for.', 'passport'],
  ['studio', 'Studio Photography', 'Controlled lighting and clean backdrops for portraits, products and creative concepts.', 'studio'],
  ['outdoor', 'Outdoor Photography', 'Sessions on location, in natural light, at a place that means something to you.', 'outdoor'],
  ['framing', 'Photo Framing', 'Your favourite photographs printed and framed, ready to hang or give as a gift.', 'other'],
  ['commercial', 'Advertising & Commercial Photography', 'Photographs for products, menus, brands and campaigns, made to help your business look its best.', 'commercial'],
  ['other', 'Other Photography Services', 'Something not listed? Tell us about your project and we will tell you honestly whether and how we can help.', 'other'],
];

module.exports = { SCHEMA, DEFAULTS, CATEGORIES, SEED_SERVICES };
