import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { BACKENDGROUPS } from "./schema";

export const addComper = mutation({
  args: {
    preferredName: v.string(),
    originalRanking: v.array(BACKENDGROUPS),
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
  args: { group: BACKENDGROUPS, email: v.string() },
  handler: async (ctx, { group, email }) => {
    await ctx.db.insert("users", {
      email,
      group,
      admin: false,
    });
  },
});

export const comperAlreadyExists = query({
  handler: async (ctx) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user)
      throw new Error("comperAlreadyExists() called while not logged in");

    const identified = await ctx.db
      .query("compers")
      .filter((q) => q.eq(q.field("email"), user.email!))
      .unique();

    if (identified)
      return {
        preferredName: identified.preferredName,
        ranking: identified.originalRanking,
      };

    return false;
  },
});

export const getCompers = query({
  handler: async (ctx) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("getCompers() called while not logged in");

    const identified = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), user.email!))
      .unique();
    if (!identified) throw new Error("getCompers() called while not a user");

    const allCompers = await ctx.db.query("compers").collect();
    const filteredCompers = allCompers
      .filter((comper) => comper.originalRanking.includes(identified.group))
      .map((comper) => ({
        preferredName: comper.preferredName,
        email: comper.email,
        matched: comper.matched,
      }));

    return filteredCompers;
  },
});
