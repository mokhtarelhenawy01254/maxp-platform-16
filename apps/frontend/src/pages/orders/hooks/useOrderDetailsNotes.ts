import { useState } from "react";
import { apiClient } from "../../../services/apiClient";
import { toast } from "sonner";
import { tToast } from "../../../utils/i18n-toast";

export interface UseOrderDetailsNotesParams {
  encodedOrderNumber: string;
}

export const useOrderDetailsNotes = ({ encodedOrderNumber }: UseOrderDetailsNotesParams) => {
  const [orderNotes, setOrderNotes] = useState<any[]>([]);
  const [addingNote, setAddingNote] = useState(false);
  const [updatingNote, setUpdatingNote] = useState(false);
  const [deletingNote, setDeletingNote] = useState(false);

  const addNote = async (content: string) => {
    if (!content.trim()) return false;
    try {
      setAddingNote(true);
      const response = await apiClient.post(
        `/orders-new/simple/${encodedOrderNumber}/notes`,
        { content },
      );
      if (response.data.success) {
        setOrderNotes((prev) => [response.data.data, ...prev]);
        tToast.success("orderDetails.success_add_477c");
        return true;
      }
      return false;
    } catch (error: any) {
      toast.error(error.response?.data?.message || "فشل إضافة الملاحظة");
      return false;
    } finally {
      setAddingNote(false);
    }
  };

  const updateNote = async (noteId: string, content: string) => {
    if (!content.trim()) return false;
    try {
      setUpdatingNote(true);
      const response = await apiClient.patch(
        `/orders-new/simple/notes/${noteId}`,
        { content },
      );
      if (response.data.success) {
        setOrderNotes((prev) =>
          prev.map((n) => (n.id === noteId ? response.data.data : n)),
        );
        tToast.success("orderDetails.msg_a504");
        return true;
      }
      return false;
    } catch (error: any) {
      toast.error(error.response?.data?.message || "فشل تعديل الملاحظة");
      return false;
    } finally {
      setUpdatingNote(false);
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      setDeletingNote(true);
      const response = await apiClient.delete(
        `/orders-new/simple/notes/${noteId}`,
      );
      if (response.data.success) {
        setOrderNotes((prev) => prev.filter((n) => n.id !== noteId));
        tToast.success("orderDetails.success_delete_42f8");
        return true;
      }
      return false;
    } catch (error: any) {
      toast.error(error.response?.data?.message || "فشل حذف الملاحظة");
      return false;
    } finally {
      setDeletingNote(false);
    }
  };

  return {
    orderNotes,
    setOrderNotes,
    addingNote,
    updatingNote,
    deletingNote,
    addNote,
    updateNote,
    deleteNote,
  };
};
