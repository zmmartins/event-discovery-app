export const avatarImages = {
  ana: require("../assets/avatars/ana.png"),
  clara: require("../assets/avatars/clara.png"),
  ines: require("../assets/avatars/ines.png"),
  joao: require("../assets/avatars/joao.png"),
  miguel: require("../assets/avatars/miguel.png"),
  rita: require("../assets/avatars/rita.png"),
};

export const eventImages = {
  "art-gallery": require("../assets/events/art_gallery1.jpg"),
  "film-night": require("../assets/events/concert.jpg"),
  "rooftop-jazz": require("../assets/events/sunset1.jpg"),
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

export function getAvatarImage(key) {
  return avatarImages[key] ?? avatarImages.ana;
}

export function getEventImage(key) {
  return eventImages[key] ?? eventImages["art-gallery"];
}
