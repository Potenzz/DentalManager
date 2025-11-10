import React from "react";
import { Input } from "@/components/ui/input";

export function RemarksField({
  value,
  onChange,
  debounceMs = 250, // tweak (150–300) if you like
}: {
  value: string;
  onChange: (next: string) => void;
  debounceMs?: number;
}) {
  const [local, setLocal] = React.useState(() => value);

  // Track last prop we saw to detect true external changes
  const lastPropRef = React.useRef(value);
  React.useEffect(() => {
    if (value !== lastPropRef.current && value !== local) {
      // Only sync when parent changed from elsewhere
      setLocal(value);
    }
    lastPropRef.current = value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]); // (intentionally ignoring `local` in deps)

  // Debounce: call parent onChange after user pauses typing
  const timerRef = React.useRef<number | null>(null);
  const schedulePush = React.useCallback(
    (next: string) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        onChange(next);
        // update lastPropRef so the next parent echo won't resync over local
        lastPropRef.current = next;
      }, debounceMs);
    },
    [onChange, debounceMs]
  );

  // Flush on unmount to avoid losing the last input
  React.useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        onChange(local);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-2">
      <Input
        id="remarks"
        placeholder="Paste clinical notes here"
        autoComplete="off"
        spellCheck={false}
        value={local}
        onChange={(e) => {
          const next = e.target.value;
          setLocal(next); // instant local update (no lag)
          schedulePush(next); // debounced parent update
        }}
        onBlur={() => {
          // ensure latest text is pushed when the field loses focus
          if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
          }
          if (local !== lastPropRef.current) {
            onChange(local);
            lastPropRef.current = local;
          }
        }}
      />
    </div>
  );
}
