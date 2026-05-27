import PlaceholderScreen from "../components/PlaceholderScreen";
import useInteractionLogger from "../hooks/useInteractionLogger";
import { LOG_ACTIONS } from "../services/interactionLogService";

export default function SearchScreen() {
  useInteractionLogger(LOG_ACTIONS.searchOpened, {
    screen: "SearchScreen",
  });

  return <PlaceholderScreen title="Search" />;
}
