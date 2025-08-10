import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TopAppBar } from "@/components/layout/top-app-bar";
import { Sidebar } from "@/components/layout/sidebar";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  AlertCircle,
  DollarSign,
  ArrowDown,
  Upload,
  Image,
  X,
  Trash2,
  Save,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import PaymentsRecentTable from "@/components/payments/payments-recent-table";
import { Appointment, Patient } from "@repo/db/types";

export default function PaymentsPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [paymentPeriod, setPaymentPeriod] = useState<string>("all-time");
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showReimbursementWindow, setShowReimbursementWindow] = useState(false);
  const [extractedPaymentData, setExtractedPaymentData] = useState<any[]>([]);
  const [editableData, setEditableData] = useState<any[]>([]);
  const [paidItems, setPaidItems] = useState<Record<string, boolean>>({});
  const [adjustmentValues, setAdjustmentValues] = useState<
    Record<string, number>
  >({});
  const [balanceValues, setBalanceValues] = useState<Record<string, number>>(
    {}
  );
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch patients
  const { data: patients = [], isLoading: isLoadingPatients } = useQuery<
    Patient[]
  >({
    queryKey: ["/api/patients"],
    enabled: !!user,
  });

  // Fetch appointments
  const {
    data: appointments = [] as Appointment[],
    isLoading: isLoadingAppointments,
  } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
    enabled: !!user,
  });

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Sample payment data
  const samplePayments = [
    {
      id: "PMT-1001",
      patientId: patients[0]?.id || 1,
      amount: 75.0,
      date: new Date(new Date().setDate(new Date().getDate() - 2)),
      method: "Credit Card",
      status: "completed",
      description: "Co-pay for cleaning",
    },
    {
      id: "PMT-1002",
      patientId: patients[0]?.id || 1,
      amount: 150.0,
      date: new Date(new Date().setDate(new Date().getDate() - 7)),
      method: "Insurance",
      status: "processing",
      description: "Insurance claim for x-rays",
    },
    {
      id: "PMT-1003",
      patientId: patients[0]?.id || 1,
      amount: 350.0,
      date: new Date(new Date().setDate(new Date().getDate() - 14)),
      method: "Check",
      status: "completed",
      description: "Payment for root canal",
    },
    {
      id: "PMT-1004",
      patientId: patients[0]?.id || 1,
      amount: 120.0,
      date: new Date(new Date().setDate(new Date().getDate() - 30)),
      method: "Credit Card",
      status: "completed",
      description: "Filling procedure",
    },
  ];

  // Sample outstanding balances
  const sampleOutstanding = [
    {
      id: "INV-5001",
      patientId: patients[0]?.id || 1,
      amount: 210.5,
      dueDate: new Date(new Date().setDate(new Date().getDate() + 7)),
      description: "Crown procedure",
      created: new Date(new Date().setDate(new Date().getDate() - 10)),
      status: "pending",
    },
    {
      id: "INV-5002",
      patientId: patients[0]?.id || 1,
      amount: 85.0,
      dueDate: new Date(new Date().setDate(new Date().getDate() - 5)),
      description: "Diagnostic & preventive",
      created: new Date(new Date().setDate(new Date().getDate() - 20)),
      status: "overdue",
    },
  ];

  // Calculate summary data
  const totalOutstanding = sampleOutstanding.reduce(
    (sum, item) => sum + item.amount,
    0
  );
  const totalCollected = samplePayments
    .filter((payment) => payment.status === "completed")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const pendingAmount = samplePayments
    .filter((payment) => payment.status === "processing")
    .reduce((sum, payment) => sum + payment.amount, 0);

  const handleRecordPayment = (patientId: number, invoiceId?: string) => {
    const patient = patients.find((p) => p.id === patientId);
    toast({
      title: "Payment form opened",
      description: `Recording payment for ${patient?.firstName} ${patient?.lastName}${invoiceId ? ` (Invoice: ${invoiceId})` : ""}`,
    });
  };

  // Image upload handlers for OCR
  const handleImageDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        setUploadedImage(file);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file (JPG, PNG, etc.)",
          variant: "destructive",
        });
      }
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      setUploadedImage(file);
    }
  };

  const handleOCRExtraction = async (file: File) => {
    setIsExtracting(true);

    try {
      // Create FormData for image upload
      const formData = new FormData();
      formData.append("image", file);

      // Simulate OCR extraction process
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Sample extracted payment data - 20 rows
      const mockExtractedData = [
        {
          memberName: "John Smith",
          memberId: "123456789",
          procedureCode: "D1110",
          dateOfService: "12/15/2024",
          billedAmount: 150.0,
          allowedAmount: 120.0,
          paidAmount: 96.0,
        },
        {
          memberName: "John Smith",
          memberId: "123456789",
          procedureCode: "D0120",
          dateOfService: "12/15/2024",
          billedAmount: 85.0,
          allowedAmount: 70.0,
          paidAmount: 56.0,
        },
        {
          memberName: "Mary Johnson",
          memberId: "987654321",
          procedureCode: "D2330",
          dateOfService: "12/14/2024",
          billedAmount: 280.0,
          allowedAmount: 250.0,
          paidAmount: 200.0,
        },
        {
          memberName: "Robert Brown",
          memberId: "456789123",
          procedureCode: "D3320",
          dateOfService: "12/13/2024",
          billedAmount: 1050.0,
          allowedAmount: 900.0,
          paidAmount: 720.0,
        },
        {
          memberName: "Sarah Davis",
          memberId: "789123456",
          procedureCode: "D2140",
          dateOfService: "12/12/2024",
          billedAmount: 320.0,
          allowedAmount: 280.0,
          paidAmount: 224.0,
        },
        {
          memberName: "Michael Wilson",
          memberId: "321654987",
          procedureCode: "D1120",
          dateOfService: "12/11/2024",
          billedAmount: 120.0,
          allowedAmount: 100.0,
          paidAmount: 80.0,
        },
        {
          memberName: "Jennifer Garcia",
          memberId: "654987321",
          procedureCode: "D0150",
          dateOfService: "12/10/2024",
          billedAmount: 195.0,
          allowedAmount: 165.0,
          paidAmount: 132.0,
        },
        {
          memberName: "David Miller",
          memberId: "147258369",
          procedureCode: "D2331",
          dateOfService: "12/09/2024",
          billedAmount: 220.0,
          allowedAmount: 190.0,
          paidAmount: 152.0,
        },
        {
          memberName: "Lisa Anderson",
          memberId: "258369147",
          procedureCode: "D4910",
          dateOfService: "12/08/2024",
          billedAmount: 185.0,
          allowedAmount: 160.0,
          paidAmount: 128.0,
        },
        {
          memberName: "James Taylor",
          memberId: "369147258",
          procedureCode: "D2392",
          dateOfService: "12/07/2024",
          billedAmount: 165.0,
          allowedAmount: 140.0,
          paidAmount: 112.0,
        },
        {
          memberName: "Patricia Thomas",
          memberId: "741852963",
          procedureCode: "D0140",
          dateOfService: "12/06/2024",
          billedAmount: 90.0,
          allowedAmount: 75.0,
          paidAmount: 60.0,
        },
        {
          memberName: "Christopher Lee",
          memberId: "852963741",
          procedureCode: "D2750",
          dateOfService: "12/05/2024",
          billedAmount: 1250.0,
          allowedAmount: 1100.0,
          paidAmount: 880.0,
        },
        {
          memberName: "Linda White",
          memberId: "963741852",
          procedureCode: "D1351",
          dateOfService: "12/04/2024",
          billedAmount: 75.0,
          allowedAmount: 65.0,
          paidAmount: 52.0,
        },
        {
          memberName: "Mark Harris",
          memberId: "159753486",
          procedureCode: "D7140",
          dateOfService: "12/03/2024",
          billedAmount: 185.0,
          allowedAmount: 155.0,
          paidAmount: 124.0,
        },
        {
          memberName: "Nancy Martin",
          memberId: "486159753",
          procedureCode: "D2332",
          dateOfService: "12/02/2024",
          billedAmount: 280.0,
          allowedAmount: 240.0,
          paidAmount: 192.0,
        },
        {
          memberName: "Kevin Thompson",
          memberId: "753486159",
          procedureCode: "D0210",
          dateOfService: "12/01/2024",
          billedAmount: 125.0,
          allowedAmount: 105.0,
          paidAmount: 84.0,
        },
        {
          memberName: "Helen Garcia",
          memberId: "357951486",
          procedureCode: "D4341",
          dateOfService: "11/30/2024",
          billedAmount: 210.0,
          allowedAmount: 180.0,
          paidAmount: 144.0,
        },
        {
          memberName: "Daniel Rodriguez",
          memberId: "486357951",
          procedureCode: "D2394",
          dateOfService: "11/29/2024",
          billedAmount: 295.0,
          allowedAmount: 250.0,
          paidAmount: 200.0,
        },
        {
          memberName: "Carol Lewis",
          memberId: "951486357",
          procedureCode: "D1206",
          dateOfService: "11/28/2024",
          billedAmount: 45.0,
          allowedAmount: 40.0,
          paidAmount: 32.0,
        },
        {
          memberName: "Paul Clark",
          memberId: "246813579",
          procedureCode: "D5110",
          dateOfService: "11/27/2024",
          billedAmount: 1200.0,
          allowedAmount: 1050.0,
          paidAmount: 840.0,
        },
        {
          memberName: "Susan Young",
          memberId: "135792468",
          procedureCode: "D4342",
          dateOfService: "11/26/2024",
          billedAmount: 175.0,
          allowedAmount: 150.0,
          paidAmount: 120.0,
        },
        {
          memberName: "Richard Allen",
          memberId: "468135792",
          procedureCode: "D2160",
          dateOfService: "11/25/2024",
          billedAmount: 385.0,
          allowedAmount: 320.0,
          paidAmount: 256.0,
        },
        {
          memberName: "Karen Scott",
          memberId: "792468135",
          procedureCode: "D0220",
          dateOfService: "11/24/2024",
          billedAmount: 95.0,
          allowedAmount: 80.0,
          paidAmount: 64.0,
        },
        {
          memberName: "William Green",
          memberId: "135246879",
          procedureCode: "D3220",
          dateOfService: "11/23/2024",
          billedAmount: 820.0,
          allowedAmount: 700.0,
          paidAmount: 560.0,
        },
        {
          memberName: "Betty King",
          memberId: "579024681",
          procedureCode: "D1208",
          dateOfService: "11/22/2024",
          billedAmount: 55.0,
          allowedAmount: 45.0,
          paidAmount: 36.0,
        },
        {
          memberName: "Edward Baker",
          memberId: "246897531",
          procedureCode: "D2950",
          dateOfService: "11/21/2024",
          billedAmount: 415.0,
          allowedAmount: 350.0,
          paidAmount: 280.0,
        },
        {
          memberName: "Dorothy Hall",
          memberId: "681357924",
          procedureCode: "D0230",
          dateOfService: "11/20/2024",
          billedAmount: 135.0,
          allowedAmount: 115.0,
          paidAmount: 92.0,
        },
        {
          memberName: "Joseph Adams",
          memberId: "924681357",
          procedureCode: "D2740",
          dateOfService: "11/19/2024",
          billedAmount: 1150.0,
          allowedAmount: 980.0,
          paidAmount: 784.0,
        },
        {
          memberName: "Sandra Nelson",
          memberId: "357924681",
          procedureCode: "D4211",
          dateOfService: "11/18/2024",
          billedAmount: 245.0,
          allowedAmount: 210.0,
          paidAmount: 168.0,
        },
        {
          memberName: "Kenneth Carter",
          memberId: "681924357",
          procedureCode: "D0274",
          dateOfService: "11/17/2024",
          billedAmount: 165.0,
          allowedAmount: 140.0,
          paidAmount: 112.0,
        },
      ];

      setExtractedPaymentData(mockExtractedData);
      setEditableData([...mockExtractedData]);
      setShowReimbursementWindow(true);

      toast({
        title: "OCR Extraction Complete",
        description: "Payment information extracted from image successfully",
      });
    } catch (error) {
      toast({
        title: "OCR Extraction Failed",
        description: "Could not extract information from the image",
        variant: "destructive",
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const removeUploadedImage = () => {
    setUploadedImage(null);
  };

  const updateEditableData = (
    index: number,
    field: string,
    value: string | number
  ) => {
    setEditableData((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const deleteRow = (index: number) => {
    setEditableData((prev) => prev.filter((_, i) => i !== index));
    toast({
      title: "Row Deleted",
      description: `Payment record has been removed`,
    });
  };

  const saveRow = (index: number) => {
    toast({
      title: "Row Saved",
      description: `Changes to payment record ${index + 1} have been saved`,
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopAppBar toggleMobileMenu={toggleMobileMenu} />

        <main className="flex-1 overflow-y-auto p-4">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">Payments</h1>
              <p className="text-gray-600">
                Manage patient payments and outstanding balances
              </p>
            </div>

            <div className="mt-4 md:mt-0 flex items-center space-x-2">
              <Select
                defaultValue="all-time"
                onValueChange={(value) => setPaymentPeriod(value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-time">All Time</SelectItem>
                  <SelectItem value="this-month">This Month</SelectItem>
                  <SelectItem value="last-month">Last Month</SelectItem>
                  <SelectItem value="last-90-days">Last 90 Days</SelectItem>
                  <SelectItem value="this-year">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Payment Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Outstanding Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <DollarSign className="h-5 w-5 text-yellow-500 mr-2" />
                  <div className="text-2xl font-bold">
                    ${totalOutstanding.toFixed(2)}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  From {sampleOutstanding.length} outstanding invoices
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Payments Collected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <DollarSign className="h-5 w-5 text-green-500 mr-2" />
                  <div className="text-2xl font-bold">
                    ${totalCollected.toFixed(2)}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  From{" "}
                  {
                    samplePayments.filter((p) => p.status === "completed")
                      .length
                  }{" "}
                  completed payments
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Pending Payments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <DollarSign className="h-5 w-5 text-blue-500 mr-2" />
                  <div className="text-2xl font-bold">
                    ${pendingAmount.toFixed(2)}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  From{" "}
                  {
                    samplePayments.filter((p) => p.status === "processing")
                      .length
                  }{" "}
                  pending transactions
                </p>
              </CardContent>
            </Card>
          </div>

          {/* OCR Image Upload Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-medium text-gray-800">
                Payment Document OCR
              </h2>
            </div>

            <Card>
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <div
                    className={`flex-1 border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      isDragging
                        ? "border-blue-400 bg-blue-50"
                        : uploadedImage
                          ? "border-green-400 bg-green-50"
                          : "border-gray-300 bg-gray-50 hover:border-gray-400"
                    }`}
                    onDrop={handleImageDrop}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onClick={() =>
                      document.getElementById("image-upload-input")?.click()
                    }
                  >
                    {uploadedImage ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-center space-x-4">
                          <Image className="h-8 w-8 text-green-500" />
                          <div className="text-left">
                            <p className="font-medium text-green-700">
                              {uploadedImage.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {(uploadedImage.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeUploadedImage();
                            }}
                            className="ml-auto"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        {isExtracting && (
                          <div className="text-sm text-blue-600">
                            Extracting payment information...
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                        <div>
                          <p className="text-lg font-medium text-gray-700 mb-2">
                            Upload Payment Document
                          </p>
                          <p className="text-sm text-gray-500 mb-4">
                            Drag and drop an image or click to browse
                          </p>
                          <Button variant="outline" type="button">
                            Choose Image
                          </Button>
                        </div>
                        <p className="text-xs text-gray-400">
                          Supported formats: JPG, PNG, GIF • Max size: 10MB
                        </p>
                      </div>
                    )}

                    <input
                      id="image-upload-input"
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </div>

                  <div className="flex flex-col justify-center">
                    <Button
                      onClick={() => {
                        if (!uploadedImage) {
                          toast({
                            title: "No Image Selected",
                            description:
                              "Please upload an image first before extracting information",
                            variant: "destructive",
                          });
                          return;
                        }
                        handleOCRExtraction(uploadedImage);
                      }}
                      disabled={!uploadedImage || isExtracting}
                      className="min-w-32"
                    >
                      {isExtracting ? "Extracting..." : "Extract Info"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Outstanding Balances Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-medium text-gray-800">
                Outstanding Balances
              </h2>
            </div>

            <Card>
              <CardContent className="p-0">
                {sampleOutstanding.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Patient</TableHead>
                        <TableHead>Claimed procedure codes</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Adjustment</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sampleOutstanding.map((invoice) => {
                        const patient = patients.find(
                          (p) => p.id === invoice.patientId
                        ) || { firstName: "Sample", lastName: "Patient" };

                        return (
                          <TableRow key={invoice.id}>
                            <TableCell>
                              {patient.firstName} {patient.lastName}
                            </TableCell>
                            <TableCell>{invoice.description}</TableCell>
                            <TableCell>${invoice.amount.toFixed(2)}</TableCell>
                            <TableCell>
                              <Checkbox
                                checked={paidItems[invoice.id] || false}
                                onCheckedChange={(checked) => {
                                  setPaidItems((prev) => ({
                                    ...prev,
                                    [invoice.id]: !!checked,
                                  }));
                                }}
                                className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={adjustmentValues[invoice.id] || ""}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value) || 0;
                                  setAdjustmentValues((prev) => ({
                                    ...prev,
                                    [invoice.id]: value,
                                  }));
                                }}
                                className="w-20 h-8"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={balanceValues[invoice.id] || ""}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value) || 0;
                                  setBalanceValues((prev) => ({
                                    ...prev,
                                    [invoice.id]: value,
                                  }));
                                }}
                                className="w-20 h-8"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleRecordPayment(
                                    invoice.patientId,
                                    invoice.id
                                  )
                                }
                              >
                                Send an invoice
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <h3 className="text-lg font-medium">
                      No outstanding balances
                    </h3>
                    <p className="text-gray-500 mt-1">
                      All patient accounts are current
                    </p>
                  </div>
                )}
              </CardContent>

              {sampleOutstanding.length > 0 && (
                <CardFooter className="flex justify-between px-6 py-4 border-t">
                  <div className="flex items-center text-sm text-gray-500">
                    <ArrowDown className="h-4 w-4 mr-1" />
                    <span>Download statement</span>
                  </div>
                  <div className="font-medium">
                    Total: ${totalOutstanding.toFixed(2)}
                  </div>
                </CardFooter>
              )}
            </Card>
          </div>

          <PaymentsRecentTable
      allowView
      allowEdit
      allowDelete
      />
        </main>
      </div>

      {/* Reimbursement Data Popup */}
      <Dialog
        open={showReimbursementWindow}
        onOpenChange={setShowReimbursementWindow}
      >
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Insurance Reimbursement/Payment Details
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member Name</TableHead>
                  <TableHead>Member ID</TableHead>
                  <TableHead>Procedure Code</TableHead>
                  <TableHead>Date of Service</TableHead>
                  <TableHead>Billed Amount</TableHead>
                  <TableHead>Allowed Amount</TableHead>
                  <TableHead>Paid Amount</TableHead>
                  <TableHead>Delete/Save</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {editableData.map((payment, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      <Input
                        value={payment.memberName}
                        onChange={(e) =>
                          updateEditableData(
                            index,
                            "memberName",
                            e.target.value
                          )
                        }
                        className="border-0 p-1 bg-transparent"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={payment.memberId}
                        onChange={(e) =>
                          updateEditableData(index, "memberId", e.target.value)
                        }
                        className="border-0 p-1 bg-transparent"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={payment.procedureCode}
                        onChange={(e) =>
                          updateEditableData(
                            index,
                            "procedureCode",
                            e.target.value
                          )
                        }
                        className="border-0 p-1 bg-transparent"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={payment.dateOfService}
                        onChange={(e) =>
                          updateEditableData(
                            index,
                            "dateOfService",
                            e.target.value
                          )
                        }
                        className="border-0 p-1 bg-transparent"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={payment.billedAmount}
                        onChange={(e) =>
                          updateEditableData(
                            index,
                            "billedAmount",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="border-0 p-1 bg-transparent"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={payment.allowedAmount}
                        onChange={(e) =>
                          updateEditableData(
                            index,
                            "allowedAmount",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="border-0 p-1 bg-transparent"
                      />
                    </TableCell>
                    <TableCell className="font-medium text-green-600">
                      <Input
                        type="number"
                        step="0.01"
                        value={payment.paidAmount}
                        onChange={(e) =>
                          updateEditableData(
                            index,
                            "paidAmount",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="border-0 p-1 bg-transparent text-green-600 font-medium"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRow(index)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => saveRow(index)}
                          className="h-8 w-8 p-0 text-green-500 hover:text-green-700 hover:bg-green-50"
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {extractedPaymentData.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No payment data extracted
              </div>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => setShowReimbursementWindow(false)}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                toast({
                  title: "Data Processed",
                  description:
                    "Payment information has been processed successfully",
                });
                setShowReimbursementWindow(false);
              }}
            >
              Process Payments
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
