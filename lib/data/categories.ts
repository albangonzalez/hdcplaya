import { requireAdmin } from "@/lib/auth"
import { categoriesCollection, type Category } from "@/models/category"

// Plain values only, so a row can be passed to Client Components.
export type CategoryRow = {
  id: string
  kind: Category["kind"]
  name: Category["name"]
  active: boolean
  // A category the app itself uses: its kind and state cannot be changed.
  system: boolean
}

export async function getCategories(): Promise<CategoryRow[]> {
  await requireAdmin()

  const categories = await categoriesCollection()
    .find()
    .sort({ kind: -1, "name.es": 1 })
    .collation({ locale: "es" })
    .toArray()

  return categories.map((category) => ({
    id: category._id.toHexString(),
    kind: category.kind,
    name: category.name,
    active: category.active,
    system: category.system !== null,
  }))
}
