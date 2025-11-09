module.exports = (sequelize, DataTypes) => {
  const MissionCompletion = sequelize.define('MissionCompletion', {
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
    mission_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'missions',
        key: 'id'
      }
    },
    completed_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'mission_completions',
    timestamps: true
  });

  MissionCompletion.associate = (models) => {
    MissionCompletion.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
    MissionCompletion.belongsTo(models.Mission, {
      foreignKey: 'mission_id',
      as: 'mission'
    });
  };

  return MissionCompletion;
};