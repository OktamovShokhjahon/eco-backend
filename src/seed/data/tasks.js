/**
 * The six daily habits. `key` matches the translation keys already present in
 * frontend/lib/translations.ts (t.mockTasks.task1Title ...), so the UI stays
 * fully trilingual while the data itself lives in MongoDB.
 *
 * `co2Impact` is an approximate kilograms-of-CO2-avoided figure per
 * completion, used for the platform-wide impact counters.
 */
export const tasks = [
  {
    key: "task1",
    title: "Use Reusable Water Bottle",
    description:
      "Avoid single-use plastic bottles today. Carry your reusable bottle everywhere!",
    points: 50,
    category: "waste",
    difficulty: "easy",
    imageUrl: "/reusable-water-bottle.png",
    co2Impact: 0.5,
    order: 1,
  },
  {
    key: "task2",
    title: "Bike or Walk to School/Work",
    description: "Choose active transport instead of driving. Good for you and the planet!",
    points: 100,
    category: "transport",
    difficulty: "medium",
    imageUrl: "/person-riding-bicycle.jpg",
    co2Impact: 2.6,
    order: 2,
  },
  {
    key: "task3",
    title: "Meatless Monday",
    description:
      "Try a plant-based meal today. Reduce your carbon footprint one meal at a time.",
    points: 75,
    category: "food",
    difficulty: "medium",
    imageUrl: "/healthy-vegetarian-meal.jpg",
    co2Impact: 1.8,
    order: 3,
  },
  {
    key: "task4",
    title: "Turn Off Unused Electronics",
    description: "Unplug chargers and turn off devices not in use. Save energy and money!",
    points: 40,
    category: "energy",
    difficulty: "easy",
    imageUrl: "/power-outlet-plug.jpg",
    co2Impact: 0.4,
    order: 4,
  },
  {
    key: "task5",
    title: "Take a 5-Minute Shower",
    description: "Challenge yourself to conserve water. Every drop counts!",
    points: 60,
    category: "water",
    difficulty: "medium",
    imageUrl: "/shower-head-water.jpg",
    co2Impact: 0.9,
    order: 5,
  },
  {
    key: "task6",
    title: "Start Composting Food Scraps",
    description:
      "Turn your kitchen waste into nutrient-rich soil. Great for the environment!",
    points: 120,
    category: "waste",
    difficulty: "hard",
    imageUrl: "/compost-bin-food-scraps.jpg",
    co2Impact: 3.2,
    order: 6,
  },
];
