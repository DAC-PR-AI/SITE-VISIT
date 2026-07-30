import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { verifyAdminCode } from "@/lib/sheets.functions";
import { ShieldCheck } from "lucide-react";

const KEY = "visitly_admin_code";

export function getStoredAdminCode(): string {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(KEY) ?? "";
}

export function storeAdminCode(code: string) {
  if (typeof window !== "undefined") window.sessionStorage.setItem(KEY, code);
}

export function AdminCodeDialog({
  open,
  action,
  onOpenChange,
  onVerified,
}: {
  open: boolean;
  action: string;
  onOpenChange: (open: boolean) => void;
  onVerified: (code: string) => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const verify = useServerFn(verifyAdminCode);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError("Enter the admin code");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await verify({ data: { code: code.trim() } });
      storeAdminCode(code.trim());
      setCode("");
      onOpenChange(false);
      onVerified(code.trim());
    } catch {
      setError("Invalid admin code.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <ShieldCheck className="size-4" />
            Admin code required
          </DialogTitle>
          <DialogDescription>Enter the admin code to {action} this booking.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Admin Code
            </Label>
            <Input
              type="password"
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="••••"
            />
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Verifying…" : "Continue"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}