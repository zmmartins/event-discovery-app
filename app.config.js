const APP_IDENTIFIER = "com.eventdiscovery.app";

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

module.exports = ({ config }) => withGoogleMapsConfig(config);
