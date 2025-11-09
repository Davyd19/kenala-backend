module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Seed Missions
    await queryInterface.bulkInsert('missions', [
      {
        name: 'Kopi Seroja',
        description: 'Kedai kopi tersembunyi dengan suasana tenang dan kopi nikmat',
        category: 'Kuliner',
        location_name: 'Kopi Seroja, Padang',
        latitude: -0.9471,
        longitude: 100.4172,
        address: 'Jl. Pemuda No. 45, Padang',
        image_url: 'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg',
        budget_category: 'Terjangkau',
        estimated_distance: 2.5,
        difficulty_level: 'Easy',
        points: 10,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Galeri Seni Lokal',
        description: 'Galeri seni kontemporer dengan karya seniman lokal',
        category: 'Seni & Budaya',
        location_name: 'Galeri Seni Padang',
        latitude: -0.9492,
        longitude: 100.4213,
        address: 'Jl. Sudirman No. 12, Padang',
        image_url: 'https://images.pexels.com/photos/1025804/pexels-photo-1025804.jpeg',
        budget_category: 'Gratis',
        estimated_distance: 3.2,
        difficulty_level: 'Easy',
        points: 15,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Hutan Kota',
        description: 'Taman hutan dengan udara segar dan jalur jogging',
        category: 'Alam',
        location_name: 'Hutan Kota Padang',
        latitude: -0.9533,
        longitude: 100.4144,
        address: 'Jl. Bypass No. 88, Padang',
        image_url: 'https://images.pexels.com/photos/167699/pexels-photo-167699.jpeg',
        budget_category: 'Gratis',
        estimated_distance: 5.0,
        difficulty_level: 'Medium',
        points: 20,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Museum Adityawarman',
        description: 'Museum dengan koleksi sejarah dan budaya Minangkabau',
        category: 'Sejarah',
        location_name: 'Museum Adityawarman',
        latitude: -0.9409,
        longitude: 100.3617,
        address: 'Jl. Diponegoro, Padang',
        image_url: 'https://images.pexels.com/photos/2833391/pexels-photo-2833391.jpeg',
        budget_category: 'Terjangkau',
        estimated_distance: 4.5,
        difficulty_level: 'Easy',
        points: 15,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Pantai Air Manis',
        description: 'Pantai dengan legenda Malin Kundang dan pemandangan indah',
        category: 'Rekreasi',
        location_name: 'Pantai Air Manis',
        latitude: -1.0167,
        longitude: 100.3667,
        address: 'Air Manis, Padang Selatan',
        image_url: 'https://images.pexels.com/photos/1032650/pexels-photo-1032650.jpeg',
        budget_category: 'Terjangkau',
        estimated_distance: 8.0,
        difficulty_level: 'Medium',
        points: 25,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    // Seed Badges
    await queryInterface.bulkInsert('badges', [
      {
        name: 'Petualang Pemula',
        description: 'Selesaikan misi pertamamu',
        icon_name: 'Hiking',
        color: '#004608',
        requirement_type: 'missions_completed',
        requirement_value: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Penjelajah Kota',
        description: 'Selesaikan 10 misi',
        icon_name: 'LocationCity',
        color: '#00398C',
        requirement_type: 'missions_completed',
        requirement_value: 10,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Kuliner Hunter',
        description: 'Selesaikan 5 misi kuliner',
        icon_name: 'Restaurant',
        color: '#F8C104',
        requirement_type: 'category_specific',
        requirement_value: 5,
        requirement_category: 'Kuliner',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Pecinta Seni',
        description: 'Kunjungi 3 galeri seni',
        icon_name: 'Palette',
        color: '#0058A7',
        requirement_type: 'category_specific',
        requirement_value: 3,
        requirement_category: 'Seni & Budaya',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Penjaga Streak',
        description: 'Pertahankan streak 7 hari',
        icon_name: 'LocalFireDepartment',
        color: '#DC2626',
        requirement_type: 'streak_days',
        requirement_value: 7,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Maraton Petualang',
        description: 'Tempuh jarak 50km',
        icon_name: 'DirectionsRun',
        color: '#F8C104',
        requirement_type: 'distance_traveled',
        requirement_value: 50,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Master Explorer',
        description: 'Selesaikan 50 misi',
        icon_name: 'EmojiEvents',
        color: '#F8C104',
        requirement_type: 'missions_completed',
        requirement_value: 50,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('missions', null, {});
    await queryInterface.bulkDelete('badges', null, {});
  }
};