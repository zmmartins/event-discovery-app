import { Ionicons } from "@expo/vector-icons";
import MaskedView from "@react-native-masked-view/masked-view";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { usePathname } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";

import { formatAttendedExperienceDate } from "../domain/events/eventFormatters";
import { LOG_ACTIONS, logInteraction } from "../services/interactionLogService";
import { colors } from "../theme/colors";
import { getAvatarImage, getEventPreviewImage } from "../utils/imageAssets";

const TICKET_DARK = "#121A15";
const TICKET_DARK_SOFT = "#18241D";

const POSTER_TEXT_FONT = Platform.select({
  android: "monospace",
  default: "monospace",
  ios: "Menlo",
});

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

const EXPERIENCE_MEDIA_TOGGLE_TOP = 10;
const EXPERIENCE_MEDIA_TOGGLE_RIGHT = 10;

const TICKET_IMAGE_SPRING_CONFIG = {
  damping: 25,
  mass: 0.88,
  stiffness: 160,
  useNativeDriver: false,
};

const TICKET_IMAGE_HEIGHT_SPRING_CONFIG = {
  damping: 26,
  mass: 0.9,
  stiffness: 155,
  useNativeDriver: false,
};

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

function getExpandedPhotoHeight(width, aspectRatio) {
  const safeWidth = Number(width);
  const safeAspectRatio = Number(aspectRatio);

  if (!Number.isFinite(safeWidth) || safeWidth <= 0) {
    return EXPERIENCE_TICKET_MEDIA_HEIGHT;
  }

  const resolvedAspectRatio =
    Number.isFinite(safeAspectRatio) && safeAspectRatio > 0 ? safeAspectRatio : 1;

  return Math.round(Math.min(Math.max(safeWidth / resolvedAspectRatio, 320), 520));
}

function getSafePhotoFrame(frame, fallbackFrame) {
  const safeFallbackFrame = {
    height:
      Number.isFinite(fallbackFrame?.height) && fallbackFrame.height > 0
        ? fallbackFrame.height
        : 1,
    left: Number.isFinite(fallbackFrame?.left) ? fallbackFrame.left : 0,
    top: Number.isFinite(fallbackFrame?.top) ? fallbackFrame.top : 0,
    width:
      Number.isFinite(fallbackFrame?.width) && fallbackFrame.width > 0
        ? fallbackFrame.width
        : 1,
  };

  return {
    height:
      Number.isFinite(frame?.height) && frame.height > 0
        ? frame.height
        : safeFallbackFrame.height,
    left: Number.isFinite(frame?.left) ? frame.left : safeFallbackFrame.left,
    top: Number.isFinite(frame?.top) ? frame.top : safeFallbackFrame.top,
    width:
      Number.isFinite(frame?.width) && frame.width > 0
        ? frame.width
        : safeFallbackFrame.width,
  };
}

function getPhotoLayoutItems(photoRefs = []) {
  return photoRefs.map((photoRef, index) => {
    const aspectRatio = getPhotoAspectRatio(photoRef);

    return {
      aspectRatio,
      id: photoRef.id ?? `${photoRef.imageKey}-${index}`,
      index,
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

function ProfileExperiencePhotoGrid({
  eventTitle,
  hiddenPhotoIndex,
  onOpenImage,
  onPhotoLayout,
  photoRefs,
}) {
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

  useEffect(() => {
    tiles.forEach((tile) => {
      onPhotoLayout?.(tile.item.index, {
        height: tile.height,
        left: tile.left,
        top: tile.top,
        width: tile.width,
      });
    });
  }, [onPhotoLayout, tiles]);

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
      {tiles.map((tile) => (
        <View
          key={`${tile.item.id}-${tile.item.index}`}
          style={[
            styles.photoGridTile,
            {
              height: tile.height,
              left: tile.left,
              top: tile.top,
              width: tile.width,
            },
            hiddenPhotoIndex === tile.item.index && styles.photoHiddenDuringTransition,
          ]}
        >
          <Pressable
            accessibilityLabel={`Open ${eventTitle} memory ${tile.item.index + 1}`}
            accessibilityRole="imagebutton"
            onPress={(pressEvent) => {
              pressEvent?.stopPropagation?.();
              onOpenImage?.(tile.item.index);
            }}
            style={styles.photoGridImageButton}
          >
            <Image
              accessibilityLabel={`${eventTitle} memory ${tile.item.index + 1}`}
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
  height = EXPERIENCE_PHOTO_GRID_HEIGHT,
  hiddenPhotoIndex,
  onOpenImage,
  onPhotoLayout,
  onPhotoRailGestureActiveChange,
  onSelectIndex,
  photoRefs,
}) {
  const railRef = useRef(null);
  const fullPhotoLayoutRef = useRef({
    height: 0,
    width: 0,
  });
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

  const reportActivePhotoLayout = useCallback(
    (layout) => {
      const nextWidth = Math.round(layout.width);
      const nextHeight = Math.round(layout.height);

      if (nextWidth <= 0 || nextHeight <= 0) return;

      onPhotoLayout?.(clampedActiveIndex, {
        height: nextHeight,
        left: 0,
        top: 0,
        width: nextWidth,
      });
    },
    [clampedActiveIndex, onPhotoLayout]
  );

  useEffect(() => {
    reportActivePhotoLayout(fullPhotoLayoutRef.current);
  }, [reportActivePhotoLayout]);

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
      onLayout={(layoutEvent) => {
        const { height: nextHeight, width: nextWidth } = layoutEvent.nativeEvent.layout;

        fullPhotoLayoutRef.current = {
          height: nextHeight,
          width: nextWidth,
        };
        reportActivePhotoLayout(fullPhotoLayoutRef.current);
      }}
      onTouchStartCapture={handleFullPhotoTouchStartCapture}
      style={[styles.fullPhotoView, { height }]}
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
          style={[
            styles.fullPhotoImage,
            hiddenPhotoIndex === clampedActiveIndex && styles.photoHiddenDuringTransition,
          ]}
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

export default function ProfileExperienceCard({
  event,
  experience,
  onOpen,
  onPhotoRailGestureActiveChange,
  screen = "ProfileScreen",
  source = "profile_attended_list",
}) {
  const pathname = usePathname();
  const [mediaMode, setMediaMode] = useState("grid");
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [isTicketImageExpanded, setIsTicketImageExpanded] = useState(false);
  const [isTicketImageTransitioning, setIsTicketImageTransitioning] = useState(false);
  const [isTicketImageCollapsing, setIsTicketImageCollapsing] = useState(false);
  const [ticketImageTransition, setTicketImageTransition] = useState(null);
  const ticketImageExpandProgress = useRef(new Animated.Value(0)).current;
  const ticketHeroHeight = useRef(
    new Animated.Value(EXPERIENCE_TICKET_MEDIA_HEIGHT)
  ).current;
  const [animatedHeroHeight, setAnimatedHeroHeight] = useState(
    EXPERIENCE_TICKET_MEDIA_HEIGHT
  );
  const lastMeasuredHeroHeightRef = useRef(EXPERIENCE_TICKET_MEDIA_HEIGHT);
  const photoFramesRef = useRef({ grid: {}, image: {} });
  const isTicketImageTransitioningRef = useRef(false);
  const [ticketSize, setTicketSize] = useState({ height: 0, width: 0 });
  const price = event.price?.toUpperCase?.() ?? "";
  const organizerName =
    event.organizerName ??
    event.organizer?.name ??
    event.organizer?.displayName ??
    event.locationShortName ??
    event.locationName ??
    "";
  const photoRefs = useMemo(
    () => getSafePhotoRefs(experience.photoRefs),
    [experience.photoRefs]
  );
  const hasMultiplePhotos = photoRefs.length > 1;
  const currentHeroHeight = animatedHeroHeight;

  const syncAnimatedHeroHeight = useCallback((nextHeight) => {
    const roundedHeight = Math.round(nextHeight);

    if (!Number.isFinite(roundedHeight)) return;

    lastMeasuredHeroHeightRef.current = roundedHeight;
    setAnimatedHeroHeight(roundedHeight);
  }, []);

  const getExpandedHeroHeightForIndex = useCallback(
    (index) => {
      const clampedIndex = getClampedPhotoIndex(index, photoRefs.length);
      const photoRef = photoRefs[clampedIndex];
      const aspectRatio = photoRef ? getPhotoAspectRatio(photoRef) : 1;

      return getExpandedPhotoHeight(ticketSize.width, aspectRatio);
    },
    [photoRefs, ticketSize.width]
  );

  const getBaseHeroFrame = useCallback(
    () => ({
      height: EXPERIENCE_TICKET_MEDIA_HEIGHT,
      left: 0,
      top: 0,
      width: ticketSize.width || 1,
    }),
    [ticketSize.width]
  );

  const getExpandedHeroFrame = useCallback(
    (index) => ({
      height: getExpandedHeroHeightForIndex(index),
      left: 0,
      top: 0,
      width: ticketSize.width || 1,
    }),
    [getExpandedHeroHeightForIndex, ticketSize.width]
  );

  const recordPhotoLayout = useCallback(
    (mode, index, frame) => {
      const safeMode = mode === "grid" ? "grid" : "image";
      const clampedIndex = getClampedPhotoIndex(index, photoRefs.length);

      photoFramesRef.current[safeMode][clampedIndex] = getSafePhotoFrame(
        frame,
        getBaseHeroFrame()
      );
    },
    [getBaseHeroFrame, photoRefs.length]
  );

  const recordGridPhotoLayout = useCallback(
    (index, frame) => recordPhotoLayout("grid", index, frame),
    [recordPhotoLayout]
  );

  const recordImagePhotoLayout = useCallback(
    (index, frame) => recordPhotoLayout("image", index, frame),
    [recordPhotoLayout]
  );

  const getCollapsedPhotoFrame = useCallback(
    (index) => {
      const clampedIndex = getClampedPhotoIndex(index, photoRefs.length);
      const fallbackFrame = getBaseHeroFrame();

      if (mediaMode !== "grid") {
        return fallbackFrame;
      }

      return getSafePhotoFrame(photoFramesRef.current.grid[clampedIndex], fallbackFrame);
    },
    [getBaseHeroFrame, mediaMode, photoRefs.length]
  );

  const getTicketImageTransition = useCallback(
    ({ photoIndex, toExpanded }) => {
      if (photoRefs.length === 0) return null;

      const clampedIndex = getClampedPhotoIndex(photoIndex, photoRefs.length);
      const photoRef = photoRefs[clampedIndex];

      if (!photoRef) return null;

      return {
        fromFrame: getCollapsedPhotoFrame(clampedIndex),
        photoIndex: clampedIndex,
        source: getPhotoSource(photoRef),
        toExpanded,
        toFrame: getExpandedHeroFrame(clampedIndex),
      };
    },
    [getCollapsedPhotoFrame, getExpandedHeroFrame, photoRefs]
  );

  useEffect(() => {
    const listenerId = ticketHeroHeight.addListener(({ value }) => {
      const roundedHeight = Math.round(value);

      if (
        Number.isFinite(roundedHeight) &&
        roundedHeight !== lastMeasuredHeroHeightRef.current
      ) {
        syncAnimatedHeroHeight(roundedHeight);
      }
    });

    return () => {
      ticketHeroHeight.removeListener(listenerId);
    };
  }, [syncAnimatedHeroHeight, ticketHeroHeight]);

  useEffect(() => {
    isTicketImageTransitioningRef.current = isTicketImageTransitioning;
  }, [isTicketImageTransitioning]);

  useEffect(() => {
    ticketImageExpandProgress.stopAnimation();
    ticketHeroHeight.stopAnimation();
    ticketImageExpandProgress.setValue(0);
    ticketHeroHeight.setValue(EXPERIENCE_TICKET_MEDIA_HEIGHT);
    syncAnimatedHeroHeight(EXPERIENCE_TICKET_MEDIA_HEIGHT);
    photoFramesRef.current = { grid: {}, image: {} };
    setActivePhotoIndex(0);
    setIsTicketImageExpanded(false);
    setIsTicketImageTransitioning(false);
    isTicketImageTransitioningRef.current = false;
    setIsTicketImageCollapsing(false);
    setTicketImageTransition(null);
    setMediaMode("grid");
  }, [
    experience.id,
    syncAnimatedHeroHeight,
    ticketHeroHeight,
    ticketImageExpandProgress,
  ]);

  useEffect(() => {
    setActivePhotoIndex((currentIndex) =>
      getClampedPhotoIndex(currentIndex, photoRefs.length)
    );
  }, [photoRefs.length]);

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

  const handlePhotoIndexSelect = useCallback(
    (nextIndex) => {
      if (photoRefs.length === 0) return;

      const clampedIndex = getClampedPhotoIndex(nextIndex, photoRefs.length);

      if (activePhotoIndex === clampedIndex) return;

      setActivePhotoIndex(clampedIndex);
      Haptics.selectionAsync().catch(() => null);

      if (
        isTicketImageExpanded &&
        !isTicketImageTransitioningRef.current &&
        !isTicketImageCollapsing
      ) {
        const nextHeroHeight = getExpandedHeroHeightForIndex(clampedIndex);

        ticketHeroHeight.stopAnimation();
        Animated.spring(ticketHeroHeight, {
          ...TICKET_IMAGE_HEIGHT_SPRING_CONFIG,
          toValue: nextHeroHeight,
        }).start(({ finished }) => {
          if (finished) {
            ticketHeroHeight.setValue(nextHeroHeight);
            syncAnimatedHeroHeight(nextHeroHeight);
          }
        });
      }
    },
    [
      activePhotoIndex,
      getExpandedHeroHeightForIndex,
      isTicketImageCollapsing,
      isTicketImageExpanded,
      photoRefs.length,
      syncAnimatedHeroHeight,
      ticketHeroHeight,
    ]
  );

  const handleOpenExpandedImage = useCallback(
    (nextIndex) => {
      if (isTicketImageTransitioningRef.current || photoRefs.length === 0) return;

      const clampedIndex = getClampedPhotoIndex(nextIndex, photoRefs.length);
      const transition = getTicketImageTransition({
        photoIndex: clampedIndex,
        toExpanded: true,
      });

      if (!transition) return;

      ticketImageExpandProgress.stopAnimation();
      ticketHeroHeight.stopAnimation();
      ticketImageExpandProgress.setValue(0);
      ticketHeroHeight.setValue(EXPERIENCE_TICKET_MEDIA_HEIGHT);
      syncAnimatedHeroHeight(EXPERIENCE_TICKET_MEDIA_HEIGHT);
      setActivePhotoIndex(clampedIndex);
      setIsTicketImageExpanded(true);
      setIsTicketImageTransitioning(true);
      isTicketImageTransitioningRef.current = true;
      setIsTicketImageCollapsing(false);
      setTicketImageTransition(transition);

      Animated.parallel([
        Animated.spring(ticketImageExpandProgress, {
          ...TICKET_IMAGE_SPRING_CONFIG,
          toValue: 1,
        }),
        Animated.spring(ticketHeroHeight, {
          ...TICKET_IMAGE_HEIGHT_SPRING_CONFIG,
          toValue: transition.toFrame.height,
        }),
      ]).start(({ finished }) => {
        if (!finished) return;

        ticketImageExpandProgress.setValue(1);
        ticketHeroHeight.setValue(transition.toFrame.height);
        syncAnimatedHeroHeight(transition.toFrame.height);
        setIsTicketImageTransitioning(false);
        isTicketImageTransitioningRef.current = false;
        setTicketImageTransition(null);
      });

      Haptics.selectionAsync().catch(() => null);
    },
    [
      getTicketImageTransition,
      photoRefs.length,
      syncAnimatedHeroHeight,
      ticketHeroHeight,
      ticketImageExpandProgress,
    ]
  );

  const handleCollapseTicketImage = useCallback(() => {
    if (isTicketImageTransitioningRef.current || photoRefs.length === 0) return;

    const clampedIndex = getClampedPhotoIndex(activePhotoIndex, photoRefs.length);
    const transition = getTicketImageTransition({
      photoIndex: clampedIndex,
      toExpanded: false,
    });

    if (!transition) return;

    ticketImageExpandProgress.stopAnimation();
    ticketHeroHeight.stopAnimation();
    ticketImageExpandProgress.setValue(1);
    ticketHeroHeight.setValue(transition.toFrame.height);
    syncAnimatedHeroHeight(transition.toFrame.height);
    setActivePhotoIndex(clampedIndex);
    setIsTicketImageCollapsing(true);
    setIsTicketImageTransitioning(true);
    isTicketImageTransitioningRef.current = true;
    setTicketImageTransition(transition);

    Animated.parallel([
      Animated.spring(ticketImageExpandProgress, {
        ...TICKET_IMAGE_SPRING_CONFIG,
        toValue: 0,
      }),
      Animated.spring(ticketHeroHeight, {
        ...TICKET_IMAGE_HEIGHT_SPRING_CONFIG,
        toValue: EXPERIENCE_TICKET_MEDIA_HEIGHT,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        ticketImageExpandProgress.setValue(0);
        ticketHeroHeight.setValue(EXPERIENCE_TICKET_MEDIA_HEIGHT);
        syncAnimatedHeroHeight(EXPERIENCE_TICKET_MEDIA_HEIGHT);
        setIsTicketImageExpanded(false);
        setIsTicketImageCollapsing(false);
        setIsTicketImageTransitioning(false);
        isTicketImageTransitioningRef.current = false;
        setTicketImageTransition(null);
      }
    });

    Haptics.selectionAsync().catch(() => null);
  }, [
    activePhotoIndex,
    getTicketImageTransition,
    photoRefs.length,
    syncAnimatedHeroHeight,
    ticketHeroHeight,
    ticketImageExpandProgress,
  ]);

  const handleMediaModeToggle = useCallback(
    (pressEvent) => {
      pressEvent?.stopPropagation?.();

      if (isTicketImageTransitioningRef.current) return;

      if (isTicketImageExpanded) {
        handleCollapseTicketImage();
        return;
      }

      Haptics.selectionAsync().catch(() => null);

      setMediaMode((currentMode) => (currentMode === "grid" ? "image" : "grid"));
    },
    [handleCollapseTicketImage, isTicketImageExpanded]
  );

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

  const ticketNotchY = currentHeroHeight + EXPERIENCE_TICKET_SEPARATOR_HEIGHT / 2;
  const transitionPhotoIndex = ticketImageTransition?.photoIndex ?? null;
  const originalMediaOpacity = ticketImageExpandProgress.interpolate({
    inputRange: [0, 0.7],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const expandedMediaOpacity = ticketImageExpandProgress.interpolate({
    inputRange: [0.82, 1],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const ticketInfoMinHeight = ticketImageExpandProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [136, 166],
    extrapolate: "clamp",
  });
  const ticketInfoPaddingTop = ticketImageExpandProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 16],
    extrapolate: "clamp",
  });
  const ticketImageTransitionOverlayStyle = ticketImageTransition
    ? {
        height: ticketImageExpandProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [
            ticketImageTransition.fromFrame.height,
            ticketImageTransition.toFrame.height,
          ],
          extrapolate: "clamp",
        }),
        left: ticketImageExpandProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [
            ticketImageTransition.fromFrame.left,
            ticketImageTransition.toFrame.left,
          ],
          extrapolate: "clamp",
        }),
        opacity: ticketImageTransition.toExpanded
          ? ticketImageExpandProgress.interpolate({
              inputRange: [0, 0.05, 0.92, 1],
              outputRange: [1, 1, 1, 0],
              extrapolate: "clamp",
            })
          : ticketImageExpandProgress.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1],
              extrapolate: "clamp",
            }),
        top: ticketImageExpandProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [
            ticketImageTransition.fromFrame.top,
            ticketImageTransition.toFrame.top,
          ],
          extrapolate: "clamp",
        }),
        width: ticketImageExpandProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [
            ticketImageTransition.fromFrame.width,
            ticketImageTransition.toFrame.width,
          ],
          extrapolate: "clamp",
        }),
      }
    : null;

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
            <Animated.View style={[styles.ticketHero, { height: ticketHeroHeight }]}>
              <View style={styles.ticketMediaLayer}>
                {photoRefs.length > 0 ? (
                  <View style={styles.mediaArea}>
                    <Animated.View
                      pointerEvents={
                        !isTicketImageExpanded && !isTicketImageTransitioning
                          ? "auto"
                          : "none"
                      }
                      style={[
                        styles.mediaModeSurface,
                        {
                          opacity: originalMediaOpacity,
                        },
                      ]}
                    >
                      {mediaMode === "grid" ? (
                        <ProfileExperiencePhotoGrid
                          eventTitle={event.title}
                          hiddenPhotoIndex={transitionPhotoIndex}
                          onOpenImage={handleOpenExpandedImage}
                          onPhotoLayout={recordGridPhotoLayout}
                          photoRefs={photoRefs}
                        />
                      ) : (
                        <ProfileExperienceFullImageView
                          activeIndex={activePhotoIndex}
                          eventTitle={event.title}
                          height="100%"
                          hiddenPhotoIndex={transitionPhotoIndex}
                          onOpenImage={handleOpenExpandedImage}
                          onPhotoLayout={recordImagePhotoLayout}
                          onPhotoRailGestureActiveChange={onPhotoRailGestureActiveChange}
                          onSelectIndex={handlePhotoIndexSelect}
                          photoRefs={photoRefs}
                        />
                      )}
                    </Animated.View>

                    {(isTicketImageExpanded || isTicketImageTransitioning) && (
                      <Animated.View
                        pointerEvents={
                          isTicketImageExpanded &&
                          !isTicketImageTransitioning &&
                          !isTicketImageCollapsing
                            ? "auto"
                            : "none"
                        }
                        style={[
                          styles.mediaModeSurface,
                          {
                            opacity: expandedMediaOpacity,
                          },
                        ]}
                      >
                        <ProfileExperienceFullImageView
                          activeIndex={activePhotoIndex}
                          eventTitle={event.title}
                          height="100%"
                          hiddenPhotoIndex={transitionPhotoIndex}
                          onOpenImage={() => null}
                          onPhotoLayout={recordImagePhotoLayout}
                          onPhotoRailGestureActiveChange={onPhotoRailGestureActiveChange}
                          onSelectIndex={handlePhotoIndexSelect}
                          photoRefs={photoRefs}
                        />
                      </Animated.View>
                    )}

                    {ticketImageTransition && ticketImageTransitionOverlayStyle && (
                      <Animated.View
                        pointerEvents="none"
                        style={[
                          styles.ticketImageTransitionOverlay,
                          ticketImageTransitionOverlayStyle,
                        ]}
                      >
                        <Image
                          resizeMode="cover"
                          source={ticketImageTransition.source}
                          style={styles.ticketImageTransitionPhoto}
                        />
                      </Animated.View>
                    )}
                  </View>
                ) : (
                  <View style={styles.ticketHeroFallback} />
                )}
              </View>

              <Animated.View
                pointerEvents="none"
                style={[
                  styles.ticketHeroGradient,
                  {
                    opacity: ticketImageExpandProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 0],
                    }),
                  },
                ]}
              >
                <LinearGradient
                  colors={[
                    "rgba(18, 26, 21, 0)",
                    "rgba(18, 26, 21, 0)",
                    "rgba(18, 26, 21, 0.26)",
                    "rgba(18, 26, 21, 0.72)",
                    TICKET_DARK,
                  ]}
                  locations={[0, 0.48, 0.6, 0.8, 1]}
                  pointerEvents="none"
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>

              <Animated.View
                pointerEvents="none"
                style={[
                  styles.ticketHeroCopy,
                  {
                    opacity: ticketImageExpandProgress.interpolate({
                      inputRange: [0, 0.55],
                      outputRange: [1, 0],
                      extrapolate: "clamp",
                    }),
                    transform: [
                      {
                        translateY: ticketImageExpandProgress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 18],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Text style={styles.ticketHeroLabel}>MEMORY TICKET</Text>

                <Text numberOfLines={3} style={styles.ticketHeroTitle}>
                  {event.title}
                </Text>

                <View style={styles.ticketHeroMetaRow}>
                  <AttendeeStack attendees={event.attendingFriends} />

                  {!!organizerName && (
                    <Text numberOfLines={1} style={styles.ticketOrganizerName}>
                      {organizerName}
                    </Text>
                  )}
                </View>
              </Animated.View>

              {(hasMultiplePhotos || isTicketImageExpanded) && (
                <Pressable
                  accessibilityLabel={
                    isTicketImageExpanded
                      ? "Collapse expanded ticket image"
                      : mediaMode === "grid"
                        ? "Show full image view"
                        : "Show photo grid view"
                  }
                  accessibilityRole="button"
                  onPress={handleMediaModeToggle}
                  style={({ pressed }) => [
                    styles.mediaModeToggle,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons
                    name={
                      isTicketImageExpanded
                        ? "contract-outline"
                        : mediaMode === "grid"
                          ? "image-outline"
                          : "grid-outline"
                    }
                    size={15}
                    color={colors.text}
                  />
                  <Text style={styles.mediaModeToggleText}>
                    {isTicketImageExpanded
                      ? "Collapse"
                      : mediaMode === "grid"
                        ? "Full"
                        : "Grid"}
                  </Text>
                </Pressable>
              )}
            </Animated.View>

            <View pointerEvents="none" style={styles.ticketSeparatorRow}>
              <View style={styles.ticketSeparatorLine} />
            </View>

            <Animated.View
              style={[
                styles.ticketInfoSection,
                {
                  minHeight: ticketInfoMinHeight,
                  paddingTop: ticketInfoPaddingTop,
                },
              ]}
            >
              <Pressable
                accessibilityLabel={`Open details for ${event.title}`}
                accessibilityRole="button"
                onPress={isTicketImageExpanded ? undefined : handleOpenPress}
                style={({ pressed }) => [
                  styles.ticketInfoPressable,
                  pressed && styles.cardPressed,
                ]}
              >
                <Animated.View
                  pointerEvents={isTicketImageExpanded ? "none" : "auto"}
                  style={[
                    styles.ticketInfoContent,
                    {
                      opacity: ticketImageExpandProgress.interpolate({
                        inputRange: [0, 0.45],
                        outputRange: [1, 0],
                        extrapolate: "clamp",
                      }),
                      transform: [
                        {
                          translateY: ticketImageExpandProgress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 10],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <View style={styles.ticketInfoTextColumn}>
                    <Text style={styles.date}>
                      {formatAttendedExperienceDate(experience.attendedAt)}
                    </Text>

                    {!!price && <Text style={styles.price}>{price}</Text>}

                    <Text numberOfLines={2} style={styles.address}>
                      {event.locationName}
                    </Text>
                  </View>

                  <View style={styles.ticketActionColumn}>
                    <Pressable
                      accessibilityLabel={`Open details for ${event.title}`}
                      accessibilityRole="button"
                      onPress={(pressEvent) => {
                        pressEvent?.stopPropagation?.();
                        if (!isTicketImageExpanded) {
                          handleOpenPress();
                        }
                      }}
                      style={({ pressed }) => [
                        styles.posterArrowButton,
                        pressed && styles.pressed,
                      ]}
                    >
                      <View pointerEvents="none" style={styles.posterArrowButtonSurface}>
                        <LinearGradient
                          colors={[
                            colors.primary,
                            "#55F777",
                            "#DFFFF0",
                            "#68FF86",
                            colors.primary,
                            "#16C947",
                          ]}
                          locations={[0, 0.2, 0.38, 0.5, 0.72, 1]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={StyleSheet.absoluteFillObject}
                        />

                        <LinearGradient
                          colors={[
                            "rgba(255, 255, 255, 0)",
                            "rgba(255, 255, 255, 0.42)",
                            "rgba(255, 255, 255, 0)",
                          ]}
                          locations={[0, 0.5, 1]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.posterArrowButtonSheen}
                        />

                        <LinearGradient
                          colors={[
                            "rgba(255, 255, 255, 0.32)",
                            "rgba(255, 255, 255, 0.06)",
                            "rgba(255, 255, 255, 0)",
                          ]}
                          locations={[0, 0.42, 1]}
                          style={styles.posterArrowButtonTopGlow}
                        />
                      </View>

                      <Ionicons
                        name="arrow-forward"
                        size={34}
                        color={TICKET_DARK}
                        style={styles.posterArrowIcon}
                      />
                    </Pressable>
                  </View>
                </Animated.View>

                <Animated.View
                  pointerEvents={isTicketImageExpanded ? "auto" : "none"}
                  style={[
                    styles.expandedTicketIdentity,
                    {
                      opacity: ticketImageExpandProgress.interpolate({
                        inputRange: [0.35, 1],
                        outputRange: [0, 1],
                        extrapolate: "clamp",
                      }),
                      transform: [
                        {
                          translateY: ticketImageExpandProgress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-24, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Text style={styles.expandedTicketLabel}>MEMORY TICKET</Text>

                  <Text numberOfLines={3} style={styles.expandedTicketTitle}>
                    {event.title}
                  </Text>

                  {!!organizerName && (
                    <Text numberOfLines={1} style={styles.expandedTicketOrganizer}>
                      {organizerName}
                    </Text>
                  )}
                </Animated.View>
              </Pressable>
            </Animated.View>

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
                "rgba(255, 255, 255, 0)",
                "rgba(255, 255, 255, 0.085)",
                "rgba(255, 255, 255, 0.025)",
                "rgba(255, 255, 255, 0)",
              ]}
              locations={[0, 0.42, 0.52, 1]}
              pointerEvents="none"
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ticketMaterialSheen}
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
    bottom: 26,
    left: 18,
    position: "absolute",
    right: 18,
    zIndex: 4,
  },
  ticketHeroLabel: {
    color: "rgba(255, 255, 255, 0.78)",
    fontFamily: POSTER_TEXT_FONT,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0,
    marginBottom: 4,
  },
  ticketHeroTitle: {
    color: colors.primary,
    fontSize: 31,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 33,
  },
  ticketHeroMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
    width: "100%",
  },
  ticketOrganizerName: {
    color: "rgba(255, 255, 255, 0.88)",
    flex: 1,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0,
    textAlign: "right",
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
  ticketMaterialSheen: {
    height: 150,
    left: -70,
    opacity: 0.55,
    position: "absolute",
    right: -70,
    top: 40,
    transform: [{ rotate: "-12deg" }],
    zIndex: 18,
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
    minHeight: 136,
    paddingTop: 12,
    position: "relative",
  },
  ticketInfoPressable: {
    flex: 1,
    paddingBottom: EXPERIENCE_TICKET_INFO_PADDING + 20,
    paddingHorizontal: EXPERIENCE_TICKET_INFO_PADDING,
    position: "relative",
  },
  ticketInfoContent: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 16,
    justifyContent: "space-between",
  },
  expandedTicketIdentity: {
    left: EXPERIENCE_TICKET_INFO_PADDING,
    position: "absolute",
    right: EXPERIENCE_TICKET_INFO_PADDING,
    top: 0,
  },
  expandedTicketLabel: {
    color: "rgba(255, 255, 255, 0.78)",
    fontFamily: POSTER_TEXT_FONT,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0,
    marginBottom: 5,
  },
  expandedTicketTitle: {
    color: colors.primary,
    fontSize: 27,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 29,
  },
  expandedTicketOrganizer: {
    color: "rgba(255, 255, 255, 0.88)",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: 8,
    textAlign: "right",
  },
  ticketInfoTextColumn: {
    flex: 1,
    minWidth: 0,
    paddingRight: 4,
  },
  ticketActionColumn: {
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 1,
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
  photoHiddenDuringTransition: {
    opacity: 0,
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
  mediaModeSurface: {
    ...StyleSheet.absoluteFillObject,
  },
  ticketImageTransitionOverlay: {
    backgroundColor: TICKET_DARK,
    overflow: "hidden",
    position: "absolute",
    zIndex: 7,
  },
  ticketImageTransitionPhoto: {
    height: "100%",
    width: "100%",
  },
  date: {
    color: colors.primary,
    fontFamily: POSTER_TEXT_FONT,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 16,
    marginBottom: 8,
  },
  address: {
    color: "rgba(255, 255, 255, 0.78)",
    fontFamily: POSTER_TEXT_FONT,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0,
    lineHeight: 17,
  },
  price: {
    color: colors.primary,
    fontFamily: POSTER_TEXT_FONT,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 16,
    marginBottom: 7,
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
  posterArrowButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 31,
    height: 62,
    justifyContent: "center",
    overflow: "visible",
    position: "relative",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    width: 62,
  },
  posterArrowButtonSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 31,
    overflow: "hidden",
  },
  posterArrowButtonSheen: {
    height: 90,
    left: -28,
    opacity: 0.75,
    position: "absolute",
    top: -16,
    transform: [{ rotate: "-12deg" }],
    width: 42,
  },
  posterArrowButtonTopGlow: {
    height: 28,
    left: 0,
    opacity: 0.65,
    position: "absolute",
    right: 0,
    top: 0,
  },
  posterArrowIcon: {
    position: "relative",
    zIndex: 2,
  },
  pressed: {
    opacity: 0.72,
  },
});
