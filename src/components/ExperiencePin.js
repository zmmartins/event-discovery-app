import EventPin from "./EventPin";
import { getEventImage } from "../utils/imageAssets";

export default function ExperiencePin({ event, photoRef }) {
  return (
    <EventPin
      centerImageAccessibilityLabel="Experience photo"
      centerImageSource={getEventImage(photoRef?.imageKey)}
      event={event}
    />
  );
}
