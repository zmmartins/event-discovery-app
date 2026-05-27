import AsyncStorage from "@react-native-async-storage/async-storage";

const LOGS_KEY = "interaction_logs";
const CONTEXT_KEY = "interaction_context";
const SCHEMA_VERSION = 2;

export const LOG_ACTIONS = {
  appOpened: "app_opened",
  communityOpened: "community_opened",
  eventBookmarkToggled: "event_bookmark_toggled",
  eventCardPressed: "event_card_pressed",
  eventDetailOpened: "event_detail_opened",
  eventPinSelected: "event_pin_selected",
  eventPreviewDismissed: "event_preview_dismissed",
  filterOpened: "filter_opened",
  listViewOpened: "list_view_opened",
  mapViewOpened: "map_view_opened",
  messagesOpened: "messages_opened",
  notificationsOpened: "notifications_opened",
  participationClicked: "participation_clicked",
  participationConfirmed: "participation_confirmed",
  profileOpened: "profile_opened",
  searchOpened: "search_opened",
  shakeDiscoverOpened: "shake_discover_opened",
  topNavSelected: "top_nav_selected",
};

const sessionStartedAt = Date.now();
const sessionId = `session-${sessionStartedAt}-${Math.random()
  .toString(36)
  .slice(2)}`;
let sequence = 0;
let interactionContext = {};

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function safeJsonParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function pickCommonField(metadata, key) {
  return metadata && Object.prototype.hasOwnProperty.call(metadata, key)
    ? metadata[key]
    : undefined;
}

function escapeCsvCell(value) {
  if (value === undefined || value === null) return "";

  const stringValue =
    typeof value === "string" ? value : JSON.stringify(value);

  return `"${stringValue.replace(/"/g, '""')}"`;
}

function normalizeLog(log, index = 0) {
  const metadata = log?.metadata && typeof log.metadata === "object"
    ? log.metadata
    : {};
  const timestamp = log?.timestamp ?? new Date(sessionStartedAt).toISOString();

  return {
    id: log?.id ?? `legacy-${index}`,
    schemaVersion: log?.schemaVersion ?? 1,
    sessionId: log?.sessionId ?? "legacy-session",
    sequence: log?.sequence ?? index + 1,
    timestamp,
    elapsedMs: log?.elapsedMs ?? null,
    action: log?.action ?? "unknown",
    screen: log?.screen ?? pickCommonField(metadata, "screen") ?? null,
    route: log?.route ?? pickCommonField(metadata, "route") ?? null,
    eventId: log?.eventId ?? pickCommonField(metadata, "eventId") ?? null,
    participantId:
      log?.participantId ?? pickCommonField(metadata, "participantId") ?? null,
    taskId: log?.taskId ?? pickCommonField(metadata, "taskId") ?? null,
    source: log?.source ?? pickCommonField(metadata, "source") ?? null,
    reason: log?.reason ?? pickCommonField(metadata, "reason") ?? null,
    result: log?.result ?? pickCommonField(metadata, "result") ?? null,
    metadata,
  };
}

export async function logInteraction(action, metadata = {}) {
  const currentLogs = await getInteractionLogs();
  const context = await getInteractionContext();
  const nextSequence = sequence + 1;

  const newLog = {
    id: createId(),
    schemaVersion: SCHEMA_VERSION,
    sessionId,
    sequence: nextSequence,
    timestamp: new Date().toISOString(),
    elapsedMs: Date.now() - sessionStartedAt,
    action,
    screen: pickCommonField(metadata, "screen") ?? null,
    route: pickCommonField(metadata, "route") ?? null,
    eventId: pickCommonField(metadata, "eventId") ?? null,
    participantId:
      pickCommonField(metadata, "participantId") ?? context.participantId ?? null,
    taskId: pickCommonField(metadata, "taskId") ?? context.taskId ?? null,
    source: pickCommonField(metadata, "source") ?? null,
    reason: pickCommonField(metadata, "reason") ?? null,
    result: pickCommonField(metadata, "result") ?? null,
    metadata: {
      ...metadata,
      participantId:
        pickCommonField(metadata, "participantId") ?? context.participantId,
      taskId: pickCommonField(metadata, "taskId") ?? context.taskId,
    },
  };

  const updatedLogs = [...currentLogs, newLog];

  await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(updatedLogs));
  sequence = nextSequence;

  return newLog;
}

export async function getInteractionLogs() {
  const rawLogs = await AsyncStorage.getItem(LOGS_KEY);
  const parsedLogs = safeJsonParse(rawLogs, []);

  if (!Array.isArray(parsedLogs)) return [];

  return parsedLogs.map(normalizeLog);
}

export async function clearInteractionLogs() {
  await AsyncStorage.removeItem(LOGS_KEY);
  sequence = 0;
}

export async function setInteractionContext(nextContext = {}) {
  interactionContext = {
    ...(await getInteractionContext()),
    ...nextContext,
  };

  await AsyncStorage.setItem(CONTEXT_KEY, JSON.stringify(interactionContext));

  return getInteractionContext();
}

export async function getInteractionContext() {
  if (interactionContext.participantId || interactionContext.taskId) {
    return interactionContext;
  }

  const storedContext = safeJsonParse(
    await AsyncStorage.getItem(CONTEXT_KEY),
    {},
  );

  interactionContext = {
    participantId: storedContext.participantId ?? null,
    taskId: storedContext.taskId ?? null,
  };

  return interactionContext;
}

export async function getInteractionSummary() {
  const logs = await getInteractionLogs();
  const firstLog = logs[0];
  const lastLog = logs[logs.length - 1];
  const summary = {
    totalLogs: logs.length,
    firstTimestamp: firstLog?.timestamp ?? null,
    lastTimestamp: lastLog?.timestamp ?? null,
    durationMs:
      firstLog && lastLog
        ? new Date(lastLog.timestamp).getTime() -
          new Date(firstLog.timestamp).getTime()
        : 0,
    lastElapsedMs: lastLog?.elapsedMs ?? null,
    sessionIds: [...new Set(logs.map((log) => log.sessionId).filter(Boolean))],
    countsByAction: {},
    countsByScreen: {},
    countsByEventId: {},
  };

  logs.forEach((log) => {
    summary.countsByAction[log.action] =
      (summary.countsByAction[log.action] ?? 0) + 1;

    if (log.screen) {
      summary.countsByScreen[log.screen] =
        (summary.countsByScreen[log.screen] ?? 0) + 1;
    }

    if (log.eventId) {
      summary.countsByEventId[log.eventId] =
        (summary.countsByEventId[log.eventId] ?? 0) + 1;
    }
  });

  return summary;
}

export async function exportInteractionLogsAsJson() {
  const logs = await getInteractionLogs();

  return JSON.stringify(logs, null, 2);
}

export async function exportInteractionLogsAsCsv() {
  const logs = await getInteractionLogs();
  const columns = [
    "id",
    "schemaVersion",
    "sessionId",
    "sequence",
    "timestamp",
    "elapsedMs",
    "action",
    "screen",
    "route",
    "eventId",
    "participantId",
    "taskId",
    "source",
    "reason",
    "result",
    "metadata",
  ];
  const rows = logs.map((log) =>
    columns.map((column) => escapeCsvCell(log[column])).join(","),
  );

  return [columns.join(","), ...rows].join("\n");
}
