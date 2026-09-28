import React, { useState, useMemo } from 'react';
import {
  Users,
  Play,
  Clock,
  CheckCircle2,
  Layers,
  Search,
  ChevronDown,
  ChevronUp,
  X,
  Filter,
} from 'lucide-react';
import { TeamMemberTaskSummary } from './TaskReportTypes';

interface TaskReportTeamMatrixProps {
  members: TeamMemberTaskSummary[];
  selectedUserId: string;
  onSelectMember: (userId: string) => void;
}

export const TaskReportTeamMatrix: React.FC<TaskReportTeamMatrixProps> = ({
  members,
  selectedUserId,
  onSelectMember,
}) => {
  const [search, setSearch] = useState('');
  const [showStandby, setShowStandby] = useState(false);

  // Filter by search query
  const filtered = useMemo(() => {
    if (!search) return members;
    const q = search.toLowerCase();
    return members.filter(
      (m) =>
        m.userName.toLowerCase().includes(q) ||
        (m.departmentName || '').toLowerCase().includes(q) ||
        (m.jobTitle || '').toLowerCase().includes(q)
    );
  }, [members, search]);

  // Separate active contributors from standby members (who have 0 active tasks)
  const { activeMembers, standbyMembers } = useMemo(() => {
    const active: TeamMemberTaskSummary[] = [];
    const standby: TeamMemberTaskSummary[] = [];

    filtered.forEach((m) => {
      const hasActivity =
        m.inProgressCount > 0 ||
        m.inReviewCount > 0 ||
        m.completedTodayCount > 0 ||
        m.pendingCount > 0 ||
        m.totalTrackedMinutes > 0;

      if (hasActivity) {
        active.push(m);
      } else {
        standby.push(m);
      }
    });

    return { activeMembers: active, standbyMembers: standby };
  }, [filtered]);

  const totals = useMemo(() => {
    return members.reduce(
      (acc, m) => {
        acc.inProgress += m.inProgressCount;
        acc.inReview += m.inReviewCount;
        acc.completedToday += m.completedTodayCount;
        acc.pending += m.pendingCount;
        acc.minutes += m.totalTrackedMinutes;
        return acc;
      },
      { inProgress: 0, inReview: 0, completedToday: 0, pending: 0, minutes: 0 }
    );
  }, [members]);

  const formatMinToH = (mins: number) => {
    if (!mins || mins === 0) return '—';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m > 0 ? `${m}m` : ''}`;
  };

  return (
    <div style={styles.chassis}>
      {/* Header Bar */}
      <div style={styles.headerBar}>
        <div style={styles.headerTitleGroup}>
          <Users size={13} color="#38bdf8" />
          <span style={styles.headerTitle}>توزيع أعباء الفريق والإنتاجية</span>
          <span style={styles.activePill}>
            {activeMembers.length} نشط من {members.length}
          </span>
        </div>

        <div style={styles.headerRightGroup}>
          <div style={styles.searchBox}>
            <Search size={11} color="#64748b" style={styles.searchIcon} />
            <input
              type="text"
              placeholder="بحث بالاسم أو القسم…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={styles.searchInput}
            />
            {search && (
              <button onClick={() => setSearch('')} style={styles.clearSearchBtn}>
                <X size={10} color="#94a3b8" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table: Active Contributors First */}
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thRow}>
              <th style={{ ...styles.th, width: '32%' }}>الموظف</th>
              <th style={{ ...styles.th, width: '14%', textAlign: 'center' }}>
                <span style={styles.thBadge}>
                  <Play size={9} color="#38bdf8" />
                  <span>قيد التنفيذ</span>
                </span>
              </th>
              <th style={{ ...styles.th, width: '14%', textAlign: 'center' }}>
                <span style={styles.thBadge}>
                  <Clock size={9} color="#eab308" />
                  <span>انتظار الاعتماد</span>
                </span>
              </th>
              <th style={{ ...styles.th, width: '14%', textAlign: 'center' }}>
                <span style={styles.thBadge}>
                  <CheckCircle2 size={9} color="#22c55e" />
                  <span>أُنجزت اليوم</span>
                </span>
              </th>
              <th style={{ ...styles.th, width: '12%', textAlign: 'center' }}>
                <span style={styles.thBadge}>
                  <Layers size={9} color="#94a3b8" />
                  <span>معلقة</span>
                </span>
              </th>
              <th style={{ ...styles.th, width: '14%', textAlign: 'left' }}>وقت التايمر</th>
            </tr>
          </thead>
          <tbody>
            {activeMembers.length === 0 ? (
              <tr>
                <td colSpan={6} style={styles.emptyTd}>
                  لا توجد مهام نشطة حالياً لأعضاء الفريق
                </td>
              </tr>
            ) : (
              activeMembers.map((m) => {
                const isSelected = selectedUserId === m.userId;
                const initials = m.userName.slice(0, 2).toUpperCase();

                return (
                  <tr
                    key={m.userId}
                    onClick={() => onSelectMember(isSelected ? 'all' : m.userId)}
                    style={{
                      ...styles.tr,
                      background: isSelected ? 'rgba(56, 189, 248, 0.08)' : 'transparent',
                      borderRight: isSelected ? '2px solid #38bdf8' : '2px solid transparent',
                    }}
                    title="انقر لتصفية جدول المهام بالأسفل لهذا الموظف"
                  >
                    {/* Member Details */}
                    <td style={styles.td}>
                      <div style={styles.memberBox}>
                        <div style={styles.avatar}>{initials}</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={styles.memberName} title={m.userName}>
                            {m.userName}
                          </div>
                          <div style={styles.memberDept}>
                            {m.departmentName || m.jobTitle || 'فريق العمل'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* In Progress */}
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      {m.inProgressCount > 0 ? (
                        <span style={styles.chipInProgress}>
                          {m.inProgressCount}
                        </span>
                      ) : (
                        <span style={styles.dimDash}>—</span>
                      )}
                    </td>

                    {/* In Review */}
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      {m.inReviewCount > 0 ? (
                        <span style={styles.chipInReview}>
                          {m.inReviewCount}
                        </span>
                      ) : (
                        <span style={styles.dimDash}>—</span>
                      )}
                    </td>

                    {/* Completed Today */}
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      {m.completedTodayCount > 0 ? (
                        <span style={styles.chipCompleted}>
                          {m.completedTodayCount}
                        </span>
                      ) : (
                        <span style={styles.dimDash}>—</span>
                      )}
                    </td>

                    {/* Pending */}
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      {m.pendingCount > 0 ? (
                        <span style={styles.chipPending}>
                          {m.pendingCount}
                        </span>
                      ) : (
                        <span style={styles.dimDash}>—</span>
                      )}
                    </td>

                    {/* Stopwatch Focus Time */}
                    <td style={{ ...styles.td, textAlign: 'left' }}>
                      <span
                        style={{
                          ...styles.timeNum,
                          color: m.totalTrackedMinutes > 0 ? '#f8fafc' : 'rgba(255,255,255,0.2)',
                        }}
                      >
                        {formatMinToH(m.totalTrackedMinutes)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Totals Summary Footer */}
          <tfoot>
            <tr style={styles.tfRow}>
              <td style={styles.td}>
                <span style={styles.tfLabel}>إجمالي الفريق الموثق</span>
              </td>
              <td style={{ ...styles.td, textAlign: 'center' }}>
                <span style={{ ...styles.tfNum, color: '#38bdf8' }}>{totals.inProgress}</span>
              </td>
              <td style={{ ...styles.td, textAlign: 'center' }}>
                <span style={{ ...styles.tfNum, color: '#eab308' }}>{totals.inReview}</span>
              </td>
              <td style={{ ...styles.td, textAlign: 'center' }}>
                <span style={{ ...styles.tfNum, color: '#22c55e' }}>{totals.completedToday}</span>
              </td>
              <td style={{ ...styles.td, textAlign: 'center' }}>
                <span style={{ ...styles.tfNum, color: '#94a3b8' }}>{totals.pending}</span>
              </td>
              <td style={{ ...styles.td, textAlign: 'left' }}>
                <span style={{ ...styles.tfNum, color: '#f8fafc' }}>
                  {formatMinToH(totals.minutes)}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Standby Members (Compact Subdued Bar - Zero Screen Waste) */}
      {standbyMembers.length > 0 && (
        <div style={styles.standbyStrip}>
          <div
            style={styles.standbyToggleBtn}
            onClick={() => setShowStandby((prev) => !prev)}
            role="button"
          >
            <span style={styles.standbyLabel}>
              أعضاء بدون مهام نشطة اليوم ({standbyMembers.length})
            </span>
            {showStandby ? <ChevronUp size={12} color="#64748b" /> : <ChevronDown size={12} color="#64748b" />}
          </div>

          {showStandby && (
            <div style={styles.standbyChipsWrap}>
              {standbyMembers.map((m) => (
                <button
                  key={m.userId}
                  onClick={() => onSelectMember(selectedUserId === m.userId ? 'all' : m.userId)}
                  style={{
                    ...styles.standbyChip,
                    borderColor: selectedUserId === m.userId ? '#38bdf8' : 'rgba(255,255,255,0.06)',
                    background: selectedUserId === m.userId ? 'rgba(56, 189, 248, 0.1)' : 'rgba(255,255,255,0.02)',
                    color: selectedUserId === m.userId ? '#38bdf8' : '#94a3b8',
                  }}
                  title="تصفية لعرض سجل هذا الموظف"
                >
                  <span style={styles.standbyDot} />
                  <span>{m.userName}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  chassis: {
    background: '#121214',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    marginBottom: 10,
    overflow: 'hidden',
  },
  headerBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '7px 12px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    background: 'rgba(24, 24, 27, 0.4)',
  },
  headerTitleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
  },
  headerTitle: {
    fontSize: 11.5,
    fontWeight: 700,
    color: '#f8fafc',
  },
  activePill: {
    fontSize: 10,
    fontWeight: 600,
    padding: '1px 6px',
    borderRadius: 10,
    background: 'rgba(56, 189, 248, 0.12)',
    color: '#38bdf8',
    fontVariantNumeric: 'tabular-nums',
  },
  headerRightGroup: {
    display: 'flex',
    alignItems: 'center',
  },
  searchBox: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    right: 7,
    pointerEvents: 'none',
  },
  searchInput: {
    background: '#18181b',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 5,
    color: '#f8fafc',
    fontSize: 10.5,
    padding: '3px 22px 3px 6px',
    fontFamily: 'inherit',
    outline: 'none',
    width: 140,
  },
  clearSearchBtn: {
    position: 'absolute',
    left: 4,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 2,
    display: 'flex',
  },
  tableWrap: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 11.5,
  },
  thRow: {
    background: 'rgba(24, 24, 27, 0.6)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
  },
  th: {
    padding: '6px 10px',
    textAlign: 'right',
    color: '#94a3b8',
    fontWeight: 600,
    fontSize: 10.5,
    whiteSpace: 'nowrap',
  },
  thBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  },
  tr: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    cursor: 'pointer',
    transition: 'background 120ms ease',
  },
  td: {
    padding: '5px 10px',
    verticalAlign: 'middle',
  },
  emptyTd: {
    padding: 16,
    textAlign: 'center',
    color: '#64748b',
    fontSize: 11,
  },
  memberBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 4,
    background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  memberName: {
    fontSize: 11,
    fontWeight: 600,
    color: '#f1f5f9',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 160,
  },
  memberDept: {
    fontSize: 9,
    color: '#64748b',
  },
  chipInProgress: {
    display: 'inline-block',
    padding: '1px 7px',
    borderRadius: 4,
    background: 'rgba(56, 189, 248, 0.12)',
    border: '1px solid rgba(56, 189, 248, 0.25)',
    color: '#38bdf8',
    fontWeight: 700,
    fontSize: 10.5,
    fontVariantNumeric: 'tabular-nums',
  },
  chipInReview: {
    display: 'inline-block',
    padding: '1px 7px',
    borderRadius: 4,
    background: 'rgba(234, 179, 8, 0.12)',
    border: '1px solid rgba(234, 179, 8, 0.25)',
    color: '#eab308',
    fontWeight: 700,
    fontSize: 10.5,
    fontVariantNumeric: 'tabular-nums',
  },
  chipCompleted: {
    display: 'inline-block',
    padding: '1px 7px',
    borderRadius: 4,
    background: 'rgba(34, 197, 94, 0.12)',
    border: '1px solid rgba(34, 197, 94, 0.25)',
    color: '#22c55e',
    fontWeight: 700,
    fontSize: 10.5,
    fontVariantNumeric: 'tabular-nums',
  },
  chipPending: {
    display: 'inline-block',
    padding: '1px 6px',
    borderRadius: 4,
    color: '#94a3b8',
    fontSize: 10.5,
    fontVariantNumeric: 'tabular-nums',
  },
  dimDash: {
    color: 'rgba(255, 255, 255, 0.18)',
    fontWeight: 300,
  },
  timeNum: {
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 600,
    fontSize: 11,
  },
  tfRow: {
    background: 'rgba(24, 24, 27, 0.6)',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
  },
  tfLabel: {
    fontSize: 10.5,
    fontWeight: 700,
    color: '#94a3b8',
  },
  tfNum: {
    fontSize: 11,
    fontWeight: 800,
    fontVariantNumeric: 'tabular-nums',
  },
  standbyStrip: {
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    padding: '5px 12px',
    background: 'rgba(18, 18, 20, 0.5)',
  },
  standbyToggleBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    cursor: 'pointer',
    userSelect: 'none',
  },
  standbyLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: 500,
  },
  standbyChipsWrap: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 6,
    paddingTop: 4,
  },
  standbyChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    border: '1px solid',
    borderRadius: 4,
    padding: '2px 7px',
    fontSize: 10,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 120ms ease',
  },
  standbyDot: {
    width: 4,
    height: 4,
    borderRadius: '50%',
    background: '#64748b',
  },
};
