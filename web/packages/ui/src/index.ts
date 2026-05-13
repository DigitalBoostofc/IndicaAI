// Barrel export — Indica AÍ! UI Package
// Design System: docs/design-system.md

// Utilities
export { cn } from "./lib/utils";

// shadcn/ui base components
export { Button, type ButtonProps } from "./components/ui/button";
export { Input, type InputProps } from "./components/ui/input";
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./components/ui/card";
export { Badge, type BadgeProps } from "./components/ui/badge";
export { Label } from "./components/ui/label";
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "./components/ui/table";
export { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs";
export { ToastProvider, ToastViewport } from "./components/ui/toast";
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuRadioGroup,
} from "./components/ui/dropdown-menu";
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "./components/ui/dialog";
export { Sheet, SheetPortal, SheetOverlay, SheetTrigger, SheetClose, SheetContent } from "./components/ui/sheet";
export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
} from "./components/ui/form";

// Indica AÍ! derived components
export { StatCard, type StatCardProps } from "./components/stat-card";
export { EmptyState } from "./components/empty-state";
export { LeadStatusBadge } from "./components/lead-status-badge";
export { CommissionAmount } from "./components/commission-amount";
export { CopyLinkButton } from "./components/copy-link-button";
export { RewardRulePreview } from "./components/reward-rule-preview";
export { TierBuilder, type Tier, type TierRewardType } from "./components/tier-builder";

// Toast system
export { toast, useToast, dismissToast, type Toast } from "./hooks/use-toast";
export { Toaster } from "./components/ui/sonner";

// Zustand stores
export { useUIStore } from "./store/example";
