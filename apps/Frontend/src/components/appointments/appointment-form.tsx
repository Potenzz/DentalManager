import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { InsertAppointment, UpdateAppointment, Appointment, Patient } from "@shared/schema";

// Define staff members (should match those in appointments-page.tsx)
const staffMembers = [
  { id: "doctor1", name: "Dr. Kai Gao", role: "doctor" },
  { id: "doctor2", name: "Dr. Jane Smith", role: "doctor" },
  { id: "hygienist1", name: "Hygienist One", role: "hygienist" },
  { id: "hygienist2", name: "Hygienist Two", role: "hygienist" },
  { id: "hygienist3", name: "Hygienist Three", role: "hygienist" },
];
import { Button } from "@/components/ui/button";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

// Create a schema for appointment validation
const appointmentSchema = z.object({
  patientId: z.coerce.number().positive(),
  title: z.string().optional(),
  date: z.date({
    required_error: "Appointment date is required",
  }),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: "Start time must be in format HH:MM",
  }),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: "End time must be in format HH:MM",
  }),
  type: z.string().min(1, "Appointment type is required"),
  notes: z.string().optional(),
  status: z.string().default("scheduled"),
  staff: z.string().default(staffMembers[0].id),
});

export type AppointmentFormValues = z.infer<typeof appointmentSchema>;

interface AppointmentFormProps {
  appointment?: Appointment;
  patients: Patient[];
  onSubmit: (data: InsertAppointment | UpdateAppointment) => void;
  isLoading?: boolean;
}

export function AppointmentForm({ 
  appointment, 
  patients, 
  onSubmit, 
  isLoading = false 
}: AppointmentFormProps) {
  // Get the stored data from session storage
  const storedDataString = sessionStorage.getItem('newAppointmentData');
  let parsedStoredData = null;
  
  // Try to parse it if it exists
  if (storedDataString) {
    try {
      parsedStoredData = JSON.parse(storedDataString);
      console.log('Initial appointment data from storage:', parsedStoredData);
      
      // LOG the specific time values for debugging
      console.log('Time values in stored data:', {
        startTime: parsedStoredData.startTime,
        endTime: parsedStoredData.endTime
      });
    } catch (error) {
      console.error('Error parsing stored appointment data:', error);
    }
  }
  
  // Format the date and times for the form
  const defaultValues: Partial<AppointmentFormValues> = appointment
    ? {
        patientId: appointment.patientId,
        title: appointment.title,
        date: new Date(appointment.date),
        startTime: appointment.startTime.slice(0, 5), // HH:MM from HH:MM:SS
        endTime: appointment.endTime.slice(0, 5), // HH:MM from HH:MM:SS
        type: appointment.type,
        notes: appointment.notes || "",
        status: appointment.status || "scheduled",
      }
    : parsedStoredData
      ? {
          patientId: parsedStoredData.patientId,
          date: new Date(parsedStoredData.date),
          title: parsedStoredData.title || "",
          startTime: parsedStoredData.startTime, // This should now be correctly applied
          endTime: parsedStoredData.endTime,
          type: parsedStoredData.type || "checkup",
          status: parsedStoredData.status || "scheduled",
          notes: parsedStoredData.notes || "",
          staff: parsedStoredData.staff || staffMembers[0].id,
        }
      : {
          date: new Date(),
          title: "",
          startTime: "09:00",
          endTime: "09:30",
          type: "checkup",
          status: "scheduled",
          staff: "doctor1",
        };

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues,
  });
  
  // Force form field values to update and clean up storage
  useEffect(() => {
    if (parsedStoredData) {
      // Force-update the form with the stored values
      console.log("Force updating form fields with:", parsedStoredData);
      
      // Update form field values directly
      if (parsedStoredData.startTime) {
        form.setValue('startTime', parsedStoredData.startTime);
        console.log(`Setting startTime to: ${parsedStoredData.startTime}`);
      }
      
      if (parsedStoredData.endTime) {
        form.setValue('endTime', parsedStoredData.endTime);
        console.log(`Setting endTime to: ${parsedStoredData.endTime}`);
      }
      
      if (parsedStoredData.staff) {
        form.setValue('staff', parsedStoredData.staff);
      }
      
      if (parsedStoredData.date) {
        form.setValue('date', new Date(parsedStoredData.date));
      }
      
      // Clean up session storage
      sessionStorage.removeItem('newAppointmentData');
    }
  }, [form]);

  const handleSubmit = (data: AppointmentFormValues) => {
    // Convert date to string format for the API and ensure patientId is properly parsed as a number
    console.log("Form data before submission:", data);
    
    // Make sure patientId is a number
    const patientId = typeof data.patientId === 'string' 
      ? parseInt(data.patientId, 10) 
      : data.patientId;
    
    // Get patient name for the title
    const patient = patients.find(p => p.id === patientId);
    const patientName = patient ? `${patient.firstName} ${patient.lastName}` : 'Patient';
    
    // Auto-create title if it's empty
    let title = data.title;
    if (!title || title.trim() === '') {
      // Format: "April 19" - just the date
      title = format(data.date, 'MMMM d');
    }
    
    // Make sure notes include staff information (needed for appointment display in columns)
    let notes = data.notes || '';
    
    // Get the selected staff member
    const selectedStaff = staffMembers.find(staff => staff.id === data.staff) || staffMembers[0];
    
    // If there's no staff information in the notes, add it
    if (!notes.includes('Appointment with')) {
      notes = notes ? `${notes}\nAppointment with ${selectedStaff.name}` : `Appointment with ${selectedStaff.name}`;
    }
    
    onSubmit({
      ...data,
      title,
      notes,
      patientId, // Ensure patientId is a number
      date: format(data.date, 'yyyy-MM-dd'),
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="patientId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Patient</FormLabel>
              <Select
                disabled={isLoading}
                onValueChange={field.onChange}
                value={field.value?.toString()}
                defaultValue={field.value?.toString()}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a patient" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id.toString()}>
                      {patient.firstName} {patient.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Appointment Title <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
              <FormControl>
                <Input 
                  placeholder="Leave blank to auto-fill with date" 
                  {...field} 
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                      disabled={isLoading}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date < new Date(new Date().setHours(0, 0, 0, 0))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Time</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="09:00"
                      {...field}
                      disabled={isLoading}
                      className="pl-10"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Time</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="09:30"
                      {...field}
                      disabled={isLoading}
                      className="pl-10"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Appointment Type</FormLabel>
              <Select
                disabled={isLoading}
                onValueChange={field.onChange}
                value={field.value}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="checkup">Checkup</SelectItem>
                  <SelectItem value="cleaning">Cleaning</SelectItem>
                  <SelectItem value="filling">Filling</SelectItem>
                  <SelectItem value="extraction">Extraction</SelectItem>
                  <SelectItem value="root-canal">Root Canal</SelectItem>
                  <SelectItem value="crown">Crown</SelectItem>
                  <SelectItem value="dentures">Dentures</SelectItem>
                  <SelectItem value="consultation">Consultation</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select
                disabled={isLoading}
                onValueChange={field.onChange}
                value={field.value}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="no-show">No Show</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="staff"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Doctor/Hygienist</FormLabel>
              <Select
                disabled={isLoading}
                onValueChange={field.onChange}
                value={field.value}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {staffMembers.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.name} ({staff.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter any notes about the appointment"
                  {...field}
                  disabled={isLoading}
                  className="min-h-24"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" disabled={isLoading} className="w-full">
          {appointment ? "Update Appointment" : "Create Appointment"}
        </Button>
      </form>
    </Form>
  );
}