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

  useEffect(() => {
    if (value) {
      const formatted = format(value, "MM/dd/yyyy");
      setInputValue((prev) => (prev !== formatted ? formatted : prev));
    } else {
      setInputValue("");
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // If the user typed or pasted separators, treat as segmented input.
    if (/\D/.test(raw)) {
      // Split into digit-groups, ignoring empty groups.
      const parts = raw.split(/\D+/).filter(Boolean); // e.g. ["02","12","2003"] or ["02","231996"]

      let mm = "";
      let dd = "";
      let yyyy = "";

      // month is the first group (max 2 chars)
      if (parts.length >= 1) {
        mm = (parts[0] ?? "").slice(0, 2);
      }

      if (parts.length >= 2) {
        const p1 = parts[1] ?? "";

        if (p1.length <= 2) {
          // normal: p1 is day (1-2 digits)
          dd = p1.slice(0, 2);

          // if there are more parts, they form the year
          if (parts.length >= 3) {
            yyyy = parts.slice(2).join("").slice(0, 4);
          }
        } else {
          // overflow: p1 contains day + start-of-year (e.g. "231996")
          dd = p1.slice(0, 2);
          const rest = p1.slice(2) + parts.slice(2).join("");
          yyyy = rest.slice(0, 4);
        }
      }

      // Build display string WITHOUT forcing zero-padding or weird heuristics.
      // This avoids turning user edits like "10" into "00".
      let display = "";
      if (mm) display += mm;
      if (dd || raw.includes("/")) {
        // add slash if there's a day or user typed a slash
        display += "/" + dd;
      }
      if (yyyy || (raw.match(/\//g) || []).length >= 2) {
        // add slash for year if there's a year or user typed two slashes
        display += "/" + yyyy;
      }

      // Trim trailing slash if nothing after it (keeps behavior clean)
      if (display.endsWith("/") && !display.endsWith("//")) {
        // keep single trailing slash only if user typed it explicitly (raw ends with '/'),
        // otherwise remove it to avoid showing an empty trailing slash.
        if (!raw.endsWith("/")) {
          display = display.replace(/\/$/, "");
        }
      }

      setInputValue(display);

      // Only call onChange when we have mm + dd + 4-digit yyyy and the date is valid.
      if (mm.length > 0 && dd.length > 0 && yyyy.length === 4) {
        const parsed = new Date(+yyyy, +mm - 1, +dd);
        if (!isNaN(parsed.getTime())) {
          onChange(parsed);
        }
      }

      return;
    }

    // No separators — free typing digits (incremental)
    // Keep simple: mm (2) / dd (2) / yyyy (4)
    let val = raw.replace(/\D/g, "");

    if (val.length <= 2) {
      setInputValue(val);
    } else if (val.length <= 4) {
      setInputValue(`${val.slice(0, 2)}/${val.slice(2)}`);
    } else {
      const mm = val.slice(0, 2);
      const dd = val.slice(2, 4);
      const yyyy = val.slice(4, 8); // 0..4 chars
      setInputValue(`${mm}/${dd}${yyyy ? `/${yyyy}` : ""}`);

      if (yyyy.length === 4) {
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
