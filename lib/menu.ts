import {
  ArrowLeftRightIcon,
  Building2Icon,
  CircleIcon,
  HandCoinsIcon,
  HistoryIcon,
  HouseIcon,
  LandmarkIcon,
  LayoutDashboardIcon,
  ReceiptIcon,
  ScaleIcon,
  TagsIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react"

import menuConfig from "@/config/menu.json"

export type MenuRole = "owner" | "committee" | "admin"

export type MenuItem = {
  id: string
  label: string
  path: string
  icon: string
}

export type MenuGroup = {
  id: string
  label?: string
  // Omitted means the group is visible to every role.
  roles?: MenuRole[]
  items: MenuItem[]
}

// Icon names usable in config/menu.json. Add an entry here to use a new one.
const menuIcons: Record<string, LucideIcon> = {
  ArrowLeftRight: ArrowLeftRightIcon,
  Building2: Building2Icon,
  HandCoins: HandCoinsIcon,
  History: HistoryIcon,
  House: HouseIcon,
  Landmark: LandmarkIcon,
  LayoutDashboard: LayoutDashboardIcon,
  Receipt: ReceiptIcon,
  Scale: ScaleIcon,
  Tags: TagsIcon,
  Users: UsersIcon,
}

export function getMenuIcon(name: string): LucideIcon {
  return menuIcons[name] ?? CircleIcon
}

export function getMenu(role: MenuRole): MenuGroup[] {
  return (menuConfig.groups as MenuGroup[]).filter(
    (group) => !group.roles || group.roles.includes(role)
  )
}
