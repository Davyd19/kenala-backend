module.exports = (sequelize, DataTypes) => {
  const UserClueProgress = sequelize.define('UserClueProgress', {
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
    clue_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'mission_clues',
        key: 'id'
      }
    },
    reached_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    distance_from_clue: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Jarak dalam meter saat detected'
    }
  }, {
    tableName: 'user_clue_progress',
    timestamps: true
  });

  UserClueProgress.associate = (models) => {
    UserClueProgress.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
    UserClueProgress.belongsTo(models.Mission, {
      foreignKey: 'mission_id',
      as: 'mission'
    });
    UserClueProgress.belongsTo(models.MissionClue, {
      foreignKey: 'clue_id',
      as: 'clue'
    });
  };

  return UserClueProgress;
};