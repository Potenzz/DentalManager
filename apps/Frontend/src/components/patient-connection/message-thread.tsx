import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Send, ArrowLeft } from "lucide-react";
import type { Patient, Communication } from "@repo/db/types";
import { format, isToday, isYesterday, parseISO } from "date-fns";

interface MessageThreadProps {
  patient: Patient;
  onBack?: () => void;
}

export function MessageThread({ patient, onBack }: MessageThreadProps) {
  const { toast } = useToast();
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: communications = [], isLoading } = useQuery<Communication[]>({
    queryKey: ["/api/patients", patient.id, "communications"],
    queryFn: async () => {
      const res = await fetch(`/api/patients/${patient.id}/communications`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch communications");
      return res.json();
    },
    refetchInterval: 5000, // Refresh every 5 seconds to get new messages
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      return apiRequest("POST", "/api/twilio/send-sms", {
        to: patient.phone,
        message: message,
        patientId: patient.id,
      });
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({
        queryKey: ["/api/patients", patient.id, "communications"],
      });
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send message",
        description:
          error.message || "Unable to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    sendMessageMutation.mutate(messageText);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [communications]);

  const formatMessageDate = (dateValue: string | Date) => {
    const date =
      typeof dateValue === "string" ? parseISO(dateValue) : dateValue;
    if (isToday(date)) {
      return format(date, "h:mm a");
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, "h:mm a")}`;
    } else {
      return format(date, "MMM d, h:mm a");
    }
  };

  const getDateDivider = (dateValue: string | Date) => {
    const messageDate =
      typeof dateValue === "string" ? parseISO(dateValue) : dateValue;
    if (isToday(messageDate)) {
      return "Today";
    } else if (isYesterday(messageDate)) {
      return "Yesterday";
    } else {
      return format(messageDate, "MMMM d, yyyy");
    }
  };

  const groupedMessages: { date: string; messages: Communication[] }[] = [];
  communications.forEach((comm) => {
    if (!comm.createdAt) return;
    const messageDate =
      typeof comm.createdAt === "string"
        ? parseISO(comm.createdAt)
        : comm.createdAt;
    const dateKey = format(messageDate, "yyyy-MM-dd");
    const existingGroup = groupedMessages.find((g) => g.date === dateKey);
    if (existingGroup) {
      existingGroup.messages.push(comm);
    } else {
      groupedMessages.push({ date: dateKey, messages: [comm] });
    }
  });

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
              {patient.firstName[0]}
              {patient.lastName[0]}
            </div>
            <div>
              <h3 className="font-semibold text-base">
                {patient.firstName} {patient.lastName}
              </h3>
              <p className="text-sm text-muted-foreground">{patient.phone}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto p-6 space-y-4"
        data-testid="messages-container"
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Loading messages...</p>
          </div>
        ) : communications.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          <>
            {groupedMessages.map((group) => (
              <div key={group.date}>
                {/* Date Divider */}
                <div className="flex items-center justify-center my-8">
                  <div className="px-4 py-1 bg-gray-100 rounded-full text-xs text-muted-foreground">
                    {getDateDivider(group.messages[0]?.createdAt!)}
                  </div>
                </div>

                {/* Messages for this date */}
                {group.messages.map((comm) => (
                  <div
                    key={comm.id}
                    className={`flex mb-4 ${comm.direction === "outbound" ? "justify-end" : "justify-start"}`}
                    data-testid={`message-${comm.id}`}
                  >
                    <div
                      className={`max-w-md ${comm.direction === "outbound" ? "ml-auto" : "mr-auto"}`}
                    >
                      {comm.direction === "inbound" && (
                        <div className="flex items-start gap-2">
                          <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                            {patient.firstName[0]}
                            {patient.lastName[0]}
                          </div>
                          <div>
                            <div className="p-3 rounded-2xl bg-gray-100 text-gray-900 rounded-tl-md">
                              <p className="text-sm whitespace-pre-wrap break-words">
                                {comm.body}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {comm.createdAt &&
                                formatMessageDate(comm.createdAt)}
                            </p>
                          </div>
                        </div>
                      )}

                      {comm.direction === "outbound" && (
                        <div>
                          <div className="p-3 rounded-2xl bg-primary text-primary-foreground rounded-tr-md">
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {comm.body}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 text-right">
                            {comm.createdAt &&
                              formatMessageDate(comm.createdAt)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex items-center gap-2">
          <Input
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 rounded-full"
            disabled={sendMessageMutation.isPending}
            data-testid="input-message"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!messageText.trim() || sendMessageMutation.isPending}
            size="icon"
            className="rounded-full h-10 w-10"
            data-testid="button-send"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
