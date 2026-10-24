// Delivery dates come from the API as "YYYY-MM-DD". They are read as local
// dates: new Date("2026-10-27") would be midnight UTC and can show as the
// previous day.
export const parseISODate = (iso) => {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const toISODate = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

// "Tue, 27 Oct"
export const formatDeliveryDate = (iso) => {
  const date = parseISODate(iso);
  if (!date) return "";
  return date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
};

// { weekday: "Tue", day: 27, month: "Oct" }, for the date chips
export const dateParts = (iso) => {
  const date = parseISODate(iso);
  return {
    weekday: date.toLocaleDateString("en-IN", { weekday: "short" }),
    day: date.getDate(),
    month: date.toLocaleDateString("en-IN", { month: "short" }),
  };
};

// "Today" / "Tomorrow" for the next two days, otherwise ""
export const relativeDay = (iso, todayIso) => {
  const date = parseISODate(iso);
  const today = parseISODate(todayIso) || new Date(new Date().setHours(0, 0, 0, 0));
  if (!date) return "";
  const days = Math.round((date - today) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return "";
};

// every date from first to last, inclusive, as "YYYY-MM-DD"
export const datesBetween = (firstIso, lastIso) => {
  const dates = [];
  const day = parseISODate(firstIso);
  const last = parseISODate(lastIso);
  if (!day || !last) return dates;
  while (day <= last) {
    dates.push(toISODate(day));
    day.setDate(day.getDate() + 1);
  }
  return dates;
};
