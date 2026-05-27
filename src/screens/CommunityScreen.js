import PlaceholderScreen from "../components/PlaceholderScreen";
import useInteractionLogger from "../hooks/useInteractionLogger";
import { LOG_ACTIONS } from "../services/interactionLogService";

export default function CommunityScreen() {
  useInteractionLogger(LOG_ACTIONS.communityOpened, {
    screen: "CommunityScreen",
  });

  return <PlaceholderScreen title="Community" />;
}
