import React, { useState, useEffect } from "react";
import { ChevronDown, User, Check, UserX } from "lucide-react";
import { apiClient } from "../../../services/apiClient";

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
}

interface AssignmentDropdownProps {
  currentAssignee: string | null;
  currentAssigneeName?: string;
  onAssign: (userId: string | null, name?: string | null) => void;
  disabled?: boolean;
}

const AssignmentDropdown: React.FC<AssignmentDropdownProps> = ({
  currentAssignee,
  currentAssigneeName,
  onAssign,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // Fetch team members from API
  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        const response = await apiClient.get<{ success: boolean; data: any[] }>(
          "/tasks/company-users",
        );
        if (response.data?.success && response.data?.data) {
          const users = response.data.data.map((user: any) => ({
            id: user.id,
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            email: user.email || "",
          }));
          setTeamMembers(users);
        }
      } catch (error: any) {
        const serverError = error?.response?.data;
        console.error("Error fetching team members:", {
          status: error?.response?.status,
          code: serverError?.code,
          message: serverError?.message || error?.message,
        });
      }
    };
    fetchTeamMembers();
  }, []);

  const handleSelect = (userId: string | null, name?: string | null) => {
    onAssign(userId, name);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block" dir="rtl">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`inline-flex items-center gap-1.5 rounded-xl border border-border/70 px-2.5 py-1 text-xs font-medium transition-colors shadow-2xs ${
          currentAssignee
            ? "bg-primary/10 text-primary border-primary/20"
            : "bg-card text-foreground hover:bg-muted/40"
        } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
      >
        <User className="w-3.5 h-3.5" />
        <span className="truncate max-w-[120px]">
          {currentAssigneeName || "غير معين"}
        </span>
        <ChevronDown className="w-3 h-3 text-muted-foreground" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1.5 z-30 max-h-72 w-60 overflow-y-auto rounded-xl border border-border/70 bg-card p-1.5 shadow-xl text-card-foreground animate-in fade-in duration-100">
            <div className="space-y-0.5">
              {/* Unassign option (Zero Emojis) */}
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-right ${
                  !currentAssignee
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                }`}
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
                  <UserX className="w-3 h-3" />
                </div>
                <span className="flex-1 truncate">إلغاء التعيين</span>
                {!currentAssignee && (
                  <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                )}
              </button>

              <div className="my-1 border-t border-border/50" />

              {/* Team members */}
              {teamMembers.map((member) => {
                const isSelected = currentAssignee === member.id;
                const initials = `${member.firstName.charAt(0)}${member.lastName.charAt(0)}`.trim() || "U";
                return (
                  <button
                    type="button"
                    key={member.id}
                    onClick={() =>
                      handleSelect(
                        member.id,
                        `${member.firstName} ${member.lastName}`.trim(),
                      )
                    }
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-right ${
                      isSelected
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "text-foreground hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary text-[10px] font-bold">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-semibold text-foreground">
                        {member.firstName} {member.lastName}
                      </p>
                      {member.email && (
                        <p className="truncate text-[10px] text-muted-foreground font-mono" dir="ltr">
                          {member.email}
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AssignmentDropdown;
