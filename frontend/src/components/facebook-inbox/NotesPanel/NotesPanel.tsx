import React, { useState, useEffect } from "react";
import { Note } from "../../../types/inbox.types";
import { useNotes } from "../../../hooks/inbox/useNotes";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface NotesPanelProps {
  customerId: string;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export const NotesPanel: React.FC<NotesPanelProps> = ({
  customerId,
  isOpen,
  onClose,
  className,
}) => {
  const { fetchNotes, addNote, deleteNote, loading } = useNotes();
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && customerId) {
      loadNotes();
    }
  }, [isOpen, customerId]);

  const loadNotes = async () => {
    const fetchedNotes = await fetchNotes(customerId);
    setNotes(fetchedNotes);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setIsSubmitting(true);
    const addedNote = await addNote(customerId, newNote);
    setIsSubmitting(false);

    if (addedNote) {
      setNotes([addedNote, ...notes]);
      setNewNote("");
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (window.confirm("هل أنت متأكد من حذف هذه الملاحظة؟")) {
      const success = await deleteNote(noteId);
      if (success) {
        setNotes(notes.filter((n) => n.id !== noteId));
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={[
        "business-inbox-column flex transform transition-transform duration-300 ease-in-out",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="business-inbox-header">
        <div className="business-inbox-header-row">
          <h3 className="business-inbox-title">الملاحظات الخاصة</h3>
          <button
            type="button"
            onClick={onClose}
            className="business-icon-button business-icon-button--sm"
            style={{ color: "var(--color-muted-foreground)" }}
          >
            ✕
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && notes.length === 0 ? (
          <div className="flex justify-center p-4">
            <div
              className="h-6 w-6 animate-spin rounded-full border-b-2"
              style={{ borderColor: "var(--color-primary)" }}
            />
          </div>
        ) : notes.length === 0 ? (
          <div
            className="py-8 text-center"
            style={{ color: "var(--color-muted-foreground)" }}
          >
            لا توجد ملاحظات بعد
          </div>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="business-note-card relative group">
              <p
                className="whitespace-pre-wrap text-sm"
                style={{ color: "var(--color-foreground)" }}
              >
                {note.content}
              </p>
              <div
                className="mt-2 flex items-center justify-between text-xs"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                <span>{note.authorName}</span>
                <span>{format(note.createdAt, "PP p", { locale: ar })}</span>
              </div>
              <button
                type="button"
                onClick={() => handleDeleteNote(note.id)}
                className="business-icon-button business-icon-button--sm absolute left-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
                style={{ color: "var(--business-danger)" }}
                title="حذف"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      <div className="business-chat-composer p-4">
        <form onSubmit={handleAddNote}>
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="أضف ملاحظة خاصة..."
            className="business-chat-input h-24 resize-none text-sm"
            disabled={isSubmitting}
          />
          <div className="mt-2 flex justify-end">
            <button
              type="submit"
              disabled={!newNote.trim() || isSubmitting}
              className={`business-chip-button px-4 py-2 text-sm font-medium ${
                isSubmitting ? "cursor-wait" : ""
              }`}
              data-active="true"
            >
              {isSubmitting ? "جاري الحفظ..." : "حفظ الملاحظة"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
