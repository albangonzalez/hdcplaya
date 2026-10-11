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
import { getCategories } from "@/lib/data/categories"
import { CategoryRowActions } from "./category-dialog"

export async function CategoriesTable() {
  const [t, categories] = await Promise.all([
    getTranslations("Categories"),
    getCategories(),
  ])

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted">
          <TableRow>
            <TableHead>{t("columns.nameEs")}</TableHead>
            <TableHead>{t("columns.nameEn")}</TableHead>
            <TableHead>{t("columns.kind")}</TableHead>
            <TableHead className="w-12">
              <span className="sr-only">{t("columns.actions")}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">
                {t("empty")}
              </TableCell>
            </TableRow>
          ) : (
            categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">
                  {category.name.es}
                </TableCell>
                <TableCell>{category.name.en}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Badge variant="outline">
                      {t(`kinds.${category.kind}`)}
                    </Badge>
                    {category.system && (
                      <Badge variant="secondary">{t("system")}</Badge>
                    )}
                    {!category.active && (
                      <Badge variant="outline" className="text-muted-foreground">
                        {t("inactive")}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <CategoryRowActions category={category} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
