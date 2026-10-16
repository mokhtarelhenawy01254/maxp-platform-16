import React, { useState, useEffect } from "react";
import { Note } from "../../../types/inbox.types";
import { useNotes } from "../../../hooks/inbox/useNotes";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { X, StickyNote, Trash2, Plus, Loader2, Send } from "lucide-react";

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
        "border-s border-border/70 bg-card text-foreground flex flex-col h-full w-80 shrink-0 transform transition-transform duration-200 ease-in-out",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/20">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <StickyNote className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-foreground">
              الملاحظات الخاصة
            </h3>
            <p className="text-[10px] text-muted-foreground">
              ملاحظات داخلية خاصة بفريق العمل
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors active:scale-95"
          aria-label="إغلاق"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && notes.length === 0 ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : notes.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            لا توجد ملاحظات مسجلة لهذا العميل حتى الآن
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="p-3 rounded-xl bg-muted/20 border border-border/60 relative group hover:border-border transition-all space-y-2"
            >
              <p className="whitespace-pre-wrap text-xs text-foreground leading-relaxed">
                {note.content}
              </p>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/40 pt-2 font-mono tabular-nums">
                <span className="font-medium">{note.authorName}</span>
                <span>{format(note.createdAt, "PP p", { locale: ar })}</span>
              </div>
              <button
                type="button"
                onClick={() => handleDeleteNote(note.id)}
                className="absolute top-2 left-2 p-1 rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all active:scale-95"
                title="حذف الملاحظة"
                aria-label="حذف"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Composer */}
      <div className="p-3 border-t border-border/60 bg-muted/10">
        <form onSubmit={handleAddNote} className="space-y-2">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="أضف ملاحظة خاصة بالعميل..."
            className="w-full h-20 p-2.5 text-xs bg-background border border-border/70 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
            disabled={isSubmitting}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!newNote.trim() || isSubmitting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>حفظ الملاحظة</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
