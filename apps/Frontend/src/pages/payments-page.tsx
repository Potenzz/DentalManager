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
  CardDescription,
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

export default function PaymentsPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [paymentPeriod, setPaymentPeriod] = useState<string>("all-time");
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [extractedPaymentData, setExtractedPaymentData] = useState<any[]>([]);
  const [editableData, setEditableData] = useState<any[]>([]);

  const { toast } = useToast();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
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
                  <div className="text-2xl font-bold">$0</div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  From 0 outstanding invoices
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
                  <div className="text-2xl font-bold">${0}</div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  From 0 completed payments
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
                  <div className="text-2xl font-bold">$0</div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  From 0 pending transactions
                </p>
              </CardContent>
            </Card>
          </div>

          {/* OCR Image Upload Section - not working rn*/}
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

          {/* Recent Payments table  */}
          <Card>
            <CardHeader>
              <CardTitle>Payment's Records</CardTitle>
              <CardDescription>
                View and manage all recents patient's claims payments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentsRecentTable allowEdit allowDelete />
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
