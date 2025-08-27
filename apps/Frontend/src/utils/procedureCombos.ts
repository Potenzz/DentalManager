export const PROCEDURE_COMBOS: Record<
  string,
  { id: string; label: string; codes: string[] }
> = {
  childRecall: {
    id: "childRecall",
    label: "Child Recall",
    codes: [
      "D0120",
      "D1120",
      "D0272",
      "D1208",
      "D2331",
      "D0120",
      "D1120",
      "D0272",
      "D1208",
      "D2331",
      "D0120",
      "D1120",
      "D0272",
      "D1208",
      "D2331",
    ],
  },
  adultProphy: {
    id: "adultProphy",
    label: "Adult Prophy",
    codes: ["D0150", "D1110", "D0274", "D1208"],
  },
  bitewingsOnly: {
    id: "bitewingsOnly",
    label: "Bitewings Only",
    codes: ["D0272"],
  },
  // add more…
};
