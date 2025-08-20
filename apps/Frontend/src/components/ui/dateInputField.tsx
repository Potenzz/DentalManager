import { format } from "date-fns";
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { DateInput } from "@/components/ui/dateInput";
import { parseLocalDate } from "@/utils/dateUtils";

interface DateInputFieldProps {
  control: any;
  name: string;
  label: string;
  disableFuture?: boolean;
  disablePast?: boolean;
}

export function DateInputField({
  control,
  name,
  label,
  disableFuture,
  disablePast,
}: DateInputFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <DateInput
            value={field.value ? parseLocalDate(field.value) : null}
            onChange={(date) =>
              field.onChange(date ? format(date, "yyyy-MM-dd") : null)
            }
            disableFuture={disableFuture}
            disablePast={disablePast}
          />
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
