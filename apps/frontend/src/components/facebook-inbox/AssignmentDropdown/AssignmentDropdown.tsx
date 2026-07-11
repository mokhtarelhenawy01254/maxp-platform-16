import React, { useState, useEffect } from "react";
import {
  ChevronDownIcon,
  UserCircleIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
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
        const response = await apiClient.get("/tasks/company-users");
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

  const triggerStyle: React.CSSProperties = currentAssignee
    ? {
        background: "color-mix(in srgb, var(--color-secondary) 10%, white)",
        borderColor:
          "color-mix(in srgb, var(--color-secondary) 18%, transparent)",
        color: "var(--color-secondary)",
      }
    : {
        background: "var(--shell-control-bg)",
        borderColor: "var(--shell-control-border)",
        color: "var(--color-foreground)",
      };

  const mutedAvatarStyle: React.CSSProperties = {
    background: "color-mix(in srgb, var(--color-border) 24%, white)",
    color: "var(--color-muted-foreground)",
  };

  const memberAvatarStyle: React.CSSProperties = {
    background:
      "linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)",
    color: "white",
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-2 rounded-2xl border px-3 py-1.5 text-sm font-medium shadow-sm transition-all ${
          disabled ? "cursor-not-allowed opacity-50" : ""
        }`}
        style={triggerStyle}
      >
        <UserCircleIcon className="w-4 h-4" />
        <span>{currentAssigneeName || "غير معين"}</span>
        <ChevronDownIcon className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="business-dropdown-surface absolute left-0 z-20 mt-2 max-h-80 w-64 overflow-y-auto p-2">
            <div className="space-y-1">
              {/* Unassign option */}
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className="business-dropdown-option"
                data-active={!currentAssignee}
              >
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full text-sm"
                  style={mutedAvatarStyle}
                >
                  ❌
                </div>
                <span className="flex-1 text-right font-medium">
                  إلغاء التعيين
                </span>
                {!currentAssignee && (
                  <CheckIcon
                    className="h-4 w-4"
                    style={{ color: "var(--color-primary)" }}
                  />
                )}
              </button>

              <div
                className="my-1 border-t"
                style={{ borderColor: "var(--business-muted-line)" }}
              />

              {/* Team members */}
              {teamMembers.map((member) => (
                <button
                  type="button"
                  key={member.id}
                  onClick={() => handleSelect(member.id, `${member.firstName} ${member.lastName}`)}
                  className="business-dropdown-option"
                  data-active={currentAssignee === member.id}
                >
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
                    style={memberAvatarStyle}
                  >
                    {member.firstName.charAt(0)}
                    {member.lastName.charAt(0)}
                  </div>
                  <div className="flex-1 text-right">
                    <p
                      className="font-medium"
                      style={{ color: "var(--color-foreground)" }}
                    >
                      {member.firstName} {member.lastName}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: "var(--color-muted-foreground)" }}
                    >
                      {member.email}
                    </p>
                  </div>
                  {currentAssignee === member.id && (
                    <CheckIcon
                      className="h-4 w-4"
                      style={{ color: "var(--color-primary)" }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AssignmentDropdown;
