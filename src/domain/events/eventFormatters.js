const MONTH_LABELS = [
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

export function formatEventCardDate(value) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "DATE TBA -";

  return `${MONTH_LABELS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} -`;
}

export function formatAttendedExperienceDate(value) {
  const date = value?.includes?.("T")
    ? new Date(value)
    : new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "PAST EXPERIENCE";

  return `${MONTH_LABELS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function formatShortEventDate(value) {
  if (!value) return "00/00/00";

  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;

  return `${day}/${month}/${year.slice(2)}`;
}
