module.exports = (sequelize, DataTypes) => {
  const Badge = sequelize.define('Badge', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    icon_name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Material icon name'
    },
    color: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'Hex color code'
    },
    requirement_type: {
      type: DataTypes.ENUM('missions_completed', 'category_specific', 'streak_days', 'distance_traveled', 'journals_written'),
      allowNull: false
    },
    requirement_value: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    requirement_category: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'For category-specific badges'
    }
  }, {
    tableName: 'badges',
    timestamps: true
  });

  Badge.associate = (models) => {
    Badge.belongsToMany(models.User, {
      through: models.UserBadge,
      foreignKey: 'badge_id',
      as: 'users'
    });
  };

  return Badge;
};