import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
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
      statuses: originalRanking.map(() => null),
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
        id: comper._id,
        preferredName: comper.preferredName,
        email: comper.email,
        matched: comper.matched,
        matchedGroup: comper.matchedGroup,
        decision:
          comper.statuses[
            comper.originalRanking.findIndex(
              (group) => group === identified.group
            )
          ],
      }));

    return filteredCompers;
  },
});

export const decideComper = mutation({
  args: { comperId: v.id("compers"), status: v.boolean() },
  handler: async (ctx, { comperId, status }) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("decideComper() called while not logged in");

    const identified = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), user.email!))
      .unique();
    if (!identified) throw new Error("decideComper() called while not a user");

    const comper = await ctx.db.get(comperId);
    if (!comper) throw new Error("decideComper() called with invalid comperId");

    const groupIndex = comper.originalRanking.findIndex(
      (group) => group === identified.group
    );
    if (groupIndex === -1)
      throw new Error(
        "decideComper() called with comperId not in user's group"
      );

    const newStatuses = comper.statuses;
    if (newStatuses[groupIndex] !== null)
      throw new Error("comper already decided");
    newStatuses[groupIndex] = status;

    const result = identifyIfIndexIfDone(newStatuses);
    if (result === -1) await ctx.db.patch(comperId, { statuses: newStatuses });
    else if (result === -2) {
      await ctx.db.patch(comperId, {
        statuses: newStatuses,
        matched: true,
        matchedGroup: "None",
      });
      await ctx.db.insert("updates", {
        name: comper.preferredName,
        email: comper.email,
        group: "None",
      });
    } else {
      await ctx.db.patch(comperId, {
        statuses: newStatuses,
        matched: true,
        matchedGroup: comper.originalRanking[result],
      });
      await ctx.db.insert("updates", {
        name: comper.preferredName,
        email: comper.email,
        group: comper.originalRanking[result],
      });
    }
  },
});

const identifyIfIndexIfDone = (statuses: Array<boolean | null>) => {
  for (let i = 0; i < statuses.length; i++) {
    if (statuses[i] === false) continue;
    if (statuses[i] === true) return i;
    else if (statuses[i] === null) return -1;
  }
  return -2;
};

export const clearDecisions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const compers = await ctx.db.query("compers").collect();
    await Promise.all(
      compers.map((comper) =>
        ctx.db.patch(comper._id, {
          statuses: comper.statuses.map(() => null),
          matched: false,
          matchedGroup: undefined,
        })
      )
    );

    const updates = await ctx.db.query("updates").collect();
    await Promise.all(updates.map((update) => ctx.db.delete(update._id)));
  },
});

export const getUpdates = query({
  handler: async (ctx) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("getUpdates() called while not logged in");

    const identified = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), user.email!))
      .unique();
    if (!identified) throw new Error("getUpdates() called while not a user");

    const updates = await ctx.db
      .query("updates")
      .filter((q) => q.eq(q.field("group"), identified.group))
      .collect();

    return updates;
  },
});
