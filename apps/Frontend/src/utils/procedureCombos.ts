export const PROCEDURE_COMBOS: Record<
  string,
  {
    id: string;
    label: string;
    codes: string[];
    toothNumbers?: (string | null)[];
  }
> = {
  childRecall: {
    id: "childRecall",
    label: "Child Recall",
    codes: ["D0120", "D1120", "D0272", "D1208"],
  },
  childRecallDirect: {
    id: "childRecallDirect",
    label: "Child Recall Direct(no x-ray)",
    codes: ["D0120", "D1120", "D1208"],
  },
  adultRecall: {
    id: "adultRecall",
    label: "Adult Recall",
    codes: ["D0120", "D0220", "D0230", "D0274", "D1110"],
    toothNumbers: [null, "9", "24", null, null], // only these two need values
  },
  adultRecallDirect: {
    id: "adultRecallDirect",
    label: "Adult Recall Direct(no x-ray)",
    codes: ["D0120", "D1110"],
  },
  adultRecallDirect4bw: {
    id: "adultRecallDirect4bw",
    label: "Adult Recall Direct - 4bw (no x-ray)",
    codes: ["D0120", "D1110", "D0274"],
  },
  adultRecallDirect4bw2pa: {
    id: "adultRecallDirect4bw",
    label: "Adult Recall Direct - 4bw (no x-ray)",
    codes: ["D0120", "D0220", "D0230", "D0274", "D1110"],
  },
  newChildPatient: {
    id: "newChildPatient",
    label: "New Child Patient",
    codes: ["D0150", "D1120", "D1208"],
  },
  newAdultPatientPano: {
    id: "newAdultPatientPano",
    label: "New Adult Patient (Pano)",
    codes: ["D0150", "D0330", "D1110"],
  },
  newAdultPatientFMX: {
    id: "newAdultPatientFMX",
    label: "New Adult Patient (FMX)",
    codes: ["D0150", "D0210", "D1110"],
  },

  //Compostie
  oneSurfCompFront: {
    id: "oneSurfCompFront",
    label: "One Surface Composite (Front)",
    codes: ["D2330"],
  },
  oneSurfCompBack: {
    id: "oneSurfCompBack",
    label: "One Surface Composite (Back)",
    codes: ["D2391"],
  },
  twoSurfCompFront: {
    id: "twoSurfCompFront",
    label: "Two Surface Composite (Front)",
    codes: ["D2331"],
  },
  twoSurfCompBack: {
    id: "twoSurfCompBack",
    label: "Two Surface Composite (Back)",
    codes: ["D2392"],
  },
  threeSurfCompFront: {
    id: "threeSurfCompFront",
    label: "Three Surface Composite (Front)",
    codes: ["D2332"],
  },
  threeSurfCompBack: {
    id: "threeSurfCompBack",
    label: "Three Surface Composite (Back)",
    codes: ["D2393"],
  },
  fourSurfCompFront: {
    id: "fourSurfCompFront",
    label: "Four Surface Composite (Front)",
    codes: ["D2335"],
  },
  fourSurfCompBack: {
    id: "fourSurfCompBack",
    label: "Four Surface Composite (Back)",
    codes: ["D2394"],
  },

  // Dentures / Partials
  fu: {
    id: "fu",
    label: "FU",
    codes: ["D5110"],
  },
  fl: {
    id: "fl",
    label: "FL",
    codes: ["D5120"],
  },
  puResin: {
    id: "puResin",
    label: "PU (Resin)",
    codes: ["D5211"],
  },
  puCast: {
    id: "puCast",
    label: "PU (Cast)",
    codes: ["D5213"],
  },
  plResin: {
    id: "plResin",
    label: "PL (Resin)",
    codes: ["D5212"],
  },
  plCast: {
    id: "plCast",
    label: "PL (Cast)",
    codes: ["D5214"],
  },

  // Endodontics
  rctAnterior: {
    id: "rctAnterior",
    label: "RCT Anterior",
    codes: ["D3310"],
  },
  rctPremolar: {
    id: "rctPremolar",
    label: "RCT PreM",
    codes: ["D3320"],
  },
  rctMolar: {
    id: "rctMolar",
    label: "RCT Molar",
    codes: ["D3330"],
  },
  postCore: {
    id: "postCore",
    label: "Post/Core",
    codes: ["D2954"],
  },

  // Prostho / Perio / Oral Surgery
  crown: {
    id: "crown",
    label: "Crown",
    codes: ["D2740"],
  },
  deepCleaning: {
    id: "deepCleaning",
    label: "Deep Cleaning",
    codes: ["D4341"],
  },
  simpleExtraction: {
    id: "simpleExtraction",
    label: "Simple EXT",
    codes: ["D7140"],
  },
  surgicalExtraction: {
    id: "surgicalExtraction",
    label: "Surg EXT",
    codes: ["D7210"],
  },
  babyTeethExtraction: {
    id: "babyTeethExtraction",
    label: "Baby Teeth EXT",
    codes: ["D7111"],
  },
  // add more…
};

// Which combos appear under which heading
export const COMBO_CATEGORIES: Record<
  string,
  (keyof typeof PROCEDURE_COMBOS)[]
> = {
  "Recalls & New Patients": [
    "childRecall",
    "adultRecall",
    "newChildPatient",
    "newAdultPatientPano",
    "newAdultPatientFMX",
  ],
  "Composite Fillings (Front)": [
    "oneSurfCompFront",
    "twoSurfCompFront",
    "threeSurfCompFront",
    "fourSurfCompFront",
  ],
  "Composite Fillings (Back)": [
    "oneSurfCompBack",
    "twoSurfCompBack",
    "threeSurfCompBack",
    "fourSurfCompBack",
  ],
  "Dentures / Partials (>21 price)": [
    "fu",
    "fl",
    "puResin",
    "puCast",
    "plResin",
    "plCast",
  ],
  Endodontics: ["rctAnterior", "rctPremolar", "rctMolar", "postCore"],
  Prosthodontics: ["crown"],
  Periodontics: ["deepCleaning"],
  Extractions: [
    "simpleExtraction",
    "surgicalExtraction",
    "babyTeethExtraction",
  ],
};
