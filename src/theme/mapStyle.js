import { colors } from "./colors";

export const APP_MAP_STYLE = [
  {
    featureType: "all",
    elementType: "geometry",
    stylers: [{ visibility: "on" }],
  },
  {
    featureType: "all",
    elementType: "labels",
    stylers: [{ visibility: "on" }],
  },
  {
    featureType: "administrative",
    elementType: "geometry.fill",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "administrative.country",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "administrative.province",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: colors.text }, { weight: "2.00" }],
  },
  {
    featureType: "administrative.neighborhood",
    elementType: "labels.text.fill",
    stylers: [{ color: colors.secondaryText }],
  },
  {
    featureType: "landscape",
    elementType: "geometry.fill",
    stylers: [{ color: colors.surface }],
  },
  {
    featureType: "landscape.man_made",
    elementType: "geometry.fill",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi",
    elementType: "geometry.fill",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry.fill",
    stylers: [{ color: colors.softSurface }, { visibility: "off" }],
  },
  {
    featureType: "road",
    elementType: "geometry.fill",
    stylers: [{ weight: "0.50" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.fill",
    stylers: [{ color: colors.iconMuted }, { weight: "0.50" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ visibility: "off" }, { weight: "0.01" }],
  },
  {
    featureType: "road.highway.controlled_access",
    elementType: "geometry.fill",
    stylers: [{ weight: "0.50" }, { color: colors.mutedText }],
  },
  {
    featureType: "road.highway.controlled_access",
    elementType: "geometry.stroke",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry.fill",
    stylers: [{ color: colors.text }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry.stroke",
    stylers: [{ visibility: "off" }, { weight: "0.50" }],
  },
  {
    featureType: "road.local",
    elementType: "geometry.fill",
    stylers: [{ color: colors.border }],
  },
  {
    featureType: "road.local",
    elementType: "geometry.stroke",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "transit.line",
    elementType: "geometry.fill",
    stylers: [{ color: colors.secondaryText }],
  },
  {
    featureType: "transit.line",
    elementType: "geometry.stroke",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "transit.station",
    elementType: "geometry.fill",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "water",
    elementType: "geometry.fill",
    stylers: [{ color: colors.softSurface }],
  },
];
