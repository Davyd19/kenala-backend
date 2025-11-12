module.exports = (sequelize, DataTypes) => {
  const Mission = sequelize.define('Mission', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    category: {
      type: DataTypes.ENUM('Kuliner', 'Rekreasi', 'Seni & Budaya', 'Sejarah', 'Belanja', 'Alam'),
      allowNull: false
    },
    location_name: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: false,
      comment: 'Koordinat tujuan akhir'
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: false,
      comment: 'Koordinat tujuan akhir'
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    image_url: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    budget_category: {
      type: DataTypes.ENUM('Gratis', 'Terjangkau', 'Menengah', 'Mewah'),
      defaultValue: 'Terjangkau'
    },
    estimated_distance: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Total jarak perjalanan (km)'
    },
    difficulty_level: {
      type: DataTypes.ENUM('Easy', 'Medium', 'Hard'),
      defaultValue: 'Medium'
    },
    points: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
      comment: 'Poin untuk menyelesaikan seluruh misi'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'missions',
    timestamps: true
  });

  Mission.associate = (models) => {
    Mission.hasMany(models.Journal, {
      foreignKey: 'mission_id',
      as: 'journals'
    });
    Mission.hasMany(models.MissionCompletion, {
      foreignKey: 'mission_id',
      as: 'completions'
    });
    // Relasi dengan Clues
    Mission.hasMany(models.MissionClue, {
      foreignKey: 'mission_id',
      as: 'clues'
    });
    Mission.hasMany(models.UserClueProgress, {
      foreignKey: 'mission_id',
      as: 'userClueProgress'
    });
  };

  return Mission;
};