'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create users table
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      email: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      password: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      bio: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      profile_image_url: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      level: {
        type: Sequelize.INTEGER,
        defaultValue: 1
      },
      total_missions: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      total_distance: {
        type: Sequelize.FLOAT,
        defaultValue: 0.0
      },
      current_streak: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      longest_streak: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      last_active_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      total_active_days: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Create missions table
    await queryInterface.createTable('missions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      category: {
        type: Sequelize.ENUM('Kuliner', 'Rekreasi', 'Seni & Budaya', 'Sejarah', 'Belanja', 'Alam'),
        allowNull: false
      },
      location_name: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      latitude: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: false
      },
      longitude: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: false
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      image_url: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      budget_category: {
        type: Sequelize.ENUM('Gratis', 'Terjangkau', 'Menengah', 'Mewah'),
        defaultValue: 'Terjangkau'
      },
      estimated_distance: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      difficulty_level: {
        type: Sequelize.ENUM('Easy', 'Medium', 'Hard'),
        defaultValue: 'Medium'
      },
      points: {
        type: Sequelize.INTEGER,
        defaultValue: 10
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Create journals table
    await queryInterface.createTable('journals', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      mission_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'missions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      story: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      image_url: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      location_name: {
        type: Sequelize.STRING(200),
        allowNull: true
      },
      latitude: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: true
      },
      longitude: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: true
      },
      date: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Create badges table
    await queryInterface.createTable('badges', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      icon_name: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      color: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      requirement_type: {
        type: Sequelize.ENUM('missions_completed', 'category_specific', 'streak_days', 'distance_traveled', 'journals_written'),
        allowNull: false
      },
      requirement_value: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      requirement_category: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Create user_badges table (junction table)
    await queryInterface.createTable('user_badges', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      badge_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'badges',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      unlocked_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Add unique constraint to prevent duplicate badge unlocks
    await queryInterface.addConstraint('user_badges', {
      fields: ['user_id', 'badge_id'],
      type: 'unique',
      name: 'unique_user_badge'
    });

    // Create mission_completions table
    await queryInterface.createTable('mission_completions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      mission_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'missions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      completed_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Add indexes for better query performance
    await queryInterface.addIndex('journals', ['user_id']);
    await queryInterface.addIndex('journals', ['mission_id']);
    await queryInterface.addIndex('journals', ['date']);
    await queryInterface.addIndex('mission_completions', ['user_id']);
    await queryInterface.addIndex('mission_completions', ['mission_id']);
    await queryInterface.addIndex('mission_completions', ['completed_at']);
    await queryInterface.addIndex('missions', ['category']);
    await queryInterface.addIndex('missions', ['is_active']);
  },

  down: async (queryInterface, Sequelize) => {
    // Drop tables in reverse order (to handle foreign keys)
    await queryInterface.dropTable('mission_completions');
    await queryInterface.dropTable('user_badges');
    await queryInterface.dropTable('journals');
    await queryInterface.dropTable('badges');
    await queryInterface.dropTable('missions');
    await queryInterface.dropTable('users');
  },

  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'is_admin', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('users', 'is_admin');
  }

};