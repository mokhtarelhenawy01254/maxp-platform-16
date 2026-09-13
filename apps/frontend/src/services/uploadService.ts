import { apiClient } from "./apiClient";

export interface UploadResponse {
  success: boolean;
  data?: {
    filename: string;
    originalName: string;
    size: number;
    url: string;
    fullUrl: string;
    type: string;
  };
  error?: string;
}

class UploadService {
  /**
   * Upload image for conversation (legacy method)
   */
  async uploadConversationImage(file: File): Promise<UploadResponse> {
    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await apiClient.post(
        "/upload/conversation-image",
        formData,
        {
          headers: {
            // boundary set by browser
          },
          timeout: 30000, // 30 seconds timeout
        },
      );

      return response.data;
    } catch (error: any) {
      console.error("Error uploading conversation image:", error);

      if (error.response?.data) {
        return error.response.data;
      }

      return {
        success: false,
        error: error.message || "Failed to upload image",
      };
    }
  }

  /**
   * Upload file for specific conversation (new improved method)
   */
  async uploadConversationFile(
    conversationId: string,
    file: File,
  ): Promise<UploadResponse> {
    try {
      const formData = new FormData();
      formData.append("files", file);

      console.log(
        "🚀 [UploadService] Making request to conversation upload endpoint",
      );

      const response = await apiClient.post(
        `/conversations/${conversationId}/upload`,
        formData,
        {
          headers: {
            // boundary set by browser
          },
          timeout: 30000, // 30 seconds timeout
        },
      );

      return response.data;
    } catch (error: any) {
      console.error("Error uploading conversation file:", error);

      if (error.response?.data) {
        return error.response.data;
      }

      return {
        success: false,
        error: error.message || "Failed to upload file",
      };
    }
  }

  /**
   * Upload multiple files for specific conversation
   */
  async uploadConversationFiles(
    conversationId: string,
    files: File[],
  ): Promise<UploadResponse> {
    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
      });

      console.log("🚀 [UploadService] Making batch upload request");

      const response = await apiClient.post(
        `/conversations/${conversationId}/upload`,
        formData,
        {
          headers: {
            // boundary set by browser
          },
          timeout: 60000, // 60 seconds for multiple files
        },
      );

      return response.data;
    } catch (error: any) {
      console.error("Error uploading conversation files:", error);

      if (error.response?.data) {
        return error.response.data;
      }

      return {
        success: false,
        error: error.message || "Failed to upload files",
      };
    }
  }

  /**
   * Upload a general media file (image or video)
   */
  async uploadMedia(
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<UploadResponse> {
    const formData = new FormData();
    // Use 'media' field name for the new media endpoint that supports both images and videos
    formData.append("media", file);

    try {
      const response = await apiClient.post("/upload/media", formData, {
        headers: {
          // boundary set by browser
        },
        timeout: 180000, // 3 minutes for larger video files
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percent = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total,
            );
            onProgress(percent);
          }
        },
      });

      return response.data;
    } catch (error: any) {
      console.error("Error uploading media:", error);
      return {
        success: false,
        error: error.response?.data?.error || "Failed to upload media",
      };
    }
  }

  /**
   * Upload product image
   */
  async uploadProductImage(file: File): Promise<UploadResponse> {
    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await apiClient.post("/upload/single", formData, {
        headers: {
          // boundary set by browser
        },
        timeout: 30000,
      });

      return response.data;
    } catch (error: any) {
      console.error("Error uploading product image:", error);

      if (error.response?.data) {
        return error.response.data;
      }

      return {
        success: false,
        error: error.message || "Failed to upload image",
      };
    }
  }

  /**
   * Upload multiple images
   */
  async uploadMultipleImages(files: File[]): Promise<UploadResponse> {
    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("images", file);
      });

      const response = await apiClient.post("/upload/multiple", formData, {
        headers: {
          // boundary set by browser
        },
        timeout: 60000, // 60 seconds for multiple files
      });

      return response.data;
    } catch (error: any) {
      console.error("Error uploading multiple images:", error);

      if (error.response?.data) {
        return error.response.data;
      }

      return {
        success: false,
        error: error.message || "Failed to upload images",
      };
    }
  }

  /**
   * Validate file before upload
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    // Check file type
    if (!file.type.startsWith("image/")) {
      return {
        valid: false,
        error: "Only image files are allowed",
      };
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        valid: false,
        error: "File size must be less than 10MB",
      };
    }

    return { valid: true };
  }

  /**
   * Upload service file (audio/image/video)
   */
  async uploadServiceFile(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await apiClient.post("/upload/service-file", formData, {
        // boundary set by browser
        timeout: 120000,
      });
      return response.data;
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error || "Failed to upload file" };
    }
  }

  /**
   * Get file preview URL
   */
  getFilePreview(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

export const uploadService = new UploadService();
export default uploadService;
