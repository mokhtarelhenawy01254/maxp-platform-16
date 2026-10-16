import React, { useState, useEffect, useRef } from "react";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import { AtSign, User as UserIcon } from "lucide-react";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onMention?: (userId: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

const getAuthHeaders = (additionalHeaders: Record<string, string> = {}) =>
  tokenManager.createAuthHeaders(additionalHeaders);

const MentionInput: React.FC<MentionInputProps> = ({
  value,
  onChange,
  onMention,
  placeholder = "اكتب تعليقك... استخدم @ للإشارة لزميل في الفريق",
  rows = 3,
  className = "",
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [mentionQuery, setMentionQuery] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (mentionQuery) {
      const filtered = users.filter((user) =>
        `${user.firstName} ${user.lastName}`
          .toLowerCase()
          .includes(mentionQuery.toLowerCase()),
      );
      setFilteredUsers(filtered);
      setSelectedIndex(0);
    } else {
      setFilteredUsers(users);
    }
  }, [mentionQuery, users]);

  const fetchUsers = async () => {
    try {
      const response = await fetch(buildApiUrl("tasks/company-users"), {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      if (data.success) {
        setUsers(data.data || []);
      }
    } catch {
      // Silent error fallback
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;

    onChange(newValue);
    setCursorPosition(cursorPos);

    const textBeforeCursor = newValue.substring(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      setMentionQuery(mentionMatch[1] || "");
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      setMentionQuery("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredUsers.length - 1 ? prev + 1 : prev,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter": {
        const selectedUser = filteredUsers[selectedIndex];
        if (selectedUser) {
          e.preventDefault();
          insertMention(selectedUser);
        }
        break;
      }
      case "Escape":
        setShowSuggestions(false);
        break;
    }
  };

  const insertMention = (user: User) => {
    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);

    const mentionStart = textBeforeCursor.lastIndexOf("@");
    const beforeMention = value.substring(0, mentionStart);

    const mentionText = `@${user.firstName}_${user.lastName}`;
    const newValue = beforeMention + mentionText + " " + textAfterCursor;

    onChange(newValue);
    setShowSuggestions(false);
    setMentionQuery("");

    onMention?.(user.id);

    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = mentionStart + mentionText.length + 1;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        className={`w-full px-3 py-2 text-xs bg-background border border-border/70 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none ${className}`}
      />

      {/* Suggestions Dropdown */}
      {showSuggestions && filteredUsers.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-64 mt-1 bg-card border border-border/70 rounded-xl shadow-xl max-h-48 overflow-y-auto text-foreground animate-in fade-in zoom-in-95 duration-100"
        >
          {filteredUsers.map((user, index) => (
            <button
              key={user.id}
              onClick={() => insertMention(user)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-start transition-colors ${
                index === selectedIndex
                  ? "bg-primary/10 text-primary font-medium"
                  : "hover:bg-muted/40 text-foreground"
              }`}
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt=""
                  className="w-6 h-6 rounded-full object-cover shrink-0 border border-border/50"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs font-semibold">
                  {user.firstName.charAt(0) || <UserIcon className="w-3 h-3" />}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-xs truncate">
                  {user.firstName} {user.lastName}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Helper text */}
      <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
        <AtSign className="w-3 h-3" />
        <span>اكتب @ لفتح قائمة الإشارة لأحد الزملاء</span>
      </div>
    </div>
  );
};

export default MentionInput;
