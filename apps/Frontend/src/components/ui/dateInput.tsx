import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateInputProps {
  label?: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  disableFuture?: boolean;
  disablePast?: boolean;
}

// THIS COMPONENT IS MADE FOR GENERAL FIELD IN PAGE.
// Here, User can input/paste date in certain format, and also select via calendar
export function DateInput({
  label,
  value,
  onChange,
  disableFuture = false,
  disablePast = false,
}: DateInputProps) {
  const [inputValue, setInputValue] = useState(
    value ? format(value, "MM/dd/yyyy") : ""
  );
  const [open, setOpen] = useState(false);

  // Keep inputValue in sync when parent 'value' changes.
  // Only overwrite if different to avoid stomping an in-progress user edit.
  useEffect(() => {
    if (value) {
      const formatted = format(value, "MM/dd/yyyy");
      setInputValue((prev) => (prev !== formatted ? formatted : prev));
    } else {
      // parent cleared the value
      setInputValue("");
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length >= 5) {
      val = `${val.slice(0, 2)}/${val.slice(2, 4)}/${val.slice(4, 8)}`;
    } else if (val.length >= 3) {
      val = `${val.slice(0, 2)}/${val.slice(2, 4)}`;
    }
    setInputValue(val);

    if (val.length === 10) {
      const [mm, dd, yyyy] = val.split("/") ?? [];
      if (mm && dd && yyyy) {
        const parsed = new Date(+yyyy, +mm - 1, +dd);
        if (!isNaN(parsed.getTime())) {
          onChange(parsed);
        }
      }
    }
  };

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium">{label}</label>}
      <div className="flex gap-2">
        <Input
          placeholder="MM/DD/YYYY"
          value={inputValue}
          onChange={handleInputChange}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" className={cn("px-3")}>
              <CalendarIcon className="h-4 w-4 opacity-70" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4">
            <Calendar
              mode="single"
              selected={value ?? undefined}
              defaultMonth={value ?? undefined}
              onSelect={(date) => {
                if (date) {
                  setInputValue(format(date, "MM/dd/yyyy"));
                  onChange(date);
                  setOpen(false);
                }
              }}
              disabled={
                disableFuture
                  ? { after: new Date() }
                  : disablePast
                    ? { before: new Date() }
                    : undefined
              }
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
