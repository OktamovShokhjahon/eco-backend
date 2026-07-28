import { User } from "../models/User.js";
import { TaskCompletion } from "../models/TaskCompletion.js";
import { periodStartDate } from "../utils/dates.js";

function toEntry(user, ecoPoints, rank) {
  return {
    id: String(user._id),
    name: `${user.firstName} ${user.lastName}`.trim(),
    ecoPoints,
    rank,
    avatar: user.avatar || "",
  };
}

/**
 * All-time board, ranked by lifetime points earned.
 */
async function allTimeBoard(limit) {
  const users = await User.find()
    .sort({ totalPointsEarned: -1, createdAt: 1 })
    .limit(limit)
    .select("firstName lastName avatar totalPointsEarned");

  return users.map((user, index) => toEntry(user, user.totalPointsEarned, index + 1));
}

/**
 * Weekly / monthly board, aggregated from the completions inside the window so
 * a newcomer with a strong week can outrank a long-time member.
 */
async function periodBoard(period, limit) {
  const since = periodStartDate(period);

  const rows = await TaskCompletion.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $group: { _id: "$user", ecoPoints: { $sum: "$pointsAwarded" } } },
    { $sort: { ecoPoints: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: User.collection.name,
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
  ]);

  return rows.map((row, index) => toEntry(row.user, row.ecoPoints, index + 1));
}

export async function getLeaderboard({ period = "all", limit = 10 } = {}) {
  return period === "all" ? allTimeBoard(limit) : periodBoard(period, limit);
}

/**
 * A user's all-time rank: one plus the number of users strictly ahead of them.
 * Ties are broken by signup date, matching the board's sort.
 */
export async function getUserRank(user) {
  const ahead = await User.countDocuments({
    $or: [
      { totalPointsEarned: { $gt: user.totalPointsEarned } },
      {
        totalPointsEarned: user.totalPointsEarned,
        createdAt: { $lt: user.createdAt },
      },
    ],
  });
  return ahead + 1;
}

/** The user's row plus the two competitors above and below. */
export async function getRankContext(user) {
  const rank = await getUserRank(user);
  const skip = Math.max(0, rank - 3);

  const neighbours = await User.find()
    .sort({ totalPointsEarned: -1, createdAt: 1 })
    .skip(skip)
    .limit(5)
    .select("firstName lastName avatar totalPointsEarned");

  return {
    rank,
    totalUsers: await User.estimatedDocumentCount(),
    neighbours: neighbours.map((u, i) => toEntry(u, u.totalPointsEarned, skip + i + 1)),
  };
}
