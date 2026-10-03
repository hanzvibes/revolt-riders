export const formatEventDate = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value)) + " WIB";

export const formatShortDate = (value: string) => {
  const date = new Date(value);
  return {
    day: new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "2-digit",
    }).format(date),
    month: new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      month: "short",
    })
      .format(date)
      .toUpperCase(),
  };
};
