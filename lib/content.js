'use strict';
/* All editable copy and business settings. Nothing here invents a phone number, price, award or testimonial:
   those fields start empty and are filled in from the admin dashboard.  [en, yo] pairs are bilingual. */

const SCHEMA = [
  { id: 'business', title: 'Business details', note: 'Contact details appear across the site. Leave a field empty to hide it everywhere.', fields: [
    { k: 'phone', label: 'Phone number (for calls)', type: 'tel', def: '', help: 'Example: +234 800 000 0000' },
    { k: 'whatsapp', label: 'WhatsApp number', type: 'tel', def: '', help: 'International format, e.g. +2348000000000. Floating WhatsApp button and booking messages use this.' },
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
    { k: 'hero_eyebrow', label: 'Small line above the headline', type: 'text', bi: true, def: ['Photography studio · Ado-Ekiti', 'Ilé-iṣẹ́ ìyàwòrán · Ado-Ekiti'] },
    { k: 'hero_title', label: 'Headline', type: 'text', bi: true, def: ['Moments worth keeping.', 'Àwọn àkókò tó yẹ kí a pamọ́.'] },
    { k: 'hero_text', label: 'Introduction', type: 'textarea', bi: true, def: ['Portraits, events, passport photographs and commercial work in Ado-Ekiti, made with care in the studio or on location.', 'Àwòrán ara ẹni, ayẹyẹ, àwòrán passport àti iṣẹ́ ìpolówó ní Ado-Ekiti, tí a yà pẹ̀lú ìṣọ́ra ní ilé-iṣẹ́ wa tàbí níbi tí o bá wà.'] },
    { k: 'why_title', label: '“Why choose us” heading', type: 'text', bi: true, def: ['Why choose Akin Photography', 'Ìdí tí o fi yẹ kí o yan Akin Photography'] },
    { k: 'why1_t', label: 'Reason 1: title', type: 'text', bi: true, def: ['We listen first', 'À máa ń gbọ́ tìrẹ ná'] },
    { k: 'why1_d', label: 'Reason 1: text', type: 'textarea', bi: true, def: ['Tell us what you need. We guide you on poses, outfits and location.', 'Sọ ohun tí o nílò fún wa. A ó tọ́ ọ sọ́nà lórí ìdúró, aṣọ àti ibi tí a ó ti yà á.'] },
    { k: 'why2_t', label: 'Reason 2: title', type: 'text', bi: true, def: ['Studio or on location', 'Ní ilé-iṣẹ́ tàbí níbi tí o wà'] },
    { k: 'why2_d', label: 'Reason 2: text', type: 'textarea', bi: true, def: ['Come to the studio, or we come to you for events and outdoor sessions.', 'Wá sí ilé-iṣẹ́ wa, tàbí kí a wá sọ́dọ̀ rẹ fún ayẹyẹ àti ìyàwòrán ìta gbangba.'] },
    { k: 'why3_t', label: 'Reason 3: title', type: 'text', bi: true, def: ['Careful finishing', 'Ìparí tó ṣọ́ra'] },
    { k: 'why3_d', label: 'Reason 3: text', type: 'textarea', bi: true, def: ['Every image is checked and edited with restraint, so it looks natural and lasts.', 'À ń yẹ àwòrán kọ̀ọ̀kan wò, a sì ń ṣàtúnṣe rẹ̀ níwọ̀ntúnwọ̀nsì kí ó lè rí bí àdánidá, kí ó sì pẹ́ títí.'] },
    { k: 'why4_t', label: 'Reason 4: title', type: 'text', bi: true, def: ['Simple booking', 'Ṣíṣètò tó rọrùn'] },
    { k: 'why4_d', label: 'Reason 4: text', type: 'textarea', bi: true, def: ['Send a request online or on WhatsApp. We reply to confirm the details.', 'Fi ìbéèrè ránṣẹ́ lórí ayélujára tàbí WhatsApp. A ó dáhùn láti jẹ́rìí àwọn àlàyé.'] },
    { k: 'cta_title', label: 'Closing call to action: heading', type: 'text', bi: true, def: ['Let’s make your photographs.', 'Ẹ jẹ́ kí a yà àwọn àwòrán rẹ.'] },
    { k: 'cta_text', label: 'Closing call to action: text', type: 'textarea', bi: true, def: ['Tell us what you have in mind and when. We will get back to you to confirm.', 'Sọ ohun tí o ní lọ́kàn àti ìgbà tí o fẹ́ fún wa. A ó padà wá fún ọ láti jẹ́rìí.'] },
  ] },
  { id: 'about', title: 'About page', note: 'Only write facts you can stand behind. No invented awards or years of experience.', fields: [
    { k: 'about_image', label: 'About page photograph', type: 'image', def: '', help: 'Pick a photo from your gallery.' },
    { k: 'about_intro', label: 'Introduction', type: 'textarea', bi: true, def: ['Akin Photography is a professional photography business on Onala Street, Ado-Ekiti, Ekiti State. We photograph people, celebrations and businesses with care, so that every image is something you are proud to keep.', 'Akin Photography jẹ́ iṣẹ́ ìyàwòrán àmọ̀dájú ní Òpópónà Onala, Ado-Ekiti, Ìpínlẹ̀ Ekiti. À ń yà àwòrán àwọn ènìyàn, ayẹyẹ àti iṣẹ́ ajé pẹ̀lú ìṣọ́ra, kí gbogbo àwòrán lè jẹ́ ohun tí o máa fi ìgbéraga pamọ́.'] },
    { k: 'about_story', label: 'Our story', type: 'textarea', bi: true, def: ['Akin Photography serves individuals, families, organisations and businesses in Ado-Ekiti, and further afield on request, with a wide range of services, from passport photographs to events, studio portraits, outdoor sessions, commercial work and photo framing.', 'Akin Photography ń sìn àwọn ẹnìkọ̀ọ̀kan, ìdílé, àjọ àti àwọn iṣẹ́ ajé ní Ado-Ekiti, àti ní ibòmíràn tí a bá béèrè, pẹ̀lú onírúurú iṣẹ́, láti àwòrán passport sí ayẹyẹ, àwòrán inú ilé-iṣẹ́, àwòrán ìta gbangba, iṣẹ́ ìpolówó àti fífi férémù sí àwòrán.'] },
    { k: 'about_philosophy', label: 'Photography philosophy', type: 'textarea', bi: true, def: ['A good photograph is honest. We pay attention to light, expression and the small details that make a moment yours, and we edit with restraint so the result looks natural and lasts.', 'Àwòrán tó dára gbọ́dọ̀ jẹ́ òtítọ́. À ń fọkàn sí ìmọ́lẹ̀, ìfarahàn ojú àti àwọn nǹkan kékeré tó ń mú kí àkókò náà jẹ́ tìrẹ, a sì ń ṣàtúnṣe níwọ̀ntúnwọ̀nsì kí àwòrán lè rí bí àdánidá, kí ó sì pẹ́ títí.'] },
    { k: 'about_quality', label: 'Commitment to quality', type: 'textarea', bi: true, def: ['Every session is prepared, photographed and finished with care. We check each image before it reaches you, and we are glad to talk through your expectations before the day.', 'À ń múra sílẹ̀, à ń yà, a sì ń parí gbogbo ìgbà ìyàwòrán pẹ̀lú ìṣọ́ra. À ń yẹ àwòrán kọ̀ọ̀kan wò kí ó tó dé ọ̀dọ̀ rẹ, a sì ní inú dídùn láti bá ọ sọ̀rọ̀ nípa ohun tí o fẹ́ kí ọjọ́ náà tó pé.'] },
    { k: 'about_approach', label: 'Professional approach', type: 'textarea', bi: true, def: ['We are professional and friendly, and we begin by listening. Tell us what you need, and we will guide you on posing, outfits and location, then take care of the rest.', 'À jẹ́ ògbóǹtarìgì àti ọ̀rẹ́, a sì ń bẹ̀rẹ̀ nípa gbígbọ́. Sọ ohun tí o nílò fún wa, a ó tọ́ ọ sọ́nà lórí ìdúró, aṣọ àti ibi tí a ó ti yà á, a ó sì ṣe ìyókù.'] },
    { k: 'about_availability', label: 'Studio and mobile availability', type: 'textarea', bi: true, def: ['We photograph in our studio on Onala Street, and we also travel for events and outdoor sessions. Choose studio or mobile when you book, and tell us your location for mobile sessions.', 'À ń yà àwòrán ní ilé-iṣẹ́ wa ní Òpópónà Onala, a sì ń lọ sí ibòmíràn fún ayẹyẹ àti ìyàwòrán ìta gbangba. Yan ilé-iṣẹ́ tàbí alágbèéká nígbà tí o bá ń ṣètò, kí o sì sọ ibi tí o wà fún ìyàwòrán alágbèéká.'] },
  ] },
  { id: 'seo', title: 'Search and sharing', note: 'How the site appears on Google and when shared on WhatsApp or Facebook.', fields: [
    { k: 'seo_desc', label: 'Default description', type: 'textarea', bi: true, def: ['Akin Photography: portrait, event, passport, studio, outdoor and commercial photography in Ado-Ekiti, Ekiti State, Nigeria.', 'Akin Photography: iṣẹ́ ìyàwòrán àwòrán ara ẹni, ayẹyẹ, passport, inú ilé-iṣẹ́, ìta gbangba àti ìpolówó ní Ado-Ekiti, Ìpínlẹ̀ Ekiti, Nàìjíríà.'] },
  ] },
];

const DEFAULTS = {};
for (const g of SCHEMA) for (const f of g.fields) {
  if (f.bi) { DEFAULTS[f.k + '_en'] = f.def[0]; DEFAULTS[f.k + '_yo'] = f.def[1]; } else DEFAULTS[f.k] = f.def;
}
DEFAULTS.hours = JSON.stringify(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((d) => ({ day: d, text: '' })));
DEFAULTS.hero_image = '';

const CATEGORIES = ['portraits', 'events', 'studio', 'outdoor', 'passport', 'commercial', 'other'];

// services start WITHOUT prices (price_mode 'quote'); the owner sets them in the dashboard
const SEED_SERVICES = [
  ['portrait', 'Portrait Photography', 'Àwòrán Ara Ẹni', 'Personal, family and professional portraits made with natural light and a relaxed, guided approach.', 'Àwòrán ara ẹni, ti ìdílé àti ti iṣẹ́ àmọ̀dájú, tí a yà pẹ̀lú ìmọ́lẹ̀ àdánidá àti ìtọ́sọ́nà onífẹ̀ẹ́.', 'portraits'],
  ['event', 'Event Photography', 'Ìyàwòrán Ayẹyẹ', 'Weddings, birthdays, naming ceremonies, graduations and gatherings: the moments and the people, documented.', 'Ìgbéyàwó, ọjọ́ ìbí, ìsọmọlórúkọ, ayẹyẹ ìgboyè àti àpéjọ: àwọn àkókò àti àwọn ènìyàn, tí a yà sílẹ̀.', 'events'],
  ['passport', 'Passport Photography', 'Àwòrán Passport', 'Clean passport and ID photographs that follow the requirements of the document you are applying for.', 'Àwòrán passport àti káàdì ìdánimọ̀ tó mọ́, tó sì bá ohun tí ìwé tí ò ń béèrè fún nílò mu.', 'passport'],
  ['studio', 'Studio Photography', 'Àwòrán Inú Ilé-iṣẹ́', 'Controlled lighting and clean backdrops for portraits, products and creative concepts.', 'Ìmọ́lẹ̀ tí a ṣàkóso àti àwọ̀ ẹ̀yìn tó mọ́ fún àwòrán ara ẹni, ọjà àti èrò àtinúdá.', 'studio'],
  ['outdoor', 'Outdoor Photography', 'Ìyàwòrán Ìta Gbangba', 'Sessions on location, in natural light, at a place that means something to you.', 'Ìyàwòrán níbi tí o yàn, pẹ̀lú ìmọ́lẹ̀ àdánidá, ní ibi tó ní ìtumọ̀ fún ọ.', 'outdoor'],
  ['framing', 'Photo Framing', 'Fífi Férémù Sí Àwòrán', 'Your favourite photographs printed and framed, ready to hang or give as a gift.', 'Àwọn àwòrán tí o fẹ́ jù, tí a tẹ̀ tí a sì fi férémù sí, tí ó ṣetán láti kọ́ sórí ògiri tàbí láti fúnni ní ẹ̀bùn.', 'other'],
  ['commercial', 'Advertising & Commercial Photography', 'Àwòrán Ìpolówó àti Iṣẹ́ Ajé', 'Photographs for products, menus, brands and campaigns, made to help your business look its best.', 'Àwòrán fún ọjà, àtẹ oúnjẹ, àmì-ìdánimọ̀ àti ìpolówó, tí a ṣe láti jẹ́ kí iṣẹ́ ajé rẹ dára ní ojú.', 'commercial'],
  ['other', 'Other Photography Services', 'Àwọn Iṣẹ́ Ìyàwòrán Mìíràn', 'Something not listed? Tell us about your project and we will tell you honestly whether and how we can help.', 'Ǹjẹ́ nǹkan kan wà tí a kò kọ síbí? Sọ nípa iṣẹ́ rẹ fún wa, a ó sì sọ òtítọ́ fún ọ bóyá àti bí a ṣe lè ràn ọ́ lọ́wọ́.', 'other'],
];

module.exports = { SCHEMA, DEFAULTS, CATEGORIES, SEED_SERVICES };
