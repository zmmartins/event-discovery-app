import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

const LOGS_KEY = "interaction_logs";
const CONTEXT_KEY = "interaction_context";
const SCHEMA_VERSION = 3;
const EXPORT_DIRECTORY = `${FileSystem.documentDirectory ?? ""}interaction-logs/`;

export const LOG_ACTIONS = {
  appOpened: "app_opened",
  bottomNavRouteChanged: "bottom_nav_route_changed",
  communityOpened: "community_opened",
  discoverModeActivated: "discover_mode_activated",
  discoverModeDisabled: "discover_mode_disabled",
  discoverResultsShown: "discover_results_shown",
  eventBookmarkToggled: "event_bookmark_toggled",
  eventCardPressed: "event_card_pressed",
  eventDetailBackPressed: "event_detail_back_pressed",
  eventDetailOpened: "event_detail_opened",
  eventDetailSheetChanged: "event_detail_sheet_changed",
  eventPinSelected: "event_pin_selected",
  eventPinActionMenuDismissed: "event_pin_action_menu_dismissed",
  eventPinActionMenuOpened: "event_pin_action_menu_opened",
  eventPinActionMenuSelected: "event_pin_action_menu_selected",
  eventPreviewDismissed: "event_preview_dismissed",
  eventShared: "event_shared",
  filterOpened: "filter_opened",
  interactionContextUpdated: "interaction_context_updated",
  listViewOpened: "list_view_opened",
  locationPermissionDenied: "location_permission_denied",
  locationPermissionGranted: "location_permission_granted",
  locationPermissionRequested: "location_permission_requested",
  logExportFailed: "log_export_failed",
  logExportShared: "log_export_shared",
  logExportStarted: "log_export_started",
  logExportWritten: "log_export_written",
  logsCleared: "logs_cleared",
  logsOpened: "logs_opened",
  mapViewOpened: "map_view_opened",
  messagesOpened: "messages_opened",
  notificationsOpened: "notifications_opened",
  participationClicked: "participation_clicked",
  participationConfirmed: "participation_confirmed",
  profileExperienceOpened: "profile_experience_opened",
  profileExperiencePinSelected: "profile_experience_pin_selected",
  profileOpened: "profile_opened",
  profileViewChanged: "profile_view_changed",
  routeChanged: "route_changed",
  searchOpened: "search_opened",
  shakeDiscoverOpened: "shake_discover_opened",
  shakeDetected: "shake_detected",
  taskFinished: "task_finished",
  taskStarted: "task_started",
  topNavSelected: "top_nav_selected",
  userLocationDetected: "user_location_detected",
  userLocationRecentered: "user_location_recentered",
  userLocationUnavailable: "user_location_unavailable",
};

const ACTION_CATEGORIES = {
  appOpened: "session",
  bottomNavRouteChanged: "navigation",
  communityOpened: "screen_view",
  discoverModeActivated: "discover",
  discoverModeDisabled: "discover",
  discoverResultsShown: "discover",
  eventBookmarkToggled: "event_state",
  eventCardPressed: "event_navigation",
  eventDetailBackPressed: "navigation",
  eventDetailOpened: "screen_view",
  eventDetailSheetChanged: "detail_interaction",
  eventPinSelected: "event_discovery",
  eventPinActionMenuDismissed: "event_discovery",
  eventPinActionMenuOpened: "event_discovery",
  eventPinActionMenuSelected: "event_discovery",
  eventPreviewDismissed: "event_discovery",
  eventShared: "event_state",
  filterOpened: "navigation",
  interactionContextUpdated: "context",
  listViewOpened: "screen_view",
  locationPermissionDenied: "location",
  locationPermissionGranted: "location",
  locationPermissionRequested: "location",
  logExportFailed: "debug_export",
  logExportShared: "debug_export",
  logExportStarted: "debug_export",
  logExportWritten: "debug_export",
  logsCleared: "debug_export",
  logsOpened: "screen_view",
  mapViewOpened: "screen_view",
  messagesOpened: "screen_view",
  notificationsOpened: "screen_view",
  participationClicked: "event_state",
  participationConfirmed: "event_state",
  profileExperienceOpened: "profile",
  profileExperiencePinSelected: "profile",
  profileOpened: "screen_view",
  profileViewChanged: "profile",
  routeChanged: "navigation",
  searchOpened: "screen_view",
  shakeDiscoverOpened: "screen_view",
  shakeDetected: "sensor",
  taskFinished: "task",
  taskStarted: "task",
  topNavSelected: "navigation",
  userLocationDetected: "location",
  userLocationRecentered: "location",
  userLocationUnavailable: "location",
};

const ACTION_CATEGORY_BY_VALUE = Object.fromEntries(
  Object.entries(LOG_ACTIONS).map(([key, value]) => [
    value,
    ACTION_CATEGORIES[key] ?? "interaction",
  ]),
);

const sessionStartedAtMs = Date.now();
const sessionStartedAt = new Date(sessionStartedAtMs).toISOString();
const sessionId = `session-${sessionStartedAtMs}-${Math.random()
  .toString(36)
  .slice(2)}`;
const appMetadata = {
  appName: Constants.expoConfig?.name ?? "event-discovery-app",
  appVersion: Constants.expoConfig?.version ?? null,
  buildVersion:
    Platform.OS === "ios"
      ? Constants.expoConfig?.ios?.buildNumber ?? null
      : Constants.expoConfig?.android?.versionCode ?? null,
  expoSdkVersion: Constants.expoConfig?.sdkVersion ?? null,
  platform: Platform.OS,
};
let sequence = 0;
let interactionContext = {};
let writeQueue = Promise.resolve();

const CSV_COLUMNS = [
  "id",
  "schemaVersion",
  "sessionId",
  "sessionStartedAt",
  "sequence",
  "timestamp",
  "elapsedMs",
  "action",
  "actionCategory",
  "screen",
  "route",
  "fromRoute",
  "targetRoute",
  "eventId",
  "experienceId",
  "participantId",
  "taskId",
  "source",
  "reason",
  "result",
  "latitude",
  "longitude",
  "accuracy",
  "platform",
  "appVersion",
  "metadata",
];

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

function asNullableString(value) {
  if (value === undefined || value === null || value === "") return null;

  return String(value);
}

function asNullableNumber(value) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function sanitizeMetadata(value, depth = 0) {
  if (depth > 5) return "[MaxDepth]";
  if (value === undefined || typeof value === "function") return undefined;
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeMetadata(item, depth + 1))
      .filter((item) => item !== undefined);
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([key, item]) => [key, sanitizeMetadata(item, depth + 1)])
      .filter(([, item]) => item !== undefined),
  );
}

function escapeCsvCell(value) {
  if (value === undefined || value === null) return "";

  const stringValue =
    typeof value === "string" ? value : JSON.stringify(value);

  return `"${stringValue.replace(/"/g, '""')}"`;
}

function createExportTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function getSessionMetadata() {
  return {
    ...appMetadata,
    sessionId,
    sessionStartedAt,
    sessionStartedAtMs,
  };
}

function normalizeLog(log, index = 0) {
  const metadata = sanitizeMetadata(
    log?.metadata && typeof log.metadata === "object" ? log.metadata : {},
  );
  const timestamp = log?.timestamp ?? new Date(sessionStartedAtMs).toISOString();
  const action = log?.action ?? "unknown";

  return {
    id: log?.id ?? `legacy-${index}`,
    schemaVersion: log?.schemaVersion ?? 1,
    sessionId: log?.sessionId ?? "legacy-session",
    sessionStartedAt:
      log?.sessionStartedAt ?? log?.session?.startedAt ?? sessionStartedAt,
    sequence: log?.sequence ?? index + 1,
    timestamp,
    elapsedMs: log?.elapsedMs ?? null,
    action,
    actionCategory:
      log?.actionCategory ??
      pickCommonField(metadata, "actionCategory") ??
      ACTION_CATEGORY_BY_VALUE[action] ??
      "interaction",
    screen: log?.screen ?? pickCommonField(metadata, "screen") ?? null,
    route: log?.route ?? pickCommonField(metadata, "route") ?? null,
    fromRoute:
      log?.fromRoute ??
      pickCommonField(metadata, "fromRoute") ??
      pickCommonField(metadata, "previousRoute") ??
      null,
    targetRoute:
      log?.targetRoute ??
      pickCommonField(metadata, "targetRoute") ??
      pickCommonField(metadata, "nextRoute") ??
      null,
    eventId: log?.eventId ?? pickCommonField(metadata, "eventId") ?? null,
    experienceId:
      log?.experienceId ?? pickCommonField(metadata, "experienceId") ?? null,
    participantId:
      log?.participantId ?? pickCommonField(metadata, "participantId") ?? null,
    taskId: log?.taskId ?? pickCommonField(metadata, "taskId") ?? null,
    source: log?.source ?? pickCommonField(metadata, "source") ?? null,
    reason: log?.reason ?? pickCommonField(metadata, "reason") ?? null,
    result: log?.result ?? pickCommonField(metadata, "result") ?? null,
    latitude: asNullableNumber(
      log?.latitude ?? pickCommonField(metadata, "latitude"),
    ),
    longitude: asNullableNumber(
      log?.longitude ?? pickCommonField(metadata, "longitude"),
    ),
    accuracy: asNullableNumber(
      log?.accuracy ?? pickCommonField(metadata, "accuracy"),
    ),
    platform: log?.platform ?? pickCommonField(metadata, "platform") ?? null,
    appVersion:
      log?.appVersion ?? pickCommonField(metadata, "appVersion") ?? null,
    metadata,
  };
}

async function readStoredLogs() {
  const rawLogs = await AsyncStorage.getItem(LOGS_KEY);
  const parsedLogs = safeJsonParse(rawLogs, []);

  if (!Array.isArray(parsedLogs)) return [];

  return parsedLogs.map(normalizeLog);
}

async function readStoredContext() {
  const storedContext = safeJsonParse(
    await AsyncStorage.getItem(CONTEXT_KEY),
    {},
  );

  return {
    activeTaskStartedAt: storedContext.activeTaskStartedAt ?? null,
    participantId: storedContext.participantId ?? null,
    taskId: storedContext.taskId ?? null,
  };
}

async function writeStoredLogs(logs) {
  await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

async function ensureContextLoaded() {
  if (
    Object.prototype.hasOwnProperty.call(interactionContext, "participantId") ||
    Object.prototype.hasOwnProperty.call(interactionContext, "taskId")
  ) {
    return interactionContext;
  }

  interactionContext = await readStoredContext();

  return interactionContext;
}

function buildLog(action, metadata, context) {
  const sanitizedMetadata = sanitizeMetadata(metadata);
  const nextSequence = sequence + 1;
  const participantId =
    pickCommonField(sanitizedMetadata, "participantId") ??
    context.participantId ??
    null;
  const taskId =
    pickCommonField(sanitizedMetadata, "taskId") ?? context.taskId ?? null;

  return {
    id: createId(),
    schemaVersion: SCHEMA_VERSION,
    sessionId,
    sessionStartedAt,
    sequence: nextSequence,
    timestamp: new Date().toISOString(),
    elapsedMs: Date.now() - sessionStartedAtMs,
    action,
    actionCategory:
      pickCommonField(sanitizedMetadata, "actionCategory") ??
      ACTION_CATEGORY_BY_VALUE[action] ??
      "interaction",
    screen: pickCommonField(sanitizedMetadata, "screen") ?? null,
    route: pickCommonField(sanitizedMetadata, "route") ?? null,
    fromRoute:
      pickCommonField(sanitizedMetadata, "fromRoute") ??
      pickCommonField(sanitizedMetadata, "previousRoute") ??
      null,
    targetRoute: pickCommonField(sanitizedMetadata, "targetRoute") ?? null,
    eventId: asNullableString(pickCommonField(sanitizedMetadata, "eventId")),
    experienceId: asNullableString(
      pickCommonField(sanitizedMetadata, "experienceId"),
    ),
    participantId,
    taskId,
    source: pickCommonField(sanitizedMetadata, "source") ?? null,
    reason: pickCommonField(sanitizedMetadata, "reason") ?? null,
    result: pickCommonField(sanitizedMetadata, "result") ?? null,
    latitude: asNullableNumber(pickCommonField(sanitizedMetadata, "latitude")),
    longitude: asNullableNumber(pickCommonField(sanitizedMetadata, "longitude")),
    accuracy: asNullableNumber(pickCommonField(sanitizedMetadata, "accuracy")),
    platform: appMetadata.platform,
    appVersion: appMetadata.appVersion,
    metadata: {
      ...sanitizedMetadata,
      participantId,
      taskId,
    },
  };
}

async function appendLog(action, metadata = {}) {
  const context = await ensureContextLoaded();
  const currentLogs = await readStoredLogs();
  const newLog = buildLog(action, metadata, context);

  await writeStoredLogs([...currentLogs, newLog]);
  sequence = newLog.sequence;

  return newLog;
}

function enqueueLog(action, metadata = {}) {
  const operation = writeQueue.then(() => appendLog(action, metadata));

  writeQueue = operation.catch(() => null);

  return operation;
}

function createCountMap(logs, key) {
  return logs.reduce((counts, log) => {
    const value = log[key];
    if (!value) return counts;

    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function getLastLogByAction(logs, action) {
  return [...logs].reverse().find((log) => log.action === action) ?? null;
}

function getFunnelCounts(logs) {
  return {
    appOpened: logs.filter((log) => log.action === LOG_ACTIONS.appOpened)
      .length,
    eventCardsPressed: logs.filter(
      (log) => log.action === LOG_ACTIONS.eventCardPressed,
    ).length,
    eventDetailsOpened: logs.filter(
      (log) => log.action === LOG_ACTIONS.eventDetailOpened,
    ).length,
    eventPinsSelected: logs.filter(
      (log) => log.action === LOG_ACTIONS.eventPinSelected,
    ).length,
    participationClicks: logs.filter(
      (log) => log.action === LOG_ACTIONS.participationClicked,
    ).length,
    participationConfirmations: logs.filter(
      (log) => log.action === LOG_ACTIONS.participationConfirmed,
    ).length,
    saves: logs.filter(
      (log) =>
        log.action === LOG_ACTIONS.eventBookmarkToggled &&
        log.metadata?.isSaved === true,
    ).length,
    unsaves: logs.filter(
      (log) =>
        log.action === LOG_ACTIONS.eventBookmarkToggled &&
        log.metadata?.isSaved === false,
    ).length,
  };
}

function buildSummary(logs) {
  const firstLog = logs[0];
  const lastLog = logs[logs.length - 1];

  return {
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
    countsByAction: createCountMap(logs, "action"),
    countsByActionCategory: createCountMap(logs, "actionCategory"),
    countsByScreen: createCountMap(logs, "screen"),
    countsByRoute: createCountMap(logs, "route"),
    countsByEventId: createCountMap(logs, "eventId"),
    funnelCounts: getFunnelCounts(logs),
  };
}

function buildSessions(logs) {
  const sessionMap = new Map();

  logs.forEach((log) => {
    const existing = sessionMap.get(log.sessionId) ?? {
      firstTimestamp: log.timestamp,
      lastTimestamp: log.timestamp,
      logCount: 0,
      sessionId: log.sessionId,
      sessionStartedAt: log.sessionStartedAt,
    };

    existing.logCount += 1;
    existing.lastTimestamp = log.timestamp;
    sessionMap.set(log.sessionId, existing);
  });

  return [...sessionMap.values()].map((session) => ({
    ...session,
    durationMs:
      new Date(session.lastTimestamp).getTime() -
      new Date(session.firstTimestamp).getTime(),
  }));
}

async function getExportFilename(format) {
  const context = await getInteractionContext();
  const participant = context.participantId ?? "participant";
  const task = context.taskId ?? "all-tasks";

  return `interaction-logs_${participant}_${task}_${sessionId}_${createExportTimestamp()}.${format}`;
}

function getMimeType(format) {
  if (format === "csv") return "text/csv";

  return "application/json";
}

function getSharingOptions(format) {
  return {
    dialogTitle: `Export interaction logs (${format.toUpperCase()})`,
    mimeType: getMimeType(format),
    UTI: format === "csv" ? "public.comma-separated-values-text" : "public.json",
  };
}

export function logInteraction(action, metadata = {}) {
  return enqueueLog(action, metadata);
}

export async function getInteractionLogs() {
  await writeQueue;

  return readStoredLogs();
}

export async function clearInteractionLogs({ logClear = true } = {}) {
  const operation = writeQueue.then(async () => {
    await AsyncStorage.removeItem(LOGS_KEY);
    sequence = 0;

    if (logClear) {
      const context = await ensureContextLoaded();
      const clearLog = buildLog(LOG_ACTIONS.logsCleared, {
        result: "cleared",
        screen: "InteractionLogService",
        source: "interaction_log_service",
      }, context);

      await writeStoredLogs([clearLog]);
      sequence = clearLog.sequence;
    }
  });

  writeQueue = operation.catch(() => null);

  return operation;
}

export async function setInteractionContext(nextContext = {}) {
  interactionContext = {
    ...(await getInteractionContext()),
    ...sanitizeMetadata(nextContext),
  };

  await AsyncStorage.setItem(CONTEXT_KEY, JSON.stringify(interactionContext));
  await logInteraction(LOG_ACTIONS.interactionContextUpdated, {
    result: "context_updated",
    screen: "InteractionLogService",
    source: "set_interaction_context",
  }).catch(() => null);

  return getInteractionContext();
}

export async function getInteractionContext() {
  return ensureContextLoaded();
}

export async function startInteractionTask(taskId) {
  const nextContext = await setInteractionContext({
    activeTaskStartedAt: new Date().toISOString(),
    taskId,
  });

  await logInteraction(LOG_ACTIONS.taskStarted, {
    result: "started",
    screen: "InteractionLogService",
    source: "interaction_log_service",
    taskId,
  }).catch(() => null);

  return nextContext;
}

export async function finishInteractionTask(result = "finished") {
  const context = await getInteractionContext();
  const taskId = context.taskId;

  await logInteraction(LOG_ACTIONS.taskFinished, {
    result,
    screen: "InteractionLogService",
    source: "interaction_log_service",
    taskId,
  }).catch(() => null);

  interactionContext = {
    ...context,
    activeTaskStartedAt: null,
    taskId: null,
  };

  await AsyncStorage.setItem(CONTEXT_KEY, JSON.stringify(interactionContext));

  return getInteractionContext();
}

export async function getInteractionSummary() {
  const logs = await getInteractionLogs();

  return buildSummary(logs);
}

export async function getInteractionAnalytics() {
  const logs = await getInteractionLogs();
  const summary = buildSummary(logs);

  return {
    currentSession: getSessionMetadata(),
    lastActions: logs.slice(-12).reverse(),
    lastExport: getLastLogByAction(logs, LOG_ACTIONS.logExportShared),
    lastParticipation: getLastLogByAction(
      logs,
      LOG_ACTIONS.participationConfirmed,
    ),
    lastSave: getLastLogByAction(logs, LOG_ACTIONS.eventBookmarkToggled),
    sessions: buildSessions(logs),
    summary,
  };
}

export async function exportInteractionLogsAsBundle() {
  const logs = await getInteractionLogs();
  const context = await getInteractionContext();
  const summary = buildSummary(logs);

  return {
    context,
    exportedAt: new Date().toISOString(),
    logs,
    schema: {
      csvColumns: CSV_COLUMNS,
      version: SCHEMA_VERSION,
    },
    session: getSessionMetadata(),
    sessions: buildSessions(logs),
    summary,
  };
}

export async function exportInteractionLogsAsJson() {
  const bundle = await exportInteractionLogsAsBundle();

  return JSON.stringify(bundle, null, 2);
}

export async function exportInteractionLogsAsCsv() {
  const logs = await getInteractionLogs();
  const rows = logs.map((log) =>
    CSV_COLUMNS.map((column) => escapeCsvCell(log[column])).join(","),
  );

  return [CSV_COLUMNS.join(","), ...rows].join("\n");
}

export async function writeInteractionExportFile(format = "bundle") {
  await logInteraction(LOG_ACTIONS.logExportStarted, {
    format,
    result: "started",
    screen: "InteractionLogService",
    source: "interaction_log_service",
  }).catch(() => null);

  const normalizedFormat = format === "bundle" ? "json" : format;
  const filename = await getExportFilename(normalizedFormat);
  const fileUri = `${EXPORT_DIRECTORY}${filename}`;
  const content =
    format === "csv"
      ? await exportInteractionLogsAsCsv()
      : JSON.stringify(await exportInteractionLogsAsBundle(), null, 2);

  if (!FileSystem.documentDirectory) {
    throw new Error("File exports are not available on this platform.");
  }

  try {
    await FileSystem.makeDirectoryAsync(EXPORT_DIRECTORY, {
      intermediates: true,
    });
    await FileSystem.writeAsStringAsync(fileUri, content);
    await logInteraction(LOG_ACTIONS.logExportWritten, {
      fileUri,
      format,
      result: "written",
      screen: "InteractionLogService",
      source: "interaction_log_service",
    }).catch(() => null);

    return {
      fileUri,
      filename,
      format,
      mimeType: getMimeType(normalizedFormat),
    };
  } catch (error) {
    await logInteraction(LOG_ACTIONS.logExportFailed, {
      format,
      reason: error?.message ?? "write_failed",
      result: "failed",
      screen: "InteractionLogService",
      source: "interaction_log_service",
    }).catch(() => null);
    throw error;
  }
}

export async function shareInteractionExport(format = "bundle") {
  try {
    const exportFile = await writeInteractionExportFile(format);
    const sharingAvailable = await Sharing.isAvailableAsync();

    if (!sharingAvailable) {
      throw new Error("Native sharing is not available on this platform.");
    }

    await Sharing.shareAsync(
      exportFile.fileUri,
      getSharingOptions(exportFile.mimeType === "text/csv" ? "csv" : "json"),
    );
    await logInteraction(LOG_ACTIONS.logExportShared, {
      fileUri: exportFile.fileUri,
      format,
      result: "shared",
      screen: "InteractionLogService",
      source: "interaction_log_service",
    }).catch(() => null);

    return exportFile;
  } catch (error) {
    await logInteraction(LOG_ACTIONS.logExportFailed, {
      format,
      reason: error?.message ?? "share_failed",
      result: "failed",
      screen: "InteractionLogService",
      source: "interaction_log_service",
    }).catch(() => null);
    throw error;
  }
}
