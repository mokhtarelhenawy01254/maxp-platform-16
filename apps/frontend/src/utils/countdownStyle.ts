export type CountdownStyle =
  | "classic-red"
  | "hurry-minimal"
  | "midnight-sale"
  | "soft-outline";

export const normalizeCountdownStyle = (value: unknown): CountdownStyle => {
  if (
    value === "classic-red" ||
    value === "hurry-minimal" ||
    value === "midnight-sale" ||
    value === "soft-outline"
  ) {
    return value;
  }
  return "classic-red";
};
