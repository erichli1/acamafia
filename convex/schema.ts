// OPTIONAL: Rename this file to `schema.ts` to declare the shape
// of the data in your database.
// See https://docs.convex.dev/database/schemas.

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const GROUPS = v.union(
  v.literal("Veritones"),
  v.literal("Callbacks"),
  v.literal("Lowkeys")
);

export default defineSchema(
  {
    compers: defineTable({
      email: v.string(),
      preferredName: v.string(),
      originalRanking: v.array(GROUPS),
      matched: v.boolean(),
      veritonesStatus: v.optional(v.boolean()),
      callbacksStatus: v.optional(v.boolean()),
      lowkeysStatus: v.optional(v.boolean()),
    }),
    users: defineTable({
      email: v.string(),
      group: GROUPS,
      admin: v.boolean(),
    }),
  },
  // If you ever get an error about schema mismatch
  // between your data and your schema, and you cannot
  // change the schema to match the current data in your database,
  // you can:
  //  1. Use the dashboard to delete tables or individual documents
  //     that are causing the error.
  //  2. Change this option to `false` and make changes to the data
  //     freely, ignoring the schema. Don't forget to change back to `true`!
  { schemaValidation: true }
);
