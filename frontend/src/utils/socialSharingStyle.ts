export type SocialSharingStyle =
  | "filled"
  | "outline"
  | "pills"
  | "inline-minimal";

export const normalizeSocialSharingStyle = (
  value: unknown,
): SocialSharingStyle => {
  if (
    value === "outline" ||
    value === "pills" ||
    value === "filled" ||
    value === "inline-minimal"
  ) {
    return value;
  }
  return "filled";
};
