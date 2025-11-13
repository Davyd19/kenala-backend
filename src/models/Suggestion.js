module.exports = (sequelize, DataTypes) => {
  const Suggestion = sequelize.define('Suggestion', {
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
    location_name: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending',
      allowNull: false
    }
  }, {
    tableName: 'suggestions',
    timestamps: true
  });

  Suggestion.associate = (models) => {
    Suggestion.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  };

  return Suggestion;
};