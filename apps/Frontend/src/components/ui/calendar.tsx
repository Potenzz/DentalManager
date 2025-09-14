import { useState, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import type { DateRange } from "react-day-picker";
import "react-day-picker/style.css";

type BaseProps = Omit<
  React.ComponentProps<typeof DayPicker>,
  "mode" | "selected" | "onSelect"
>;

type CalendarProps =
  | (BaseProps & {
      mode: "single";
      selected?: Date;
      onSelect?: (date: Date | undefined) => void;
      closeOnSelect?: boolean /** whether to request closing after selection (default true for single) */;
      onClose?: () => void;
    })
  | (BaseProps & {
      mode: "range";
      selected?: DateRange;
      onSelect?: (range: DateRange | undefined) => void;
      closeOnSelect?: boolean; // will close only when range is complete
      onClose?: () => void;
    })
  | (BaseProps & {
      mode: "multiple";
      selected?: Date[];
      onSelect?: (dates: Date[] | undefined) => void;
      closeOnSelect?: boolean; // default false for multi
      onClose?: () => void;
    });

export function Calendar(props: CalendarProps) {
  const {
    mode,
    selected,
    onSelect,
    className,
    closeOnSelect,
    onClose,
    ...rest
  } = props;

  const [internalSelected, setInternalSelected] =
    useState<typeof selected>(selected);

  useEffect(() => {
    setInternalSelected(selected);
  }, [selected]);

  const handleSelect = (value: typeof selected) => {
    setInternalSelected(value);
    // forward original callback
    onSelect?.(value as any);

    // Decide whether to request closing
    const shouldClose =
      typeof closeOnSelect !== "undefined"
        ? closeOnSelect
        : mode === "single"
          ? true
          : false;

    if (!shouldClose) return;

    // For range: only close when both from and to exist
    if (mode === "range") {
      const range = value as DateRange | undefined;
      if (range?.from && range?.to) {
        onClose?.();
      }
      return;
    }

    // For single or multiple (when allowed), close immediately
    onClose?.();
  };

  return (
    <div
      className={`${className || ""} day-picker-small-scale`}
      style={{
        transform: "scale(0.9)",
        transformOrigin: "top left",
        width: "fit-content",
        height: "fit-content",
      }}
    >
      {mode === "single" && (
        <DayPicker
          mode="single"
          selected={internalSelected as Date | undefined}
          onSelect={handleSelect as (date: Date | undefined) => void}
          captionLayout="dropdown" // ✅ Enables month/year dropdown
          {...rest}
        />
      )}
      {mode === "range" && (
        <DayPicker
          mode="range"
          selected={internalSelected as DateRange | undefined}
          onSelect={handleSelect as (range: DateRange | undefined) => void}
          {...rest}
        />
      )}
      {mode === "multiple" && (
        <DayPicker
          mode="multiple"
          selected={internalSelected as Date[] | undefined}
          onSelect={handleSelect as (dates: Date[] | undefined) => void}
          {...rest}
        />
      )}
    </div>
  );
}
