import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { deleteBooking } from "@/lib/sheets.functions";
import { deptColors } from "@/lib/departments";
import type { Booking } from "@/lib/booking-types";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { AdminCodeDialog } from "@/components/admin-code-dialog";
import { Calendar, Clock, Phone, User, Building2, Home, FileText, Pencil, Trash2 } from "lucide-react";

export function BookingDetailDialog({
  booking,
  onOpenChange,
}: {
  booking: Booking | null;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [gate, setGate] = useState<null | "edit" | "delete">(null);
  const del = useServerFn(deleteBooking);
  const mut = useMutation({
    mutationFn: (v: { row: number; adminCode: string }) =>
      del({ data: { _row: v.row, adminCode: v.adminCode } }),
    onSuccess: () => {
      toast.success("Booking cancelled");
      qc.invalidateQueries({ queryKey: ["bookings"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!booking) return null;
  const c = deptColors(booking.Department);

  const Row = ({ icon: Icon, label, value }: { icon: typeof Calendar; label: string; value: string }) => (
    <div className="flex items-start gap-3 py-2">
      <Icon className="mt-0.5 size-4 text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value || "—"}</p>
      </div>
    </div>
  );

  return (
    <>
    <Dialog open={!!booking} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <div className={`h-1.5 w-full ${c.solid}`} />
        <div className="p-6">
          <DialogHeader className="mb-4">
            <div className="flex items-center gap-2">
              <Badge className={`${c.bg} ${c.text} border-transparent uppercase tracking-wider text-[10px]`}>
                {booking.Department || "Other"}
              </Badge>
              <span className="font-mono text-[10px] text-muted-foreground">{booking.BookingID}</span>
            </div>
            <DialogTitle className="font-display text-xl">
              {booking.ProjectName} · Unit {booking.UnitNumber}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-x-4 divide-y divide-border">
            <Row icon={Calendar} label="Visit Date" value={booking.VisitDate} />
            <Row icon={Clock} label="Time" value={`${booking.StartTime} – ${booking.EndTime}`} />
            <Row icon={User} label="Employee" value={booking.EmployeeName} />
            <Row icon={User} label="Customer" value={booking.CustomerName} />
            <Row icon={Phone} label="Mobile" value={booking.MobileNumber} />
            <Row icon={Building2} label="Project" value={booking.ProjectName} />
            <Row icon={Home} label="Unit" value={booking.UnitNumber} />
            <Row icon={FileText} label="Purpose" value={booking.Purpose} />
          </div>

          {booking.Remarks && (
            <div className="mt-4 rounded-lg bg-slate-50 p-3">
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
                Remarks
              </p>
              <p className="text-sm">{booking.Remarks}</p>
            </div>
          )}

          <div className="mt-6 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setGate("edit")}>
              <Pencil className="mr-2 size-4" />
              Edit
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={mut.isPending}
              onClick={() => setGate("delete")}
            >
              <Trash2 className="mr-2 size-4" />
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <AdminCodeDialog
      open={gate !== null}
      action={gate === "delete" ? "cancel" : "edit"}
      onOpenChange={(o) => !o && setGate(null)}
      onVerified={(code) => {
        const mode = gate;
        setGate(null);
        if (mode === "edit") {
          onOpenChange(false);
          navigate({ to: "/new", search: { edit: booking.BookingID } });
        } else if (mode === "delete" && booking._row) {
          mut.mutate({ row: booking._row, adminCode: code });
        }
      }}
    />
    </>
  );
}