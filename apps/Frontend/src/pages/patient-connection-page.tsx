import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { TopAppBar } from "@/components/layout/top-app-bar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  PhoneCall,
  Clock,
  User,
  Search,
  MessageSquare,
  X,
} from "lucide-react";
import { SmsTemplateDialog } from "@/components/patient-connection/sms-template-diaog";
import { MessageThread } from "@/components/patient-connection/message-thread";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Patient } from "@repo/db/types";

export default function PatientConnectionPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isSmsDialogOpen, setIsSmsDialogOpen] = useState(false);
  const [showMessaging, setShowMessaging] = useState(false);
  const { toast } = useToast();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const makeCallMutation = useMutation({
    mutationFn: async ({
      to,
      patientId,
    }: {
      to: string;
      patientId: number;
    }) => {
      return apiRequest("POST", "/api/twilio/make-call", {
        to,
        message:
          "Hello, this is a call from your dental office. We are calling to connect with you.",
        patientId,
      });
    },
    onSuccess: () => {
      toast({
        title: "Call Initiated",
        description: "The call has been placed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Call Failed",
        description:
          error.message || "Unable to place the call. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Fetch all patients from database
  const { data: patients = [], isLoading } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  // Filter patients based on search term
  const filteredPatients = patients.filter((patient) => {
    if (!searchTerm) return false;
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
    const phone = patient.phone?.toLowerCase() || "";
    const patientId = patient.id?.toString();

    return (
      fullName.includes(searchLower) ||
      phone.includes(searchLower) ||
      patientId?.includes(searchLower)
    );
  });

  // Handle calling patient via Twilio
  const handleCall = (patient: Patient) => {
    if (patient.phone) {
      makeCallMutation.mutate({
        to: patient.phone,
        patientId: Number(patient.id),
      });
    }
  };

  // Handle sending SMS
  const handleSMS = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsSmsDialogOpen(true);
  };

  // Handle opening messaging
  const handleOpenMessaging = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowMessaging(true);
  };

  // Handle closing messaging
  const handleCloseMessaging = () => {
    setShowMessaging(false);
    setSelectedPatient(null);
  };

  // Sample call data
  const recentCalls = [
    {
      id: 1,
      patientName: "John Bill",
      phoneNumber: "(555) 123-4567",
      callType: "Appointment Request",
      status: "Completed",
      duration: "3:45",
      time: "2 hours ago",
    },
    {
      id: 2,
      patientName: "Emily Brown",
      phoneNumber: "(555) 987-6543",
      callType: "Insurance Question",
      status: "Follow-up Required",
      duration: "6:12",
      time: "4 hours ago",
    },
    {
      id: 3,
      patientName: "Mike Johnson",
      phoneNumber: "(555) 456-7890",
      callType: "Prescription Refill",
      status: "Completed",
      duration: "2:30",
      time: "6 hours ago",
    },
  ];

  const callStats = [
    {
      label: "Total Calls Today",
      value: "23",
      icon: <Phone className="h-4 w-4" />,
    },
    {
      label: "Answered Calls",
      value: "21",
      icon: <PhoneCall className="h-4 w-4" />,
    },
    {
      label: "Average Call Time",
      value: "4:32",
      icon: <Clock className="h-4 w-4" />,
    },
    {
      label: "Active Patients",
      value: patients.length.toString(),
      icon: <User className="h-4 w-4" />,
    },
  ];

  return (
    <div>
      <div className="container mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Patient Connection
            </h1>
            <p className="text-muted-foreground">
              Search and communicate with patients
            </p>
          </div>
        </div>
      </div>

      {/* Call Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {callStats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <div className="text-primary">{stat.icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search and Actions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Search Patients</CardTitle>
          <CardDescription>
            Search by name, phone number, or patient ID
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search patient by name, phone, or ID..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-patient-search"
              />
            </div>
          </div>

          {/* Search Results */}
          {searchTerm && (
            <div className="mt-4">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">
                  Loading patients...
                </p>
              ) : filteredPatients.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium mb-2">
                    Search Results ({filteredPatients.length})
                  </p>
                  {filteredPatients.map((patient) => (
                    <div
                      key={patient.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                      data-testid={`patient-result-${patient.id}`}
                    >
                      <div className="flex-1">
                        <p className="font-medium">
                          {patient.firstName} {patient.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {patient.phone || "No phone number"} • ID:{" "}
                          {patient.id}
                        </p>
                        {patient.email && (
                          <p className="text-xs text-muted-foreground">
                            {patient.email}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCall(patient)}
                          disabled={!patient.phone}
                          data-testid={`button-call-${patient.id}`}
                        >
                          <Phone className="h-4 w-4 mr-1" />
                          Call
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenMessaging(patient)}
                          disabled={!patient.phone}
                          data-testid={`button-chat-${patient.id}`}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Chat
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No patients found matching "{searchTerm}"
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Calls */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Calls</CardTitle>
          <CardDescription>
            View and manage recent patient calls
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentCalls.map((call) => (
              <div
                key={call.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{call.patientName}</p>
                    <p className="text-sm text-muted-foreground">
                      {call.phoneNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{call.callType}</p>
                    <p className="text-xs text-muted-foreground">
                      Duration: {call.duration}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge
                    variant={
                      call.status === "Completed" ? "default" : "secondary"
                    }
                  >
                    {call.status}
                  </Badge>
                  <p className="text-xs text-muted-foreground">{call.time}</p>
                  <Button variant="outline" size="sm">
                    <PhoneCall className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* SMS Template Dialog */}
      <SmsTemplateDialog
        open={isSmsDialogOpen}
        onOpenChange={setIsSmsDialogOpen}
        patient={selectedPatient}
      />

      {/* Messaging Interface */}
      {showMessaging && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl h-[80vh] bg-white rounded-lg shadow-xl relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-10"
              onClick={handleCloseMessaging}
              data-testid="button-close-messaging"
            >
              <X className="h-5 w-5" />
            </Button>
            <div className="h-full">
              <MessageThread
                patient={selectedPatient}
                onBack={handleCloseMessaging}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
