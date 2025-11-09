const {
  User,
  Badge,
  UserBadge,
  Journal,
  MissionCompletion,
} = require("../models");

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ["password"] },
      include: [
        {
          model: Badge,
          as: "badges",
          through: { attributes: ["unlocked_at"] },
        },
      ],
    });

    res.json({ user });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
};

// Update profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, bio, profile_image_url } = req.body;

    await req.user.update({
      name: name || req.user.name,
      phone: phone !== undefined ? phone : req.user.phone,
      bio: bio !== undefined ? bio : req.user.bio,
      profile_image_url:
        profile_image_url !== undefined
          ? profile_image_url
          : req.user.profile_image_url,
    });

    const updatedUser = await User.findByPk(req.user.id, {
      attributes: { exclude: ["password"] },
    });

    res.json({ user: updatedUser });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
};

// Get user statistics
exports.getStats = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ["password"] },
    });

    // Get category statistics
    const categoryStats = await MissionCompletion.findAll({
      where: { user_id: req.user.id },
      include: [
        {
          model: Mission,
          as: "mission",
          attributes: ["category"],
        },
      ],
      attributes: [],
    });

    // Count missions by category
    const categoryCounts = {};
    categoryStats.forEach((completion) => {
      const category = completion.mission?.category;
      if (category) {
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      }
    });

    // Get recent journals count
    const journalCount = await Journal.count({
      where: { user_id: req.user.id },
    });

    const stats = {
      level: user.level,
      total_missions: user.total_missions,
      total_distance: user.total_distance,
      current_streak: user.current_streak,
      longest_streak: user.longest_streak,
      total_active_days: user.total_active_days,
      journal_count: journalCount,
      category_breakdown: categoryCounts,
    };

    res.json({ stats });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
};

// Get user badges
exports.getBadges = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [
        {
          model: Badge,
          as: "badges",
          through: {
            attributes: ["unlocked_at"],
            as: "userBadge",
          },
        },
      ],
    });

    // Get all available badges
    const allBadges = await Badge.findAll();

    // Mark which badges are unlocked
    const badgesWithStatus = allBadges.map((badge) => {
      const unlocked = user.badges.find((b) => b.id === badge.id);
      return {
        ...badge.toJSON(),
        is_unlocked: !!unlocked,
        unlocked_at: unlocked ? unlocked.userBadge.unlocked_at : null,
      };
    });

    res.json({ badges: badgesWithStatus });
  } catch (error) {
    console.error("Get badges error:", error);
    res.status(500).json({ error: "Failed to fetch badges" });
  }
};

// Get streak data
exports.getStreakData = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: [
        "current_streak",
        "longest_streak",
        "total_active_days",
        "last_active_date",
      ],
    });

    // Get last 14 days activity
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const recentCompletions = await MissionCompletion.findAll({
      where: {
        user_id: req.user.id,
        completed_at: {
          [Op.gte]: fourteenDaysAgo,
        },
      },
      attributes: ["completed_at"],
      order: [["completed_at", "DESC"]],
    });

    // Group by date
    const activityByDate = {};
    recentCompletions.forEach((completion) => {
      const date = completion.completed_at.toISOString().split("T")[0];
      activityByDate[date] = true;
    });

    res.json({
      current_streak: user.current_streak,
      longest_streak: user.longest_streak,
      total_active_days: user.total_active_days,
      last_active_date: user.last_active_date,
      recent_activity: activityByDate,
    });
  } catch (error) {
    console.error("Get streak data error:", error);
    res.status(500).json({ error: "Failed to fetch streak data" });
  }
};
