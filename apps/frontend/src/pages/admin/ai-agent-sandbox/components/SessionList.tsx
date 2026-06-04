import React from "react";
import {
  Box,
  Typography,
  IconButton,
  Button,
  Tooltip,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Skeleton,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Chat as ChatIcon,
  Search as SearchIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  PushPin as PinIcon,
  PushPinOutlined as PinOutlineIcon,
} from "@mui/icons-material";
import type { Session } from "../types/sandbox.types";

interface SessionListProps {
  sessions: Session[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onCreateSession: () => void;
  onDeleteSession: (id: string) => void;
  onUpdateTitle: (id: string, title: string) => void;
  formatCost: (cost: number) => string;
  collapsed?: boolean;
  isSessionsLoading?: boolean;
}

export const SessionList: React.FC<SessionListProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  onUpdateTitle,
  formatCost,
  collapsed = false,
  isSessionsLoading = false,
}) => {
  const [search, setSearch] = React.useState("");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editTitle, setEditTitle] = React.useState("");
  const [pinnedIds, setPinnedIds] = React.useState<Set<string>>(new Set());
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);

  const handleTogglePin = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  const sortedSessions = React.useMemo(() => {
    const filtered = sessions.filter((s) =>
      s.title.toLowerCase().includes(search.toLowerCase())
    );
    return [...filtered].sort((a, b) => {
      const aPinned = pinnedIds.has(a.id);
      const bPinned = pinnedIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [sessions, search, pinnedIds]);

  const handleDoubleClick = (session: Session) => {
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  const handleSaveTitle = () => {
    if (editingId && editTitle.trim()) {
      onUpdateTitle(editingId, editTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <Box
      sx={{
        width: collapsed ? 0 : 260,
        minWidth: collapsed ? 0 : 260,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        overflow: "hidden",
        transition: "width 0.25s ease, min-width 0.25s ease",
      }}
    >
      <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
          <Typography variant="subtitle2" fontWeight={700}>
            Sessions
          </Typography>
          <Tooltip title="New Session">
            <IconButton size="small" onClick={onCreateSession} color="primary">
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <TextField
          fullWidth
          size="small"
          placeholder="Search sessions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
              </InputAdornment>
            ),
          }}
          sx={{ "& .MuiInputBase-root": { fontSize: 13 } }}
        />
      </Box>

      <Box sx={{ flex: 1, overflow: "auto", py: 0.5 }}>
        {isSessionsLoading && (
          <Box sx={{ px: 2, py: 1.5 }}>
            <Skeleton variant="rounded" height={36} sx={{ mb: 1 }} />
            <Skeleton variant="rounded" height={36} sx={{ mb: 1 }} />
            <Skeleton variant="rounded" height={36} sx={{ mb: 1 }} />
            <Skeleton variant="rounded" height={36} />
          </Box>
        )}

        {!isSessionsLoading && sortedSessions.length === 0 && sessions.length > 0 && (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <SearchIcon sx={{ fontSize: 40, color: "text.secondary", mb: 1, opacity: 0.4 }} />
            <Typography variant="body2" color="text.secondary" fontSize={12}>
              No sessions match your search
            </Typography>
            <Typography variant="caption" color="text.secondary" fontSize={11}>
              Try a different search term
            </Typography>
          </Box>
        )}

        {!isSessionsLoading && sortedSessions.length === 0 && sessions.length === 0 && (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <ChatIcon sx={{ fontSize: 40, color: "text.secondary", mb: 1, opacity: 0.4 }} />
            <Typography variant="body2" color="text.secondary" fontSize={12}>
              No sessions yet
            </Typography>
            <Typography variant="caption" color="text.secondary" fontSize={11}>
              Click + to create one
            </Typography>
          </Box>
        )}

        {sortedSessions.map((session) => {
          const isActive = session.id === activeSessionId;
          const score = session.score;
          const isPinned = pinnedIds.has(session.id);

          return (
            <Box
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              onDoubleClick={() => handleDoubleClick(session)}
              sx={{
                px: 2,
                py: 1.25,
                cursor: "pointer",
                bgcolor: isActive ? "primary.main" : "transparent",
                color: isActive ? "primary.contrastText" : "text.primary",
                "&:hover": {
                  bgcolor: isActive ? "primary.dark" : "action.hover",
                },
                transition: "background-color 0.15s",
                borderBottom: "1px solid",
                borderColor: isActive ? "primary.dark" : "divider",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Tooltip title={isPinned ? "Unpin session" : "Pin session"}>
                  <IconButton
                    size="small"
                    onClick={(e) => handleTogglePin(e, session.id)}
                    sx={{
                      color: isPinned ? "warning.main" : isActive ? "primary.contrastText" : "text.secondary",
                      mr: 0.5,
                      opacity: 0.7,
                      "&:hover": { opacity: 1 },
                    }}
                  >
                    {isPinned ? <PinIcon sx={{ fontSize: 14 }} /> : <PinOutlineIcon sx={{ fontSize: 14 }} />}
                  </IconButton>
                </Tooltip>
                {editingId === session.id ? (
                  <TextField
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={handleSaveTitle}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveTitle();
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    autoFocus
                    size="small"
                    sx={{
                      flex: 1,
                      "& .MuiInputBase-root": {
                        fontSize: 13,
                        color: isActive ? "primary.contrastText" : "text.primary",
                      },
                    }}
                  />
                ) : (
                  <Typography
                    variant="body2"
                    fontWeight={isActive ? 600 : 400}
                    sx={{ flex: 1, fontSize: 13 }}
                    noWrap
                  >
                    {session.title}
                  </Typography>
                )}
                <Tooltip title="Delete session">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmId(session.id);
                    }}
                    sx={{
                      color: isActive ? "primary.contrastText" : "text.secondary",
                      opacity: 0.5,
                      "&:hover": { opacity: 1, color: "error.main" },
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
                <Typography
                  variant="caption"
                  sx={{ color: isActive ? "primary.contrastText" : "text.secondary", opacity: 0.7, fontSize: 11 }}
                >
                  {session.messageCount} msgs
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: isActive ? "primary.contrastText" : "text.secondary", opacity: 0.7, fontSize: 11 }}
                >
                  {session.toolCallCount} tools
                </Typography>
                {score !== undefined && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                    {score >= 80 ? (
                      <StarIcon sx={{ fontSize: 12, color: "gold" }} />
                    ) : (
                      <StarBorderIcon sx={{ fontSize: 12, color: "text.secondary" }} />
                    )}
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: 11,
                        color: isActive ? "primary.contrastText" : "text.secondary",
                        opacity: 0.7,
                      }}
                    >
                      {score}
                    </Typography>
                  </Box>
                )}
                <Typography
                  variant="caption"
                  sx={{
                    ml: "auto",
                    color: isActive ? "primary.contrastText" : "text.secondary",
                    opacity: 0.5,
                    fontSize: 10,
                  }}
                >
                  {formatCost(session.totalCost)}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>

      <Dialog open={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)}>
        <DialogTitle>Delete Session?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete this session and all its messages. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
          <Button
            onClick={() => {
              if (deleteConfirmId) {
                onDeleteSession(deleteConfirmId);
                setDeleteConfirmId(null);
              }
            }}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
