module.exports = (sequelize, DataTypes) => {
  const MissionClue = sequelize.define('MissionClue', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    mission_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'missions',
        key: 'id'
      }
    },
    clue_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Urutan clue (1, 2, 3, dst.)'
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    hint_text: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: false
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: false
    },
    radius_meters: {
      type: DataTypes.INTEGER,
      defaultValue: 50,
      comment: 'Radius deteksi dalam meter'
    },
    image_url: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    points_reward: {
      type: DataTypes.INTEGER,
      defaultValue: 5
    },
    is_required: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'mission_clues',
    timestamps: true
  });

  MissionClue.associate = (models) => {
    MissionClue.belongsTo(models.Mission, {
      foreignKey: 'mission_id',
      as: 'mission'
    });
    MissionClue.hasMany(models.UserClueProgress, {
      foreignKey: 'clue_id',
      as: 'userProgress'
    });
  };

  return MissionClue;
};