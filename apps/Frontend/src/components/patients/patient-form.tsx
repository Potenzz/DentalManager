import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PatientUncheckedCreateInputObjectSchema } from "@repo/db/usedSchemas";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useMemo } from "react";
import { forwardRef, useImperativeHandle } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "../ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { formatLocalDate, parseLocalDate } from "@/utils/dateUtils";

const PatientSchema = (
  PatientUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
).omit({
  appointments: true,
});
type Patient = z.infer<typeof PatientSchema>;

const insertPatientSchema = (
  PatientUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
).omit({
  id: true,
  createdAt: true,
  userId: true,
});
type InsertPatient = z.infer<typeof insertPatientSchema>;

const updatePatientSchema = (
  PatientUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
)
  .omit({
    id: true,
    createdAt: true,
    userId: true,
  })
  .partial();

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

export type PatientFormRef = {
  submit: () => void;
};

export const PatientForm = forwardRef<PatientFormRef, PatientFormProps>(
  ({ patient, extractedInfo, onSubmit }, ref) => {
    const { user } = useAuth();
    const isEditing = !!patient;

    const schema = useMemo(
      () =>
        isEditing
          ? updatePatientSchema
          : insertPatientSchema.extend({ userId: z.number().optional() }),
      [isEditing]
    );

    const computedDefaultValues = useMemo(() => {
      if (isEditing && patient) {
        const { id, userId, createdAt, ...sanitizedPatient } = patient;
        return {
          ...sanitizedPatient,
          dateOfBirth: patient.dateOfBirth
            ? formatLocalDate(new Date(patient.dateOfBirth))
            : "",
        };
      }
      return {
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
    }, [isEditing, patient, extractedInfo, user?.id]);

    const form = useForm<InsertPatient | UpdatePatient>({
      resolver: zodResolver(schema),
      defaultValues: computedDefaultValues,
    });

    useImperativeHandle(ref, () => ({
      submit() {
        (
          document.getElementById("patient-form") as HTMLFormElement | null
        )?.requestSubmit();
      },
    }));

    // Debug form errors
    useEffect(() => {
      const errors = form.formState.errors;
      if (Object.keys(errors).length > 0) {
        console.log("❌ Form validation errors:", errors);
      }
    }, [form.formState.errors]);

    useEffect(() => {
      if (patient) {
        const { id, userId, createdAt, ...sanitizedPatient } = patient;
        const resetValues: Partial<Patient> = {
          ...sanitizedPatient,
          dateOfBirth: patient.dateOfBirth
            ? formatLocalDate(new Date(patient.dateOfBirth))
            : "",
        };
        form.reset(resetValues);
      }
    }, [patient, computedDefaultValues, form]);

    const handleSubmit2 = (data: InsertPatient | UpdatePatient) => {
      onSubmit(data);
    };

    return (
      <Form {...form}>
        <form
          id="patient-form"
          key={patient?.id || "new"}
          onSubmit={form.handleSubmit((data) => {
            handleSubmit2(data);
          })}
          className="space-y-6"
        >
          {/* Personal Information */}
          <div>
            <h4 className="text-md font-medium text-gray-700 mb-3">
              Personal Information
            </h4>
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
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(parseLocalDate(field.value), "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-4">
                        <Calendar
                          mode="single"
                          selected={
                            field.value
                              ? parseLocalDate(field.value)
                              : undefined
                          }
                          onSelect={(date) => {
                            if (date) {
                              const localDate = formatLocalDate(date); // keep yyyy-MM-dd
                              field.onChange(localDate);
                            }
                          }}
                          disabled={
                            (date) => date > new Date() // Prevent future dates
                          }
                        />
                      </PopoverContent>
                    </Popover>
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
            <h4 className="text-md font-medium text-gray-700 mb-3">
              Contact Information
            </h4>
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
                      <Input
                        type="email"
                        {...field}
                        value={field.value || ""}
                      />
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
                      <Input {...field} value={field.value || ""} />
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
                      <Input {...field} value={field.value || ""} />
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
                      <Input {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Insurance Information */}
          <div>
            <h4 className="text-md font-medium text-gray-700 mb-3">
              Insurance Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      defaultValue="active"
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="insuranceProvider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Insurance Provider</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={(field.value as string) || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="placeholder">
                          Select provider
                        </SelectItem>
                        <SelectItem value="Mass Health">Mass Health</SelectItem>
                        <SelectItem value="Delta MA">Delta MA</SelectItem>
                        <SelectItem value="Metlife">MetLife</SelectItem>
                        <SelectItem value="Cigna">Cigna</SelectItem>
                        <SelectItem value="Aetna">Aetna</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
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
                      <Input {...field} value={field.value || ""} />
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
                      <Input {...field} value={field.value || ""} />
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
                      <Input {...field} value={field.value || ""} />
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
);
