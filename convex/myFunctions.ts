import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { GROUPS } from "./schema";

export const addComper = mutation({
  args: {
    preferredName: v.string(),
    originalRanking: v.array(GROUPS),
  },
  handler: async (ctx, { preferredName, originalRanking }) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("addUser() called while not logged in");

    await ctx.db.insert("compers", {
      email: user.email!,
      preferredName,
      originalRanking,
      matched: false,
    });
  },
});

export const getUser = query({
  handler: async (ctx) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("getUser() called while not logged in");

    const identified = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), user.email!))
      .unique();

    return identified;
  },
});

export const addUser = mutation({
  args: { group: GROUPS, email: v.string() },
  handler: async (ctx, { group, email }) => {
    await ctx.db.insert("users", {
      email,
      group,
      admin: false,
    });
  },
});
