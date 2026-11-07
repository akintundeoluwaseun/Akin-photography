'use strict';
/* Interface text. [English, Yoruba]. Business content (hero, about, services) is edited in the dashboard. */
const T = {
  nav_home: ['Home', 'Ilé'], nav_about: ['About', 'Nípa Wa'], nav_services: ['Services', 'Àwọn Iṣẹ́'], nav_portfolio: ['Portfolio', 'Àwòrán Wa'],
  nav_pricing: ['Pricing', 'Iye Owó'], nav_contact: ['Contact', 'Kàn Sí Wa'], nav_book: ['Book a Session', 'Ṣètò Ìgbà Ìyàwòrán'],
  menu: ['Menu', 'Àtòjọ'], skip: ['Skip to content', 'Lọ sí àkóónú'], lang_switch: ['Yorùbá', 'English'], lang_label: ['Switch to Yoruba', 'Yípadà sí Gẹ̀ẹ́sì'],
  explore: ['Explore Our Work', 'Wo Àwọn Iṣẹ́ Wa'], book: ['Book a Session', 'Ṣètò Ìgbà Ìyàwòrán'], book_short: ['Book', 'Ṣètò'],
  featured_title: ['Selected work', 'Àwọn iṣẹ́ tí a yàn'], featured_all: ['View the full portfolio', 'Wo gbogbo àwòrán'],
  services_title: ['What we photograph', 'Ohun tí a ń yà'], services_all: ['All services', 'Gbogbo àwọn iṣẹ́'],
  testimonials_title: ['Kind words', 'Ọ̀rọ̀ rere'],
  // about
  about_title: ['About Akin Photography', 'Nípa Akin Photography'], about_story_h: ['Our story', 'Ìtàn wa'], about_phil_h: ['How we see photography', 'Bí a ṣe ń wo ìyàwòrán'],
  about_quality_h: ['Our commitment to quality', 'Ìfọkànsìn wa sí dídára'], about_approach_h: ['How we work', 'Bí a ṣe ń ṣiṣẹ́'], about_avail_h: ['Studio and mobile', 'Ilé-iṣẹ́ àti alágbèéká'],
  // services / pricing
  services_page_title: ['Photography services', 'Àwọn iṣẹ́ ìyàwòrán'], services_intro: ['Choose a service and book a session, or message us if your project is different.', 'Yan iṣẹ́ kan kí o sì ṣètò ìgbà, tàbí kọ̀wé sí wa tí iṣẹ́ rẹ bá yàtọ̀.'],
  book_this: ['Book this service', 'Ṣètò iṣẹ́ yìí'], ask_wa: ['Ask on WhatsApp', 'Béèrè lórí WhatsApp'],
  pricing_title: ['Pricing', 'Iye Owó'], pricing_intro: ['Prices are in Nigerian Naira. Where a price is not listed, we give you a quotation for your project.', 'Owó wà ní Naira Nàìjíríà. Níbi tí a kò bá kọ iye owó sí, a ó fún ọ ní ìṣirò fún iṣẹ́ rẹ.'],
  price_quote: ['Price on request', 'Iye owó lórí ìbéèrè'], price_from: ['From', 'Láti'], price_negotiable: ['Negotiable', 'A lè jọ jíròrò'], price_fixed: ['Fixed price', 'Iye owó tí a dá'],
  custom_quote_h: ['Need something special?', 'Ṣé o nílò ohun pàtàkì?'], custom_quote_t: ['For weddings, large events and commercial projects, we prepare a custom quotation. Tell us about the project.', 'Fún ìgbéyàwó, àpéjọ ńlá àti iṣẹ́ ìpolówó, a ń ṣe ìṣirò tó yàtọ̀. Sọ nípa iṣẹ́ náà fún wa.'], custom_quote_btn: ['Request a quotation', 'Béèrè fún ìṣirò'],
  // portfolio
  portfolio_title: ['Portfolio', 'Àwọn Àwòrán Wa'], portfolio_intro: ['A look at our photography. Select a category, then tap a photograph to view it large.', 'Ìwòran iṣẹ́ ìyàwòrán wa. Yan ẹ̀ka kan, lẹ́yìn náà tẹ àwòrán láti wò ó ní ńlá.'],
  cat_all: ['All', 'Gbogbo'], cat_portraits: ['Portraits', 'Àwòrán Ara Ẹni'], cat_events: ['Events', 'Ayẹyẹ'], cat_studio: ['Studio', 'Inú Ilé-iṣẹ́'], cat_outdoor: ['Outdoor', 'Ìta Gbangba'],
  cat_passport: ['Passport', 'Passport'], cat_commercial: ['Commercial', 'Iṣẹ́ Ajé'], cat_other: ['Other Projects', 'Àwọn Iṣẹ́ Mìíràn'],
  viewer_close: ['Close', 'Ti'], viewer_prev: ['Previous photograph', 'Àwòrán tó ṣáájú'], viewer_next: ['Next photograph', 'Àwòrán tó kàn'], viewer_of: ['of', 'nínú'],
  empty_cat: ['No photographs in this category yet.', 'Kò tíì sí àwòrán nínú ẹ̀ka yìí.'],
  // booking
  booking_title: ['Book a session', 'Ṣètò ìgbà ìyàwòrán'], booking_intro: ['Send us a booking request. We will contact you to confirm the date, time and price. Your session is not booked until we confirm.', 'Fi ìbéèrè ìṣètò ránṣẹ́ sí wa. A ó kàn sí ọ láti jẹ́rìí ọjọ́, àkókò àti iye owó. A kò tíì ṣètò ìgbà rẹ títí a ó fi jẹ́rìí.'],
  f_service: ['Service', 'Iṣẹ́'], f_choose: ['Choose a service', 'Yan iṣẹ́ kan'], f_name: ['Full name', 'Orúkọ kíkún'], f_phone: ['Phone number', 'Nọ́ńbà fóònù'],
  f_date: ['Preferred date', 'Ọjọ́ tí o fẹ́'], f_time: ['Preferred time', 'Àkókò tí o fẹ́'], f_mode: ['Where should we photograph?', 'Níbo ni kí a ti yà á?'],
  f_studio: ['At the studio', 'Ní ilé-iṣẹ́'], f_mobile: ['Mobile (we come to you)', 'Alágbèéká (a ó wá sọ́dọ̀ rẹ)'], f_location: ['Your location', 'Ibi tí o wà'],
  f_location_h: ['Address or landmark for the session', 'Àdírẹ́sì tàbí àmì ibi fún ìyàwòrán náà'], f_details: ['Tell us what you need', 'Sọ ohun tí o nílò fún wa'],
  f_details_h: ['Occasion, number of people, outfits, anything we should know', 'Ayẹyẹ, iye ènìyàn, aṣọ, ohunkóhun tí a yẹ kí a mọ̀'], f_email: ['Email (optional)', 'Ímeèlì (kò ṣe dandan)'], f_message: ['Your message', 'Ọ̀rọ̀ rẹ'],
  f_send_booking: ['Send booking request', 'Fi ìbéèrè ìṣètò ránṣẹ́'], f_sending: ['Sending…', 'Ń fi ránṣẹ́…'], f_optional: ['optional', 'kò ṣe dandan'],
  err_service: ['Please choose a service.', 'Jọ̀wọ́ yan iṣẹ́ kan.'], err_name: ['Please enter your full name.', 'Jọ̀wọ́ kọ orúkọ kíkún rẹ.'], err_phone: ['Please enter a valid phone number.', 'Jọ̀wọ́ kọ nọ́ńbà fóònù tó tọ́.'],
  err_date: ['Please choose a date from today onwards.', 'Jọ̀wọ́ yan ọjọ́ láti òní lọ.'], err_time: ['Please choose a time.', 'Jọ̀wọ́ yan àkókò.'], err_location: ['Please tell us where the session should take place.', 'Jọ̀wọ́ sọ ibi tí a ó ti yà á fún wa.'],
  err_message: ['Please write a short message.', 'Jọ̀wọ́ kọ ọ̀rọ̀ kúkúrú.'], err_contact: ['Please give a phone number or an email so we can reply.', 'Jọ̀wọ́ fún wa ní nọ́ńbà fóònù tàbí ímeèlì kí a lè dáhùn.'],
  err_security: ['Your session expired. Please reload the page and try again.', 'Ìgbà rẹ ti parí. Jọ̀wọ́ tún ojú-ìwé yìí ṣí, kí o sì gbìyànjú lẹ́ẹ̀kan sí i.'], err_many: ['Too many requests. Please wait a few minutes and try again.', 'Ìbéèrè pọ̀ jù. Jọ̀wọ́ dúró fún ìṣẹ́jú díẹ̀ kí o sì gbìyànjú padà.'],
  err_fix: ['Please check the highlighted fields.', 'Jọ̀wọ́ yẹ àwọn àpótí tí a fi hàn wò.'],
  conf_title: ['Request received', 'A ti gba ìbéèrè rẹ'], conf_head: ['Thank you, {name}.', 'A dúpẹ́, {name}.'],
  conf_text: ['Your request has been saved and is awaiting approval. It is not yet a confirmed booking. We will contact you to confirm.', 'A ti fi ìbéèrè rẹ pamọ́, ó sì ń dúró de ìfọwọ́sí. Kò tíì jẹ́ ìṣètò tí a ti jẹ́rìí. A ó kàn sí ọ láti jẹ́rìí.'],
  conf_wa_btn: ['Send these details on WhatsApp', 'Fi àlàyé wọ̀nyí ránṣẹ́ lórí WhatsApp'], conf_wa_note: ['Tap to send your request to us directly on WhatsApp so we can respond faster.', 'Tẹ̀ láti fi ìbéèrè rẹ ránṣẹ́ sí wa tààrà lórí WhatsApp kí a lè dáhùn ní kíákíá.'],
  conf_no_wa: ['We will contact you on the phone number you gave us.', 'A ó kàn sí ọ lórí nọ́ńbà fóònù tí o fún wa.'], conf_summary: ['Your request', 'Ìbéèrè rẹ'], conf_ref: ['Reference', 'Nọ́ńbà ìtọ́kasí'],
  conf_another: ['Make another request', 'Ṣe ìbéèrè mìíràn'], conf_home: ['Back to home', 'Padà sí ilé'], s_mode: ['Where', 'Níbo'],
  wa_hello: ['Hello Akin Photography, I would like to book a session.', 'Báwo ni, Akin Photography, mo fẹ́ ṣètò ìgbà ìyàwòrán.'],
  wa_hello_generic: ['Hello Akin Photography, I would like to ask about your photography services.', 'Báwo ni, Akin Photography, mo fẹ́ béèrè nípa àwọn iṣẹ́ ìyàwòrán yín.'],
  wa_hello_service: ['Hello Akin Photography, I am interested in: {service}.', 'Báwo ni, Akin Photography, mo ní ìfẹ́ sí: {service}.'],
  // contact
  contact_title: ['Contact us', 'Kàn sí wa'], contact_intro: ['Call, message us on WhatsApp, or send a note below. We would love to hear from you.', 'Pè wá, kọ̀wé sí wa lórí WhatsApp, tàbí fi ọ̀rọ̀ ránṣẹ́ nísàlẹ̀. A ó fẹ́ gbọ́ lẹ́nu rẹ.'],
  c_visit: ['Visit the studio', 'Wá sí ilé-iṣẹ́ wa'], c_address: ['Address', 'Àdírẹ́sì'], c_phone: ['Phone', 'Fóònù'], c_email: ['Email', 'Ímeèlì'], c_hours: ['Opening hours', 'Àkókò iṣẹ́'],
  c_hours_closed: ['Closed', 'A tì'], c_form_title: ['Send us a message', 'Fi ọ̀rọ̀ ránṣẹ́ sí wa'], c_send: ['Send message', 'Fi ọ̀rọ̀ ránṣẹ́'],
  c_thanks_title: ['Message received', 'A ti gba ọ̀rọ̀ rẹ'], c_thanks_text: ['Thank you, {name}. We have received your message and will get back to you.', 'A dúpẹ́, {name}. A ti gba ọ̀rọ̀ rẹ, a ó sì padà wá fún ọ.'],
  c_open_maps: ['Open in Google Maps', 'Ṣí i nínú Google Maps'], c_map_title: ['Map showing the studio location', 'Àwòrán ìmọ̀ràn tó fi ibùdó ilé-iṣẹ́ hàn'], c_follow: ['Follow us', 'Tẹ̀lé wa'],
  call_now: ['Call us', 'Pè wá'], whatsapp_us: ['Message on WhatsApp', 'Kọ̀wé lórí WhatsApp'], wa_float: ['Chat on WhatsApp', 'Bá wa sọ̀rọ̀ lórí WhatsApp'],
  days: [['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], ['Ọjọ́ Ajé', 'Ọjọ́ Ìṣẹ́gun', 'Ọjọ́rú', 'Ọjọ́bọ̀', 'Ọjọ́ Ẹtì', 'Ọjọ́ Àbámẹ́ta', 'Ọjọ́ Àìkú']],
  // footer / errors
  foot_tag: ['Portraits, events, passport and commercial photography in Ado-Ekiti, Ekiti State.', 'Àwòrán ara ẹni, ayẹyẹ, passport àti iṣẹ́ ìpolówó ní Ado-Ekiti, Ìpínlẹ̀ Ekiti.'],
  foot_nav: ['Explore', 'Ṣàwárí'], foot_services: ['Services', 'Àwọn iṣẹ́'], foot_contact: ['Contact', 'Kàn sí wa'], foot_rights: ['All rights reserved.', 'Gbogbo ẹ̀tọ́ wà ní ìpamọ́.'],
  e404_title: ['Page not found', 'A kò rí ojú-ìwé yìí'], e404_text: ['The page you are looking for does not exist or has moved.', 'Ojú-ìwé tí ò ń wá kò sí, tàbí ó ti yí ibùgbé padà.'],
  e500_title: ['Something went wrong', 'Nǹkan kan ṣẹlẹ̀'], e500_text: ['We hit a problem on our side. Please try again in a moment.', 'Ìṣòro kan yọjú ní ìhà tiwa. Jọ̀wọ́ gbìyànjú lẹ́ẹ̀kan sí i láìpẹ́.'],
  loading: ['Loading…', 'Ń gbé e wá…'],
};
function make(lang) {
  const i = lang === 'yo' ? 1 : 0;
  return (k, vars) => {
    const e = T[k]; if (!e) return k;
    let s = Array.isArray(e[0]) ? e[i] : e[i] || e[0];
    if (vars) for (const [a, b] of Object.entries(vars)) s = String(s).replaceAll('{' + a + '}', b);
    return s;
  };
}
module.exports = { T, make };
