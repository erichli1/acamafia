export const groups = ["Veritones", "Callbacks", "Opportunes"] as const;
export type FRONTENDGROUPS = (typeof groups)[number];
