import { api } from "./_generated/api";
import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { BACKENDGROUPS } from "./schema";
import { identifyIfIndexIfDone } from "./helpers";

export const addComper = mutation({
  args: {
    preferredName: v.string(),
    rank: v.array(BACKENDGROUPS),
    unranked: v.array(BACKENDGROUPS),
  },
  handler: async (ctx, { preferredName, rank, unranked }) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("addUser() called while not logged in");

    await ctx.db.insert("compers", {
      email: user.email!,
      preferredName,
      originalRanking: rank,
      unranked,
      matched: false,
      matchScheduled: false,
      statuses: rank.map(() => null),
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
        unranked: identified.unranked,
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
    const rankedCompers = allCompers
      .filter((comper) => comper.originalRanking.includes(identified.group))
      .map((comper) => ({
        ...comper,
        decision:
          comper.statuses[
            comper.originalRanking.findIndex(
              (group) => group === identified.group
            )
          ],
      }));

    const unrankedCompers = allCompers.filter((comper) =>
      comper.unranked.includes(identified.group)
    );

    return { ranked: rankedCompers, unranked: unrankedCompers };
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
    if (result === -1 || comper.matchScheduled)
      await ctx.db.patch(comperId, { statuses: newStatuses });
    else {
      const randomDelay = await randomDelayForUpdates(ctx, {});

      await ctx.db.patch(comperId, {
        statuses: newStatuses,
        matchScheduled: true,
      });
      await ctx.scheduler.runAfter(randomDelay, api.myFunctions.matchComper, {
        comperId,
        name: comper.preferredName,
        email: comper.email,
        relevantGroups: comper.originalRanking,
        group: result === -2 ? "None" : comper.originalRanking[result],
      });
    }
  },
});

export const matchComper = mutation({
  args: {
    comperId: v.id("compers"),
    name: v.string(),
    email: v.string(),
    relevantGroups: v.array(BACKENDGROUPS),
    group: v.union(BACKENDGROUPS, v.literal("None")),
  },
  handler: async (ctx, { comperId, name, email, relevantGroups, group }) => {
    await ctx.db.insert("updates", {
      name,
      email,
      relevantGroups,
      group,
    });

    await ctx.db.patch(comperId, { matched: true });
  },
});

export const clearDecisions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const compers = await ctx.db.query("compers").collect();
    await Promise.all(
      compers.map((comper) =>
        ctx.db.patch(comper._id, {
          statuses: comper.statuses.map(() => null),
          matched: false,
          matchScheduled: false,
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

    const updates = await ctx.db.query("updates").collect();

    // const relevantUpdates = updates.filter((update) =>
    //   update.relevantGroups.includes(identified.group)
    // );

    return updates;
  },
});

export const randomDelayForUpdates = query({
  handler: async (ctx) => {
    const result = await ctx.db.query("delay").unique();
    if (!result) throw new Error("Did not retrieve delay information");

    return Math.floor(result.baseline + Math.random() * result.range);
  },
});

export const addToDelay = internalMutation({
  args: { baseline: v.number(), range: v.number() },
  handler: async (ctx, { baseline, range }) => {
    const results = await ctx.db.query("delay").collect();
    if (results.length > 0) {
      await ctx.db.patch(results[0]._id, { baseline, range });
      console.log("Delay exists. Updating it.");
    } else {
      await ctx.db.insert("delay", {
        baseline,
        range,
      });
    }
  },
});
