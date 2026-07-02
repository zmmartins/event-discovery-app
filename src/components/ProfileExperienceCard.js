import { Ionicons } from "@expo/vector-icons";
import MaskedView from "@react-native-masked-view/masked-view";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { usePathname } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";

import { formatAttendedExperienceDate } from "../domain/events/eventFormatters";
import { toggleSavedEvent } from "../services/eventService";
import { LOG_ACTIONS, logInteraction } from "../services/interactionLogService";
import { colors } from "../theme/colors";
import { getAvatarImage, getEventPreviewImage } from "../utils/imageAssets";

const TICKET_DARK = "#121A15";
const TICKET_DARK_SOFT = "#18241D";

const EXPERIENCE_TICKET_RADIUS = 12;

const EXPERIENCE_TICKET_SIDE_NOTCH_RADIUS = 10;

const EXPERIENCE_TICKET_MEDIA_HEIGHT = 360;

const EXPERIENCE_TICKET_SCALLOP_SIZE = 15;
const EXPERIENCE_TICKET_SCALLOP_COUNT = 15;
const EXPERIENCE_TICKET_SCALLOP_CENTER_OFFSET = -3;

const EXPERIENCE_TICKET_SEPARATOR_INSET = 28;
const EXPERIENCE_TICKET_SEPARATOR_HEIGHT = 34;

const EXPERIENCE_TICKET_INFO_PADDING = 16;

const EXPERIENCE_PHOTO_GRID_HEIGHT = EXPERIENCE_TICKET_MEDIA_HEIGHT;
const EXPERIENCE_PHOTO_GRID_GAP = 6;
const EXPERIENCE_PHOTO_GRID_RADIUS = 0;

const EXPERIENCE_PHOTO_ASPECT_MIN = 0.58;
const EXPERIENCE_PHOTO_ASPECT_MAX = 1.85;

const EXPERIENCE_PHOTO_PRIMARY_WEIGHT = 1.28;

const EXPERIENCE_PHOTO_DASH_WIDTH = 8;
const EXPERIENCE_PHOTO_ACTIVE_DASH_WIDTH = 22;
const EXPERIENCE_PHOTO_DASH_HEIGHT = 4;
const EXPERIENCE_PHOTO_DASH_GAP = 9;
const EXPERIENCE_PHOTO_DASH_HIT_HEIGHT = 22;
const EXPERIENCE_PHOTO_DASH_RAIL_WIDTH = 48;
const EXPERIENCE_EXPANDED_DASH_RIGHT = 14;

const EXPERIENCE_MEDIA_TOGGLE_TOP = 10;
const EXPERIENCE_MEDIA_TOGGLE_RIGHT = 10;

const EXPERIENCE_EXPANDED_IMAGE_MARGIN = 18;
const EXPERIENCE_EXPANDED_IMAGE_RADIUS = 26;

function createCirclePath(cx, cy, radius) {
  return [
    `M ${cx - radius} ${cy}`,
    `a ${radius} ${radius} 0 1 0 ${radius * 2} 0`,
    `a ${radius} ${radius} 0 1 0 ${-radius * 2} 0`,
    "Z",
  ].join(" ");
}

function createTicketBasePath(width, height, topRadius) {
  const safeWidth = Math.max(width, 1);
  const safeHeight = Math.max(height, 1);
  const safeTopRadius = Math.min(topRadius, safeWidth / 2, safeHeight / 2);

  return [
    `M ${safeTopRadius} 0`,
    `H ${safeWidth - safeTopRadius}`,
    `Q ${safeWidth} 0 ${safeWidth} ${safeTopRadius}`,
    `V ${safeHeight}`,
    `H 0`,
    `V ${safeTopRadius}`,
    `Q 0 0 ${safeTopRadius} 0`,
    "Z",
  ].join(" ");
}

function createTicketMaskPath({
  height,
  notchRadius,
  notchY,
  radius,
  scallopRadius,
  width,
}) {
  const outerPath = createTicketBasePath(width, height, radius);
  const sideCutouts = [
    createCirclePath(0, notchY, notchRadius),
    createCirclePath(width, notchY, notchRadius),
  ];

  const scallopCount = Math.max(2, EXPERIENCE_TICKET_SCALLOP_COUNT);
  const firstScallopCenterX = scallopRadius * 1.15;
  const lastScallopCenterX = Math.max(width - scallopRadius * 1.15, firstScallopCenterX);
  const scallopPitch =
    scallopCount <= 1
      ? 0
      : (lastScallopCenterX - firstScallopCenterX) / (scallopCount - 1);

  const scallopCenterY = height - EXPERIENCE_TICKET_SCALLOP_CENTER_OFFSET;

  const bottomCutouts = Array.from({ length: scallopCount }).map((_, index) =>
    createCirclePath(
      firstScallopCenterX + index * scallopPitch,
      scallopCenterY,
      scallopRadius
    )
  );

  return [outerPath, ...sideCutouts, ...bottomCutouts].join(" ");
}

function getTicketShapePath({ height, notchY, width }) {
  if (width <= 0 || height <= 0) return "";

  return createTicketMaskPath({
    height,
    notchRadius: EXPERIENCE_TICKET_SIDE_NOTCH_RADIUS,
    notchY,
    radius: EXPERIENCE_TICKET_RADIUS,
    scallopRadius: EXPERIENCE_TICKET_SCALLOP_SIZE / 2,
    width,
  });
}

function TicketMask({ height, notchY, width }) {
  if (width <= 0 || height <= 0) {
    return <View style={StyleSheet.absoluteFill} />;
  }

  const maskPath = getTicketShapePath({ height, notchY, width });

  return (
    <Svg height={height} width={width}>
      <Path d={maskPath} fill="black" fillRule="evenodd" />
    </Svg>
  );
}

function getSafePhotoRefs(photoRefs = []) {
  return Array.isArray(photoRefs) ? photoRefs.filter(Boolean) : [];
}

function getClampedPhotoIndex(index, photoCount) {
  if (photoCount <= 0) return 0;

  return Math.min(Math.max(index, 0), photoCount - 1);
}

function getNativeEventPagePoint(nativeEvent) {
  const touch = nativeEvent?.touches?.[0] ?? nativeEvent?.changedTouches?.[0];

  return {
    x: touch?.pageX ?? nativeEvent?.pageX,
    y: touch?.pageY ?? nativeEvent?.pageY,
  };
}

function getPhotoSource(photoRef) {
  return getEventPreviewImage(photoRef.imageKey);
}

function getPhotoAspectRatio(photoRef) {
  const source = getPhotoSource(photoRef);
  const resolvedSource = Image.resolveAssetSource(source);
  const width = Number(resolvedSource?.width);
  const height = Number(resolvedSource?.height);

  if (!Number.isFinite(width) || !Number.isFinite(height) || height <= 0) {
    return 1;
  }

  return Math.min(
    Math.max(width / height, EXPERIENCE_PHOTO_ASPECT_MIN),
    EXPERIENCE_PHOTO_ASPECT_MAX
  );
}

function getPhotoLayoutItems(photoRefs = []) {
  return photoRefs.map((photoRef, index) => {
    const aspectRatio = getPhotoAspectRatio(photoRef);

    return {
      aspectRatio,
      id: photoRef.id ?? `${photoRef.imageKey}-${index}`,
      photoRef,
      source: getPhotoSource(photoRef),
      weight: aspectRatio * (index === 0 ? EXPERIENCE_PHOTO_PRIMARY_WEIGHT : 1),
    };
  });
}

function getTotalLayoutWeight(items = []) {
  return items.reduce((total, item) => total + Math.max(item.weight, 0.1), 0);
}

function splitItemsByBalancedWeight(items = []) {
  if (items.length <= 1) {
    return [items, []];
  }

  const totalWeight = getTotalLayoutWeight(items);
  const targetWeight = totalWeight / 2;
  let bestIndex = 1;
  let bestDistance = Number.POSITIVE_INFINITY;
  let runningWeight = 0;

  for (let index = 0; index < items.length - 1; index += 1) {
    runningWeight += Math.max(items[index].weight, 0.1);

    const distance = Math.abs(targetWeight - runningWeight);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index + 1;
    }
  }

  return [items.slice(0, bestIndex), items.slice(bestIndex)];
}

function createMosaicTiles(items, frame) {
  if (!items.length || frame.width <= 0 || frame.height <= 0) {
    return [];
  }

  if (items.length === 1) {
    return [
      {
        ...frame,
        item: items[0],
      },
    ];
  }

  const [firstGroup, secondGroup] = splitItemsByBalancedWeight(items);

  if (!firstGroup.length || !secondGroup.length) {
    return [
      {
        ...frame,
        item: items[0],
      },
    ];
  }

  const totalWeight = getTotalLayoutWeight(items);
  const firstWeight = getTotalLayoutWeight(firstGroup);
  const shouldSplitVertically = frame.width >= frame.height;

  if (shouldSplitVertically) {
    const availableWidth = Math.max(frame.width - EXPERIENCE_PHOTO_GRID_GAP, 1);
    const firstWidth = Math.round(
      availableWidth * Math.min(Math.max(firstWeight / totalWeight, 0.32), 0.68)
    );
    const secondWidth = availableWidth - firstWidth;

    return [
      ...createMosaicTiles(firstGroup, {
        height: frame.height,
        left: frame.left,
        top: frame.top,
        width: firstWidth,
      }),
      ...createMosaicTiles(secondGroup, {
        height: frame.height,
        left: frame.left + firstWidth + EXPERIENCE_PHOTO_GRID_GAP,
        top: frame.top,
        width: secondWidth,
      }),
    ];
  }

  const availableHeight = Math.max(frame.height - EXPERIENCE_PHOTO_GRID_GAP, 1);
  const firstHeight = Math.round(
    availableHeight * Math.min(Math.max(firstWeight / totalWeight, 0.32), 0.68)
  );
  const secondHeight = availableHeight - firstHeight;

  return [
    ...createMosaicTiles(firstGroup, {
      height: firstHeight,
      left: frame.left,
      top: frame.top,
      width: frame.width,
    }),
    ...createMosaicTiles(secondGroup, {
      height: secondHeight,
      left: frame.left,
      top: frame.top + firstHeight + EXPERIENCE_PHOTO_GRID_GAP,
      width: frame.width,
    }),
  ];
}

function AttendeeStack({ attendees }) {
  const safeAttendees = Array.isArray(attendees) ? attendees : [];
  const hasOverflow = safeAttendees.length > 4;
  const visibleAttendees = hasOverflow
    ? safeAttendees.slice(0, 3)
    : safeAttendees.slice(0, 4);

  if (safeAttendees.length === 0) {
    return <View style={styles.emptyStack} />;
  }

  return (
    <View style={styles.avatarStack}>
      {visibleAttendees.map((friend, index) => (
        <Image
          accessibilityLabel={friend.name}
          key={friend.id}
          source={getAvatarImage(friend.avatarKey)}
          style={[styles.avatar, index > 0 && styles.avatarOverlap]}
        />
      ))}

      {hasOverflow && (
        <View style={[styles.avatar, styles.avatarOverlap, styles.moreAvatar]}>
          <Text style={styles.moreAvatarText}>+</Text>
        </View>
      )}
    </View>
  );
}

function ProfileExperiencePhotoGrid({ eventTitle, onOpenImage, photoRefs }) {
  const [gridWidth, setGridWidth] = useState(0);

  const safePhotoRefs = useMemo(() => getSafePhotoRefs(photoRefs), [photoRefs]);

  const layoutItems = useMemo(() => getPhotoLayoutItems(safePhotoRefs), [safePhotoRefs]);

  const tiles = useMemo(() => {
    if (gridWidth <= 0 || layoutItems.length === 0) {
      return [];
    }

    return createMosaicTiles(layoutItems, {
      height: EXPERIENCE_PHOTO_GRID_HEIGHT,
      left: 0,
      top: 0,
      width: gridWidth,
    });
  }, [gridWidth, layoutItems]);

  const handleLayout = useCallback((event) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);

    if (nextWidth <= 0) return;

    setGridWidth((currentWidth) =>
      currentWidth === nextWidth ? currentWidth : nextWidth
    );
  }, []);

  if (safePhotoRefs.length === 0) return null;

  return (
    <View onLayout={handleLayout} style={styles.photoGrid}>
      {tiles.map((tile, index) => (
        <View
          key={`${tile.item.id}-${index}`}
          style={[
            styles.photoGridTile,
            {
              height: tile.height,
              left: tile.left,
              top: tile.top,
              width: tile.width,
            },
          ]}
        >
          <Pressable
            accessibilityLabel={`Open ${eventTitle} memory ${index + 1}`}
            accessibilityRole="imagebutton"
            onPress={(pressEvent) => {
              pressEvent?.stopPropagation?.();
              onOpenImage?.(index);
            }}
            style={styles.photoGridImageButton}
          >
            <Image
              accessibilityLabel={`${eventTitle} memory ${index + 1}`}
              resizeMode="cover"
              source={tile.item.source}
              style={styles.photoGridImage}
            />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

function ProfileExperienceFullImageView({
  activeIndex,
  eventTitle,
  onOpenImage,
  onPhotoRailGestureActiveChange,
  onSelectIndex,
  photoRefs,
}) {
  const railRef = useRef(null);
  const railLayoutRef = useRef({
    height: 1,
    pageX: 0,
    pageY: 0,
    width: EXPERIENCE_PHOTO_DASH_RAIL_WIDTH,
  });
  const didTouchStartInDashRailRef = useRef(false);
  const isDashGestureActiveRef = useRef(false);

  const safePhotoRefs = useMemo(() => getSafePhotoRefs(photoRefs), [photoRefs]);
  const photoCount = safePhotoRefs.length;
  const clampedActiveIndex = getClampedPhotoIndex(activeIndex, photoCount);
  const activePhotoRef = safePhotoRefs[clampedActiveIndex];

  const selectIndex = useCallback(
    (nextIndex) => {
      if (photoCount <= 1) return;

      const clampedIndex = getClampedPhotoIndex(nextIndex, photoCount);

      onSelectIndex?.(clampedIndex);
    },
    [onSelectIndex, photoCount]
  );

  const isTouchInsideDashRail = useCallback((nativeEvent) => {
    const { x, y } = getNativeEventPagePoint(nativeEvent);

    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;

    const { height, pageX, pageY, width } = railLayoutRef.current;

    const horizontalInset = 6;

    return (
      x >= pageX - horizontalInset &&
      x <= pageX + width + horizontalInset &&
      y >= pageY &&
      y <= pageY + height
    );
  }, []);

  const selectIndexFromTouch = useCallback(
    (nativeEvent) => {
      if (photoCount <= 1) return;

      const { y: pageY } = getNativeEventPagePoint(nativeEvent);

      if (!Number.isFinite(pageY)) return;

      const { height, pageY: railPageY } = railLayoutRef.current;
      const relativeY = Math.min(Math.max(pageY - railPageY, 0), Math.max(height, 1));
      const stepHeight = Math.max(height / photoCount, 1);
      const nextIndex = Math.floor(relativeY / stepHeight);

      selectIndex(nextIndex);
    },
    [photoCount, selectIndex]
  );

  const startPhotoRailGesture = useCallback(() => {
    didTouchStartInDashRailRef.current = true;
    isDashGestureActiveRef.current = true;
    onPhotoRailGestureActiveChange?.(true);
  }, [onPhotoRailGestureActiveChange]);

  const endPhotoRailGesture = useCallback(() => {
    didTouchStartInDashRailRef.current = false;
    isDashGestureActiveRef.current = false;
    onPhotoRailGestureActiveChange?.(false);
  }, [onPhotoRailGestureActiveChange]);

  useEffect(() => {
    return () => {
      onPhotoRailGestureActiveChange?.(false);
    };
  }, [onPhotoRailGestureActiveChange]);

  const handleFullPhotoTouchStartCapture = useCallback(
    (touchEvent) => {
      const shouldHandle =
        photoCount > 1 && isTouchInsideDashRail(touchEvent.nativeEvent);

      didTouchStartInDashRailRef.current = shouldHandle;

      if (shouldHandle) {
        onPhotoRailGestureActiveChange?.(true);
      }
    },
    [isTouchInsideDashRail, onPhotoRailGestureActiveChange, photoCount]
  );

  const fullPhotoPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponderCapture: (responderEvent) => {
          const shouldHandle =
            photoCount > 1 && isTouchInsideDashRail(responderEvent.nativeEvent);

          if (shouldHandle) {
            startPhotoRailGesture();
          } else {
            didTouchStartInDashRailRef.current = false;
          }

          return shouldHandle;
        },

        onStartShouldSetPanResponder: () => didTouchStartInDashRailRef.current,

        onMoveShouldSetPanResponderCapture: () =>
          didTouchStartInDashRailRef.current || isDashGestureActiveRef.current,

        onMoveShouldSetPanResponder: () =>
          didTouchStartInDashRailRef.current || isDashGestureActiveRef.current,

        onPanResponderGrant: (responderEvent) => {
          startPhotoRailGesture();
          selectIndexFromTouch(responderEvent.nativeEvent);
        },

        onPanResponderMove: (responderEvent) => {
          if (!isDashGestureActiveRef.current) return;

          selectIndexFromTouch(responderEvent.nativeEvent);
        },

        onPanResponderRelease: endPhotoRailGesture,

        onPanResponderTerminate: endPhotoRailGesture,

        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
      }),
    [
      endPhotoRailGesture,
      isTouchInsideDashRail,
      photoCount,
      selectIndexFromTouch,
      startPhotoRailGesture,
    ]
  );

  if (!activePhotoRef) return null;

  return (
    <View
      onTouchStartCapture={handleFullPhotoTouchStartCapture}
      style={styles.fullPhotoView}
      {...fullPhotoPanResponder.panHandlers}
    >
      <Pressable
        accessibilityLabel={`Open ${eventTitle} memory ${clampedActiveIndex + 1}`}
        accessibilityRole="imagebutton"
        onPress={(pressEvent) => {
          pressEvent?.stopPropagation?.();
          onOpenImage?.(clampedActiveIndex);
        }}
        style={styles.fullPhotoImageButton}
      >
        <Image
          accessibilityLabel={`${eventTitle} memory ${clampedActiveIndex + 1}`}
          resizeMode="cover"
          source={getPhotoSource(activePhotoRef)}
          style={styles.fullPhotoImage}
        />
      </Pressable>

      {photoCount > 1 && (
        <View
          collapsable={false}
          onLayout={(layoutEvent) => {
            const { height, width } = layoutEvent.nativeEvent.layout;
            const nextLayout = {
              height: Math.max(height, 1),
              pageX: railLayoutRef.current.pageX,
              pageY: railLayoutRef.current.pageY,
              width: Math.max(width, 1),
            };

            railLayoutRef.current = nextLayout;

            railRef.current?.measureInWindow?.((pageX, pageY) => {
              railLayoutRef.current = {
                ...nextLayout,
                pageX,
                pageY,
              };
            });
          }}
          pointerEvents="none"
          ref={railRef}
          style={styles.fullPhotoDashRail}
        >
          {safePhotoRefs.map((photoRef, index) => {
            const isActive = index === clampedActiveIndex;

            return (
              <View
                key={`${photoRef.id ?? photoRef.imageKey}-${index}`}
                style={styles.fullPhotoDashHitArea}
              >
                <View
                  style={[styles.fullPhotoDash, isActive && styles.fullPhotoDashActive]}
                />
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function ExpandedExperienceImageModal({
  activeIndex,
  eventTitle,
  onClose,
  onSelectIndex,
  photoRefs,
  visible,
}) {
  const frameRef = useRef(null);
  const frameLayoutRef = useRef({
    height: 1,
    pageY: 0,
    width: 1,
  });

  const safePhotoRefs = useMemo(() => getSafePhotoRefs(photoRefs), [photoRefs]);
  const photoCount = safePhotoRefs.length;
  const clampedActiveIndex = getClampedPhotoIndex(activeIndex, photoCount);
  const activePhotoRef = safePhotoRefs[clampedActiveIndex];

  const selectIndex = useCallback(
    (nextIndex) => {
      if (photoCount <= 1) return;

      onSelectIndex?.(getClampedPhotoIndex(nextIndex, photoCount));
    },
    [onSelectIndex, photoCount]
  );

  const selectIndexFromTouch = useCallback(
    (nativeEvent) => {
      if (photoCount <= 1) return;

      const touch = nativeEvent?.touches?.[0] ?? nativeEvent?.changedTouches?.[0];
      const pageY = touch?.pageY ?? nativeEvent?.pageY;

      if (!Number.isFinite(pageY)) return;

      const { height, pageY: framePageY } = frameLayoutRef.current;
      const relativeY = Math.min(Math.max(pageY - framePageY, 0), Math.max(height, 1));
      const stepHeight = Math.max(height / photoCount, 1);
      const nextIndex = Math.floor(relativeY / stepHeight);

      selectIndex(nextIndex);
    },
    [photoCount, selectIndex]
  );

  const expandedImagePanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,

        onPanResponderGrant: () => {},

        onPanResponderMove: (responderEvent) => {
          selectIndexFromTouch(responderEvent.nativeEvent);
        },

        onPanResponderRelease: () => {},
        onPanResponderTerminate: () => {},
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
      }),
    [selectIndexFromTouch]
  );

  if (!activePhotoRef) return null;

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.expandedImageModalRoot}>
        <Pressable
          accessibilityLabel="Close expanded image"
          accessibilityRole="button"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />

        <View
          onLayout={(layoutEvent) => {
            const { height, width } = layoutEvent.nativeEvent.layout;
            const nextLayout = {
              height: Math.max(height, 1),
              pageY: frameLayoutRef.current.pageY,
              width: Math.max(width, 1),
            };

            frameLayoutRef.current = nextLayout;

            frameRef.current?.measureInWindow?.((_, pageY) => {
              frameLayoutRef.current = {
                ...nextLayout,
                pageY,
              };
            });
          }}
          ref={frameRef}
          style={styles.expandedImageFrame}
          {...expandedImagePanResponder.panHandlers}
        >
          <Image
            accessibilityLabel={`${eventTitle} memory ${clampedActiveIndex + 1}`}
            resizeMode="contain"
            source={getPhotoSource(activePhotoRef)}
            style={styles.expandedImage}
          />

          {photoCount > 1 && (
            <View style={styles.expandedImageDashRail}>
              {safePhotoRefs.map((photoRef, index) => {
                const isActive = index === clampedActiveIndex;

                return (
                  <View
                    key={`${photoRef.id ?? photoRef.imageKey}-${index}`}
                    style={styles.fullPhotoDashHitArea}
                  >
                    <View
                      style={[
                        styles.fullPhotoDash,
                        isActive && styles.fullPhotoDashActive,
                      ]}
                    />
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

export default function ProfileExperienceCard({
  event,
  experience,
  onOpen,
  onPhotoRailGestureActiveChange,
  onSavedChange,
  screen = "ProfileScreen",
  source = "profile_attended_list",
}) {
  const pathname = usePathname();
  const saveScale = useRef(new Animated.Value(1)).current;
  const [isSaved, setIsSaved] = useState(Boolean(event.isSaved));
  const [mediaMode, setMediaMode] = useState("grid");
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [isExpandedImageVisible, setIsExpandedImageVisible] = useState(false);
  const [ticketSize, setTicketSize] = useState({ height: 0, width: 0 });
  const price = event.price?.toUpperCase?.() ?? "";
  const photoRefs = useMemo(
    () => getSafePhotoRefs(experience.photoRefs),
    [experience.photoRefs]
  );
  const hasMultiplePhotos = photoRefs.length > 1;

  useEffect(() => {
    setIsSaved(Boolean(event.isSaved));
  }, [event.id, event.isSaved]);

  useEffect(() => {
    setActivePhotoIndex(0);
    setIsExpandedImageVisible(false);
    setMediaMode("grid");
  }, [experience.id]);

  useEffect(() => {
    setActivePhotoIndex((currentIndex) =>
      getClampedPhotoIndex(currentIndex, photoRefs.length)
    );
  }, [photoRefs.length]);

  function animateSavePulse() {
    saveScale.setValue(0.82);
    Animated.spring(saveScale, {
      damping: 8,
      mass: 0.45,
      stiffness: 320,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }

  async function handleSavePress() {
    const nextIsSaved = !isSaved;

    setIsSaved(nextIsSaved);
    animateSavePulse();
    Haptics.selectionAsync().catch(() => null);

    try {
      const updatedEvent = await toggleSavedEvent(event.id);
      setIsSaved(Boolean(updatedEvent?.isSaved));
      onSavedChange?.(updatedEvent);
      logInteraction(LOG_ACTIONS.eventBookmarkToggled, {
        eventId: event.id,
        experienceId: experience.id,
        isSaved: Boolean(updatedEvent?.isSaved),
        route: pathname,
        screen,
        source,
      }).catch(() => null);
    } catch {
      setIsSaved(!nextIsSaved);
    }
  }

  function handleOpenPress() {
    logInteraction(LOG_ACTIONS.profileExperienceOpened, {
      eventId: event.id,
      experienceId: experience.id,
      route: pathname,
      screen,
      source,
    }).catch(() => null);
    onOpen?.();
  }

  const handleMediaModeToggle = useCallback((pressEvent) => {
    pressEvent?.stopPropagation?.();

    Haptics.selectionAsync().catch(() => null);

    setMediaMode((currentMode) => (currentMode === "grid" ? "image" : "grid"));
  }, []);

  const handlePhotoIndexSelect = useCallback((nextIndex) => {
    setActivePhotoIndex((currentIndex) => {
      if (currentIndex === nextIndex) return currentIndex;

      Haptics.selectionAsync().catch(() => null);
      return nextIndex;
    });
  }, []);

  const handleOpenExpandedImage = useCallback(
    (nextIndex) => {
      setActivePhotoIndex(getClampedPhotoIndex(nextIndex, photoRefs.length));
      setIsExpandedImageVisible(true);
      Haptics.selectionAsync().catch(() => null);
    },
    [photoRefs.length]
  );

  const handleCloseExpandedImage = useCallback(() => {
    setIsExpandedImageVisible(false);
    Haptics.selectionAsync().catch(() => null);
  }, []);

  const handleTicketLayout = useCallback((layoutEvent) => {
    const { height, width } = layoutEvent.nativeEvent.layout;

    setTicketSize((currentSize) => {
      const nextHeight = Math.round(height);
      const nextWidth = Math.round(width);

      if (currentSize.height === nextHeight && currentSize.width === nextWidth) {
        return currentSize;
      }

      return {
        height: nextHeight,
        width: nextWidth,
      };
    });
  }, []);

  const ticketNotchY =
    EXPERIENCE_TICKET_MEDIA_HEIGHT + EXPERIENCE_TICKET_SEPARATOR_HEIGHT / 2;

  return (
    <View style={styles.experience}>
      <View style={styles.ticketShadow}>
        <MaskedView
          maskElement={
            <TicketMask
              height={ticketSize.height}
              notchY={ticketNotchY}
              width={ticketSize.width}
            />
          }
          style={styles.ticketMask}
        >
          <View onLayout={handleTicketLayout} style={styles.ticketBody}>
            <View style={styles.ticketHero}>
              <View style={styles.ticketMediaLayer}>
                {photoRefs.length > 0 ? (
                  <View style={styles.mediaArea}>
                    {mediaMode === "grid" ? (
                      <ProfileExperiencePhotoGrid
                        eventTitle={event.title}
                        onOpenImage={handleOpenExpandedImage}
                        photoRefs={photoRefs}
                      />
                    ) : (
                      <ProfileExperienceFullImageView
                        activeIndex={activePhotoIndex}
                        eventTitle={event.title}
                        onOpenImage={handleOpenExpandedImage}
                        onPhotoRailGestureActiveChange={onPhotoRailGestureActiveChange}
                        onSelectIndex={handlePhotoIndexSelect}
                        photoRefs={photoRefs}
                      />
                    )}
                  </View>
                ) : (
                  <View style={styles.ticketHeroFallback} />
                )}
              </View>

              <LinearGradient
                colors={[
                  "rgba(18, 26, 21, 0)",
                  "rgba(18, 26, 21, 0.06)",
                  "rgba(18, 26, 21, 0.30)",
                  TICKET_DARK,
                ]}
                locations={[0, 0.6, 0.75, 1]}
                pointerEvents="none"
                style={styles.ticketHeroGradient}
              />

              <View pointerEvents="none" style={styles.ticketHeroTopMeta}>
                <Text style={styles.ticketHeroLabel}>MEMORY TICKET</Text>
              </View>

              <View pointerEvents="none" style={styles.ticketHeroCopy}>
                <Text numberOfLines={3} style={styles.ticketHeroTitle}>
                  {event.title}
                </Text>
              </View>

              {hasMultiplePhotos && (
                <Pressable
                  accessibilityLabel={
                    mediaMode === "grid" ? "Show full image view" : "Show photo grid view"
                  }
                  accessibilityRole="button"
                  onPress={handleMediaModeToggle}
                  style={({ pressed }) => [
                    styles.mediaModeToggle,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons
                    name={mediaMode === "grid" ? "image-outline" : "grid-outline"}
                    size={15}
                    color={colors.text}
                  />
                  <Text style={styles.mediaModeToggleText}>
                    {mediaMode === "grid" ? "Full" : "Grid"}
                  </Text>
                </Pressable>
              )}
            </View>

            <View pointerEvents="none" style={styles.ticketSeparatorRow}>
              <View style={styles.ticketSeparatorLine} />
            </View>

            <Pressable
              accessibilityLabel={`Open details for ${event.title}`}
              accessibilityRole="button"
              onPress={handleOpenPress}
              style={({ pressed }) => [
                styles.ticketInfoSection,
                pressed && styles.cardPressed,
              ]}
            >
              <View style={styles.ticketInfoTopRow}>
                <Text style={styles.date}>
                  {formatAttendedExperienceDate(experience.attendedAt)}
                </Text>

                <Pressable
                  accessibilityLabel={isSaved ? "Remove saved event" : "Save event"}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSaved }}
                  hitSlop={8}
                  onPress={(pressEvent) => {
                    pressEvent?.stopPropagation?.();
                    handleSavePress();
                  }}
                  style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
                >
                  <Animated.View style={{ transform: [{ scale: saveScale }] }}>
                    <Ionicons
                      name="bookmark"
                      size={21}
                      color={isSaved ? colors.primary : colors.surface}
                    />
                  </Animated.View>
                </Pressable>
              </View>

              <Text numberOfLines={2} style={styles.address}>
                {event.locationName}
              </Text>

              <View style={styles.footerRow}>
                <View style={styles.ticketMetaBlock}>
                  <Text style={styles.price}>{price}</Text>
                  <AttendeeStack attendees={event.attendingFriends} />
                </View>

                <Pressable
                  accessibilityLabel={`Open details for ${event.title}`}
                  accessibilityRole="button"
                  onPress={(pressEvent) => {
                    pressEvent?.stopPropagation?.();
                    handleOpenPress();
                  }}
                  style={({ pressed }) => [
                    styles.detailsButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.detailsButtonText}>CHECK US</Text>
                  <Text style={styles.detailsButtonText}>OUT</Text>
                </Pressable>
              </View>
            </Pressable>

            <View pointerEvents="none" style={styles.ticketInnerHighlightFrame} />
            <LinearGradient
              colors={[
                "rgba(255, 255, 255, 0.20)",
                "rgba(255, 255, 255, 0.07)",
                "rgba(255, 255, 255, 0)",
              ]}
              locations={[0, 0.22, 0.55]}
              pointerEvents="none"
              style={styles.ticketInnerTopGlow}
            />
            <LinearGradient
              colors={["rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0.12)"]}
              locations={[0.45, 1]}
              pointerEvents="none"
              style={styles.ticketInnerBottomShade}
            />
            <LinearGradient
              colors={[
                "rgba(255, 255, 255, 0.22)",
                "rgba(255, 255, 255, 0.055)",
                "rgba(255, 255, 255, 0)",
              ]}
              locations={[0, 0.35, 1]}
              pointerEvents="none"
              style={styles.ticketTopInsetHighlight}
            />
            <LinearGradient
              colors={[
                "rgba(255, 255, 255, 0.16)",
                "rgba(255, 255, 255, 0.045)",
                "rgba(255, 255, 255, 0)",
              ]}
              end={{ x: 1, y: 0 }}
              locations={[0, 0.42, 1]}
              pointerEvents="none"
              start={{ x: 0, y: 0 }}
              style={styles.ticketLeftInsetHighlight}
            />
            <LinearGradient
              colors={["rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0.16)"]}
              end={{ x: 1, y: 0 }}
              locations={[0, 1]}
              pointerEvents="none"
              start={{ x: 0, y: 0 }}
              style={styles.ticketRightInsetShade}
            />
            <LinearGradient
              colors={["rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0.20)"]}
              locations={[0, 1]}
              pointerEvents="none"
              style={styles.ticketBottomInsetShade}
            />
          </View>
        </MaskedView>
      </View>

      <ExpandedExperienceImageModal
        activeIndex={activePhotoIndex}
        eventTitle={event.title}
        onClose={handleCloseExpandedImage}
        onSelectIndex={handlePhotoIndexSelect}
        photoRefs={photoRefs}
        visible={isExpandedImageVisible}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  experience: {
    marginBottom: 22,
    position: "relative",
    width: "100%",
  },
  ticketShadow: {
    borderRadius: EXPERIENCE_TICKET_RADIUS,
    elevation: 10,
    overflow: "visible",
    position: "relative",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    zIndex: 1,
  },
  ticketMask: {
    position: "relative",
    width: "100%",
    zIndex: 2,
  },
  ticketBody: {
    backgroundColor: TICKET_DARK,
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  ticketHero: {
    backgroundColor: TICKET_DARK,
    height: EXPERIENCE_TICKET_MEDIA_HEIGHT,
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  ticketMediaLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  ticketHeroFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: TICKET_DARK_SOFT,
  },
  ticketHeroGradient: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3,
  },
  ticketHeroCopy: {
    bottom: 54,
    left: 18,
    position: "absolute",
    right: 18,
    zIndex: 4,
  },
  ticketHeroTopMeta: {
    left: 18,
    position: "absolute",
    right: 120,
    top: 16,
    zIndex: 4,
  },
  ticketHeroLabel: {
    color: "rgba(255, 255, 255, 0.78)",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0,
  },
  ticketHeroTitle: {
    color: colors.surface,
    fontSize: 31,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 33,
  },
  ticketSeparatorRow: {
    backgroundColor: TICKET_DARK,
    height: EXPERIENCE_TICKET_SEPARATOR_HEIGHT,
    justifyContent: "center",
    paddingHorizontal: EXPERIENCE_TICKET_SEPARATOR_INSET,
  },
  ticketSeparatorLine: {
    borderColor: "rgba(255, 255, 255, 0.20)",
    borderStyle: "solid",
    borderTopWidth: StyleSheet.hairlineWidth,
    height: 1,
    width: "100%",
  },
  ticketInnerHighlightFrame: {
    ...StyleSheet.absoluteFillObject,
    borderColor: "rgba(255, 255, 255, 0.075)",
    borderRadius: EXPERIENCE_TICKET_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    zIndex: 20,
  },
  ticketInnerTopGlow: {
    height: 82,
    left: 0,
    opacity: 0.72,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 19,
  },
  ticketInnerBottomShade: {
    bottom: 0,
    height: 110,
    left: 0,
    opacity: 0.7,
    position: "absolute",
    right: 0,
    zIndex: 19,
  },
  ticketTopInsetHighlight: {
    height: 26,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 21,
  },
  ticketLeftInsetHighlight: {
    bottom: 0,
    left: 0,
    position: "absolute",
    top: 0,
    width: 18,
    zIndex: 21,
  },
  ticketRightInsetShade: {
    bottom: 0,
    position: "absolute",
    right: 0,
    top: 0,
    width: 18,
    zIndex: 21,
  },
  ticketBottomInsetShade: {
    bottom: 0,
    height: 34,
    left: 0,
    position: "absolute",
    right: 0,
    zIndex: 21,
  },
  ticketInfoSection: {
    backgroundColor: TICKET_DARK,
    paddingBottom: EXPERIENCE_TICKET_INFO_PADDING + 6,
    paddingHorizontal: EXPERIENCE_TICKET_INFO_PADDING,
    paddingTop: 8,
  },
  ticketInfoTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  ticketMetaBlock: {
    flex: 1,
    minWidth: 0,
  },
  photoGrid: {
    backgroundColor: TICKET_DARK,
    borderRadius: EXPERIENCE_PHOTO_GRID_RADIUS,
    height: EXPERIENCE_PHOTO_GRID_HEIGHT,
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  photoGridTile: {
    backgroundColor: TICKET_DARK,
    borderRadius: 0,
    overflow: "hidden",
    position: "absolute",
  },
  photoGridImageButton: {
    height: "100%",
    width: "100%",
  },
  photoGridImage: {
    height: "100%",
    width: "100%",
  },
  fullPhotoView: {
    backgroundColor: TICKET_DARK,
    borderRadius: EXPERIENCE_PHOTO_GRID_RADIUS,
    height: EXPERIENCE_PHOTO_GRID_HEIGHT,
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  fullPhotoImage: {
    height: "100%",
    width: "100%",
  },
  fullPhotoImageButton: {
    height: "100%",
    width: "100%",
  },
  fullPhotoDashRail: {
    alignItems: "flex-end",
    bottom: 0,
    gap: EXPERIENCE_PHOTO_DASH_GAP,
    justifyContent: "center",
    paddingVertical: 12,
    position: "absolute",
    right: 10,
    top: 0,
    width: EXPERIENCE_PHOTO_DASH_RAIL_WIDTH,
    zIndex: 5,
  },
  fullPhotoDashHitArea: {
    alignItems: "flex-end",
    height: EXPERIENCE_PHOTO_DASH_HIT_HEIGHT,
    justifyContent: "center",
    width: EXPERIENCE_PHOTO_DASH_RAIL_WIDTH,
  },
  fullPhotoDash: {
    backgroundColor: colors.effects.surfaceRaised,
    borderRadius: EXPERIENCE_PHOTO_DASH_HEIGHT / 2,
    height: EXPERIENCE_PHOTO_DASH_HEIGHT,
    opacity: 0.72,
    shadowColor: colors.effects.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    width: EXPERIENCE_PHOTO_DASH_WIDTH,
  },
  fullPhotoDashActive: {
    backgroundColor: colors.primary,
    opacity: 1,
    width: EXPERIENCE_PHOTO_ACTIVE_DASH_WIDTH,
  },
  expandedImageModalRoot: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.48)",
    justifyContent: "center",
    padding: EXPERIENCE_EXPANDED_IMAGE_MARGIN,
  },
  expandedImageFrame: {
    backgroundColor: colors.primary,
    borderRadius: EXPERIENCE_EXPANDED_IMAGE_RADIUS,
    height: "82%",
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  expandedImage: {
    height: "100%",
    width: "100%",
  },
  expandedImageDashRail: {
    alignItems: "flex-end",
    bottom: 0,
    gap: EXPERIENCE_PHOTO_DASH_GAP,
    justifyContent: "center",
    paddingVertical: 16,
    position: "absolute",
    right: EXPERIENCE_EXPANDED_DASH_RIGHT,
    top: 0,
    width: EXPERIENCE_PHOTO_DASH_RAIL_WIDTH,
    zIndex: 5,
  },
  mediaModeToggle: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.84)",
    borderColor: "rgba(255, 255, 255, 0.58)",
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 5,
    minHeight: 30,
    paddingHorizontal: 10,
    position: "absolute",
    right: EXPERIENCE_MEDIA_TOGGLE_RIGHT,
    top: EXPERIENCE_MEDIA_TOGGLE_TOP,
    zIndex: 8,
  },
  mediaModeToggleText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0,
  },
  cardPressed: {
    opacity: 0.92,
  },
  mediaArea: {
    borderRadius: EXPERIENCE_PHOTO_GRID_RADIUS,
    height: "100%",
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  date: {
    color: colors.primary,
    flex: 1,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 15,
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderColor: "rgba(255, 255, 255, 0.14)",
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  address: {
    color: "rgba(255, 255, 255, 0.78)",
    fontSize: 12,
    lineHeight: 16,
    marginTop: 8,
  },
  footerRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginTop: 14,
  },
  price: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0,
    marginBottom: 5,
  },
  avatarStack: {
    alignItems: "center",
    flexDirection: "row",
    minHeight: 26,
  },
  emptyStack: {
    minHeight: 26,
    width: 24,
  },
  avatar: {
    borderColor: TICKET_DARK,
    borderRadius: 12,
    borderWidth: 1.5,
    height: 24,
    width: 24,
  },
  avatarOverlap: {
    marginLeft: -10,
  },
  moreAvatar: {
    alignItems: "center",
    backgroundColor: colors.primary,
    justifyContent: "center",
  },
  moreAvatarText: {
    color: colors.iconActive,
    fontSize: 19,
    fontWeight: "800",
    lineHeight: 20,
  },
  detailsButton: {
    alignItems: "flex-start",
    backgroundColor: colors.primary,
    borderRadius: 10,
    justifyContent: "center",
    minHeight: 40,
    minWidth: 76,
    paddingHorizontal: 10,
  },
  detailsButtonText: {
    color: colors.iconActive,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 10,
  },
  pressed: {
    opacity: 0.72,
  },
});
