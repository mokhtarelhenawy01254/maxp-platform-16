import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Image as ImageIcon, Loader2, X } from "lucide-react";
import { api, fetchJson, RadiologyStudyImage, MODAL_CONTENT_CLS } from "./shared";

const Viewer = React.lazy(() => import("../../components/radiology/DicomViewer"));

export default function RadiologyViewerModal({ studyId, onClose }: { studyId: string; onClose: () => void }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<RadiologyStudyImage[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const detail = await fetchJson<{ images?: RadiologyStudyImage[] }>(api(`studies/${studyId}`));
        const list = (detail.images || []).map(img => ({
          ...img,
          url: api(`studies/${studyId}/images/${img.id}/file`),
        }));
        setImages(list);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("radiology.viewer.loadFailed"));
      } finally {
        setLoading(false);
      }
    })();
  }, [studyId]);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className={`${MODAL_CONTENT_CLS} !max-w-5xl max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">{t("radiology.viewer.title")}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><X className="w-5 h-5" /></button>
        </div>
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
        ) : error ? (
          <div className="text-center py-16 text-red-500">{error}</div>
        ) : images.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <ImageIcon className="w-10 h-10 mx-auto mb-3" />
            {t("radiology.viewer.noImages")}
          </div>
        ) : (
          <React.Suspense fallback={<div className="text-center py-16 text-gray-400 dark:text-gray-500">{t("radiology.viewer.loadingViewer")}</div>}>
            <Viewer studyId={studyId} images={images} />
          </React.Suspense>
        )}
      </div>
    </div>
  );
}
