import { useState, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import type { DateRange } from "react-day-picker";
import "react-day-picker/style.css";

type BaseProps = Omit<React.ComponentProps<typeof DayPicker>, 'mode' | 'selected' | 'onSelect'>;

type CalendarProps =
  | (BaseProps & {
      mode: 'single';
      selected?: Date;
      onSelect?: (date: Date | undefined) => void;
    })
  | (BaseProps & {
      mode: 'range';
      selected?: DateRange;
      onSelect?: (range: DateRange | undefined) => void;
    })
  | (BaseProps & {
      mode: 'multiple';
      selected?: Date[];
      onSelect?: (dates: Date[] | undefined) => void;
    });

export function Calendar(props: CalendarProps) {
  const { mode, selected, onSelect, className, ...rest } = props;

  const [internalSelected, setInternalSelected] = useState<typeof selected>(selected);

  useEffect(() => {
    setInternalSelected(selected);
  }, [selected]);

  const handleSelect = (value: typeof selected) => {
    setInternalSelected(value);
    onSelect?.(value as any); // We'll narrow this properly below
  };

  return (
    <div
      className={`${className || ''} day-picker-small-scale`}
      style={{
        transform: 'scale(0.9)',
        transformOrigin: 'top left',
        width: 'fit-content',
        height: 'fit-content',
      }}
    >
      {mode === 'single' && (
        <DayPicker
          mode="single"
          selected={internalSelected as Date | undefined}
          onSelect={handleSelect as (date: Date | undefined) => void}
          {...rest}
        />
      )}
      {mode === 'range' && (
        <DayPicker
          mode="range"
          selected={internalSelected as DateRange | undefined}
          onSelect={handleSelect as (range: DateRange | undefined) => void}
          {...rest}
        />
      )}
      {mode === 'multiple' && (
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
