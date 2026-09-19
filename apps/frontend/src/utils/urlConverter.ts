import { envConfig } from "../config/environment";

// دالة مساعدة لتحويل روابط localhost إلى ngrok في الواجهة الأمامية
export const convertToPublicUrl = (url: string): string => {
  if (!url) return url;

  // التحقق من وجود mokhtarelhenawy.online في الرابط واستبداله بـ maxp.online أو النفق
  if (
    url.includes("https://www.mokhtarelhenawy.online") ||
    url.includes("https://mokhtarelhenawy.online")
  ) {
    const targetDomain =
      import.meta.env["VITE_NGROK_URL"] || envConfig.appUrl || "https://maxp.online";

    const convertedUrl = url
      .replace("https://www.mokhtarelhenawy.online", targetDomain)
      .replace("https://mokhtarelhenawy.online", targetDomain);

    return convertedUrl;
  }

  return url;
};

// دالة لمعالجة رسائل الصور مع ضمان الروابط الصحيحة
export const processImageMessage = (message: any) => {
  const processedMessage = { ...message };

  // معالجة رابط المحتوى
  if (
    processedMessage.content &&
    (processedMessage.content.includes("https://www.mokhtarelhenawy.online") ||
      processedMessage.content.includes("https://mokhtarelhenawy.online"))
  ) {
    processedMessage.content = convertToPublicUrl(processedMessage.content);
  }

  // معالجة fileUrl
  if (
    processedMessage.fileUrl &&
    (processedMessage.fileUrl.includes("https://www.mokhtarelhenawy.online") ||
      processedMessage.fileUrl.includes("https://mokhtarelhenawy.online"))
  ) {
    processedMessage.fileUrl = convertToPublicUrl(processedMessage.fileUrl);
  }

  // معالجة المرفقات
  if (processedMessage.attachments) {
    try {
      const attachments =
        typeof processedMessage.attachments === "string"
          ? JSON.parse(processedMessage.attachments)
          : processedMessage.attachments;

      if (Array.isArray(attachments)) {
        const updatedAttachments = attachments.map((attachment) => ({
          ...attachment,
          url: attachment.url
            ? convertToPublicUrl(attachment.url)
            : attachment.url,
        }));

        processedMessage.attachments = updatedAttachments;
      }
    } catch (error) {
      console.warn("⚠️ [URL-CONVERTER] Failed to process attachments:", error);
    }
  }

  return processedMessage;
};

// دالة للحصول على رابط الصورة النهائي مع معالجة شاملة
export const getImageUrl = (message: any): string => {
  const processedMessage = processImageMessage(message);

  // ترتيب الأولوية: fileUrl ثم content
  let imageUrl = processedMessage.fileUrl || processedMessage.content;

  // ضمان التحويل النهائي
  if (imageUrl) {
    imageUrl = convertToPublicUrl(imageUrl);

    // إضافة معالجة خاصة للصور - استخدام proxy لجميع الصور من المخدم
    if (
      imageUrl.startsWith("https://maxp.online/") ||
      imageUrl.startsWith("https://www.maxp.online/") ||
      imageUrl.startsWith("https://www.mokhtarelhenawy.online/") ||
      imageUrl.startsWith("https://mokhtarelhenawy.online/") ||
      imageUrl.startsWith("https://files.easy-orders.net/") ||
      imageUrl.startsWith("https://scontent.") ||
      imageUrl.startsWith("https://platform-lookaside.fbsbx.com/") ||
      imageUrl.includes("fbcdn.net")
    ) {
      // في بيئة التطوير، استخدم رابط ال proxy المحلي
      if (envConfig.isDevelopment) {
        return `${envConfig.apiUrl.replace("/api/v1", "")}/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
      }
      // في بيئة الإنتاج، استخدم رابط ال proxy المناسب
      return `${envConfig.appUrl}/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
    }
  }

  return imageUrl || "";
};

export default {
  convertToPublicUrl,
  processImageMessage,
  getImageUrl,
};
