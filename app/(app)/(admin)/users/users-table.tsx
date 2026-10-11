import { getTranslations } from "next-intl/server"

import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getUsers } from "@/lib/data/users"
import { UserRowActions } from "./user-row-actions"

export async function UsersTable() {
  const [t, users] = await Promise.all([getTranslations("Users"), getUsers()])

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted">
          <TableRow>
            <TableHead>{t("columns.name")}</TableHead>
            <TableHead>{t("columns.role")}</TableHead>
            <TableHead>{t("columns.email")}</TableHead>
            <TableHead className="w-12">
              <span className="sr-only">{t("columns.actions")}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">
                {t("empty")}
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.fullName}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Badge variant="outline">{t(`roles.${user.role}`)}</Badge>
                    {user.isCommittee && (
                      <Badge variant="secondary">{t("roles.committee")}</Badge>
                    )}
                    {user.status !== "active" && (
                      <Badge variant="outline" className="text-muted-foreground">
                        {t(`statuses.${user.status}`)}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <UserRowActions user={user} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
