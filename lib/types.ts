export const groups = ["Veritones", "Callbacks", "Lowkeys"] as const;
export type FRONTENDGROUPS = (typeof groups)[number];
