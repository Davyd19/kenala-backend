module.exports = (sequelize, DataTypes) => {
  const Journal = sequelize.define('Journal', {
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
      allowNull: true,
      references: {
        model: 'missions',
        key: 'id'
      }
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    story: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    image_url: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    location_name: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true
    },
    date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'journals',
    timestamps: true
  });

  Journal.associate = (models) => {
    Journal.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
    Journal.belongsTo(models.Mission, {
      foreignKey: 'mission_id',
      as: 'mission'
    });
  };

  return Journal;
};