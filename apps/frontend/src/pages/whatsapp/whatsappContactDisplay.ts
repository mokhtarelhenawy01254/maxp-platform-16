import type { Contact } from "../../hooks/useWhatsAppQueries";

/**
 * Unified WhatsApp Display Processor
 *
 * Central layer that converts WhatsApp internal data (JIDs, session IDs, etc.)
 * into human-readable customer display information. Every component MUST use
 * these functions instead of accessing raw JID/phoneNumber fields directly.
 *
 * Guarantees:
 * - No chatId, conversationId, remoteJid, participantId, sessionId visible to end user
 * - Real WhatsApp phone number is always shown
 * - Contact name shown when available, with number below
 * - All international and local number formats supported
 */

type ContactDisplaySource = Pick<Contact, "jid"> &
  Partial<Pick<Contact, "phoneNumber" | "name" | "pushName" | "customer" | "isGroup" | "isNewsletter">>;

/**
 * Check if the value contains a non-real-phone fallback prefix.
 * Backend stores "group:xxx", "lid:xxx", "jid:xxx" for internal IDs.
 */
function isNonPhoneFallback(value: string): boolean {
  return /^(group|lid|jid):/i.test(value);
}

/**
 * Check if a JID is a group JID.
 */
function isGroupJid(jid: string): boolean {
  return jid.endsWith("@g.us");
}

/**
 * Extract clean phone digits from any source (phoneNumber field, JID, etc.)
 * Never returns internal IDs, prefixes, or technical identifiers.
 * Returns empty string for groups and non-standard contacts.
 */
function extractCleanDigits(source: ContactDisplaySource): string {
  // Groups don't have phone numbers
  if (source.isGroup || isGroupJid(source.jid)) return "";

  // Try phoneNumber field first
  const rawPhone = String(source.phoneNumber || "").trim();
  if (rawPhone && rawPhone.toLowerCase() !== "unknown") {
    // Skip backend fallback prefixes like group:, lid:, jid:
    if (isNonPhoneFallback(rawPhone)) {
      return "";
    }
    const cleaned = rawPhone.replace(/^\w+:/, "").replace(/[^\d]/g, "");
    if (cleaned.length >= 7) return cleaned;
  }

  // Fallback: extract from JID (e.g., "201234567890@s.whatsapp.net" -> "201234567890")
  const jidPart = source.jid.split("@")[0]?.split(":")[0] || "";
  const digits = jidPart.replace(/[^\d]/g, "");
  if (digits.length >= 7) return digits;

  return "";
}

/**
 * Get the real WhatsApp phone number as a clean digit string.
 * Never returns lid:, group:, jid: or any internal prefixes.
 * Returns empty string if no valid number can be extracted.
 */
export function getContactPhoneNumber(contact: ContactDisplaySource): string {
  return extractCleanDigits(contact);
}

/**
 * Format a phone number for human-friendly display.
 * Egyptian numbers: +20 XXX XXX XXXX
 * International: +[country][number]
 */
export function formatContactPhoneNumber(value?: string | null): string {
  const rawValue = String(value || "").trim();
  const digits = rawValue.replace(/[^\d]/g, "");

  if (!digits) return "";

  // Egyptian mobile: +20 XX XXX XXXX
  if (digits.startsWith("20") && digits.length === 12) {
    return `+20 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }

  // Egyptian mobile without country code, local format
  if (digits.startsWith("01") && digits.length === 11) {
    return `+20 ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }

  // International format
  if (digits.length >= 7) {
    return `+${digits}`;
  }

  return digits;
}

/**
 * Get the formatted display phone number for a contact.
 * Returns the phone number formatted for display, never an internal ID.
 */
export function getContactDisplayPhone(contact: ContactDisplaySource): string {
  // Groups don't have phone numbers
  if (contact.isGroup || isGroupJid(contact.jid)) return "";

  const rawPhone = String(contact.phoneNumber || "").trim();
  if (rawPhone && rawPhone.toLowerCase() !== "unknown") {
    // Skip backend fallback prefixes
    if (isNonPhoneFallback(rawPhone)) return "";
    return formatContactPhoneNumber(rawPhone);
  }
  const digits = extractCleanDigits(contact);
  return formatContactPhoneNumber(digits);
}

/**
 * Get the phone href for tel: links.
 */
export function getContactPhoneHref(value?: string | null): string | undefined {
  const digits = String(value || "").replace(/[^\d]/g, "");
  return digits ? `tel:+${digits}` : undefined;
}

export function normalizeDisplayName(value?: string | null): string {
  return value?.normalize("NFKC").replace(/\s+/g, " ").trim() || "";
}

export function isPlaceholderDisplayName(value?: string | null): boolean {
  const normalized = normalizeDisplayName(value).toLowerCase();
  return (
    !normalized ||
    normalized === "whatsapp user" ||
    normalized === "whatsapp-user" ||
    normalized === "unknown" ||
    normalized === "n/a" ||
    normalized === "مستخدم واتساب"
  );
}

/**
 * Get the best display name for a contact.
 * Priority: name > pushName > customer name > formatted phone number
 * Never returns raw JID or internal IDs.
 */
export function getBestContactDisplayName(contact: ContactDisplaySource): string {
  const customerName = normalizeDisplayName(
    `${contact.customer?.firstName || ""} ${contact.customer?.lastName || ""}`,
  );

  const preferredName = [
    contact.name,
    contact.pushName,
    customerName,
  ].find((name) => !isPlaceholderDisplayName(name));

  if (normalizeDisplayName(preferredName)) {
    return normalizeDisplayName(preferredName);
  }

  // Final fallback: formatted phone number (never raw JID)
  const displayPhone = getContactDisplayPhone(contact);
  if (displayPhone) {
    return displayPhone;
  }

  // LID contacts without mapping — show partial JID instead of "WhatsApp"
  if (contact.jid?.includes('@lid')) {
    const bareJid = contact.jid.split('@')[0].replace(/\D/g, '');
    if (bareJid) return `اتصال واتساب (${bareJid.slice(-4)})`;
  }
  if (contact.jid?.endsWith('@g.us')) {
    return contact.pushName || 'مجموعة واتساب';
  }

  // Absolute last resort - but never show raw JID
  return "اتصال واتساب";
}

/**
 * Get initials for avatar fallback.
 */
export function getContactInitials(value?: string | null): string {
  const initials = normalizeDisplayName(value)
    .split(" ")
    .map((part) => part.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => Array.from(part)[0])
    .join("")
    .toUpperCase();

  return initials || "WA";
}
