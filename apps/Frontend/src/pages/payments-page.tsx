import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TopAppBar } from "@/components/layout/top-app-bar";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
// import { Patient, Appointment } from "@repo/db/shared/schemas";
import { Patient, Appointment } from "@repo/db/shared/schemas";
import { 
  CreditCard, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  DollarSign, 
  Receipt, 
  Plus,
  ArrowDown,
  ReceiptText
} from "lucide-react";
import { format } from "date-fns";
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function PaymentsPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [paymentPeriod, setPaymentPeriod] = useState<string>("all-time");
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch patients
  const { data: patients = [], isLoading: isLoadingPatients } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
    enabled: !!user,
  });
  
  // Fetch appointments
  const { 
    data: appointments = [] as Appointment[], 
    isLoading: isLoadingAppointments 
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
      amount: 75.00,
      date: new Date(new Date().setDate(new Date().getDate() - 2)),
      method: "Credit Card",
      status: "completed",
      description: "Co-pay for cleaning"
    },
    {
      id: "PMT-1002",
      patientId: patients[0]?.id || 1,
      amount: 150.00,
      date: new Date(new Date().setDate(new Date().getDate() - 7)),
      method: "Insurance",
      status: "processing",
      description: "Insurance claim for x-rays"
    },
    {
      id: "PMT-1003",
      patientId: patients[0]?.id || 1,
      amount: 350.00,
      date: new Date(new Date().setDate(new Date().getDate() - 14)),
      method: "Check",
      status: "completed",
      description: "Payment for root canal"
    },
    {
      id: "PMT-1004",
      patientId: patients[0]?.id || 1,
      amount: 120.00,
      date: new Date(new Date().setDate(new Date().getDate() - 30)),
      method: "Credit Card",
      status: "completed",
      description: "Filling procedure"
    }
  ];

  // Sample outstanding balances
  const sampleOutstanding = [
    {
      id: "INV-5001",
      patientId: patients[0]?.id || 1,
      amount: 210.50,
      dueDate: new Date(new Date().setDate(new Date().getDate() + 7)),
      description: "Crown procedure",
      created: new Date(new Date().setDate(new Date().getDate() - 10)),
      status: "pending"
    },
    {
      id: "INV-5002",
      patientId: patients[0]?.id || 1,
      amount: 85.00,
      dueDate: new Date(new Date().setDate(new Date().getDate() - 5)),
      description: "Diagnostic & preventive",
      created: new Date(new Date().setDate(new Date().getDate() - 20)),
      status: "overdue"
    }
  ];

  // Calculate summary data
  const totalOutstanding = sampleOutstanding.reduce((sum, item) => sum + item.amount, 0);
  const totalCollected = samplePayments
    .filter(payment => payment.status === "completed")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const pendingAmount = samplePayments
    .filter(payment => payment.status === "processing")
    .reduce((sum, payment) => sum + payment.amount, 0);

  const handleRecordPayment = (patientId: number, invoiceId?: string) => {
    const patient = patients.find(p => p.id === patientId);
    toast({
      title: "Payment form opened",
      description: `Recording payment for ${patient?.firstName} ${patient?.lastName}${invoiceId ? ` (Invoice: ${invoiceId})` : ''}`,
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <Sidebar isMobileOpen={isMobileMenuOpen} setIsMobileOpen={setIsMobileMenuOpen} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopAppBar toggleMobileMenu={toggleMobileMenu} />
        
        <main className="flex-1 overflow-y-auto p-4">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">Payments</h1>
              <p className="text-gray-600">Manage patient payments and outstanding balances</p>
            </div>
            
            <div className="mt-4 md:mt-0 flex items-center space-x-2">
              <Select 
                defaultValue="all-time" 
                onValueChange={value => setPaymentPeriod(value)}
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
              
              <Button onClick={() => handleRecordPayment(patients[0]?.id || 1)}>
                <Plus className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            </div>
          </div>

          {/* Payment Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Outstanding Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <DollarSign className="h-5 w-5 text-yellow-500 mr-2" />
                  <div className="text-2xl font-bold">${totalOutstanding.toFixed(2)}</div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  From {sampleOutstanding.length} outstanding invoices
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Payments Collected</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <DollarSign className="h-5 w-5 text-green-500 mr-2" />
                  <div className="text-2xl font-bold">${totalCollected.toFixed(2)}</div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  From {samplePayments.filter(p => p.status === "completed").length} completed payments
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Pending Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <DollarSign className="h-5 w-5 text-blue-500 mr-2" />
                  <div className="text-2xl font-bold">${pendingAmount.toFixed(2)}</div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  From {samplePayments.filter(p => p.status === "processing").length} pending transactions
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Outstanding Balances Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-medium text-gray-800">Outstanding Balances</h2>
            </div>
            
            <Card>
              <CardContent className="p-0">
                {sampleOutstanding.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Patient</TableHead>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sampleOutstanding.map((invoice) => {
                        const patient = patients.find(p => p.id === invoice.patientId) || 
                          { firstName: "Sample", lastName: "Patient" };
                          
                        return (
                          <TableRow key={invoice.id}>
                            <TableCell>
                              {patient.firstName} {patient.lastName}
                            </TableCell>
                            <TableCell>{invoice.id}</TableCell>
                            <TableCell>{invoice.description}</TableCell>
                            <TableCell>${invoice.amount.toFixed(2)}</TableCell>
                            <TableCell>{format(invoice.dueDate, 'MMM dd, yyyy')}</TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                invoice.status === 'overdue' 
                                  ? 'bg-red-100 text-red-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {invoice.status === 'overdue' ? (
                                  <>
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Overdue
                                  </>
                                ) : (
                                  <>
                                    <Clock className="h-3 w-3 mr-1" />
                                    Pending
                                  </>
                                )}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleRecordPayment(invoice.patientId, invoice.id)}
                              >
                                Pay Now
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
                    <h3 className="text-lg font-medium">No outstanding balances</h3>
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
          
          {/* Recent Payments Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-medium text-gray-800">Recent Payments</h2>
            </div>
            
            <Card>
              <CardContent className="p-0">
                {samplePayments.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Patient</TableHead>
                        <TableHead>Payment ID</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {samplePayments.map((payment) => {
                        const patient = patients.find(p => p.id === payment.patientId) || 
                          { firstName: "Sample", lastName: "Patient" };
                          
                        return (
                          <TableRow key={payment.id}>
                            <TableCell>
                              {patient.firstName} {patient.lastName}
                            </TableCell>
                            <TableCell>{payment.id}</TableCell>
                            <TableCell>{payment.description}</TableCell>
                            <TableCell>{format(payment.date, 'MMM dd, yyyy')}</TableCell>
                            <TableCell>${payment.amount.toFixed(2)}</TableCell>
                            <TableCell>{payment.method}</TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                payment.status === 'completed' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {payment.status === 'completed' ? (
                                  <>
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Completed
                                  </>
                                ) : (
                                  <>
                                    <Clock className="h-3 w-3 mr-1" />
                                    Processing
                                  </>
                                )}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => {
                                  toast({
                                    title: "Receipt Generated",
                                    description: `Receipt for payment ${payment.id} has been generated`,
                                  });
                                }}
                              >
                                <ReceiptText className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <Receipt className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <h3 className="text-lg font-medium">No payment history</h3>
                    <p className="text-gray-500 mt-1">
                      Payments will appear here once processed
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}