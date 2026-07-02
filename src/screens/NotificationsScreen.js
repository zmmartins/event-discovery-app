import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import useInteractionLogger from "../hooks/useInteractionLogger";
import {
  LOG_ACTIONS,
  beginUsabilityTestSession,
  clearInteractionLogs,
  finishInteractionTask,
  getInteractionAnalytics,
  getInteractionContext,
  setInteractionContext,
  shareInteractionExport,
  startInteractionTask,
} from "../services/interactionLogService";
import { colors } from "../theme/colors";

const DEFAULT_SESSION_INPUTS = {
  participantId: "P01",
  sessionLabel: "pilot-1",
  testPlanId: "ami-lab3",
};

const TASK_PRESETS = [
  "task-map-find-event",
  "task-list-save-event",
  "task-join-event",
  "task-profile-memory",
  "task-shake-discover",
];

function formatDuration(ms) {
  const safeMs = Number(ms);

  if (!Number.isFinite(safeMs) || safeMs <= 0) return "0s";

  const totalSeconds = Math.round(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function getCountEntries(counts = {}, limit = 6) {
  return Object.entries(counts)
    .sort((first, second) => second[1] - first[1])
    .slice(0, limit);
}

function normalizeSessionInputs(values) {
  return {
    participantId:
      values?.participantId?.trim() || DEFAULT_SESSION_INPUTS.participantId,
    sessionLabel:
      values?.sessionLabel?.trim() || DEFAULT_SESSION_INPUTS.sessionLabel,
    testPlanId: values?.testPlanId?.trim() || DEFAULT_SESSION_INPUTS.testPlanId,
  };
}

function sessionInputsMatch(first, second) {
  return (
    first?.participantId === second?.participantId &&
    first?.sessionLabel === second?.sessionLabel &&
    first?.testPlanId === second?.testPlanId
  );
}

function Metric({ label, value }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function ActionButton({
  disabled = false,
  icon,
  label,
  onPress,
  tone = "default",
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        tone === "primary" && styles.actionButtonPrimary,
        tone === "danger" && styles.actionButtonDanger,
        disabled && styles.actionButtonDisabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {!!icon && (
        <Ionicons
          name={icon}
          size={16}
          color={tone === "primary" ? colors.iconActive : colors.text}
        />
      )}
      <Text
        style={[
          styles.actionButtonText,
          tone === "primary" && styles.actionButtonTextPrimary,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function CountList({ emptyLabel = "No data yet", items }) {
  if (!items.length) {
    return <Text style={styles.emptyText}>{emptyLabel}</Text>;
  }

  return (
    <View style={styles.countList}>
      {items.map(([label, value]) => (
        <View key={label} style={styles.countRow}>
          <Text numberOfLines={1} style={styles.countLabel}>
            {label}
          </Text>
          <Text style={styles.countValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState(null);
  const [context, setContext] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [participantId, setParticipantId] = useState(
    DEFAULT_SESSION_INPUTS.participantId,
  );
  const [sessionLabel, setSessionLabel] = useState(
    DEFAULT_SESSION_INPUTS.sessionLabel,
  );
  const [taskId, setTaskId] = useState(TASK_PRESETS[0]);
  const [testPlanId, setTestPlanId] = useState(
    DEFAULT_SESSION_INPUTS.testPlanId,
  );
  const hasHydratedFormRef = useRef(false);
  const latestSessionInputsRef = useRef(DEFAULT_SESSION_INPUTS);
  const lastPersistedSessionInputsRef = useRef(DEFAULT_SESSION_INPUTS);

  useInteractionLogger(LOG_ACTIONS.notificationsOpened, {
    screen: "NotificationsScreen",
  });

  const hydrateSessionInputs = useCallback((nextContext = {}) => {
    const nextInputs = normalizeSessionInputs({
      participantId: nextContext.participantId,
      sessionLabel: nextContext.sessionLabel,
      testPlanId: nextContext.testPlanId,
    });

    latestSessionInputsRef.current = nextInputs;
    lastPersistedSessionInputsRef.current = nextInputs;
    hasHydratedFormRef.current = true;
    setParticipantId(nextInputs.participantId);
    setSessionLabel(nextInputs.sessionLabel);
    setTestPlanId(nextInputs.testPlanId);
  }, []);

  const persistSessionInputs = useCallback(async () => {
    if (!hasHydratedFormRef.current) return null;

    const nextInputs = normalizeSessionInputs(latestSessionInputsRef.current);

    if (
      sessionInputsMatch(nextInputs, lastPersistedSessionInputsRef.current)
    ) {
      return null;
    }

    const nextContext = await setInteractionContext(nextInputs);
    lastPersistedSessionInputsRef.current = nextInputs;
    setContext(nextContext);

    return nextContext;
  }, []);

  const refreshAnalytics = useCallback(async () => {
    const [nextAnalytics, nextContext] = await Promise.all([
      getInteractionAnalytics(),
      getInteractionContext(),
    ]);

    setAnalytics(nextAnalytics);
    setContext(nextContext);
    hydrateSessionInputs(nextContext);
  }, [hydrateSessionInputs]);

  const runAction = useCallback(
    async (action) => {
      setErrorMessage("");
      setIsBusy(true);

      try {
        await action();
        await refreshAnalytics();
      } catch (error) {
        setErrorMessage(error?.message ?? "Action failed");
      } finally {
        setIsBusy(false);
      }
    },
    [refreshAnalytics]
  );

  useFocusEffect(
    useCallback(() => {
      refreshAnalytics().catch((error) => {
        setErrorMessage(error?.message ?? "Could not load logs");
      });

      return () => {
        persistSessionInputs().catch(() => null);
      };
    }, [persistSessionInputs, refreshAnalytics]),
  );

  useEffect(() => {
    if (!hasHydratedFormRef.current) return undefined;

    const timeoutId = setTimeout(() => {
      persistSessionInputs().catch(() => null);
    }, 600);

    return () => clearTimeout(timeoutId);
  }, [participantId, persistSessionInputs, sessionLabel, testPlanId]);

  const summary = analytics?.summary;
  const activeTaskId = context?.taskId;
  const taskSummaries = summary?.taskSummaries ?? [];
  const lastTask = taskSummaries[taskSummaries.length - 1];
  const handleParticipantIdChange = useCallback((value) => {
    latestSessionInputsRef.current = {
      ...latestSessionInputsRef.current,
      participantId: value,
    };
    setParticipantId(value);
  }, []);
  const handleSessionLabelChange = useCallback((value) => {
    latestSessionInputsRef.current = {
      ...latestSessionInputsRef.current,
      sessionLabel: value,
    };
    setSessionLabel(value);
  }, []);
  const handleTestPlanIdChange = useCallback((value) => {
    latestSessionInputsRef.current = {
      ...latestSessionInputsRef.current,
      testPlanId: value,
    };
    setTestPlanId(value);
  }, []);
  const handleBackPress = useCallback(async () => {
    await persistSessionInputs().catch(() => null);

    if (router.canGoBack?.()) {
      router.back();
      return;
    }

    router.replace("/map");
  }, [persistSessionInputs, router]);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      style={styles.container}
    >
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Pressable
            accessibilityLabel="Go back to the app"
            accessibilityRole="button"
            hitSlop={8}
            onPress={handleBackPress}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>

          <View style={styles.headerTitleText}>
            <Text style={styles.eyebrow}>Usability testing</Text>
            <Text style={styles.title}>Interaction Logs</Text>
          </View>
        </View>
        {isBusy && <ActivityIndicator color={colors.primary} />}
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Session</Text>
        <View style={styles.inputRow}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Participant</Text>
            <TextInput
              autoCapitalize="characters"
              onChangeText={handleParticipantIdChange}
              placeholder="P01"
              placeholderTextColor={colors.secondaryText}
              style={styles.input}
              value={participantId}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Plan</Text>
            <TextInput
              autoCapitalize="none"
              onChangeText={handleTestPlanIdChange}
              placeholder="ami-lab3"
              placeholderTextColor={colors.secondaryText}
              style={styles.input}
              value={testPlanId}
            />
          </View>
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Session label</Text>
          <TextInput
            autoCapitalize="none"
            onChangeText={handleSessionLabelChange}
            placeholder="pilot-1"
            placeholderTextColor={colors.secondaryText}
            style={styles.input}
            value={sessionLabel}
          />
        </View>

        <View style={styles.buttonGrid}>
          <ActionButton
            disabled={isBusy}
            icon="play"
            label="Start clean session"
            onPress={() =>
              runAction(() =>
                beginUsabilityTestSession({
                  participantId: participantId.trim() || "participant",
                  resetLogs: true,
                  sessionLabel: sessionLabel.trim() || "session",
                  testPlanId: testPlanId.trim() || "test-plan",
                })
              )
            }
            tone="primary"
          />
          <ActionButton
            disabled={isBusy}
            icon="refresh"
            label="Refresh"
            onPress={() => runAction(refreshAnalytics)}
          />
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Task</Text>
        <Text style={styles.helperText}>
          Start a task, hand the phone to the participant, then come back here to
          finish it before starting the next one.
        </Text>
        <Text style={styles.inputLabel}>Task id</Text>
        <TextInput
          autoCapitalize="none"
          onChangeText={setTaskId}
          placeholder="task-find-event"
          placeholderTextColor={colors.secondaryText}
          style={styles.input}
          value={taskId}
        />

        <View style={styles.presetWrap}>
          {TASK_PRESETS.map((preset) => (
            <Pressable
              accessibilityRole="button"
              key={preset}
              onPress={() => setTaskId(preset)}
              style={({ pressed }) => [
                styles.presetButton,
                taskId === preset && styles.presetButtonActive,
                pressed && styles.pressed,
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.presetButtonText,
                  taskId === preset && styles.presetButtonTextActive,
                ]}
              >
                {preset.replace("task-", "")}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.buttonGrid}>
          <ActionButton
            disabled={isBusy || Boolean(activeTaskId)}
            icon="timer"
            label={activeTaskId ? `Running ${activeTaskId}` : "Start task"}
            onPress={() =>
              runAction(() =>
                startInteractionTask(taskId.trim() || "untitled-task", {
                  participantId: participantId.trim() || "participant",
                  sessionLabel: sessionLabel.trim() || "session",
                  testPlanId: testPlanId.trim() || "test-plan",
                })
              )
            }
            tone="primary"
          />
          <ActionButton
            disabled={isBusy || !activeTaskId}
            icon="checkmark-circle"
            label="Finish completed"
            onPress={() => runAction(() => finishInteractionTask("completed"))}
          />
          <ActionButton
            disabled={isBusy || !activeTaskId}
            icon="close-circle"
            label="Finish failed"
            onPress={() => runAction(() => finishInteractionTask("failed"))}
          />
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Export</Text>
        <View style={styles.buttonGrid}>
          <ActionButton
            disabled={isBusy}
            icon="share"
            label="Share JSON bundle"
            onPress={() => runAction(() => shareInteractionExport("bundle"))}
            tone="primary"
          />
          <ActionButton
            disabled={isBusy}
            icon="document-text"
            label="Share CSV"
            onPress={() => runAction(() => shareInteractionExport("csv"))}
          />
          <ActionButton
            disabled={isBusy}
            icon="trash"
            label="Clear logs"
            onPress={() => runAction(() => clearInteractionLogs({ logClear: false }))}
            tone="danger"
          />
        </View>
      </View>

      {!!errorMessage && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      <View style={styles.metricsGrid}>
        <Metric label="logs" value={summary?.totalLogs ?? 0} />
        <Metric label="clicks" value={summary?.clickCount ?? 0} />
        <Metric label="routes" value={Object.keys(summary?.countsByRoute ?? {}).length} />
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Current context</Text>
        <Text style={styles.contextText}>
          Participant: {context?.participantId ?? "none"}
        </Text>
        <Text style={styles.contextText}>Active task: {activeTaskId ?? "none"}</Text>
        <Text style={styles.contextText}>
          Session: {context?.sessionLabel ?? "none"}
        </Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Top clicked targets</Text>
        <CountList items={getCountEntries(summary?.countsByClickTarget)} />
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Tabs and routes</Text>
        <CountList
          emptyLabel="No tab changes yet"
          items={getCountEntries(summary?.countsByTab)}
        />
        <View style={styles.divider} />
        <CountList
          emptyLabel="No routes yet"
          items={getCountEntries(summary?.countsByRoute)}
        />
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Latest task summary</Text>
        {lastTask ? (
          <>
            <Text style={styles.contextText}>Task: {lastTask.taskId}</Text>
            <Text style={styles.contextText}>
              Duration: {formatDuration(lastTask.durationMs)}
            </Text>
            <Text style={styles.contextText}>Clicks: {lastTask.clickCount}</Text>
            <Text style={styles.contextText}>
              Interactions: {lastTask.interactionCount}
            </Text>
          </>
        ) : (
          <Text style={styles.emptyText}>No finished tasks yet</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    borderColor: "rgba(14, 30, 22, 0.12)",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 12,
  },
  actionButtonDanger: {
    backgroundColor: "rgba(255, 235, 235, 0.9)",
  },
  actionButtonDisabled: {
    opacity: 0.42,
  },
  actionButtonPrimary: {
    backgroundColor: colors.primary,
    borderColor: "rgba(14, 30, 22, 0.08)",
  },
  actionButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
  },
  actionButtonTextPrimary: {
    color: colors.iconActive,
  },
  backButton: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    borderColor: "rgba(14, 30, 22, 0.12)",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  buttonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    padding: 18,
    paddingBottom: 42,
  },
  contextText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },
  countLabel: {
    color: colors.text,
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0,
  },
  countList: {
    gap: 6,
  },
  countRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  countValue: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "900",
    minWidth: 28,
    textAlign: "right",
  },
  divider: {
    backgroundColor: "rgba(14, 30, 22, 0.1)",
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
  },
  emptyText: {
    color: colors.secondaryText,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
  },
  errorBox: {
    backgroundColor: "rgba(255, 235, 235, 0.92)",
    borderColor: "rgba(160, 30, 30, 0.18)",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
    padding: 12,
  },
  errorText: {
    color: "#9F1D1D",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
  },
  eyebrow: {
    color: colors.secondaryText,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerTitleRow: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 10,
    minWidth: 0,
  },
  headerTitleText: {
    flex: 1,
    minWidth: 0,
  },
  helperText: {
    color: colors.secondaryText,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
    marginBottom: 12,
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    borderColor: "rgba(14, 30, 22, 0.12)",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    minHeight: 42,
    paddingHorizontal: 12,
  },
  inputGroup: {
    flex: 1,
    gap: 5,
    minWidth: 120,
  },
  inputLabel: {
    color: colors.secondaryText,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  inputRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  metric: {
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    borderColor: "rgba(14, 30, 22, 0.1)",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    minHeight: 64,
    padding: 10,
  },
  metricLabel: {
    color: colors.secondaryText,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  metricValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 28,
  },
  panel: {
    backgroundColor: "rgba(255, 255, 255, 0.58)",
    borderColor: "rgba(14, 30, 22, 0.1)",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
    padding: 14,
  },
  panelTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 20,
    marginBottom: 10,
  },
  pressed: {
    opacity: 0.7,
  },
  presetButton: {
    backgroundColor: "rgba(255, 255, 255, 0.66)",
    borderColor: "rgba(14, 30, 22, 0.1)",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: "48%",
    minHeight: 32,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  presetButtonActive: {
    backgroundColor: "rgba(57, 255, 106, 0.22)",
    borderColor: "rgba(14, 30, 22, 0.18)",
  },
  presetButtonText: {
    color: colors.secondaryText,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0,
  },
  presetButtonTextActive: {
    color: colors.text,
  },
  presetWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 10,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 32,
  },
});
