module.exports = (sequelize, DataTypes) => {
  const UserBadge = sequelize.define('UserBadge', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    badge_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'badges',
        key: 'id'
      }
    },
    unlocked_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'user_badges',
    timestamps: true
  });

  return UserBadge;
};