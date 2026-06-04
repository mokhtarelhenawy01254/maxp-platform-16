import { InboxConversationMetadata } from "../types/inbox.types";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

export const parseInboxConversationMetadata = (
  metadata: unknown,
): InboxConversationMetadata | null => {
  if (!metadata) {
    return null;
  }

  if (typeof metadata === "string") {
    try {
      return parseInboxConversationMetadata(JSON.parse(metadata));
    } catch (_error) {
      return null;
    }
  }

  if (!isPlainObject(metadata)) {
    return null;
  }

  return metadata as InboxConversationMetadata;
};
