const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    profile_image_url: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    level: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    total_missions: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    total_distance: {
      type: DataTypes.FLOAT,
      defaultValue: 0.0
    },
    current_streak: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    longest_streak: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    last_active_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    total_active_days: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    is_admin: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    }
  }, {
    tableName: 'users',
    timestamps: true,
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      }
    }
  });

  User.associate = (models) => {
    User.hasMany(models.Journal, {
      foreignKey: 'user_id',
      as: 'journals'
    });
    User.hasMany(models.MissionCompletion, {
      foreignKey: 'user_id',
      as: 'completedMissions'
    });
    User.belongsToMany(models.Badge, {
      through: models.UserBadge,
      foreignKey: 'user_id',
      as: 'badges'
    });
  };

  User.prototype.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  };

  return User;
};