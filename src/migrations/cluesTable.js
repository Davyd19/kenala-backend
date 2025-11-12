'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create mission_clues table
    await queryInterface.createTable('mission_clues', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
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
      clue_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Urutan clue (1, 2, 3, dst.)'
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: false,
        comment: 'Nama checkpoint/clue'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Deskripsi petunjuk untuk user'
      },
      hint_text: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Petunjuk tambahan jika user kesulitan'
      },
      latitude: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: false,
        comment: 'Koordinat latitude clue'
      },
      longitude: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: false,
        comment: 'Koordinat longitude clue'
      },
      radius_meters: {
        type: Sequelize.INTEGER,
        defaultValue: 50,
        comment: 'Radius dalam meter untuk mendeteksi "sudah sampai"'
      },
      image_url: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Gambar petunjuk (opsional)'
      },
      points_reward: {
        type: Sequelize.INTEGER,
        defaultValue: 5,
        comment: 'Poin yang didapat saat mencapai clue ini'
      },
      is_required: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        comment: 'Apakah clue ini wajib dikunjungi'
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

    // Create user_clue_progress table
    await queryInterface.createTable('user_clue_progress', {
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
      clue_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'mission_clues',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      reached_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Waktu saat user sampai di clue'
      },
      distance_from_clue: {
        type: Sequelize.FLOAT,
        allowNull: true,
        comment: 'Jarak dalam meter saat detected'
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

    // Add indexes
    await queryInterface.addIndex('mission_clues', ['mission_id']);
    await queryInterface.addIndex('mission_clues', ['clue_order']);
    await queryInterface.addIndex('user_clue_progress', ['user_id', 'mission_id']);
    await queryInterface.addIndex('user_clue_progress', ['clue_id']);

    // Add unique constraint to prevent duplicate clue completion
    await queryInterface.addConstraint('user_clue_progress', {
      fields: ['user_id', 'clue_id'],
      type: 'unique',
      name: 'unique_user_clue'
    });

    // Add composite index for mission_id and clue_order (for ordering)
    await queryInterface.addIndex('mission_clues', ['mission_id', 'clue_order'], {
      name: 'idx_mission_clues_order'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('user_clue_progress');
    await queryInterface.dropTable('mission_clues');
  }
};