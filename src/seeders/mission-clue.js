'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Seed Clues untuk Misi "Kopi Seroja" (mission_id: 1)
    await queryInterface.bulkInsert('mission_clues', [
      {
        mission_id: 1,
        clue_order: 1,
        name: 'Gerbang Pemuda',
        description: 'Mulai petualanganmu dari Gerbang Pemuda. Cari monumen dengan tulisan "Kota Padang".',
        hint_text: 'Monumen ini berada di persimpangan jalan utama',
        latitude: -0.9450,
        longitude: 100.4160,
        radius_meters: 50,
        image_url: 'https://images.pexels.com/photos/1252500/pexels-photo-1252500.jpeg',
        points_reward: 5,
        is_required: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        mission_id: 1,
        clue_order: 2,
        name: 'Taman Kecil',
        description: 'Lanjutkan ke taman kecil dengan air mancur di tengahnya. Di sini biasanya ada orang yang duduk-duduk.',
        hint_text: 'Taman ini berada 200m dari gerbang pemuda',
        latitude: -0.9461,
        longitude: 100.4168,
        radius_meters: 50,
        image_url: 'https://images.pexels.com/photos/2480073/pexels-photo-2480073.jpeg',
        points_reward: 5,
        is_required: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        mission_id: 1,
        clue_order: 3,
        name: 'Gang Sempit',
        description: 'Masuk ke gang kecil di sebelah toko roti. Kamu akan mencium aroma kopi yang kuat!',
        hint_text: 'Gang ini ada tulisan "Jalan Setapak" di dindingnya',
        latitude: -0.9468,
        longitude: 100.4170,
        radius_meters: 30,
        image_url: 'https://images.pexels.com/photos/1036857/pexels-photo-1036857.jpeg',
        points_reward: 5,
        is_required: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    // Seed Clues untuk Misi "Galeri Seni Lokal" (mission_id: 2)
    await queryInterface.bulkInsert('mission_clues', [
      {
        mission_id: 2,
        clue_order: 1,
        name: 'Patung Kuda',
        description: 'Temukan patung kuda perunggu di depan gedung tinggi.',
        hint_text: 'Patung ini menghadap ke arah timur',
        latitude: -0.9480,
        longitude: 100.4200,
        radius_meters: 50,
        image_url: 'https://images.pexels.com/photos/1743165/pexels-photo-1743165.jpeg',
        points_reward: 5,
        is_required: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        mission_id: 2,
        clue_order: 2,
        name: 'Jembatan Merah',
        description: 'Lanjutkan ke jembatan kecil berwarna merah.',
        hint_text: 'Jembatan ini melintasi sungai kecil',
        latitude: -0.9487,
        longitude: 100.4208,
        radius_meters: 40,
        image_url: 'https://images.pexels.com/photos/1029328/pexels-photo-1029328.jpeg',
        points_reward: 5,
        is_required: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        mission_id: 2,
        clue_order: 3,
        name: 'Pintu Biru',
        description: 'Cari bangunan dengan pintu besar berwarna biru. Galeri ada di sini!',
        hint_text: 'Ada plakat bertulisan "Galeri" di dinding',
        latitude: -0.9490,
        longitude: 100.4211,
        radius_meters: 30,
        image_url: 'https://images.pexels.com/photos/1029328/pexels-photo-1029328.jpeg',
        points_reward: 5,
        is_required: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    // Seed Clues untuk Misi "Hutan Kota" (mission_id: 3)
    await queryInterface.bulkInsert('mission_clues', [
      {
        mission_id: 3,
        clue_order: 1,
        name: 'Pos Keamanan',
        description: 'Mulai dari pos keamanan pintu masuk hutan kota.',
        hint_text: 'Ada papan informasi besar di sini',
        latitude: -0.9520,
        longitude: 100.4130,
        radius_meters: 50,
        image_url: 'https://images.pexels.com/photos/1047393/pexels-photo-1047393.jpeg',
        points_reward: 5,
        is_required: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        mission_id: 3,
        clue_order: 2,
        name: 'Pohon Besar',
        description: 'Cari pohon beringin raksasa di tengah jalur.',
        hint_text: 'Pohon ini memiliki akar gantung yang panjang',
        latitude: -0.9527,
        longitude: 100.4138,
        radius_meters: 60,
        image_url: 'https://images.pexels.com/photos/1179229/pexels-photo-1179229.jpeg',
        points_reward: 5,
        is_required: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        mission_id: 3,
        clue_order: 3,
        name: 'Gazebo',
        description: 'Lanjutkan ke gazebo kayu dengan pemandangan kota.',
        hint_text: 'Gazebo ini berada di titik tertinggi',
        latitude: -0.9531,
        longitude: 100.4142,
        radius_meters: 40,
        image_url: 'https://images.pexels.com/photos/1438408/pexels-photo-1438408.jpeg',
        points_reward: 10,
        is_required: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        mission_id: 3,
        clue_order: 4,
        name: 'Area Jogging',
        description: 'Tiba di area jogging utama dengan track melingkar.',
        hint_text: 'Ada bangku istirahat dan tempat minum di sini',
        latitude: -0.9533,
        longitude: 100.4144,
        radius_meters: 50,
        image_url: 'https://images.pexels.com/photos/1415810/pexels-photo-1415810.jpeg',
        points_reward: 10,
        is_required: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('mission_clues', null, {});
  }
};