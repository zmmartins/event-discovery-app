import { Image, StyleSheet, View } from "react-native";

import { colors } from "../theme/colors";
import { getEventImage } from "../utils/imageAssets";

const PIN_SIZE = 64;
const IMAGE_SIZE = 52;

export default function ExperiencePin({ photoRef }) {
  return (
    <View pointerEvents="none" style={styles.container}>
      <View style={styles.pin}>
        <Image
          accessibilityLabel="Experience photo"
          source={getEventImage(photoRef?.imageKey)}
          style={styles.image}
        />
      </View>
      <View style={styles.tail} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    height: 78,
    justifyContent: "flex-start",
    overflow: "visible",
    width: 72,
  },
  pin: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderRadius: PIN_SIZE / 2,
    borderWidth: 4,
    elevation: 5,
    height: PIN_SIZE,
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    width: PIN_SIZE,
    zIndex: 2,
  },
  image: {
    borderRadius: IMAGE_SIZE / 2,
    height: IMAGE_SIZE,
    width: IMAGE_SIZE,
  },
  tail: {
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 4,
    height: 18,
    marginTop: -7,
    transform: [{ rotate: "45deg" }],
    width: 18,
  },
});
