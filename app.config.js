const APP_IDENTIFIER = "com.eventdiscovery.app";
const LOCATION_PERMISSION_MESSAGE =
  "Allow Event Discovery to use your location to center the explore map near you.";
const ANDROID_LOCATION_PERMISSIONS = [
  "android.permission.ACCESS_COARSE_LOCATION",
  "android.permission.ACCESS_FINE_LOCATION",
];

function withLocationPermissionConfig(config) {
  const ios = {
    ...config.ios,
    infoPlist: {
      ...(config.ios?.infoPlist ?? {}),
      NSLocationWhenInUseUsageDescription: LOCATION_PERMISSION_MESSAGE,
    },
  };
  const currentAndroidPermissions = config.android?.permissions ?? [];
  const android = {
    ...config.android,
    permissions: [
      ...new Set([
        ...currentAndroidPermissions,
        ...ANDROID_LOCATION_PERMISSIONS,
      ]),
    ],
  };

  return {
    ...config,
    ios,
    android,
  };
}

function withGoogleMapsConfig(config) {
  const ios = {
    ...config.ios,
    bundleIdentifier: APP_IDENTIFIER,
  };
  const android = {
    ...config.android,
    package: APP_IDENTIFIER,
  };

  if (process.env.GOOGLE_MAPS_IOS_API_KEY) {
    ios.config = {
      ...(config.ios?.config ?? {}),
      googleMapsApiKey: process.env.GOOGLE_MAPS_IOS_API_KEY,
    };
  }

  if (process.env.GOOGLE_MAPS_ANDROID_API_KEY) {
    android.config = {
      ...(config.android?.config ?? {}),
      googleMaps: {
        ...(config.android?.config?.googleMaps ?? {}),
        apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY,
      },
    };
  }

  return {
    ...config,
    ios,
    android,
  };
}

module.exports = ({ config }) =>
  withGoogleMapsConfig(withLocationPermissionConfig(config));
