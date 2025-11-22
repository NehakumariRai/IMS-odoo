// 🧩 Dummy Supabase Client — Offline Mock Version
// This file simulates Supabase behavior for UI testing without a real backend.

console.log("⚙️ Using dummy Supabase client (offline mode)");

let mockDB = {
  user_profiles: [
    { id: "user-1", email: "citizen@example.com", cqi: 120, streak: 4 },
  ],
  module_progress: [],
  module_quizzes: [],
  user_badges: [
    { user_id: "user-1", badge_id: "starter" },
  ],
};

// Simulate currently logged-in user
const mockUser = { id: "user-1", email: "citizen@example.com" };

export const getUserProfile = async () => {
  console.log("Fetching dummy user profile...");
  const user = mockDB.user_profiles.find(u => u.id === mockUser.id);
  return user || { id: mockUser.id, cqi: 0, streak: 0 };
};

export const initializeUserProfile = async (user) => {
  console.log("Initializing dummy profile...");
  const exists = mockDB.user_profiles.find(u => u.id === user.id);
  if (!exists) {
    mockDB.user_profiles.push({
      id: user.id,
      email: user.email,
      cqi: 0,
      streak: 0,
    });
  }
  return mockDB.user_profiles.find(u => u.id === user.id);
};

export const updateUserCQI = async (userId, amount) => {
  const user = mockDB.user_profiles.find(u => u.id === userId);
  if (user) {
    user.cqi += amount;
    console.log(`Updated CQI for ${userId}: +${amount} → ${user.cqi}`);
  }
  return user?.cqi || 0;
};

export const getModuleProgress = async (userId, moduleId) => {
  return mockDB.module_progress.find(
    (m) => m.user_id === userId && m.module_id === moduleId
  ) || null;
};

export const updateModuleProgress = async (userId, moduleId, currentSlide, progress) => {
  const existing = await getModuleProgress(userId, moduleId);
  if (existing) {
    existing.current_slide = currentSlide;
    existing.progress = progress;
  } else {
    mockDB.module_progress.push({
      user_id: userId,
      module_id: moduleId,
      current_slide: currentSlide,
      progress,
    });
  }
  console.log(`Module ${moduleId} updated to ${progress}%`);
};

export const completeModule = async (userId, moduleId, cqiReward) => {
  await updateModuleProgress(userId, moduleId, 0, 100);
  const newCQI = await updateUserCQI(userId, cqiReward);
  console.log(`Module ${moduleId} completed! New CQI: ${newCQI}`);
  return newCQI;
};

export const getQuizAttempt = async (userId, moduleId) => {
  return mockDB.module_quizzes.find(
    (q) => q.user_id === userId && q.module_id === moduleId
  ) || null;
};

export const submitQuiz = async (userId, moduleId, score, correctAnswers, totalQuestions) => {
  mockDB.module_quizzes.push({
    user_id: userId,
    module_id: moduleId,
    score,
    correct_answers: correctAnswers,
    total_questions: totalQuestions,
  });
  console.log(`Dummy quiz submitted for ${moduleId}: ${score}/${totalQuestions}`);
  return { score, correctAnswers, totalQuestions };
};

export const getAllModuleProgress = async (userId) => {
  return mockDB.module_progress.filter((m) => m.user_id === userId);
};

export const getBadges = async (userId) => {
  return mockDB.user_badges.filter((b) => b.user_id === userId);
};

export const unlockBadge = async (userId, badgeId) => {
  const exists = mockDB.user_badges.find(
    (b) => b.user_id === userId && b.badge_id === badgeId
  );
  if (!exists) {
    mockDB.user_badges.push({ user_id: userId, badge_id: badgeId });
    console.log(`Unlocked dummy badge: ${badgeId}`);
  }
};
