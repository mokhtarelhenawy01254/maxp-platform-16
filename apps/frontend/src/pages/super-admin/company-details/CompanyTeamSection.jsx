import { Globe, Mail, Phone, UserPlus, Users } from "lucide-react"
import { Badge } from "../../../components/ui/badge"
import { Button } from "../../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card"
import { Skeleton } from "../../../components/ui/skeleton"
import { InfoLine } from "./InfoLine"
import { StatusBadge } from "./StatusBadge"
import { EmptyState } from "./EmptyState"
import { formatDate, formatNumber, getRoleLabel } from "./helpers"

export function CompanyTeamSection({
  companyUsers,
  usersLoading,
  company,
  facebookPages,
  pagesLoading,
  openAddEmployeeModal,
}) {
  const counts = {
    users: company?._count?.users || 0,
    facebookPagesCount: company?._count?.facebookPages || facebookPages.length || 0,
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)]">
      <Card className="rounded-2xl border">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl font-black">فريق الشركة</CardTitle>
            <CardDescription>
              الأعضاء الحاليون مع الحالة، الدور، ومؤشرات النشاط.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            className="rounded-2xl"
            onClick={openAddEmployeeModal}
          >
            <UserPlus className="size-4" />
            إضافة عضو
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {usersLoading ? (
            [...Array(4)].map((_, index) => (
              <Skeleton key={index} className="h-28 rounded-xl" />
            ))
          ) : companyUsers.length ? (
            <>
              {companyUsers.map((user) => (
                <div
                  key={user.id}
                  className="py-3"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-black text-foreground">
                          {user.firstName} {user.lastName}
                        </p>
                        <Badge
                          variant="outline"
                          className="rounded-full px-2.5 py-1 text-[11px]"
                        >
                          {getRoleLabel(user.role)}
                        </Badge>
                        <StatusBadge isActive={user.isActive} />
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        <InfoLine icon={Mail}>{user.email}</InfoLine>
                        {user.phone ? (
                          <InfoLine icon={Phone}>{user.phone}</InfoLine>
                        ) : null}
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-muted-foreground sm:text-left">
                      <p>أضيف في {formatDate(user.createdAt)}</p>
                      <p>آخر دخول {formatDate(user.lastLoginAt)}</p>
                      {user.employee?.employeeNumber ? (
                        <p>رقم الموظف: {user.employee.employeeNumber}</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}

              {counts.users > companyUsers.length ? (
                <p className="text-xs text-muted-foreground">
                  المعروض حاليًا أول {companyUsers.length} عضو من إجمالي{" "}
                  {formatNumber(counts.users)}.
                </p>
              ) : null}
            </>
          ) : (
            <EmptyState message="لا يوجد أعضاء مضافون لهذه الشركة حتى الآن." icon={Users} className="p-6" />
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl font-black">الربط والقنوات</CardTitle>
          <CardDescription>
            صفحات فيسبوك وحالة القنوات داخل الشركة.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-black text-foreground">
                  صفحات فيسبوك المرتبطة
                </p>
                <p className="text-xs text-muted-foreground">
                  كل الصفحات المتصلة بهذه الشركة.
                </p>
              </div>
              <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
                {counts.facebookPagesCount}
              </Badge>
            </div>

            <div className="mt-4 space-y-2">
              {pagesLoading ? (
                [...Array(3)].map((_, index) => (
                  <Skeleton key={index} className="h-20 rounded-lg" />
                ))
              ) : facebookPages.length ? (
                facebookPages.map((page) => (
                  <div
                    key={page.id}
                    className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-foreground">
                          {page.pageName || page.pageId}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          معرف الصفحة: {page.pageId}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          متصلة منذ {formatDate(page.connectedAt || page.createdAt)}
                        </p>
                      </div>
                      <StatusBadge isActive={page.status !== "DISCONNECTED"} />
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState message="لا توجد صفحات فيسبوك مربوطة بهذه الشركة." icon={Globe} />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
