export const avatarImages = {
  ana: require("../assets/avatars/ana.png"),
  clara: require("../assets/avatars/clara.png"),
  ines: require("../assets/avatars/ines.png"),
  joao: require("../assets/avatars/joao.png"),
  miguel: require("../assets/avatars/miguel.png"),
  rita: require("../assets/avatars/rita.png"),
};

export const eventImages = {
  "art-gallery": require("../assets/events/art-gallery.png"),
  "film-night": require("../assets/events/film-night.png"),
  "rooftop-jazz": require("../assets/events/rooftop-jazz.png"),
};

export function getAvatarImage(key) {
  return avatarImages[key] ?? avatarImages.ana;
}

export function getEventImage(key) {
  return eventImages[key] ?? eventImages["art-gallery"];
}
