import EventPin from "./EventPin";
import { getEventPinImage } from "../utils/imageAssets";

export default function ExperiencePin({ event, photoRef }) {
  return (
    <EventPin
      centerImageAccessibilityLabel="Experience photo"
      centerImageSource={getEventPinImage(photoRef?.imageKey)}
      event={event}
    />
  );
}
