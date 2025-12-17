import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Patient } from "@repo/db/types";

interface SmsTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient | null;
}

const MESSAGE_TEMPLATES = {
  appointment_reminder: {
    name: "Appointment Reminder",
    template: (firstName: string) =>
      `Hi ${firstName}, this is your dental office. Reminder: You have an appointment scheduled. Please confirm or call us if you need to reschedule.`,
  },
  appointment_confirmation: {
    name: "Appointment Confirmation",
    template: (firstName: string) =>
      `Hi ${firstName}, your appointment has been confirmed. We look forward to seeing you! If you have any questions, please call our office.`,
  },
  follow_up: {
    name: "Follow-Up",
    template: (firstName: string) =>
      `Hi ${firstName}, thank you for visiting our dental office. How are you feeling after your treatment? Please let us know if you have any concerns.`,
  },
  payment_reminder: {
    name: "Payment Reminder",
    template: (firstName: string) =>
      `Hi ${firstName}, this is a friendly reminder about your outstanding balance. Please contact our office to discuss payment options.`,
  },
  general: {
    name: "General Message",
    template: (firstName: string) =>
      `Hi ${firstName}, this is your dental office. `,
  },
  custom: {
    name: "Custom Message",
    template: () => "",
  },
};

export function SmsTemplateDialog({
  open,
  onOpenChange,
  patient,
}: SmsTemplateDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<
    keyof typeof MESSAGE_TEMPLATES
  >("appointment_reminder");
  const [customMessage, setCustomMessage] = useState("");
  const { toast } = useToast();

  const sendSmsMutation = useMutation({
    mutationFn: async ({
      to,
      message,
      patientId,
    }: {
      to: string;
      message: string;
      patientId: number;
    }) => {
      return apiRequest("POST", "/api/twilio/send-sms", {
        to,
        message,
        patientId,
      });
    },
    onSuccess: () => {
      toast({
        title: "SMS Sent Successfully",
        description: `Message sent to ${patient?.firstName} ${patient?.lastName}`,
      });
      onOpenChange(false);
      // Reset state
      setSelectedTemplate("appointment_reminder");
      setCustomMessage("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send SMS",
        description:
          error.message ||
          "Please check your Twilio configuration and try again.",
        variant: "destructive",
      });
    },
  });

  const getMessage = () => {
    if (!patient) return "";

    if (selectedTemplate === "custom") {
      return customMessage;
    }

    return MESSAGE_TEMPLATES[selectedTemplate].template(patient.firstName);
  };

  const handleSend = () => {
    if (!patient || !patient.phone) return;

    const message = getMessage();
    if (!message.trim()) return;

    sendSmsMutation.mutate({
      to: patient.phone,
      message: message,
      patientId: Number(patient.id),
    });
  };

  const handleTemplateChange = (value: string) => {
    const templateKey = value as keyof typeof MESSAGE_TEMPLATES;
    setSelectedTemplate(templateKey);

    // Pre-fill custom message if not custom template
    if (templateKey !== "custom" && patient) {
      setCustomMessage(
        MESSAGE_TEMPLATES[templateKey].template(patient.firstName)
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Send SMS to {patient?.firstName} {patient?.lastName}
          </DialogTitle>
          <DialogDescription>
            Choose a message template or write a custom message
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="template">Message Template</Label>
            <Select
              value={selectedTemplate}
              onValueChange={handleTemplateChange}
            >
              <SelectTrigger id="template" data-testid="select-sms-template">
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MESSAGE_TEMPLATES).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message Preview</Label>
            <Textarea
              id="message"
              value={
                selectedTemplate === "custom" ? customMessage : getMessage()
              }
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Type your message here..."
              rows={5}
              className="resize-none"
              data-testid="textarea-sms-message"
            />
            <p className="text-xs text-muted-foreground">
              {patient?.phone
                ? `Will be sent to: ${patient.phone}`
                : "No phone number available"}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={
              !patient?.phone ||
              !getMessage().trim() ||
              sendSmsMutation.isPending
            }
            className="gap-2"
            data-testid="button-send-sms"
          >
            {sendSmsMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {sendSmsMutation.isPending ? "Sending..." : "Send SMS"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
