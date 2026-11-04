import type { ComponentType } from "react"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import {
  Add01Icon,
  Mortarboard01Icon,
  ViewOffSlashIcon,
  UserCircleIcon,
  Certificate01Icon,
  TractorIcon,
  SmartPhone01Icon,
  Wrench01Icon,
  LinkSquare02Icon,
  TeacherIcon,
  Calendar03Icon,
  Invoice01Icon,
  ViewIcon,
  Delete02Icon,
  Copy01Icon,
  Alert02Icon,
  ArrowDown01Icon,
  ArrowDownRight01Icon,
  ArrowDataTransferHorizontalIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  ArrowUpRight01Icon,
  Building03Icon,
  BankIcon,
  Cancel01Icon,
  CancelCircleIcon,
  Camera01Icon,
  Car01Icon,
  ChartBarLineIcon,
  CheckListIcon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  CpuIcon,
  Home01Icon,
  File02Icon,
  InformationCircleIcon,
  Loading03Icon,
  Logout01Icon,
  MoreHorizontalIcon,
  Notification03Icon,
  PrinterIcon,
  QuoteUpIcon,
  Invoice03Icon,
  SlidersHorizontalIcon,
  UndoIcon,
  PlugSocketIcon,
  Download04Icon,
  Upload04Icon,
  Edit02Icon,
  Route01Icon,
  Link01Icon,
  QrCodeIcon,
  RefreshIcon,
  Search01Icon,
  SecurityCheckIcon,
  Settings02Icon,
  Ticket01Icon,
  Tick02Icon,
  UserGroupIcon,
  UserMultiple02Icon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons"

export type AppIcon = ComponentType<{ className?: string }>

function make(icon: IconSvgElement): AppIcon {
  return function Icon({ className }: { className?: string }) {
    return <HugeiconsIcon icon={icon} strokeWidth={1.75} className={className} />
  }
}

export const Plus = make(Add01Icon)
export const AlertTriangle = make(Alert02Icon)
export const TriangleAlertIcon = AlertTriangle
export const ArrowDownRight = make(ArrowDownRight01Icon)
export const ArrowUpRight = make(ArrowUpRight01Icon)
export const ArrowLeftRight = make(ArrowDataTransferHorizontalIcon)
export const GitCompareArrows = make(ArrowDataTransferHorizontalIcon)
export const Camera = make(Camera01Icon)
export const Car = make(Car01Icon)
export const Check = make(Tick02Icon)
export const CheckIcon = Check
export const CheckCircle2 = make(CheckmarkCircle02Icon)
export const CircleCheckIcon = CheckCircle2
export const ChevronDownIcon = make(ArrowDown01Icon)
export const ChevronUpIcon = make(ArrowUp01Icon)
export const ChevronLeft = make(ArrowLeft01Icon)
export const ChevronLeftIcon = ChevronLeft
export const ChevronRight = make(ArrowRight01Icon)
export const ChevronRightIcon = ChevronRight
export const Clock = make(Clock01Icon)
export const Cpu = make(CpuIcon)
export const InfoIcon = make(InformationCircleIcon)
export const Landmark = make(BankIcon)
export const Building2 = make(Building03Icon)
export const LayoutDashboard = make(Home01Icon)
export const ListChecks = make(CheckListIcon)
export const Loader2Icon = make(Loading03Icon)
export const LogOut = make(Logout01Icon)
export const MoreHorizontal = make(MoreHorizontalIcon)
export { MoreHorizontal as MoreHorizontalIcon }
export const OctagonXIcon = make(CancelCircleIcon)
export const Printer = make(PrinterIcon)
export const RefreshCw = make(RefreshIcon)
export const ScrollText = make(File02Icon)
export const Search = make(Search01Icon)
export const SearchIcon = Search
export const ShieldCheck = make(SecurityCheckIcon)
export const Ticket = make(Ticket01Icon)
export const Users = make(UserGroupIcon)
export const UsersRound = make(UserMultiple02Icon)
export const Wallet = make(Wallet01Icon)
export const X = make(Cancel01Icon)
export const XIcon = X
export const BarChart3 = make(ChartBarLineIcon)
export const Bell = make(Notification03Icon)
export const Settings = make(Settings02Icon)
export const Quote = make(QuoteUpIcon)
export const ReceiptText = make(Invoice03Icon)
export const SlidersHorizontal = make(SlidersHorizontalIcon)
export const Undo2 = make(UndoIcon)
export const Plug = make(PlugSocketIcon)
export const Download = make(Download04Icon)
export const Upload = make(Upload04Icon)
export const Pencil = make(Edit02Icon)
export const Route = make(Route01Icon)
export const Link2 = make(Link01Icon)
export const QrCode = make(QrCodeIcon)

export const Eye = make(ViewIcon)
export const Trash = make(Delete02Icon)
export const Copy = make(Copy01Icon)
export const ArrowLeft = make(ArrowLeft01Icon)

export const GraduationCap = make(Mortarboard01Icon)
export const Award = make(Certificate01Icon)
export const Tractor = make(TractorIcon)
export const Phone = make(SmartPhone01Icon)
export const Wrench = make(Wrench01Icon)
export const ExternalLink = make(LinkSquare02Icon)
export const Teacher = make(TeacherIcon)
export const Calendar = make(Calendar03Icon)
export const Bill = make(Invoice01Icon)
export const EyeOff = make(ViewOffSlashIcon)
export const UserCircle = make(UserCircleIcon)
