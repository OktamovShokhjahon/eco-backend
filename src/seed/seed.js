import mongoose from "mongoose";
import { connectDB, disconnectDB } from "../config/db.js";
import {
  User,
  Task,
  TaskCompletion,
  Product,
  Order,
  Achievement,
  UserAchievement,
  priceAfterDiscount,
} from "../models/index.js";
import { tasks } from "./data/tasks.js";
import { products } from "./data/products.js";
import { achievements } from "./data/achievements.js";
import { users as demoUsers, DEMO_PASSWORD } from "./data/users.js";
import { addDays, toDayKey } from "../utils/dates.js";
import { recomputeStreak } from "../services/streak.service.js";
import { evaluateAchievements } from "../services/achievement.service.js";

const HISTORY_DAYS = 30;

/**
 * Deterministic PRNG (mulberry32) so re-running the seed produces the same
 * leaderboard - useful when rehearsing a demo.
 */
function makeRandom(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function wipe() {
  await Promise.all([
    User.deleteMany({}),
    Task.deleteMany({}),
    TaskCompletion.deleteMany({}),
    Product.deleteMany({}),
    Order.deleteMany({}),
    Achievement.deleteMany({}),
    UserAchievement.deleteMany({}),
  ]);
}

/**
 * Builds ~30 days of plausible history so the weekly/monthly leaderboards,
 * the streak counters and the global impact stats all have real data behind
 * them the moment the app starts.
 */
function buildHistory(user, index, taskDocs) {
  const random = makeRandom(1000 + index * 37);
  const rows = [];

  // The demo account deliberately has nothing logged for *today*, so a judge
  // can complete a task live and watch every counter move.
  const lastOffset = user.isDemoAccount ? -1 : 0;

  for (let offset = -(HISTORY_DAYS - 1); offset <= lastOffset; offset += 1) {
    if (random() > user.activityWeight) continue; // an inactive day

    const when = addDays(new Date(), offset);
    const date = toDayKey(when);
    const howMany = 1 + Math.floor(random() * 3); // 1-3 tasks that day

    const pool = [...taskDocs];
    for (let i = 0; i < howMany && pool.length > 0; i += 1) {
      const [task] = pool.splice(Math.floor(random() * pool.length), 1);
      // Spread completions across the working day rather than all at midnight.
      const createdAt = new Date(when);
      createdAt.setHours(8 + Math.floor(random() * 12), Math.floor(random() * 60), 0, 0);

      rows.push({
        task,
        row: {
          user: user._id,
          task: task._id,
          date,
          pointsAwarded: task.points,
          co2Saved: task.co2Impact,
          createdAt,
          updatedAt: createdAt,
        },
      });
    }
  }

  return rows;
}

async function seed() {
  console.log("[seed] connecting...");
  await connectDB();

  console.log("[seed] clearing existing collections...");
  await wipe();

  console.log("[seed] inserting tasks, products and achievements...");
  const [taskDocs, productDocs] = await Promise.all([
    Task.insertMany(tasks),
    Product.insertMany(products),
    Achievement.insertMany(achievements),
  ]);

  console.log("[seed] creating users...");
  const createdUsers = [];
  for (const data of demoUsers) {
    const { activityWeight, isDemoAccount, ...fields } = data;
    const user = new User(fields);
    await user.setPassword(DEMO_PASSWORD);
    await user.save();
    createdUsers.push(Object.assign(user, { activityWeight, isDemoAccount }));
  }

  console.log(`[seed] generating ${HISTORY_DAYS} days of activity...`);
  let completionCount = 0;

  for (const [index, user] of createdUsers.entries()) {
    const history = buildHistory(user, index, taskDocs);
    if (history.length === 0) continue;

    // `timestamps: false` keeps our back-dated createdAt values, which the
    // weekly/monthly leaderboard aggregations depend on.
    await TaskCompletion.insertMany(
      history.map((h) => h.row),
      { timestamps: false }
    );
    completionCount += history.length;

    const totals = history.reduce(
      (acc, h) => {
        acc.points += h.task.points;
        acc.co2 += h.task.co2Impact;
        return acc;
      },
      { points: 0, co2: 0 }
    );

    user.completedTasks = history.length;
    user.totalPointsEarned = totals.points;
    user.ecoPoints = totals.points;
    user.co2Saved = Math.round(totals.co2 * 10) / 10;
    await recomputeStreak(user);
    await user.save();

    await evaluateAchievements(user);
  }

  console.log("[seed] creating sample purchases for the demo account...");
  const demo = createdUsers.find((u) => u.isDemoAccount) || createdUsers[0];
  let orderCount = 0;

  for (const slug of ["bamboo-toothbrush-set", "reusable-shopping-bags"]) {
    const product = productDocs.find((p) => p.slug === slug);
    if (!product || product.stock <= 0) continue;

    const price = priceAfterDiscount(product);
    if (demo.ecoPoints < price) continue;

    await Order.create({
      user: demo._id,
      product: product._id,
      productSnapshot: {
        name: product.name,
        imageUrl: product.imageUrl,
        category: product.category,
      },
      unitPrice: product.price,
      discount: product.discount || 0,
      pricePaid: price,
    });

    demo.ecoPoints -= price;
    product.stock -= 1;
    await product.save();
    orderCount += 1;
  }

  await demo.save();
  await evaluateAchievements(demo);

  const badgeCount = await UserAchievement.countDocuments();
  const board = await User.find()
    .sort({ totalPointsEarned: -1 })
    .limit(3)
    .select("firstName lastName totalPointsEarned");

  console.log("\n=========================================");
  console.log("  EcoHabits database seeded successfully");
  console.log("=========================================");
  console.log(`  Users             : ${createdUsers.length}`);
  console.log(`  Tasks             : ${taskDocs.length}`);
  console.log(`  Products          : ${productDocs.length}`);
  console.log(`  Achievements      : ${achievements.length}`);
  console.log(`  Task completions  : ${completionCount}`);
  console.log(`  Badges unlocked   : ${badgeCount}`);
  console.log(`  Sample orders     : ${orderCount}`);
  console.log("-----------------------------------------");
  console.log("  Top 3:");
  board.forEach((u, i) =>
    console.log(`   ${i + 1}. ${u.firstName} ${u.lastName} - ${u.totalPointsEarned} pts`)
  );
  console.log("-----------------------------------------");
  console.log("  Demo login:");
  console.log(`   email    : ${demo.email}`);
  console.log(`   password : ${DEMO_PASSWORD}`);
  console.log("  (every seeded account uses the same password)");
  console.log("=========================================\n");
}

seed()
  .then(async () => {
    await disconnectDB();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("[seed] failed:", error);
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
  });
