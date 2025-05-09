import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PatientUncheckedCreateInputObjectSchema } from "@repo/db/shared/schemas";
// import { insertPatientSchema, InsertPatient, Patient, updatePatientSchema, UpdatePatient } from "@repo/db/shared/schemas";
import { useAuth } from "@/hooks/use-auth";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PatientSchema = (PatientUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>).omit({
  appointments: true,
});
type Patient = z.infer<typeof PatientSchema>;

const insertPatientSchema = (PatientUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>).omit({
  id: true,
  createdAt: true,
});
type InsertPatient = z.infer<typeof insertPatientSchema>;

const updatePatientSchema = (PatientUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>).omit({
  id: true,
  createdAt: true,
  userId: true,
}).partial();

type UpdatePatient = z.infer<typeof updatePatientSchema>;


interface PatientFormProps {
  patient?: Patient;
  extractedInfo?: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    insuranceId: string;
  };
  onSubmit: (data: InsertPatient | UpdatePatient) => void;
}

export function PatientForm({ patient, extractedInfo, onSubmit }: PatientFormProps) {
  const { user } = useAuth();
  const isEditing = !!patient;
  
  const schema = isEditing ? updatePatientSchema : insertPatientSchema.extend({
    userId: z.number().optional(),
  });

  // Merge extracted info into default values if available
  const defaultValues = {
    firstName: extractedInfo?.firstName || "",
    lastName: extractedInfo?.lastName || "",
    dateOfBirth: extractedInfo?.dateOfBirth || "",
    gender: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    zipCode: "",
    insuranceProvider: "",
    insuranceId: extractedInfo?.insuranceId || "",
    groupNumber: "",
    policyHolder: "",
    allergies: "",
    medicalConditions: "",
    status: "active",
    userId: user?.id,
  };
  
  const form = useForm<InsertPatient | UpdatePatient>({
    resolver: zodResolver(schema),
    defaultValues: patient || defaultValues,
  });

  const handleSubmit = (data: InsertPatient | UpdatePatient) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Personal Information */}
        <div>
          <h4 className="text-md font-medium text-gray-700 mb-3">Personal Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Birth *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender *</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value as string}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        
        {/* Contact Information */}
        <div>
          <h4 className="text-md font-medium text-gray-700 mb-3">Contact Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="zipCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ZIP Code</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        
        {/* Insurance Information */}
        <div>
          <h4 className="text-md font-medium text-gray-700 mb-3">Insurance Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="insuranceProvider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Insurance Provider</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value as string || ''}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="placeholder">Select provider</SelectItem>
                      <SelectItem value="delta">Delta Dental</SelectItem>
                      <SelectItem value="metlife">MetLife</SelectItem>
                      <SelectItem value="cigna">Cigna</SelectItem>
                      <SelectItem value="aetna">Aetna</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="insuranceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Insurance ID</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="groupNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group Number</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="policyHolder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Policy Holder (if not self)</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        
        {/* Hidden submit button for form validation */}
        <button type="submit" className="hidden" aria-hidden="true"></button>
      </form>
    </Form>
  );
}
