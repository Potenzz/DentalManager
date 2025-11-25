import { useEffect, useRef, useState } from "react";
import { io as ioClient, Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, LoaderCircleIcon, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAppDispatch } from "@/redux/hooks";
import { setTaskStatus } from "@/redux/slices/seleniumEligibilityCheckTaskSlice";
import { formatLocalDate } from "@/utils/dateUtils";
import { QK_PATIENTS_BASE } from "@/components/patients/patient-table";

// Use Vite env (set VITE_BACKEND_URL in your frontend .env)
const SOCKET_URL =
  import.meta.env.VITE_API_BASE_URL_BACKEND ||
  (typeof window !== "undefined" ? window.location.origin : "");

// ---------- OTP Modal component ----------
interface DdmaOtpModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (otp: string) => Promise<void> | void;
  isSubmitting: boolean;
}

function DdmaOtpModal({ open, onClose, onSubmit, isSubmitting }: DdmaOtpModalProps) {
  const [otp, setOtp] = useState("");

  useEffect(() => {
    if (!open) setOtp("");
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;
    await onSubmit(otp.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Enter OTP</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          We need the one-time password (OTP) sent by the Delta Dental MA portal
          to complete this eligibility check.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ddma-otp">OTP</Label>
            <Input
              id="ddma-otp"
              placeholder="Enter OTP code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !otp.trim()}>
              {isSubmitting ? (
                <>
                  <LoaderCircleIcon className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit OTP"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------- Main DDMA Eligibility button component ----------
interface DdmaEligibilityButtonProps {
  memberId: string;
  dateOfBirth: Date | null;
  firstName: string;
  lastName: string;
  isFormIncomplete: boolean;
  /** Called when backend has finished and PDF is ready */
  onPdfReady: (pdfId: number, fallbackFilename: string | null) => void;
}

export function DdmaEligibilityButton({
  memberId,
  dateOfBirth,
  firstName,
  lastName,
  isFormIncomplete,
  onPdfReady,
}: DdmaEligibilityButtonProps) {
  const { toast } = useToast();
  const dispatch = useAppDispatch();

  const socketRef = useRef<Socket | null>(null);
  const connectingRef = useRef<Promise<void> | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmittingOtp, setIsSubmittingOtp] = useState(false);

  // Clean up socket on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      connectingRef.current = null;
    };
  }, []);

  // Lazy socket setup: called only when we actually need it (first click)
  const ensureSocketConnected = async () => {
    // If already connected, nothing to do
    if (socketRef.current && socketRef.current.connected) {
      return;
    }

    // If a connection is in progress, reuse that promise
    if (connectingRef.current) {
      return connectingRef.current;
    }

    const promise = new Promise<void>((resolve, reject) => {
      const socket = ioClient(SOCKET_URL, {
        withCredentials: true,
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        console.log("DDMA socket connected:", socket.id);
        resolve();
      });

      socket.on("connect_error", (err) => {
        console.error("DDMA socket connect_error:", err);
        reject(err);
      });

      socket.on("disconnect", () => {
        console.log("DDMA socket disconnected");
      });

      // OTP required
      socket.on("selenium:otp_required", (payload: any) => {
        if (!payload?.session_id) return;
        setSessionId(payload.session_id);
        setOtpModalOpen(true);
        dispatch(
          setTaskStatus({
            status: "pending",
            message:
              "OTP required for DDMA eligibility. Please enter the OTP.",
          })
        );
      });

      // OTP submitted (optional UX)
      socket.on("selenium:otp_submitted", (payload: any) => {
        if (!payload?.session_id || payload.session_id !== sessionId) return;
        dispatch(
          setTaskStatus({
            status: "pending",
            message: "OTP submitted. Finishing DDMA eligibility check...",
          })
        );
      });

      // Session update
      socket.on("selenium:session_update", (payload: any) => {
        const { session_id, status, final } = payload || {};
        if (!session_id || session_id !== sessionId) return;

        if (status === "completed") {
          dispatch(
            setTaskStatus({
              status: "success",
              message:
                "DDMA eligibility updated and PDF attached to patient documents.",
            })
          );
          toast({
            title: "DDMA eligibility complete",
            description:
              "Patient status was updated and the eligibility PDF was saved.",
            variant: "default",
          });

          const pdfId = final?.pdfFileId;
          if (pdfId) {
            const filename =
              final?.pdfFilename ?? `eligibility_ddma_${memberId}.pdf`;
            onPdfReady(Number(pdfId), filename);
          }

          setSessionId(null);
          setOtpModalOpen(false);
        } else if (status === "error") {
          const msg =
            payload?.message ||
            final?.error ||
            "DDMA eligibility session failed.";
          dispatch(
            setTaskStatus({
              status: "error",
              message: msg,
            })
          );
          toast({
            title: "DDMA selenium error",
            description: msg,
            variant: "destructive",
          });
          setSessionId(null);
          setOtpModalOpen(false);
        }

        queryClient.invalidateQueries({ queryKey: QK_PATIENTS_BASE });
      });
    });

    connectingRef.current = promise;

    try {
      await promise;
    } finally {
      // Once resolved or rejected, allow future attempts if needed
      connectingRef.current = null;
    }
  };

  const startDdmaEligibility = async () => {
    if (!memberId || !dateOfBirth) {
      toast({
        title: "Missing fields",
        description: "Member ID and Date of Birth are required.",
        variant: "destructive",
      });
      return;
    }

    const formattedDob = dateOfBirth ? formatLocalDate(dateOfBirth) : "";

    const payload = {
      memberId,
      dateOfBirth: formattedDob,
      firstName,
      lastName,
      insuranceSiteKey: "DDMA", // make sure this matches backend credential key
    };

    try {
      setIsStarting(true);

      // 1) Ensure socket is connected (lazy)
      dispatch(
        setTaskStatus({
          status: "pending",
          message: "Opening realtime channel for DDMA eligibility...",
        })
      );
      await ensureSocketConnected();

      const socket = socketRef.current;
      if (!socket || !socket.connected) {
        throw new Error("Socket connection failed");
      }

      const socketId = socket.id;

      // 2) Start the selenium job via backend
      dispatch(
        setTaskStatus({
          status: "pending",
          message: "Starting DDMA eligibility check via selenium...",
        })
      );

      const response = await apiRequest(
        "POST",
        "/api/insurance-status-ddma/ddma-eligibility",
        {
          data: JSON.stringify(payload),
          socketId,
        }
      );

      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || "DDMA selenium start failed");
      }

      if (result.status === "started" && result.session_id) {
        setSessionId(result.session_id as string);
        dispatch(
          setTaskStatus({
            status: "pending",
            message:
              "DDMA eligibility job started. Waiting for OTP or final result...",
          })
        );
      } else {
        // fallback if backend returns immediate result
        dispatch(
          setTaskStatus({
            status: "success",
            message: "DDMA eligibility completed.",
          })
        );
      }
    } catch (err: any) {
      console.error("startDdmaEligibility error:", err);
      dispatch(
        setTaskStatus({
          status: "error",
          message: err?.message || "Failed to start DDMA eligibility",
        })
      );
      toast({
        title: "DDMA selenium error",
        description: err?.message || "Failed to start DDMA eligibility",
        variant: "destructive",
      });
    } finally {
      setIsStarting(false);
    }
  };

  const handleSubmitOtp = async (otp: string) => {
    if (!sessionId || !socketRef.current || !socketRef.current.connected) {
      toast({
        title: "Session not ready",
        description:
          "Could not submit OTP because the DDMA session or socket is not ready.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmittingOtp(true);
      const resp = await apiRequest(
        "POST",
        "/api/insurance-status-ddma/selenium/submit-otp",
        {
          session_id: sessionId,
          otp,
          socketId: socketRef.current.id,
        }
      );
      const data = await resp.json();
      if (!resp.ok || data.error) {
        throw new Error(data.error || "Failed to submit OTP");
      }

      // from here we rely on websocket events (otp_submitted + session_update)
      setOtpModalOpen(false);
    } catch (err: any) {
      console.error("handleSubmitOtp error:", err);
      toast({
        title: "Failed to submit OTP",
        description: err?.message || "Error forwarding OTP to selenium agent",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingOtp(false);
    }
  };

  return (
    <>
      <Button
        className="w-full"
        variant="default"
        disabled={isFormIncomplete || isStarting}
        onClick={startDdmaEligibility}
      >
        {isStarting ? (
          <>
            <LoaderCircleIcon className="h-4 w-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CheckCircle className="h-4 w-4 mr-2" />
            Delta MA Eligibility
          </>
        )}
      </Button>

      <DdmaOtpModal
        open={otpModalOpen}
        onClose={() => setOtpModalOpen(false)}
        onSubmit={handleSubmitOtp}
        isSubmitting={isSubmittingOtp}
      />
    </>
  );
}
