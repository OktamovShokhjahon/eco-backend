/**
 * Demo accounts. Names, avatars and point totals match the leaderboard the
 * frontend previously hardcoded, so the seeded database reproduces the
 * original design exactly - only now it is real data.
 *
 * `activityWeight` drives how much back-dated history the seed generates for
 * each user (higher = more completions = higher rank).
 * Every account uses the password below.
 */
export const DEMO_PASSWORD = "Password123";

export const users = [
  {
    firstName: "Sarah",
    lastName: "Johnson",
    email: "sarah.johnson@example.com",
    address: "San Francisco, CA",
    age: 21,
    status: "student",
    avatar: "/woman-portrait.png",
    activityWeight: 0.55,
    isDemoAccount: true,
  },
  {
    firstName: "Alex",
    lastName: "Chen",
    email: "alex.chen@example.com",
    address: "Seattle, WA",
    age: 23,
    status: "student",
    avatar: "/person-avatar-1.png",
    activityWeight: 0.92,
  },
  {
    firstName: "Maya",
    lastName: "Patel",
    email: "maya.patel@example.com",
    address: "Austin, TX",
    age: 20,
    status: "student",
    avatar: "/diverse-person-avatar-2.png",
    activityWeight: 0.84,
  },
  {
    firstName: "David",
    lastName: "Kim",
    email: "david.kim@example.com",
    address: "Portland, OR",
    age: 17,
    status: "pupil",
    avatar: "/person-avatar-3.png",
    activityWeight: 0.76,
  },
  {
    firstName: "Emma",
    lastName: "Wilson",
    email: "emma.wilson@example.com",
    address: "Denver, CO",
    age: 22,
    status: "student",
    avatar: "/person-avatar-4.png",
    activityWeight: 0.66,
  },
  {
    firstName: "James",
    lastName: "Brown",
    email: "james.brown@example.com",
    address: "Chicago, IL",
    age: 16,
    status: "pupil",
    avatar: "/person-avatar-6.png",
    activityWeight: 0.48,
  },
  {
    firstName: "Olivia",
    lastName: "Martinez",
    email: "olivia.martinez@example.com",
    address: "Miami, FL",
    age: 19,
    status: "student",
    avatar: "/person-avatar-7.png",
    activityWeight: 0.4,
  },
  {
    firstName: "Noah",
    lastName: "Garcia",
    email: "noah.garcia@example.com",
    address: "Phoenix, AZ",
    age: 15,
    status: "pupil",
    avatar: "/person-avatar-8.png",
    activityWeight: 0.33,
  },
];
