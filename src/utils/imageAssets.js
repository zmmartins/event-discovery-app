const avatarImages = {
  ana: require("../assets/avatars/ana.jpeg"),
  clara: require("../assets/avatars/clara.jpeg"),
  ines: require("../assets/avatars/ines.jpeg"),
  joao: require("../assets/avatars/joao.jpeg"),
  miguel: require("../assets/avatars/miguel.jpeg"),
  rita: require("../assets/avatars/rita.jpeg"),
};

// Event image variants:
// - source: original event images, highest-quality local assets
// - pin: tiny images for map marker snapshots
// - poster: square generated fallbacks for map pin to poster morphs
// - preview: medium images for cards/lists/profile memories
// - detail: larger images for event detail screens
//
// `getEventImage` is kept as a backward-compatible alias to preview images.
const legacyEventImageKeys = {
  "art-gallery": "art_gallery1",
  "film-night": "concert",
  "rooftop-jazz": "sunset1",
};

const eventPinImages = {
  "art-gallery": require("../assets/events/pins/art_gallery1_pin.jpg"),
  "film-night": require("../assets/events/pins/concert_pin.jpg"),
  "rooftop-jazz": require("../assets/events/pins/sunset1_pin.jpg"),
  art_gallery1: require("../assets/events/pins/art_gallery1_pin.jpg"),
  art_gallery2: require("../assets/events/pins/art_gallery2_pin.jpg"),
  art_gallery3: require("../assets/events/pins/art_gallery3_pin.jpg"),
  baking_class1: require("../assets/events/pins/baking_class1_pin.jpg"),
  baking_class2: require("../assets/events/pins/baking_class2_pin.jpg"),
  baking_class3: require("../assets/events/pins/baking_class3_pin.jpg"),
  club1: require("../assets/events/pins/club1_pin.jpg"),
  club3: require("../assets/events/pins/club3_pin.jpg"),
  club4: require("../assets/events/pins/club4_pin.jpg"),
  concert: require("../assets/events/pins/concert_pin.jpg"),
  festival1: require("../assets/events/pins/festival1_pin.jpg"),
  festival2: require("../assets/events/pins/festival2_pin.jpg"),
  party1: require("../assets/events/pins/party1_pin.jpg"),
  party2: require("../assets/events/pins/party2_pin.jpg"),
  sunset1: require("../assets/events/pins/sunset1_pin.jpg"),
  sunset2: require("../assets/events/pins/sunset2_pin.jpg"),
};

const eventSourceImages = {
  art_gallery1: require("../assets/events/art_gallery1.jpg"),
  art_gallery2: require("../assets/events/art_gallery2.jpg"),
  art_gallery3: require("../assets/events/art_gallery3.jpg"),
  baking_class1: require("../assets/events/baking_class1.jpg"),
  baking_class2: require("../assets/events/baking_class2.jpg"),
  baking_class3: require("../assets/events/baking_class3.jpg"),
  club1: require("../assets/events/club1.jpg"),
  club3: require("../assets/events/club3.jpg"),
  club4: require("../assets/events/club4.jpg"),
  concert: require("../assets/events/concert.jpg"),
  festival1: require("../assets/events/festival1.jpg"),
  festival2: require("../assets/events/festival2.jpg"),
  party1: require("../assets/events/party1.jpg"),
  party2: require("../assets/events/party2.jpg"),
  sunset1: require("../assets/events/sunset1.jpg"),
  sunset2: require("../assets/events/sunset2.jpg"),
};

const eventPosterImages = {
  art_gallery1: require("../assets/events/posters/art_gallery1_poster.jpg"),
  art_gallery2: require("../assets/events/posters/art_gallery2_poster.jpg"),
  art_gallery3: require("../assets/events/posters/art_gallery3_poster.jpg"),
  baking_class1: require("../assets/events/posters/baking_class1_poster.jpg"),
  baking_class2: require("../assets/events/posters/baking_class2_poster.jpg"),
  baking_class3: require("../assets/events/posters/baking_class3_poster.jpg"),
  club1: require("../assets/events/posters/club1_poster.jpg"),
  club3: require("../assets/events/posters/club3_poster.jpg"),
  club4: require("../assets/events/posters/club4_poster.jpg"),
  concert: require("../assets/events/posters/concert_poster.jpg"),
  festival1: require("../assets/events/posters/festival1_poster.jpg"),
  festival2: require("../assets/events/posters/festival2_poster.jpg"),
  party1: require("../assets/events/posters/party1_poster.jpg"),
  party2: require("../assets/events/posters/party2_poster.jpg"),
  sunset1: require("../assets/events/posters/sunset1_poster.jpg"),
  sunset2: require("../assets/events/posters/sunset2_poster.jpg"),
};

const eventPreviewImages = {
  "art-gallery": require("../assets/events/previews/art_gallery1_preview.jpg"),
  "film-night": require("../assets/events/previews/concert_preview.jpg"),
  "rooftop-jazz": require("../assets/events/previews/sunset1_preview.jpg"),
  art_gallery1: require("../assets/events/previews/art_gallery1_preview.jpg"),
  art_gallery2: require("../assets/events/previews/art_gallery2_preview.jpg"),
  art_gallery3: require("../assets/events/previews/art_gallery3_preview.jpg"),
  baking_class1: require("../assets/events/previews/baking_class1_preview.jpg"),
  baking_class2: require("../assets/events/previews/baking_class2_preview.jpg"),
  baking_class3: require("../assets/events/previews/baking_class3_preview.jpg"),
  club1: require("../assets/events/previews/club1_preview.jpg"),
  club3: require("../assets/events/previews/club3_preview.jpg"),
  club4: require("../assets/events/previews/club4_preview.jpg"),
  concert: require("../assets/events/previews/concert_preview.jpg"),
  festival1: require("../assets/events/previews/festival1_preview.jpg"),
  festival2: require("../assets/events/previews/festival2_preview.jpg"),
  party1: require("../assets/events/previews/party1_preview.jpg"),
  party2: require("../assets/events/previews/party2_preview.jpg"),
  sunset1: require("../assets/events/previews/sunset1_preview.jpg"),
  sunset2: require("../assets/events/previews/sunset2_preview.jpg"),
};

const eventDetailImages = {
  "art-gallery": require("../assets/events/details/art_gallery1_detail.jpg"),
  "film-night": require("../assets/events/details/concert_detail.jpg"),
  "rooftop-jazz": require("../assets/events/details/sunset1_detail.jpg"),
  art_gallery1: require("../assets/events/details/art_gallery1_detail.jpg"),
  art_gallery2: require("../assets/events/details/art_gallery2_detail.jpg"),
  art_gallery3: require("../assets/events/details/art_gallery3_detail.jpg"),
  baking_class1: require("../assets/events/details/baking_class1_detail.jpg"),
  baking_class2: require("../assets/events/details/baking_class2_detail.jpg"),
  baking_class3: require("../assets/events/details/baking_class3_detail.jpg"),
  club1: require("../assets/events/details/club1_detail.jpg"),
  club3: require("../assets/events/details/club3_detail.jpg"),
  club4: require("../assets/events/details/club4_detail.jpg"),
  concert: require("../assets/events/details/concert_detail.jpg"),
  festival1: require("../assets/events/details/festival1_detail.jpg"),
  festival2: require("../assets/events/details/festival2_detail.jpg"),
  party1: require("../assets/events/details/party1_detail.jpg"),
  party2: require("../assets/events/details/party2_detail.jpg"),
  sunset1: require("../assets/events/details/sunset1_detail.jpg"),
  sunset2: require("../assets/events/details/sunset2_detail.jpg"),
};

export const eventImages = eventPreviewImages;

function normalizeEventImageKey(key) {
  const rawKey = String(key ?? "").trim();

  return legacyEventImageKeys[rawKey] ?? rawKey;
}

export function getAvatarImage(key) {
  return avatarImages[key] ?? avatarImages.ana;
}

export function getEventPinImage(key) {
  const normalizedKey = normalizeEventImageKey(key);

  return (
    eventPinImages[normalizedKey] ?? eventPinImages[key] ?? eventPinImages.art_gallery1
  );
}

export function getEventPosterImage(key) {
  const normalizedKey = normalizeEventImageKey(key);

  return (
    eventSourceImages[normalizedKey] ??
    eventSourceImages[key] ??
    eventDetailImages[normalizedKey] ??
    eventDetailImages[key] ??
    eventPosterImages[normalizedKey] ??
    eventPreviewImages[normalizedKey] ??
    eventPreviewImages[key] ??
    eventPinImages[normalizedKey] ??
    eventPinImages[key] ??
    eventPreviewImages.art_gallery1
  );
}

export function getEventPreviewImage(key) {
  const normalizedKey = normalizeEventImageKey(key);

  return (
    eventPreviewImages[normalizedKey] ??
    eventPreviewImages[key] ??
    eventPreviewImages.art_gallery1
  );
}

export function getEventDetailImage(key) {
  const normalizedKey = normalizeEventImageKey(key);

  return (
    eventDetailImages[normalizedKey] ??
    eventDetailImages[key] ??
    eventDetailImages.art_gallery1
  );
}

export function getEventImage(key) {
  return getEventPreviewImage(key);
}
