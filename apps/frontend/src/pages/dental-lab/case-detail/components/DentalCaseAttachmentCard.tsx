import { useState, type MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { deleteCaseAttachment } from "../../shared";
import type { DentalCaseAttachmentCardProps } from "./attachment-card/types";
import { useAttachmentBlob } from "./attachment-card/hooks/useAttachmentBlob";
import { AttachmentCardThumbnail } from "./attachment-card/components/AttachmentCardThumbnail";
import { AttachmentCardActions } from "./attachment-card/components/AttachmentCardActions";
import { Attachment3DModal } from "./attachment-card/components/Attachment3DModal";
import { AttachmentHtmlModal } from "./attachment-card/components/AttachmentHtmlModal";
import { AttachmentPdfModal } from "./attachment-card/components/AttachmentPdfModal";

export type { DentalCaseAttachmentCardProps };

export default function DentalCaseAttachmentCard({
  attachment,
  onDeleted,
}: DentalCaseAttachmentCardProps) {
  const { t } = useTranslation();
  const [show3d, setShow3d] = useState(false);
  const [showPdf, setShowPdf] = useState(false);
  const [showHtml, setShowHtml] = useState(false);

  const {
    url,
    failed,
    fileExt,
    is3D,
    isPdf,
    isHtml,
    isImage,
  } = useAttachmentBlob({
    storedName: attachment.storedName,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
  });

  const remove = async () => {
    if (!window.confirm(t("dentalLab.common.confirmDelete"))) return;
    try {
      await deleteCaseAttachment(attachment.caseId ?? "", attachment.id);
      toast.success(t("dentalLab.detail.fileDeleted"));
      onDeleted();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    }
  };

  const open = () => {
    if (url) window.open(url, "_blank");
  };

  const open3d = (e: MouseEvent) => {
    e.stopPropagation();
    if (url) setShow3d(true);
  };

  const openPdf = (e: MouseEvent) => {
    e.stopPropagation();
    if (url) setShowPdf(true);
  };

  const openHtml = (e: MouseEvent) => {
    e.stopPropagation();
    if (url) setShowHtml(true);
  };

  return (
    <div className="border dark:border-gray-700 rounded-lg overflow-hidden group relative">
      <AttachmentCardThumbnail
        attachment={attachment}
        url={url}
        failed={failed}
        is3D={is3D}
        isPdf={isPdf}
        isHtml={isHtml}
        isImage={isImage}
        onOpen3d={open3d}
        onOpenPdf={openPdf}
        onOpenHtml={openHtml}
        onOpen={open}
      />

      <AttachmentCardActions
        attachment={attachment}
        url={url}
        is3D={is3D}
        isPdf={isPdf}
        isHtml={isHtml}
        onOpen3d={open3d}
        onOpenPdf={openPdf}
        onOpenHtml={openHtml}
        onOpen={open}
        onRemove={remove}
      />

      <Attachment3DModal
        show={show3d}
        url={url}
        fileExt={fileExt}
        attachment={attachment}
        onClose={() => setShow3d(false)}
      />

      <AttachmentHtmlModal
        show={showHtml}
        url={url}
        attachment={attachment}
        onClose={() => setShowHtml(false)}
      />

      <AttachmentPdfModal
        show={showPdf}
        url={url}
        attachment={attachment}
        onClose={() => setShowPdf(false)}
      />
    </div>
  );
}
