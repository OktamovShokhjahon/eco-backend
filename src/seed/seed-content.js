import mongoose from "mongoose";
import { connectDB, disconnectDB } from "../config/db.js";
import { Task, Product, Achievement, User, TaskCompletion, Order } from "../models/index.js";
import { tasks } from "./data/tasks.js";
import { products } from "./data/products.js";
import { achievements } from "./data/achievements.js";

/**
 * Content-only seed, safe to run against a live database.
 *
 * Upserts the catalogue (tasks, products, achievements) by its natural key and
 * NEVER deletes anything - registered users, their completions, streaks and
 * orders are all left untouched. Use this to restore or update content on a
 * deployed environment.
 *
 * `npm run seed` is the destructive counterpart: it wipes every collection and
 * rebuilds the full demo dataset, which is only appropriate locally.
 */

async function upsertAll(Model, rows, keyField) {
  let created = 0;
  let updated = 0;

  for (const row of rows) {
    const existing = await Model.findOne({ [keyField]: row[keyField] });

    if (!existing) {
      await Model.create(row);
      created += 1;
      continue;
    }

    // Stock is inventory, not content - never reset what the store has sold.
    const { stock, ...contentFields } = row;
    existing.set(contentFields);
    if (existing.isModified()) {
      await existing.save();
      updated += 1;
    }
  }

  return { created, updated };
}

async function run() {
  console.log("[seed:content] connecting...");
  await connectDB();
  console.log(`[seed:content] target database: ${mongoose.connection.name}`);

  const [userCount, completionCount, orderCount] = await Promise.all([
    User.estimatedDocumentCount(),
    TaskCompletion.estimatedDocumentCount(),
    Order.estimatedDocumentCount(),
  ]);
  console.log(
    `[seed:content] preserving ${userCount} users, ${completionCount} completions, ${orderCount} orders`
  );

  const taskResult = await upsertAll(Task, tasks, "key");
  const productResult = await upsertAll(Product, products, "slug");
  const achievementResult = await upsertAll(Achievement, achievements, "key");

  // Products created for the first time need their opening stock.
  for (const product of products) {
    await Product.updateOne(
      { slug: product.slug, stock: { $exists: false } },
      { $set: { stock: product.stock } }
    );
  }

  console.log("\n=========================================");
  console.log("  Content restored (no data deleted)");
  console.log("=========================================");
  console.log(`  Database     : ${mongoose.connection.name}`);
  console.log(`  Tasks        : +${taskResult.created} new, ${taskResult.updated} updated`);
  console.log(
    `  Products     : +${productResult.created} new, ${productResult.updated} updated`
  );
  console.log(
    `  Achievements : +${achievementResult.created} new, ${achievementResult.updated} updated`
  );
  console.log(`  Users kept   : ${await User.estimatedDocumentCount()}`);
  console.log("=========================================\n");
}

run()
  .then(async () => {
    await disconnectDB();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("[seed:content] failed:", error);
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
  });
