import { Ionicons } from "@expo/vector-icons";
import { usePathname } from "expo-router";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { LOG_ACTIONS, logInteraction } from "../services/interactionLogService";
import { colors } from "../theme/colors";
import {
  getAvatarImage,
  getEventPinImage,
  getEventPreviewImage,
} from "../utils/imageAssets";
import { getSessionEventPinLayout } from "./EventPin";

const DEFAULT_CARD_HEIGHT = 520;
const CARD_RADIUS = 4;

const DEFAULT_IMAGE_SIZE = 272;

const POSTER_PADDING = 14;
const POSTER_TOP_PADDING = 16;
const POSTER_HEADER_HEIGHT = 150;
const POSTER_IMAGE_GAP = 14;
const POSTER_BOTTOM_GAP = 14;
const POSTER_META_HEIGHT = 58;
const POSTER_BOTTOM_PADDING = 16;

const POSTER_TITLE_FONT_SIZE = 31;
const POSTER_TITLE_LINE_HEIGHT = 31;
const POSTER_TITLE_ROW_HEIGHT = 104;
const POSTER_TITLE_MAX_LINES = 3;
const POSTER_TITLE_WIDTH_SAFETY_FACTOR = 0.96;
const POSTER_TITLE_MAX_FONT_SIZE = 42;
const POSTER_TITLE_MIN_FONT_SIZE = 20;
const POSTER_TITLE_LINE_HEIGHT_RATIO = 0.96;
const POSTER_TITLE_FONT_SIZE_PRECISION = 0.5;
const POSTER_TITLE_BALANCE_WEIGHT = 1.4;
const POSTER_TITLE_FILL_WEIGHT = 2.2;
const POSTER_TITLE_HEIGHT_FILL_WEIGHT = 1.6;
const POSTER_TITLE_FONT_SIZE_WEIGHT = 3.5;
const POSTER_TITLE_TINY_LINE_PENALTY = 4;
const POSTER_TITLE_HYPHEN_PENALTY = 0.9;
const POSTER_DATE_SLOT_WIDTH = 58;
const POSTER_TITLE_RIGHT_PADDING = 8;
const POSTER_TITLE_MIN_WORD_CHARS = 3;

const ACTION_BUTTON_SIZE = 48;
const ACTION_ICON_SIZE = 34;

const CARD_AVATAR_SIZE = 24;
const CARD_AVATAR_BORDER_WIDTH = 1.5;
const CARD_AVATAR_OVERLAP = 9;

const PIN_SURFACE_COLOR = colors.primary;
const CARD_SURFACE_COLOR = colors.primary;
const CARD_BORDER_COLOR = colors.primary;
const IMAGE_BORDER_WIDTH = StyleSheet.hairlineWidth;
const IMAGE_BORDER_COLOR = colors.primary;

const ACTION_BACKGROUND_COLOR = colors.text;
const ACTION_TEXT_COLOR = colors.surface;

const POSTER_MONTH_LABELS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

function formatPosterTime(value) {
  const rawTime = String(value ?? "").trim();
  if (!rawTime) return "";

  const [rawHour, rawMinute] = rawTime.split(":");
  const hourNumber = Number(rawHour);

  if (!Number.isFinite(hourNumber)) {
    return rawTime.toUpperCase();
  }

  const hourLabel = String(hourNumber).padStart(2, "0");
  const minuteLabel =
    rawMinute && rawMinute !== "00" ? String(rawMinute).padStart(2, "0") : "";

  return `${hourLabel}H${minuteLabel}`;
}

function getPosterDateParts(event) {
  const rawDate = String(event?.date ?? "").trim();
  const [year, month, day] = rawDate.split("-");
  const timeLabel = formatPosterTime(event?.time);

  if (!year || !month || !day) {
    return {
      main: event?.dateLabel ? String(event.dateLabel).toUpperCase() : "DATE TBA",
      sub: timeLabel,
    };
  }

  const monthLabel = POSTER_MONTH_LABELS[Number(month) - 1] ?? month.toUpperCase();
  const dayLabel = String(day).padStart(2, "0");

  return {
    main: `${monthLabel} ${dayLabel}`,
    sub: [year, timeLabel].filter(Boolean).join(" | "),
  };
}

function getUppercaseCharacterWidthRatio(character) {
  if (character === " ") return 0.34;
  if (character === "-") return 0.38;
  if ("IJL1".includes(character)) return 0.34;
  if ("MW".includes(character)) return 0.94;
  if ("ABCDEFGHKNOPQRSTUVXYZ".includes(character)) return 0.74;

  return 0.68;
}

function estimatePosterTextUnits(value) {
  return String(value ?? "")
    .split("")
    .reduce((width, character) => width + getUppercaseCharacterWidthRatio(character), 0);
}

function estimatePosterTextWidth(value, fontSize) {
  return estimatePosterTextUnits(value) * fontSize;
}

function doesPosterTextFit(value, maxWidth, fontSize) {
  return estimatePosterTextWidth(value, fontSize) <= maxWidth;
}

function roundPosterFontSize(value) {
  return (
    Math.floor(value / POSTER_TITLE_FONT_SIZE_PRECISION) *
    POSTER_TITLE_FONT_SIZE_PRECISION
  );
}

function getMaxFontSizeForPosterLines({ lines, maxWidth, maxHeight }) {
  if (!Array.isArray(lines) || lines.length === 0) {
    return 0;
  }

  const widestLineUnits = Math.max(...lines.map((line) => estimatePosterTextUnits(line)));

  if (!Number.isFinite(widestLineUnits) || widestLineUnits <= 0) {
    return 0;
  }

  const maxFontByWidth = maxWidth / widestLineUnits;
  const maxFontByHeight = maxHeight / (lines.length * POSTER_TITLE_LINE_HEIGHT_RATIO);
  const rawFontSize = Math.min(
    POSTER_TITLE_MAX_FONT_SIZE,
    maxFontByWidth,
    maxFontByHeight
  );

  return roundPosterFontSize(rawFontSize);
}

function splitLongPosterWordByWidth(word, maxWidth, fontSize) {
  const safeWord = String(word ?? "").toUpperCase();

  if (doesPosterTextFit(safeWord, maxWidth, fontSize)) {
    return [safeWord];
  }

  const parts = [];
  let remaining = safeWord;

  while (remaining.length > 0) {
    if (doesPosterTextFit(remaining, maxWidth, fontSize)) {
      parts.push(remaining);
      break;
    }

    let bestCut = 0;

    for (let cut = POSTER_TITLE_MIN_WORD_CHARS; cut < remaining.length; cut += 1) {
      const candidate = `${remaining.slice(0, cut)}-`;

      if (doesPosterTextFit(candidate, maxWidth, fontSize)) {
        bestCut = cut;
      } else {
        break;
      }
    }

    if (bestCut <= 0) {
      bestCut = Math.max(POSTER_TITLE_MIN_WORD_CHARS, Math.floor(remaining.length / 2));
    }

    const remainderLength = remaining.length - bestCut;

    if (
      remainderLength > 0 &&
      remainderLength < POSTER_TITLE_MIN_WORD_CHARS &&
      bestCut > POSTER_TITLE_MIN_WORD_CHARS + remainderLength
    ) {
      bestCut -= POSTER_TITLE_MIN_WORD_CHARS - remainderLength;
    }

    parts.push(`${remaining.slice(0, bestCut)}-`);
    remaining = remaining.slice(bestCut);
  }

  return parts;
}

function getPosterTitleWords(value) {
  return String(value ?? "")
    .toUpperCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function getWordLineCandidates(words, maxLines) {
  const candidates = [];

  function search(startIndex, currentLines) {
    if (startIndex >= words.length) {
      candidates.push(currentLines);
      return;
    }

    if (currentLines.length >= maxLines) {
      return;
    }

    let line = "";

    for (let endIndex = startIndex; endIndex < words.length; endIndex += 1) {
      line = line ? `${line} ${words[endIndex]}` : words[endIndex];
      search(endIndex + 1, [...currentLines, line]);
    }
  }

  search(0, []);

  return candidates;
}

function scorePosterTitleLayout({ lines, fontSize, maxWidth, maxHeight }) {
  const lineWidths = lines.map((line) => estimatePosterTextUnits(line) * fontSize);
  const widestLineWidth = Math.max(...lineWidths, 0);
  const narrowestLineWidth = Math.min(...lineWidths, 0);
  const averageLineWidth =
    lineWidths.reduce((sum, width) => sum + width, 0) / Math.max(lineWidths.length, 1);
  const usedHeight = lines.length * fontSize * POSTER_TITLE_LINE_HEIGHT_RATIO;
  const widthFill = widestLineWidth / maxWidth;
  const averageWidthFill = averageLineWidth / maxWidth;
  const heightFill = usedHeight / maxHeight;
  const balancePenalty =
    lines.length > 1 ? (widestLineWidth - narrowestLineWidth) / maxWidth : 0;
  const hasTinyLine = lines.some((line) => line.replace(/[-\s]/g, "").length <= 2);
  const hasHyphenatedLine = lines.some((line) => line.endsWith("-"));

  return (
    fontSize * POSTER_TITLE_FONT_SIZE_WEIGHT +
    averageWidthFill * POSTER_TITLE_FILL_WEIGHT +
    widthFill +
    heightFill * POSTER_TITLE_HEIGHT_FILL_WEIGHT -
    balancePenalty * POSTER_TITLE_BALANCE_WEIGHT -
    (hasTinyLine ? POSTER_TITLE_TINY_LINE_PENALTY : 0) -
    (hasHyphenatedLine ? POSTER_TITLE_HYPHEN_PENALTY : 0)
  );
}

function getBestNormalPosterTitleLayout({
  value,
  maxWidth,
  maxHeight,
  maxLines = POSTER_TITLE_MAX_LINES,
}) {
  const words = getPosterTitleWords(value);

  if (words.length === 0) {
    return null;
  }

  const candidates = getWordLineCandidates(words, maxLines);
  let bestLayout = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  candidates.forEach((lines) => {
    const fontSize = getMaxFontSizeForPosterLines({
      lines,
      maxHeight,
      maxWidth,
    });

    if (fontSize < POSTER_TITLE_MIN_FONT_SIZE) {
      return;
    }

    const score = scorePosterTitleLayout({
      fontSize,
      lines,
      maxHeight,
      maxWidth,
    });

    if (score > bestScore) {
      bestScore = score;
      bestLayout = {
        fontSize,
        lineHeight:
          fontSize === POSTER_TITLE_FONT_SIZE
            ? POSTER_TITLE_LINE_HEIGHT
            : Math.round(fontSize * POSTER_TITLE_LINE_HEIGHT_RATIO),
        lines,
      };
    }
  });

  return bestLayout;
}

function buildHyphenatedPosterTitleLines({ value, maxLines, maxWidth, fontSize }) {
  const words = getPosterTitleWords(value);
  const lines = [];

  function pushLine(line) {
    if (!line) return;

    if (lines.length < maxLines) {
      lines.push(line);
      return;
    }

    const lastIndex = maxLines - 1;
    const candidateLine = `${lines[lastIndex]} ${line}`.trim();

    if (doesPosterTextFit(candidateLine, maxWidth, fontSize)) {
      lines[lastIndex] = candidateLine;
    }
  }

  words.forEach((word) => {
    const wordParts = splitLongPosterWordByWidth(word, maxWidth, fontSize);

    wordParts.forEach((part) => {
      const currentLine = lines[lines.length - 1];

      if (!currentLine) {
        pushLine(part);
        return;
      }

      const candidateLine = `${currentLine} ${part}`;

      if (doesPosterTextFit(candidateLine, maxWidth, fontSize)) {
        lines[lines.length - 1] = candidateLine;
        return;
      }

      pushLine(part);
    });
  });

  return lines.slice(0, maxLines);
}

function getBestHyphenatedPosterTitleLayout({
  value,
  maxWidth,
  maxHeight,
  maxLines = POSTER_TITLE_MAX_LINES,
}) {
  const fontSize = POSTER_TITLE_MIN_FONT_SIZE;
  const lines = buildHyphenatedPosterTitleLines({
    fontSize,
    maxLines,
    maxWidth,
    value,
  });

  if (lines.length === 0) {
    return null;
  }

  const maxCalculatedFontSize = getMaxFontSizeForPosterLines({
    lines,
    maxHeight,
    maxWidth,
  });

  const finalFontSize = Math.max(
    POSTER_TITLE_MIN_FONT_SIZE,
    Math.min(maxCalculatedFontSize, POSTER_TITLE_MAX_FONT_SIZE)
  );

  return {
    fontSize: finalFontSize,
    lineHeight: Math.round(finalFontSize * POSTER_TITLE_LINE_HEIGHT_RATIO),
    lines,
  };
}

function getBestPosterTitleLayout({
  value,
  maxWidth,
  maxHeight,
  maxLines = POSTER_TITLE_MAX_LINES,
}) {
  const safeMaxWidth = Math.max(maxWidth || 0, POSTER_TITLE_MIN_FONT_SIZE * 4);
  const safeMaxHeight = Math.max(maxHeight || 0, POSTER_TITLE_MIN_FONT_SIZE);
  const normalLayout = getBestNormalPosterTitleLayout({
    maxHeight: safeMaxHeight,
    maxLines,
    maxWidth: safeMaxWidth,
    value,
  });

  if (normalLayout) {
    return normalLayout;
  }

  const hyphenatedLayout = getBestHyphenatedPosterTitleLayout({
    maxHeight: safeMaxHeight,
    maxLines,
    maxWidth: safeMaxWidth,
    value,
  });

  if (hyphenatedLayout) {
    return hyphenatedLayout;
  }

  const fallbackFontSize = POSTER_TITLE_MIN_FONT_SIZE;

  return {
    fontSize: fallbackFontSize,
    lineHeight: Math.round(fallbackFontSize * POSTER_TITLE_LINE_HEIGHT_RATIO),
    lines: getPosterTitleWords(value).slice(0, maxLines),
  };
}

function formatPosterAddress(value) {
  return String(value ?? "")
    .replace(/\b\d{4}-\d{3},?\s*/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s+,/g, ",")
    .trim();
}

function PreviewAttendeeStack({ attendees }) {
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
          key={friend.id || `${friend.name}-${index}`}
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

const MorphingEventPreview = forwardRef(function MorphingEventPreview(
  {
    event,
    geometry,
    onCloseComplete,
    onOpen,
    progressValue,
    screen = "MapScreen",
    source = "map_preview",
  },
  ref
) {
  const pathname = usePathname();
  const internalProgress = useSharedValue(0);
  const progress = progressValue ?? internalProgress;
  const closeReasonRef = useRef(null);
  const isClosingRef = useRef(false);

  const layout = getSessionEventPinLayout(event);
  const collapsedGreenSurfaceInset = layout.circleOffset - layout.greenBorderWidth;
  const collapsedGreenSurfaceSize = layout.circleSize + layout.greenBorderWidth * 2;
  const attendees = Array.isArray(event.attendingFriends) ? event.attendingFriends : [];
  const finalCardHeight = geometry.cardHeight ?? DEFAULT_CARD_HEIGHT;
  const finalImageSize = geometry.imageSize ?? DEFAULT_IMAGE_SIZE;
  const posterPadding = geometry.posterPadding ?? POSTER_PADDING;
  const posterTopPadding = geometry.posterTopPadding ?? POSTER_TOP_PADDING;
  const posterHeaderHeight = geometry.posterHeaderHeight ?? POSTER_HEADER_HEIGHT;
  const posterImageGap = geometry.posterImageGap ?? POSTER_IMAGE_GAP;
  const posterBottomGap = geometry.posterBottomGap ?? POSTER_BOTTOM_GAP;
  const posterMetaHeight = geometry.posterMetaHeight ?? POSTER_META_HEIGHT;
  const posterBottomPadding = geometry.posterBottomPadding ?? POSTER_BOTTOM_PADDING;

  const imageTop = posterTopPadding + posterHeaderHeight + posterImageGap;
  const naturalFooterTop = imageTop + finalImageSize + posterBottomGap;
  const footerTop = Math.max(
    naturalFooterTop,
    finalCardHeight - posterBottomPadding - posterMetaHeight
  );

  const rawTitle = String(event.title ?? "");
  const title = rawTitle.toUpperCase();
  const posterTitleMaxWidth =
    (geometry.width -
      posterPadding * 2 -
      POSTER_DATE_SLOT_WIDTH -
      POSTER_TITLE_RIGHT_PADDING) *
    POSTER_TITLE_WIDTH_SAFETY_FACTOR;
  const posterTitleMaxHeight = POSTER_TITLE_ROW_HEIGHT;
  const posterTitleLayout = getBestPosterTitleLayout({
    maxHeight: posterTitleMaxHeight,
    maxWidth: posterTitleMaxWidth,
    value: rawTitle,
  });
  const posterTitleLines = posterTitleLayout.lines;
  const pinImageSource = getEventPinImage(event.thumbnailKey);
  const previewImageSource = getEventPreviewImage(event.thumbnailKey);
  const titleTypography = {
    fontSize: posterTitleLayout.fontSize,
    lineHeight: posterTitleLayout.lineHeight,
  };
  const priceLabel = event.price?.toUpperCase?.() ?? "";
  const entranceLabel = [priceLabel, "ENTRADA"].filter(Boolean).join(" | ");
  const addressLabel = formatPosterAddress(event.locationName);
  const organizerName =
    event.organizerName ?? event.establishmentName ?? event.hostName ?? "LisTunes";
  const posterDate = getPosterDateParts(event);

  useEffect(() => {
    isClosingRef.current = false;
    progress.value = 0;
    progress.value = withSpring(1, {
      damping: 18,
      mass: 0.75,
      stiffness: 190,
    });
  }, [event.id, progress]);

  const finishClose = useCallback(() => {
    isClosingRef.current = false;
    onCloseComplete?.(closeReasonRef.current);
  }, [onCloseComplete]);

  const startClose = useCallback(
    (reason = "unknown") => {
      if (isClosingRef.current) return;

      isClosingRef.current = true;
      closeReasonRef.current = reason;
      progress.value = withTiming(
        0,
        {
          duration: 230,
          easing: Easing.out(Easing.cubic),
        },
        (finished) => {
          if (finished) {
            runOnJS(finishClose)();
          }
        }
      );
    },
    [finishClose, progress]
  );

  useImperativeHandle(
    ref,
    () => ({
      close: startClose,
    }),
    [startClose]
  );

  const containerStyle = useAnimatedStyle(() => {
    const value = progress.value;

    return {
      height: interpolate(value, [0, 1], [geometry.cloneHeight, geometry.height]),
      left: interpolate(value, [0, 1], [geometry.cloneLeft, geometry.left]),
      top: interpolate(value, [0, 1], [geometry.cloneTop, geometry.top]),
      width: interpolate(value, [0, 1], [geometry.cloneWidth, geometry.width]),
    };
  }, [geometry]);

  const surfaceStyle = useAnimatedStyle(() => {
    const value = progress.value;

    return {
      backgroundColor: interpolateColor(
        value,
        [0, 1],
        [PIN_SURFACE_COLOR, CARD_SURFACE_COLOR]
      ),
      borderColor: interpolateColor(
        value,
        [0, 1],
        [PIN_SURFACE_COLOR, CARD_BORDER_COLOR]
      ),
      borderRadius: interpolate(
        value,
        [0, 1],
        [collapsedGreenSurfaceSize / 2, CARD_RADIUS]
      ),
      height: interpolate(value, [0, 1], [collapsedGreenSurfaceSize, finalCardHeight]),
      left: interpolate(value, [0, 1], [collapsedGreenSurfaceInset, 0]),
      top: interpolate(value, [0, 1], [collapsedGreenSurfaceInset, 0]),
      width: interpolate(value, [0, 1], [collapsedGreenSurfaceSize, geometry.width]),
    };
  }, [
    collapsedGreenSurfaceInset,
    collapsedGreenSurfaceSize,
    finalCardHeight,
    geometry.width,
  ]);

  const friendRingStyle = useAnimatedStyle(() => {
    const value = progress.value;
    const thumbnailCenterX = interpolate(
      value,
      [0, 1],
      [layout.outerSize / 2, posterPadding + finalImageSize / 2]
    );
    const thumbnailCenterY = interpolate(
      value,
      [0, 1],
      [layout.outerSize / 2, imageTop + finalImageSize / 2]
    );

    return {
      left: thumbnailCenterX - layout.outerSize / 2,
      opacity: interpolate(value, [0, 0.08], [1, 0], Extrapolation.CLAMP),
      top: thumbnailCenterY - layout.outerSize / 2,
    };
  }, [finalImageSize, imageTop, layout.outerSize, posterPadding]);

  const thumbnailClipStyle = useAnimatedStyle(() => {
    const value = progress.value;

    return {
      borderBottomLeftRadius: interpolate(value, [0, 1], [layout.circleSize / 2, 0]),
      borderBottomRightRadius: interpolate(value, [0, 1], [layout.circleSize / 2, 0]),
      borderTopLeftRadius: interpolate(value, [0, 1], [layout.circleSize / 2, 0]),
      borderTopRightRadius: interpolate(value, [0, 1], [layout.circleSize / 2, 0]),
      height: interpolate(value, [0, 1], [layout.circleSize, finalImageSize]),
      left: interpolate(value, [0, 1], [layout.circleOffset, posterPadding]),
      overflow: "hidden",
      top: interpolate(value, [0, 1], [layout.circleOffset, imageTop]),
      width: interpolate(value, [0, 1], [layout.circleSize, finalImageSize]),
    };
  }, [finalImageSize, imageTop, layout.circleOffset, layout.circleSize, posterPadding]);

  const imageBorderStyle = useAnimatedStyle(() => {
    const value = progress.value;

    return {
      borderColor: IMAGE_BORDER_COLOR,
      borderWidth: interpolate(value, [0, 1], [0, IMAGE_BORDER_WIDTH]),
      height: interpolate(value, [0, 1], [layout.circleSize, finalImageSize]),
      left: interpolate(value, [0, 1], [layout.circleOffset, posterPadding]),
      top: interpolate(value, [0, 1], [layout.circleOffset, imageTop]),
      width: interpolate(value, [0, 1], [layout.circleSize, finalImageSize]),
    };
  }, [finalImageSize, imageTop, layout.circleOffset, layout.circleSize, posterPadding]);

  const lowResolutionImageStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.8, 0.86], [1, 1, 0], Extrapolation.CLAMP),
  }));

  const highResolutionImageStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.9, 0.96], [0, 0, 1], Extrapolation.CLAMP),
  }));

  const posterContentStyle = useAnimatedStyle(() => {
    const value = progress.value;
    const collapsedCenter = layout.outerSize / 2;

    return {
      opacity: interpolate(value, [0.42, 0.72, 1], [0, 0.45, 1], Extrapolation.CLAMP),
      transform: [
        {
          translateX: interpolate(
            value,
            [0, 1],
            [collapsedCenter - geometry.width / 2, 0],
            Extrapolation.CLAMP
          ),
        },
        {
          translateY: interpolate(
            value,
            [0, 1],
            [collapsedCenter - finalCardHeight / 2, 0],
            Extrapolation.CLAMP
          ),
        },
        {
          scale: interpolate(value, [0, 0.42, 1], [0.12, 0.12, 1], Extrapolation.CLAMP),
        },
      ],
    };
  }, [finalCardHeight, geometry.width, layout.outerSize]);

  function handleOpenPress() {
    logInteraction(LOG_ACTIONS.eventCardPressed, {
      eventId: event.id,
      route: pathname,
      screen,
      source,
    }).catch(() => null);
    onOpen?.();
  }

  return (
    <Animated.View pointerEvents="box-none" style={[styles.container, containerStyle]}>
      {layout.friendBorderWidth > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.friendRing,
            {
              borderRadius: layout.outerSize / 2,
              borderWidth: layout.friendBorderWidth,
              height: layout.outerSize,
              width: layout.outerSize,
            },
            friendRingStyle,
          ]}
        />
      )}

      <Animated.View
        onStartShouldSetResponder={() => true}
        style={[styles.surface, surfaceStyle]}
      />

      <Animated.View
        pointerEvents="none"
        style={[styles.imageBorder, imageBorderStyle]}
      />

      <Animated.View style={[styles.thumbnailClip, thumbnailClipStyle]}>
        <Animated.Image
          accessibilityLabel={`${title} thumbnail transition`}
          resizeMode="cover"
          source={pinImageSource}
          style={[styles.thumbnail, lowResolutionImageStyle]}
        />
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.finalPreviewImageClip,
          {
            height: finalImageSize,
            left: posterPadding,
            top: imageTop,
            width: finalImageSize,
          },
          highResolutionImageStyle,
        ]}
      >
        <Image
          accessibilityLabel={`${title} preview image`}
          resizeMode="cover"
          source={previewImageSource}
          style={styles.thumbnail}
        />
      </Animated.View>

      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.posterContent,
          {
            height: finalCardHeight,
            width: geometry.width,
          },
          posterContentStyle,
        ]}
      >
        <View
          style={[
            styles.posterHeader,
            {
              height: posterHeaderHeight,
              left: posterPadding,
              right: posterPadding,
              top: posterTopPadding,
            },
          ]}
        >
          <View style={styles.posterTitleDateRow}>
            <View style={styles.posterTitleBlock}>
              {posterTitleLines.map((line, index) => (
                <Text
                  key={`${line}-${index}`}
                  numberOfLines={1}
                  style={[styles.posterTitleLine, titleTypography]}
                >
                  {line}
                </Text>
              ))}
            </View>

            <View style={styles.posterDateSlot}>
              <View style={styles.posterDateTextGroup}>
                <Text style={styles.posterDateMain}>{posterDate.main}</Text>
                <Text style={styles.posterDateSub}>{posterDate.sub}</Text>
              </View>
            </View>
          </View>

          <View style={styles.posterHeaderMetaRow}>
            <PreviewAttendeeStack attendees={attendees} />

            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.72}
              numberOfLines={1}
              style={styles.organizerName}
            >
              {organizerName}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.posterFooter,
            {
              height: posterMetaHeight,
              left: posterPadding,
              right: posterPadding,
              top: footerTop,
            },
          ]}
        >
          <View style={styles.posterMeta}>
            <Text style={styles.posterMetaPrice}>{entranceLabel}</Text>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.78}
              numberOfLines={2}
              style={styles.posterMetaAddress}
            >
              {addressLabel}
            </Text>
          </View>

          <Pressable
            accessibilityLabel={`Open details for ${event.title}`}
            accessibilityRole="button"
            onPress={handleOpenPress}
            style={({ pressed }) => [styles.arrowButton, pressed && styles.pressed]}
          >
            <Ionicons
              name="arrow-forward"
              size={ACTION_ICON_SIZE}
              color={colors.primary}
            />
          </Pressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
});

export default MorphingEventPreview;

const styles = StyleSheet.create({
  container: {
    overflow: "visible",
    position: "absolute",
    zIndex: 3,
  },
  surface: {
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 3,
    position: "absolute",
    shadowColor: colors.effects.shadow,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    zIndex: 1,
  },
  friendRing: {
    borderColor: colors.secondary,
    position: "absolute",
    zIndex: 0,
  },
  thumbnailClip: {
    position: "absolute",
    zIndex: 3,
  },
  finalPreviewImageClip: {
    overflow: "hidden",
    position: "absolute",
    zIndex: 4,
  },
  imageBorder: {
    position: "absolute",
    zIndex: 5,
  },
  thumbnail: {
    height: "100%",
    width: "100%",
  },
  pressed: {
    opacity: 0.72,
  },
  posterContent: {
    left: 0,
    position: "absolute",
    top: 0,
    zIndex: 6,
  },
  posterHeader: {
    position: "absolute",
  },
  posterTitleDateRow: {
    alignItems: "center",
    flexDirection: "row",
    height: POSTER_TITLE_ROW_HEIGHT,
  },
  posterTitleBlock: {
    alignSelf: "stretch",
    flex: 1,
    justifyContent: "center",
    minWidth: 0,
    paddingRight: POSTER_TITLE_RIGHT_PADDING,
  },
  posterTitleLine: {
    color: colors.text,
    fontWeight: "900",
    includeFontPadding: false,
    letterSpacing: 0,
    minWidth: 0,
  },
  posterDateSlot: {
    alignItems: "center",
    height: POSTER_TITLE_ROW_HEIGHT,
    justifyContent: "center",
    overflow: "visible",
    width: POSTER_DATE_SLOT_WIDTH,
  },
  posterDateTextGroup: {
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-90deg" }],
    width: POSTER_TITLE_ROW_HEIGHT,
    height: POSTER_DATE_SLOT_WIDTH,
  },
  posterDateMain: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 25,
  },
  posterDateSub: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 14,
    marginTop: 0,
    marginBottom: -17,
  },
  posterHeaderMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  organizerName: {
    color: colors.text,
    flex: 1,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.5,
    lineHeight: 23,
    marginRight: 6,
    minWidth: 0,
    textAlign: "right",
  },
  posterFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    position: "absolute",
  },
  posterMeta: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  posterMetaPrice: {
    color: colors.text,
    fontFamily: Platform.select({
      android: "monospace",
      default: "monospace",
      ios: "Menlo",
    }),
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 16,
    marginBottom: 2,
  },
  posterMetaAddress: {
    color: colors.text,
    flexShrink: 1,
    fontFamily: Platform.select({
      android: "monospace",
      default: "monospace",
      ios: "Menlo",
    }),
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 16,
  },
  arrowButton: {
    alignItems: "center",
    backgroundColor: colors.text,
    borderRadius: ACTION_BUTTON_SIZE / 2,
    height: ACTION_BUTTON_SIZE,
    justifyContent: "center",
    width: ACTION_BUTTON_SIZE,
  },
  avatarStack: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-start",
    minHeight: CARD_AVATAR_SIZE,
  },
  emptyStack: {
    minHeight: CARD_AVATAR_SIZE,
    width: CARD_AVATAR_SIZE,
  },
  avatar: {
    borderColor: colors.secondary,
    borderRadius: CARD_AVATAR_SIZE / 2,
    borderWidth: CARD_AVATAR_BORDER_WIDTH,
    height: CARD_AVATAR_SIZE,
    width: CARD_AVATAR_SIZE,
  },
  avatarOverlap: {
    marginLeft: -CARD_AVATAR_OVERLAP,
  },
  moreAvatar: {
    alignItems: "center",
    backgroundColor: ACTION_BACKGROUND_COLOR,
    justifyContent: "center",
  },
  moreAvatarText: {
    color: ACTION_TEXT_COLOR,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 19,
  },
});
