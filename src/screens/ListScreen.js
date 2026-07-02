import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import DiscoveryBubble, {
  DISCOVERY_BUBBLE_SIZE,
} from "../components/DiscoveryBubble";
import DiscoverModePill from "../components/DiscoverModePill";
import EventCard from "../components/EventCard";
import EventCardActionMenu from "../components/EventCardActionMenu";
import {
  getEventPinActionLayout,
  getHoveredPinAction,
} from "../components/EventPinActionMenu";
import { useDiscoveryMode } from "../context/DiscoveryModeContext";
import useInteractionLogger from "../hooks/useInteractionLogger";
import { getUpcomingEvents, toggleSavedEvent } from "../services/eventService";
import { LOG_ACTIONS, logInteraction } from "../services/interactionLogService";
import { colors } from "../theme/colors";

const TOP_NAV_OFFSET = 8;
const TOP_NAV_HEIGHT = 44;
const TOP_NAV_GAP = 10;
const BOTTOM_NAV_HEIGHT = 64;
const BOTTOM_NAV_GAP = 12;
const LIST_HORIZONTAL_PADDING = 20;
const LIST_COLUMN_GAP = 12;
const LIST_ITEM_GAP = 22;
const SKELETON_CARD_COUNT = 6;
const SKELETON_PULSE_DURATION_MS = 950;
const CARD_ACTION_LONG_PRESS_MS = 360;
const CARD_ACTION_LONG_PRESS_MOVE_CANCEL_DISTANCE = 10;
const CARD_ACTION_MENU_DISMISS_MS = 160;
const CARD_ACTION_POST_RELEASE_SUPPRESSION_MS = 500;
const CARD_ACTION_TOP_CHROME_HEIGHT = 132;
const CARD_ACTION_BOTTOM_CHROME_HEIGHT = 128;

function getSkeletonCardHeight(index, columnWidth) {
  const ratios = [1.42, 1.08, 1.28, 1.58, 1.18, 1.36];

  return Math.round(columnWidth * ratios[index % ratios.length]);
}

function getPrimaryTouch(nativeEvent) {
  return nativeEvent.touches?.[0] ?? nativeEvent.changedTouches?.[0] ?? nativeEvent;
}

function getDistance(firstPoint, secondPoint) {
  if (!firstPoint || !secondPoint) return Number.POSITIVE_INFINITY;

  return Math.hypot(firstPoint.x - secondPoint.x, firstPoint.y - secondPoint.y);
}

function getContainerTouchPoint(responderEvent, containerOffset) {
  const touch = getPrimaryTouch(responderEvent.nativeEvent);

  return {
    x: touch.pageX - containerOffset.x,
    y: touch.pageY - containerOffset.y,
  };
}

function EventCardSkeleton({ columnWidth, index, pulseStyle }) {
  const cardHeight = getSkeletonCardHeight(index, columnWidth);
  const imageHeight = Math.max(cardHeight - 86, columnWidth * 0.9);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.skeletonCard,
        {
          width: columnWidth,
        },
        pulseStyle,
      ]}
    >
      <View
        style={[
          styles.skeletonImage,
          {
            height: imageHeight,
          },
        ]}
      />

      <View style={styles.skeletonBody}>
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonMeta} />
        <View style={styles.skeletonFooterRow}>
          <View style={styles.skeletonFooterText} />
          <View style={styles.skeletonActionDot} />
        </View>
      </View>
    </Animated.View>
  );
}

export default function ListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const listContainerRef = useRef(null);
  const listContainerOffsetRef = useRef({ x: 0, y: 0 });
  const cardRefsByIdRef = useRef({});
  const cardActionGestureRef = useRef(null);
  const cardActionLongPressTimeoutRef = useRef(null);
  const cardActionDismissTimeoutRef = useRef(null);
  const suppressCardOpenUntilRef = useRef(0);
  const isCardActionInteractionActiveRef = useRef(false);
  const [events, setEvents] = useState([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [cardActionMenu, setCardActionMenu] = useState(null);
  const [hoveredCardAction, setHoveredCardAction] = useState(null);
  const [isCardActionInteractionActive, setIsCardActionInteractionActive] =
    useState(false);
  const {
    consumeDiscoveryTransition,
    deactivateDiscoveryMode,
    filterDiscoveryEvents,
    isDiscoveryActive,
    pendingDiscoveryTransition,
  } = useDiscoveryMode();
  const shouldRunShakeEntry =
    pendingDiscoveryTransition?.type === "shake-to-list";
  const listEntryProgress = useSharedValue(shouldRunShakeEntry ? 0 : 1);
  const skeletonPulse = useSharedValue(0);
  useInteractionLogger(LOG_ACTIONS.listViewOpened, {
    screen: "ListScreen",
  });
  const topPadding =
    insets.top +
    TOP_NAV_OFFSET +
    TOP_NAV_HEIGHT +
    TOP_NAV_GAP +
    (isDiscoveryActive ? 42 : 0);
  const columnWidth = Math.max(
    (screenWidth - LIST_HORIZONTAL_PADDING * 2 - LIST_COLUMN_GAP) / 2,
    1,
  );
  const leftColumnEvents = events.filter((_, index) => index % 2 === 0);
  const rightColumnEvents = events.filter((_, index) => index % 2 === 1);
  const skeletonItems = useMemo(
    () => Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => index),
    [],
  );
  const leftSkeletonItems = skeletonItems.filter((_, index) => index % 2 === 0);
  const rightSkeletonItems = skeletonItems.filter((_, index) => index % 2 === 1);
  const cardActionAvoidanceInsets = useMemo(
    () => ({
      bottom: insets.bottom + CARD_ACTION_BOTTOM_CHROME_HEIGHT,
      left: insets.left,
      right: insets.right,
      top: insets.top + CARD_ACTION_TOP_CHROME_HEIGHT,
    }),
    [insets.bottom, insets.left, insets.right, insets.top],
  );

  const contentStyle = [
    styles.content,
    {
      paddingBottom:
        Math.max(insets.bottom, 12) + BOTTOM_NAV_HEIGHT + BOTTOM_NAV_GAP,
      paddingHorizontal: LIST_HORIZONTAL_PADDING,
      paddingTop: topPadding,
    },
  ];

  useEffect(() => {
    skeletonPulse.value = withRepeat(
      withTiming(1, {
        duration: SKELETON_PULSE_DURATION_MS,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );

    return () => {
      cancelAnimation(skeletonPulse);
    };
  }, [skeletonPulse]);

  useEffect(() => {
    if (!shouldRunShakeEntry) {
      listEntryProgress.value = 1;
      return;
    }

    if (isLoadingEvents) {
      listEntryProgress.value = 0;
      return;
    }

    listEntryProgress.value = 0;
    listEntryProgress.value = withTiming(
      1,
      {
        duration: 680,
        easing: Easing.out(Easing.cubic),
      },
      (finished) => {
        if (finished) {
          runOnJS(consumeDiscoveryTransition)();
        }
      },
    );
  }, [
    consumeDiscoveryTransition,
    isLoadingEvents,
    listEntryProgress,
    pendingDiscoveryTransition?.id,
    shouldRunShakeEntry,
  ]);

  const listEntryAnimatedStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, listEntryProgress.value * 1.35),
    transform: [
      {
        translateY: (1 - listEntryProgress.value) * 150,
      },
    ],
  }));

  const skeletonPulseStyle = useAnimatedStyle(() => ({
    opacity: 0.52 + skeletonPulse.value * 0.28,
  }));

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      setIsLoadingEvents(true);

      getUpcomingEvents()
        .then((nextEvents) => {
          if (isActive) {
            setEvents(filterDiscoveryEvents(nextEvents));
          }
        })
        .finally(() => {
          if (isActive) {
            setIsLoadingEvents(false);
          }
        });

      return () => {
        isActive = false;
      };
    }, [filterDiscoveryEvents]),
  );

  useEffect(() => {
    return () => {
      if (cardActionLongPressTimeoutRef.current) {
        clearTimeout(cardActionLongPressTimeoutRef.current);
        cardActionLongPressTimeoutRef.current = null;
      }

      if (cardActionDismissTimeoutRef.current) {
        clearTimeout(cardActionDismissTimeoutRef.current);
        cardActionDismissTimeoutRef.current = null;
      }

      cardActionGestureRef.current = null;
      isCardActionInteractionActiveRef.current = false;
      setIsCardActionInteractionActive(false);
    };
  }, []);

  const handleListContainerLayout = useCallback(() => {
    listContainerRef.current?.measureInWindow?.((x, y) => {
      listContainerOffsetRef.current = { x, y };
    });
  }, []);

  const clearCardActionLongPressTimeout = useCallback(() => {
    if (cardActionLongPressTimeoutRef.current) {
      clearTimeout(cardActionLongPressTimeoutRef.current);
      cardActionLongPressTimeoutRef.current = null;
    }
  }, []);

  const getMeasuredCardFrame = useCallback((eventId) => {
    const node = cardRefsByIdRef.current[eventId];

    return new Promise((resolve) => {
      if (!node?.measureInWindow) {
        resolve(null);
        return;
      }

      node.measureInWindow((x, y, width, height) => {
        if (width <= 0 || height <= 0) {
          resolve(null);
          return;
        }

        resolve({
          height,
          width,
          x: x - listContainerOffsetRef.current.x,
          y: y - listContainerOffsetRef.current.y,
        });
      });
    });
  }, []);

  const dismissCardActionMenu = useCallback(() => {
    if (cardActionDismissTimeoutRef.current) {
      clearTimeout(cardActionDismissTimeoutRef.current);
      cardActionDismissTimeoutRef.current = null;
    }

    setHoveredCardAction(null);
    setCardActionMenu((currentMenu) =>
      currentMenu
        ? {
            ...currentMenu,
            visible: false,
          }
        : null,
    );

    cardActionDismissTimeoutRef.current = setTimeout(() => {
      setCardActionMenu(null);
      cardActionDismissTimeoutRef.current = null;
    }, CARD_ACTION_MENU_DISMISS_MS);
  }, []);

  const handleDiscoverDismiss = useCallback(() => {
    deactivateDiscoveryMode({
      route: "/map/list",
      screen: "ListScreen",
      source: "discover_pill",
    });
  }, [deactivateDiscoveryMode]);

  const handleSavedChange = useCallback((updatedEvent) => {
    if (!updatedEvent) return;

    setEvents((currentEvents) =>
      currentEvents.map((event) =>
        event.id === updatedEvent.id ? updatedEvent : event,
      ),
    );
  }, []);

  const openEventDetail = useCallback(
    (event) => {
      if (!event) return;

      router.push({
        pathname: "/event/[id]",
        params: { id: event.id },
      });
    },
    [router],
  );

  const handleCardActionSelect = useCallback(
    async (event, actionId) => {
      suppressCardOpenUntilRef.current =
        Date.now() + CARD_ACTION_POST_RELEASE_SUPPRESSION_MS;

      isCardActionInteractionActiveRef.current = false;
      setIsCardActionInteractionActive(false);

      if (!actionId) {
        dismissCardActionMenu();
        return;
      }

      dismissCardActionMenu();
      Haptics.selectionAsync().catch(() => null);

      logInteraction(LOG_ACTIONS.eventPinActionMenuSelected, {
        eventId: event.id,
        result: actionId,
        route: "/map/list",
        screen: "ListScreen",
        source: "list_card_action_menu",
      }).catch(() => null);

      if (actionId === "expand") {
        openEventDetail(event);
        return;
      }

      if (actionId === "share") {
        logInteraction(LOG_ACTIONS.eventShared, {
          eventId: event.id,
          reason: "share_not_implemented",
          result: "placeholder",
          route: "/map/list",
          screen: "ListScreen",
          source: "list_card_action_menu",
        }).catch(() => null);
        return;
      }

      if (actionId === "save") {
        if (event.canSave !== true) return;

        try {
          const updatedEvent = await toggleSavedEvent(event.id);

          if (!updatedEvent) return;

          setEvents((currentEvents) =>
            currentEvents.map((currentEvent) =>
              currentEvent.id === updatedEvent.id ? updatedEvent : currentEvent,
            ),
          );

          logInteraction(LOG_ACTIONS.eventBookmarkToggled, {
            eventId: event.id,
            isSaved: Boolean(updatedEvent.isSaved),
            route: "/map/list",
            screen: "ListScreen",
            source: "list_card_action_menu",
          }).catch(() => null);
        } catch {
          logInteraction(LOG_ACTIONS.eventBookmarkToggled, {
            eventId: event.id,
            reason: "toggle_failed",
            result: "failed",
            route: "/map/list",
            screen: "ListScreen",
            source: "list_card_action_menu",
          }).catch(() => null);
        }
      }
    },
    [dismissCardActionMenu, openEventDetail],
  );

  const openCardActionMenu = useCallback(
    async (event) => {
      const cardFrame = await getMeasuredCardFrame(event.id);

      if (!cardFrame || cardActionGestureRef.current?.event?.id !== event.id) {
        return;
      }

      const origin = {
        x: cardFrame.x + cardFrame.width / 2,
        y: cardFrame.y + cardFrame.height / 2,
      };

      const layout = getEventPinActionLayout({
        avoidanceInsets: cardActionAvoidanceInsets,
        event,
        origin,
        otherPinPoints: [],
        screenHeight,
        screenWidth,
      });

      setHoveredCardAction(null);
      setCardActionMenu({
        cardFrame,
        event,
        layout,
        origin,
        visible: true,
      });

      cardActionGestureRef.current = {
        ...cardActionGestureRef.current,
        cardFrame,
        layout,
        longPressActivated: true,
        origin,
      };

      suppressCardOpenUntilRef.current =
        Date.now() + CARD_ACTION_POST_RELEASE_SUPPRESSION_MS;

      isCardActionInteractionActiveRef.current = true;
      setIsCardActionInteractionActive(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
    },
    [cardActionAvoidanceInsets, getMeasuredCardFrame, screenHeight, screenWidth],
  );

  const handleCardTouchStart = useCallback(
    (touchEvent, event) => {
      const startPoint = getContainerTouchPoint(
        touchEvent,
        listContainerOffsetRef.current,
      );

      const gesture = {
        event,
        hoveredAction: null,
        longPressActivated: false,
        startPoint,
      };

      cardActionGestureRef.current = gesture;
      clearCardActionLongPressTimeout();

      cardActionLongPressTimeoutRef.current = setTimeout(() => {
        if (cardActionGestureRef.current !== gesture) return;

        openCardActionMenu(event);
      }, CARD_ACTION_LONG_PRESS_MS);
    },
    [clearCardActionLongPressTimeout, openCardActionMenu],
  );

  const handleCardTouchMove = useCallback(
    (touchEvent) => {
      const gesture = cardActionGestureRef.current;

      if (!gesture) return;

      const point = getContainerTouchPoint(
        touchEvent,
        listContainerOffsetRef.current,
      );

      if (!gesture.longPressActivated) {
        const movement = getDistance(point, gesture.startPoint);

        if (movement > CARD_ACTION_LONG_PRESS_MOVE_CANCEL_DISTANCE) {
          clearCardActionLongPressTimeout();
          cardActionGestureRef.current = null;
        }

        return;
      }

      const nextHoveredAction = getHoveredPinAction(point, gesture.layout);

      if (nextHoveredAction === gesture.hoveredAction) return;

      gesture.hoveredAction = nextHoveredAction;
      setHoveredCardAction(nextHoveredAction);

      if (nextHoveredAction) {
        Haptics.selectionAsync().catch(() => null);
      }
    },
    [clearCardActionLongPressTimeout],
  );

  const finishCardActionGesture = useCallback(
    (touchEvent) => {
      const gesture = cardActionGestureRef.current;

      clearCardActionLongPressTimeout();

      if (!gesture) return;

      cardActionGestureRef.current = null;

      if (!gesture.longPressActivated) {
        return;
      }

      const releasePoint = getContainerTouchPoint(
        touchEvent,
        listContainerOffsetRef.current,
      );

      const selectedAction =
        gesture.hoveredAction ?? getHoveredPinAction(releasePoint, gesture.layout);

      handleCardActionSelect(gesture.event, selectedAction);
    },
    [clearCardActionLongPressTimeout, handleCardActionSelect],
  );

  const cancelCardActionGesture = useCallback(() => {
    clearCardActionLongPressTimeout();

    const gesture = cardActionGestureRef.current;
    cardActionGestureRef.current = null;

    if (gesture?.longPressActivated) {
      isCardActionInteractionActiveRef.current = false;
      setIsCardActionInteractionActive(false);
      dismissCardActionMenu();
    }
  }, [clearCardActionLongPressTimeout, dismissCardActionMenu]);

  const handleCardOpen = useCallback(
    (event) => {
      if (
        isCardActionInteractionActiveRef.current ||
        Date.now() < suppressCardOpenUntilRef.current
      ) {
        return;
      }

      openEventDetail(event);
    },
    [openEventDetail],
  );

  const renderEventCard = useCallback(
    (item) => (
      <View
        collapsable={false}
        ref={(node) => {
          if (node) {
            cardRefsByIdRef.current[item.id] = node;
          } else {
            delete cardRefsByIdRef.current[item.id];
          }
        }}
        onTouchCancel={cancelCardActionGesture}
        onTouchEnd={finishCardActionGesture}
        onTouchMove={handleCardTouchMove}
        onTouchStart={(touchEvent) => handleCardTouchStart(touchEvent, item)}
      >
        <EventCard
          columnWidth={columnWidth}
          event={item}
          screen="ListScreen"
          source="list"
          onSavedChange={handleSavedChange}
          onOpen={() => handleCardOpen(item)}
        />
      </View>
    ),
    [
      cancelCardActionGesture,
      columnWidth,
      finishCardActionGesture,
      handleCardOpen,
      handleCardTouchMove,
      handleCardTouchStart,
      handleSavedChange,
    ],
  );

  return (
    <View
      ref={listContainerRef}
      onLayout={handleListContainerLayout}
      style={[
        styles.container,
        isDiscoveryActive && styles.discoverContainer,
      ]}
    >
      {isDiscoveryActive && (
        <>
          <View pointerEvents="none" style={styles.discoverDecoration}>
            <View style={styles.discoverBubble}>
              <DiscoveryBubble />
            </View>
            {Array.from({ length: 42 }, (_, index) => (
              <View
                key={index}
                style={[
                  styles.discoverParticle,
                  {
                    height: 5 + (index % 7),
                    left: `${(index * 23) % 100}%`,
                    opacity: 0.28 + ((index * 17) % 45) / 100,
                    top: 10 + ((index * 31) % 150),
                    width: 5 + (index % 7),
                  },
                ]}
              />
            ))}
          </View>
          <DiscoverModePill
            onPress={handleDiscoverDismiss}
            style={[styles.discoverPill, { top: insets.top + 62 }]}
          />
        </>
      )}

      <ScrollView
        contentContainerStyle={contentStyle}
        scrollEnabled={!isCardActionInteractionActive}
        showsVerticalScrollIndicator={false}
        style={styles.list}
      >
        {isLoadingEvents ? (
          <View style={styles.masonryRow} pointerEvents="none">
            <View style={[styles.column, { width: columnWidth }]}>
              {leftSkeletonItems.map((index) => (
                <EventCardSkeleton
                  key={`left-skeleton-${index}`}
                  columnWidth={columnWidth}
                  index={index}
                  pulseStyle={skeletonPulseStyle}
                />
              ))}
            </View>

            <View style={[styles.column, { width: columnWidth }]}>
              {rightSkeletonItems.map((index) => (
                <EventCardSkeleton
                  key={`right-skeleton-${index}`}
                  columnWidth={columnWidth}
                  index={index}
                  pulseStyle={skeletonPulseStyle}
                />
              ))}
            </View>
          </View>
        ) : (
          <Animated.View style={[styles.masonryRow, listEntryAnimatedStyle]}>
            <View style={[styles.column, { width: columnWidth }]}>
              {leftColumnEvents.map((event) => (
                <View key={event.id}>{renderEventCard(event)}</View>
              ))}
            </View>

            <View style={[styles.column, { width: columnWidth }]}>
              {rightColumnEvents.map((event) => (
                <View key={event.id}>{renderEventCard(event)}</View>
              ))}
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {!isLoadingEvents && cardActionMenu && (
        <EventCardActionMenu
          avoidanceInsets={cardActionAvoidanceInsets}
          cardFrame={cardActionMenu.cardFrame}
          columnWidth={columnWidth}
          event={cardActionMenu.event}
          hoveredAction={hoveredCardAction}
          onOpen={() => openEventDetail(cardActionMenu.event)}
          onSavedChange={handleSavedChange}
          origin={cardActionMenu.origin}
          screenHeight={screenHeight}
          screenWidth={screenWidth}
          visible={cardActionMenu.visible}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  discoverContainer: {
    backgroundColor: colors.primary,
  },
  list: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  masonryRow: {
    flexDirection: "row",
    gap: LIST_COLUMN_GAP,
  },
  column: {
    gap: LIST_ITEM_GAP,
  },
  skeletonCard: {
    backgroundColor: "rgba(255, 255, 255, 0.42)",
    borderColor: "rgba(0, 0, 0, 0.04)",
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  skeletonImage: {
    backgroundColor: "rgba(255, 255, 255, 0.58)",
    borderRadius: 24,
    margin: 6,
  },
  skeletonBody: {
    paddingBottom: 14,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  skeletonTitle: {
    backgroundColor: "rgba(255, 255, 255, 0.68)",
    borderRadius: 8,
    height: 13,
    width: "78%",
  },
  skeletonMeta: {
    backgroundColor: "rgba(255, 255, 255, 0.48)",
    borderRadius: 8,
    height: 10,
    marginTop: 9,
    width: "52%",
  },
  skeletonFooterRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },
  skeletonFooterText: {
    backgroundColor: "rgba(255, 255, 255, 0.46)",
    borderRadius: 8,
    height: 10,
    width: "44%",
  },
  skeletonActionDot: {
    backgroundColor: "rgba(255, 255, 255, 0.58)",
    borderRadius: 9,
    height: 18,
    width: 18,
  },
  discoverDecoration: {
    height: 220,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 0,
  },
  discoverBubble: {
    left: "50%",
    marginLeft: -DISCOVERY_BUBBLE_SIZE / 2,
    position: "absolute",
    top: -DISCOVERY_BUBBLE_SIZE / 2,
  },
  discoverParticle: {
    backgroundColor: colors.discover,
    borderRadius: 8,
    position: "absolute",
  },
  discoverPill: {
    left: "50%",
    marginLeft: -45,
    position: "absolute",
    zIndex: 5,
  },
});
