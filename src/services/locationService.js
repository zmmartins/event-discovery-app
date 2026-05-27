import * as Location from "expo-location";

import {
  LOG_ACTIONS,
  logInteraction,
} from "./interactionLogService";

const LAST_KNOWN_MAX_AGE_MS = 10 * 60 * 1000;
const LAST_KNOWN_REQUIRED_ACCURACY_METERS = 1000;

function roundCoordinate(value) {
  if (typeof value !== "number") return null;

  return Math.round(value * 10000) / 10000;
}

function normalizeCoordinate(location) {
  const coords = location?.coords;

  if (!coords) return null;

  return {
    accuracy: coords.accuracy ?? null,
    latitude: coords.latitude,
    longitude: coords.longitude,
  };
}

function getLogLocationMetadata(location, source) {
  const coordinate = normalizeCoordinate(location);

  if (!coordinate) return { source };

  return {
    accuracy:
      typeof coordinate.accuracy === "number"
        ? Math.round(coordinate.accuracy)
        : null,
    latitude: roundCoordinate(coordinate.latitude),
    longitude: roundCoordinate(coordinate.longitude),
    source,
  };
}

async function readCurrentLocation() {
  try {
    const currentLocation = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      location: currentLocation,
      source: "current",
    };
  } catch (error) {
    const lastKnownLocation = await Location.getLastKnownPositionAsync({
      maxAge: LAST_KNOWN_MAX_AGE_MS,
      requiredAccuracy: LAST_KNOWN_REQUIRED_ACCURACY_METERS,
    });

    if (!lastKnownLocation) {
      throw error;
    }

    return {
      location: lastKnownLocation,
      source: "last_known",
    };
  }
}

export async function getForegroundUserLocation(metadata = {}) {
  logInteraction(LOG_ACTIONS.locationPermissionRequested, {
    ...metadata,
    result: "requested",
  }).catch(() => null);

  let permission;

  try {
    permission = await Location.requestForegroundPermissionsAsync();
  } catch {
    logInteraction(LOG_ACTIONS.userLocationUnavailable, {
      ...metadata,
      reason: "permission_request_failed",
      result: "unavailable",
    }).catch(() => null);

    return {
      coordinate: null,
      permissionStatus: "unknown",
      reason: "permission_request_failed",
      status: "unavailable",
    };
  }

  if (permission.status !== "granted") {
    const deniedMetadata = {
      ...metadata,
      canAskAgain: permission.canAskAgain,
      permissionStatus: permission.status,
      reason: "permission_denied",
      result: "denied",
    };

    logInteraction(LOG_ACTIONS.locationPermissionDenied, deniedMetadata).catch(
      () => null,
    );
    logInteraction(LOG_ACTIONS.userLocationUnavailable, {
      ...deniedMetadata,
      result: "unavailable",
    }).catch(() => null);

    return {
      coordinate: null,
      permissionStatus: permission.status,
      reason: "permission_denied",
      status: "denied",
    };
  }

  logInteraction(LOG_ACTIONS.locationPermissionGranted, {
    ...metadata,
    permissionStatus: permission.status,
    result: "granted",
  }).catch(() => null);

  try {
    const { location, source } = await readCurrentLocation();
    const coordinate = normalizeCoordinate(location);

    if (!coordinate) {
      throw new Error("Missing location coordinates");
    }

    logInteraction(LOG_ACTIONS.userLocationDetected, {
      ...metadata,
      ...getLogLocationMetadata(location, source),
      permissionStatus: permission.status,
      result: "detected",
    }).catch(() => null);

    return {
      coordinate,
      permissionStatus: permission.status,
      source,
      status: "available",
    };
  } catch {
    logInteraction(LOG_ACTIONS.userLocationUnavailable, {
      ...metadata,
      permissionStatus: permission.status,
      reason: "location_read_failed",
      result: "unavailable",
    }).catch(() => null);

    return {
      coordinate: null,
      permissionStatus: permission.status,
      reason: "location_read_failed",
      status: "unavailable",
    };
  }
}
