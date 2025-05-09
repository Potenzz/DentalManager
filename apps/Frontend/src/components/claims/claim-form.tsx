import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, parse } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { X, Calendar as CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
// import { Patient } from "@repo/db/shared/schemas";
import { PatientUncheckedCreateInputObjectSchema } from "@repo/db/shared/schemas";
import {z} from "zod";

const PatientSchema = (PatientUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>).omit({
  appointments: true,
});
type Patient = z.infer<typeof PatientSchema>;

interface ClaimFormProps {
  patientId: number;
  appointmentId: number;
  patientName: string;
  onClose: () => void;
  patientData?: Patient;
}

export function ClaimForm({ 
  patientId, 
  appointmentId, 
  patientName, 
  onClose,
  patientData 
}: ClaimFormProps) {
  const { toast } = useToast();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(false);
  const [serviceDateValue, setServiceDateValue] = useState<Date>(new Date());
  const [serviceDate, setServiceDate] = useState<string>(format(new Date(), 'MM/dd/yy'));
  const [clinicalNotes, setClinicalNotes] = useState<string>('');
  
  // Fetch patient data if not provided
  useEffect(() => {
    if (patientData) {
      setPatient(patientData);
      return;
    }
    
    const fetchPatient = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/patients/${patientId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch patient data");
        }
        const data = await response.json();
        setPatient(data);
      } catch (error) {
        console.error("Error fetching patient:", error);
        toast({
          title: "Error",
          description: "Failed to load patient information",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (patientId) {
      fetchPatient();
    }
  }, [patientId, patientData, toast]);



  // Update service date when calendar date changes
  const onServiceDateChange = (date: Date | undefined) => {
    if (date) {
      setServiceDateValue(date);
      setServiceDate(format(date, 'MM/dd/yy'));
    }
  };

  // Determine patient date of birth format
  const formatDOB = (dob: string | undefined) => {
    if (!dob) return '';
    
    // If already in MM/DD/YYYY format, return as is
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dob)) {
      return dob;
    }
    
    // If in YYYY-MM-DD format, convert to MM/DD/YYYY
    if (/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      const [year, month, day] = dob.split('-');
      return `${month}/${day}/${year}`;
    }
    
    return dob;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-white">
        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
          <CardTitle className="text-xl font-bold">Insurance Claim Form</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-6">
            {/* Patient Information */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label htmlFor="memberId">Member ID</Label>
                <Input 
                  id="memberId" 
                  value={patient?.insuranceId || ''} 
                  disabled={loading} 
                />
              </div>
              <div>
                <Label htmlFor="dateOfBirth">Date Of Birth</Label>
                <Input 
                  id="dateOfBirth" 
                  value={formatDOB(patient?.dateOfBirth)} 
                  disabled={loading} 
                />
              </div>
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input 
                  id="firstName" 
                  value={patient?.firstName || ''} 
                  disabled={loading} 
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input 
                  id="lastName" 
                  value={patient?.lastName || ''} 
                  disabled={loading} 
                />
              </div>
            </div>



            {/* Clinical Notes Entry */}
            <div className="mb-4 flex items-center gap-2">
              <Label htmlFor="clinicalNotes" className="whitespace-nowrap">Clinical Notes:</Label>
              <Input 
                id="clinicalNotes"
                className="flex-grow"
                placeholder="Paste clinical notes here"
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  if (clinicalNotes.trim()) {
                    toast({
                      title: "Field Extraction",
                      description: "Clinical notes have been processed",
                    });
                    // Here you would add actual parsing logic to extract values
                    // from the clinicalNotes and update form fields
                  } else {
                    toast({
                      title: "Empty Input",
                      description: "Please enter clinical notes to extract",
                      variant: "destructive"
                    });
                  }
                }}
              >
                Extract Fields
              </Button>
            </div>

            {/* Service Lines */}
            <div>
              <h3 className="text-xl font-semibold mb-2 text-center">Service Lines</h3>
              <div className="flex justify-end items-center mb-2">
                <div className="flex gap-2">
                  <Label className="flex items-center">Service Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-[120px] justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {serviceDate}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={serviceDateValue}
                        onSelect={onServiceDateChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Label className="flex items-center ml-2">Treating Doctor</Label>
                  <Select defaultValue="doctor1">
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Select Doctor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="doctor1">Kai Gao</SelectItem>
                      <SelectItem value="doctor2">Jane Smith</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-6 gap-4 mb-2">
                <div>
                  <Label htmlFor="procedureCode1">Procedure Code</Label>
                  <Input id="procedureCode1" placeholder="e.g. D0120" />
                </div>
                <div>
                  <Label htmlFor="toothNumber1">Tooth Number</Label>
                  <Input id="toothNumber1" placeholder="e.g. 14" />
                </div>
                <div>
                  <Label htmlFor="surface1">Surface</Label>
                  <Input id="surface1" placeholder="e.g. MOD" />
                </div>
                <div>
                  <Label htmlFor="quad1">Quad</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UR">Upper Right</SelectItem>
                      <SelectItem value="UL">Upper Left</SelectItem>
                      <SelectItem value="LR">Lower Right</SelectItem>
                      <SelectItem value="LL">Lower Left</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="authNo1">Auth No.</Label>
                  <Input id="authNo1" />
                </div>
                <div>
                  <Label htmlFor="billedAmount1">Billed Amount</Label>
                  <Input id="billedAmount1" placeholder="$0.00" />
                </div>
              </div>

              {/* Add more service lines - simplified for clarity */}
              {[2, 3, 4, 5].map(i => (
                <div key={i} className="grid grid-cols-6 gap-4 mb-2">
                  <Input placeholder="Procedure Code" />
                  <Input placeholder="Tooth Number" />
                  <Input placeholder="Surface" />
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UR">Upper Right</SelectItem>
                      <SelectItem value="UL">Upper Left</SelectItem>
                      <SelectItem value="LR">Lower Right</SelectItem>
                      <SelectItem value="LL">Lower Left</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="Auth No." />
                  <Input placeholder="$0.00" />
                </div>
              ))}

              <div className="flex gap-2 mt-4">
                <Button variant="outline">Child Prophy Codes</Button>
                <Button variant="outline">Adult Prophy Codes</Button>
                <Button variant="outline">Customized Group Codes</Button>
                <Button variant="outline">Map Price</Button>
              </div>

              {/* File Upload Section */}
              <div className="mt-4 bg-gray-100 p-3 rounded-md">
                <p className="text-sm text-gray-500 mb-2">Please note that file types with 4 or more character extensions are not allowed, such as .DOCX, .PPTX, or .XLSX</p>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Label>Select Field:</Label>
                    <Select defaultValue="supportData">
                      <SelectTrigger className="w-60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="supportData">Support Data for Claim</SelectItem>
                        <SelectItem value="xrays">X-Ray Images</SelectItem>
                        <SelectItem value="photos">Clinical Photos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button>Upload Document</Button>
                </div>
              </div>
            </div>

            {/* Insurance Carriers */}
            <div>
              <h3 className="text-xl font-semibold mb-4 text-center">Insurance Carriers</h3>
              <div className="flex justify-between">
                <Button className="w-32" variant="outline">Delta MA</Button>
                <Button className="w-32" variant="outline">MH</Button>
                <Button className="w-32" variant="outline">Others</Button>
              </div>
            </div>


          </div>
        </CardContent>
      </Card>
    </div>
  );
}