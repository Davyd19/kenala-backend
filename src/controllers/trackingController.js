const { Mission, MissionClue, UserClueProgress, User } = require('../models');
const { calculateDistance, isWithinRadius, formatDistance, getDistanceMessage } = require('../utils/helpers');
const { Op } = require('sequelize');

/**
 * @route   GET /api/tracking/mission/:missionId
 * @desc    Mendapatkan info misi dengan semua clues
 * @access  Private
 */
exports.getMissionWithClues = async (req, res) => {
  try {
    const { missionId } = req.params;

    const mission = await Mission.findByPk(missionId, {
      include: [
        {
          model: MissionClue,
          as: 'clues',
        }
      ],
      // Pastikan clues di dalam include diurutkan
      order: [
        [{ model: MissionClue, as: 'clues' }, 'clue_order', 'ASC']
      ]
    });

    if (!mission) {
      return res.status(404).json({ error: 'Misi tidak ditemukan' });
    }

    // Cek progress user untuk misi ini
    const userProgress = await UserClueProgress.findAll({
      where: {
        user_id: req.user.id,
        mission_id: missionId
      }
    });

    const completedClueIds = userProgress.map(p => p.clue_id);

    // Tambahkan status completed ke setiap clue
    const cluesWithStatus = mission.clues.map(clue => ({
      ...clue.toJSON(),
      is_completed: completedClueIds.includes(clue.id)
    }));

    // --- PERBAIKAN BUG JSON MISMATCH ---
    // 1. Ubah misi (induk) ke JSON
    const missionData = mission.toJSON();
    // 2. Hapus array 'clues' yang bersarang (nested) dari objek misi.
    //    Frontend (MissionWithCluesResponse) mengharapkan 'clues' di level atas.
    delete missionData.clues;

    // 3. Kirim JSON dalam format yang benar sesuai DTO Android
    res.json({
      mission: missionData,     // Objek misi (tanpa clues)
      clues: cluesWithStatus,   // Array clues (di top-level)
      progress: {
        completed_clues: completedClueIds.length,
        total_clues: mission.clues.length,
        is_mission_completed: completedClueIds.length === mission.clues.length
      }
    });
    // ------------------------------------

  } catch (error) {
    console.error('Get mission with clues error:', error);
    res.status(500).json({ error: 'Gagal mengambil data misi' });
  }
};

/**
 * @route   POST /api/tracking/check-location
 * @desc    Mengecek lokasi user terhadap clue terdekat
 * @access  Private
 */
exports.checkUserLocation = async (req, res) => {
  try {
    const { mission_id, latitude, longitude } = req.body;

    if (!mission_id || !latitude || !longitude) {
      return res.status(400).json({ error: 'mission_id, latitude, dan longitude diperlukan' });
    }

    // Ambil semua clues untuk misi ini
    const clues = await MissionClue.findAll({
      where: { mission_id },
      order: [['clue_order', 'ASC']]
    });

    if (clues.length === 0) {
      // Jika misi tidak memiliki clue, langsung cek ke tujuan akhir
      const mission = await Mission.findByPk(mission_id);
      const distanceToDestination = calculateDistance(
        latitude,
        longitude,
        parseFloat(mission.latitude),
        parseFloat(mission.longitude)
      );

      return res.json({
        status: 'all_clues_completed',
        message: 'Misi ini tidak memiliki petunjuk, langsung ke tujuan akhir.',
        next_target: 'destination',
        destination: {
          name: mission.location_name,
          latitude: mission.latitude.toString(),
          longitude: mission.longitude.toString(),
          distance: distanceToDestination,
          formatted_distance: formatDistance(distanceToDestination),
          message: getDistanceMessage(distanceToDestination),
          is_arrived: isWithinRadius(distanceToDestination, 50)
        },
        current_clue: null,
        distance: {
            meters: distanceToDestination,
            formatted: formatDistance(distanceToDestination),
            message: getDistanceMessage(distanceToDestination)
        },
        progress: {
            completed: 0,
            total: 0,
            next_clue_number: null
        }
      });
    }

    // Ambil progress user
    const completedClues = await UserClueProgress.findAll({
      where: {
        user_id: req.user.id,
        mission_id
      }
    });

    const completedClueIds = completedClues.map(c => c.clue_id);

    // Cari clue berikutnya yang belum dikunjungi
    const nextClue = clues.find(clue => !completedClueIds.includes(clue.id));

    if (!nextClue) {
      // Semua clue sudah selesai, cek jarak ke tujuan akhir
      const mission = await Mission.findByPk(mission_id);
      const distanceToDestination = calculateDistance(
        latitude,
        longitude,
        parseFloat(mission.latitude),
        parseFloat(mission.longitude)
      );

      return res.json({
        status: 'all_clues_completed',
        message: 'Semua clue sudah diselesaikan!',
        next_target: 'destination',
        destination: {
          name: mission.location_name,
          latitude: mission.latitude.toString(), // Kirim sebagai String
          longitude: mission.longitude.toString(), // Kirim sebagai String
          distance: distanceToDestination,
          formatted_distance: formatDistance(distanceToDestination),
          message: getDistanceMessage(distanceToDestination),
          is_arrived: isWithinRadius(distanceToDestination, 50) // Radius 50m untuk tujuan akhir
        },
        current_clue: null,
        distance: {
            meters: distanceToDestination,
            formatted: formatDistance(distanceToDestination),
            message: getDistanceMessage(distanceToDestination)
        },
        progress: {
            completed: clues.length,
            total: clues.length,
            next_clue_number: null
        }
      });
    }

    // Hitung jarak ke clue berikutnya
    const distanceToClue = calculateDistance(
      latitude,
      longitude,
      parseFloat(nextClue.latitude),
      parseFloat(nextClue.longitude)
    );

    const isInRadius = isWithinRadius(distanceToClue, nextClue.radius_meters);
    let justReached = false;

    if (isInRadius) {
      const existingProgress = await UserClueProgress.findOne({
        where: { user_id: req.user.id, clue_id: nextClue.id }
      });
      
      if (!existingProgress) {
        justReached = true; 
        await UserClueProgress.create({
          user_id: req.user.id,
          mission_id,
          clue_id: nextClue.id,
          distance_from_clue: distanceToClue
        });
      }
    }

    res.json({
      status: justReached ? 'clue_reached' : 'tracking',
      clue_reached: justReached,
      current_clue: {
        id: nextClue.id.toString(), // Kirim sebagai String
        order: nextClue.clue_order,
        name: nextClue.name,
        description: nextClue.description,
        hint: nextClue.hint_text,
        image_url: nextClue.image_url,
        latitude: nextClue.latitude.toString(), // Kirim sebagai String
        longitude: nextClue.longitude.toString(), // Kirim sebagai String
        radius: nextClue.radius_meters,
        points: nextClue.points_reward
      },
      distance: {
        meters: distanceToClue,
        formatted: formatDistance(distanceToClue),
        message: getDistanceMessage(distanceToClue)
      },
      progress: {
        completed: completedClueIds.length + (justReached ? 1 : 0),
        total: clues.length,
        next_clue_number: justReached ? (nextClue.clue_order + 1) : nextClue.clue_order
      },
      destination: null 
    });
  } catch (error) {
    console.error('Check location error:', error);
    res.status(500).json({ error: 'Gagal mengecek lokasi' });
  }
};

/**
 * @route   POST /api/tracking/skip-clue
 * @desc    Melewatkan clue saat ini secara manual
 * @access  Private
 */
exports.skipClue = async (req, res) => {
  try {
    const { mission_id, clue_id } = req.body;

    if (!mission_id || !clue_id) {
      return res.status(400).json({ error: 'mission_id dan clue_id diperlukan' });
    }

    // 1. Tandai clue sebagai selesai
    const existingProgress = await UserClueProgress.findOne({
      where: { user_id: req.user.id, clue_id: clue_id }
    });

    if (!existingProgress) {
      await UserClueProgress.create({
        user_id: req.user.id,
        mission_id,
        clue_id: clue_id,
        distance_from_clue: 0, // 0 karena di-skip
        reached_at: new Date()
      });
    }

    // 2. Ambil semua clues untuk misi ini
    const clues = await MissionClue.findAll({
      where: { mission_id },
      order: [['clue_order', 'ASC']]
    });

    // 3. Ambil progress user SETELAH di-skip
    const completedClues = await UserClueProgress.findAll({
      where: { user_id: req.user.id, mission_id }
    });
    const completedClueIds = completedClues.map(c => c.clue_id);

    // 4. Cari clue berikutnya
    const nextClue = clues.find(clue => !completedClueIds.includes(clue.id));

    // 5. Kirim response
    if (!nextClue) {
      // --- PERUBAHAN YANG ANDA MINTA ---
      // Jika TIDAK ADA clue berikutnya (ini adalah clue terakhir)
      // Kirim status 'all_clues_completed' dan 'is_arrived: true'
      const mission = await Mission.findByPk(mission_id);
      return res.json({
        status: 'all_clues_completed',
        message: 'Clue terakhir dilewati! Misi Selesai!',
        next_target: 'destination',
        destination: {
          name: mission.location_name,
          latitude: mission.latitude.toString(),
          longitude: mission.longitude.toString(),
          distance: 0, 
          formatted_distance: "0 m",
          message: "Anda telah sampai!",
          is_arrived: true // <-- INI PERUBAHANNYA
        },
        current_clue: null,
        distance: { meters: 0, formatted: "0 m", message: "Anda telah sampai!" },
        progress: {
          completed: clues.length,
          total: clues.length,
          next_clue_number: null
        }
      });
      // ---------------------------------
    } else {
      // Masih ada clue berikutnya, kirim data CLUE BERIKUTNYA
      return res.json({
        status: 'clue_reached', // Dianggap 'reached' karena kita kirim clue baru
        clue_reached: true,
        current_clue: {
          id: nextClue.id.toString(),
          order: nextClue.clue_order,
          name: nextClue.name,
          description: nextClue.description,
          hint: nextClue.hint_text,
          image_url: nextClue.image_url,
          latitude: nextClue.latitude.toString(),
          longitude: nextClue.longitude.toString(),
          radius: nextClue.radius_meters,
          points: nextClue.points_reward
        },
        distance: {
          meters: 0, 
          formatted: "0 m",
          message: "Clue sebelumnya dilewati."
        },
        progress: {
          completed: completedClueIds.length,
          total: clues.length,
          next_clue_number: nextClue.clue_order
        },
        destination: null
      });
    }

  } catch (error) {
    console.error('Skip clue error:', error);
    res.status(500).json({ error: 'Gagal melewati clue' });
  }
};

/**
 * @route   POST /api/tracking/reset-progress
 * @desc    Menghapus semua progress UserClueProgress untuk satu misi
 * @access  Private
 */
exports.resetProgress = async (req, res) => {
  try {
    const { mission_id } = req.body;

    if (!mission_id) {
      return res.status(400).json({ error: 'mission_id diperlukan' });
    }

    await UserClueProgress.destroy({
      where: {
        user_id: req.user.id,
        mission_id: mission_id
      }
    });

    res.status(204).send();

  } catch (error) {
    console.error('Reset progress error:', error);
    res.status(500).json({ error: 'Gagal me-reset progress misi' });
  }
};


/**
 * @route   GET /api/tracking/nearby-clues
 * @desc    Mendapatkan clue terdekat dari posisi user
 * @access  Private
 */
exports.getNearbyClues = async (req, res) => {
  try {
    const { latitude, longitude, radius = 5000 } = req.query; // default 5km

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'latitude dan longitude diperlukan' });
    }

    // Ambil semua clue yang aktif
    const allClues = await MissionClue.findAll({
      include: [
        {
          model: Mission,
          as: 'mission',
          where: { is_active: true },
          attributes: ['id', 'name', 'category']
        }
      ]
    });

    // Filter dan hitung jarak untuk setiap clue
    const cluesWithDistance = allClues
      .map(clue => {
        const distance = calculateDistance(
          parseFloat(latitude),
          parseFloat(longitude),
          parseFloat(clue.latitude),
          parseFloat(clue.longitude)
        );

        return {
          ...clue.toJSON(),
          distance,
          formatted_distance: formatDistance(distance)
        };
      })
      .filter(clue => clue.distance <= radius)
      .sort((a, b) => a.distance - b.distance);

    res.json({
      nearby_clues: cluesWithDistance,
      count: cluesWithDistance.length
    });
  } catch (error) {
    console.error('Get nearby clues error:', error);
    res.status(500).json({ error: 'Gagal mengambil clue terdekat' });
  }
};

/**
 * @route   POST /api/tracking/missions/:missionId/clues
 * @desc    Menambahkan clue baru ke misi (Admin)
 * @access  Private (Admin)
 */
exports.addClueToMission = async (req, res) => {
  try {
    const { missionId } = req.params;
    const {
      clue_order,
      name,
      description,
      hint_text,
      latitude,
      longitude,
      radius_meters,
      image_url,
      points_reward,
      is_required
    } = req.body;

    // Validasi
    if (!clue_order || !name || !description || !latitude || !longitude) {
      return res.status(400).json({ error: 'Field wajib tidak lengkap' });
    }

    // Cek apakah misi ada
    const mission = await Mission.findByPk(missionId);
    if (!mission) {
      return res.status(404).json({ error: 'Misi tidak ditemukan' });
    }

    const clue = await MissionClue.create({
      mission_id: missionId,
      clue_order,
      name,
      description,
      hint_text,
      latitude,
      longitude,
      radius_meters: radius_meters || 50,
      image_url,
      points_reward: points_reward || 5,
      is_required: is_required !== undefined ? is_required : true
    });

    res.status(201).json({ clue });
  } catch (error) {
    console.error('Add clue error:', error);
    res.status(500).json({ error: 'Gagal menambahkan clue' });
  }
};

/**
 * @route   GET /api/tracking/user/progress
 * @desc    Mendapatkan semua progress user
 * @access  Private
 */
exports.getUserProgress = async (req, res) => {
  try {
    const progress = await UserClueProgress.findAll({
      where: { user_id: req.user.id },
      include: [
        {
          model: Mission,
          as: 'mission',
          attributes: ['id', 'name', 'category']
        },
        {
          model: MissionClue,
          as: 'clue',
          attributes: ['id', 'clue_order', 'name', 'points_reward']
        }
      ],
      order: [['reached_at', 'DESC']]
    });

    res.json({ progress });
  } catch (error) {
    console.error('Get user progress error:', error);
    res.status(500).json({ error: 'Gagal mengambil progress user' });
  }
};

module.exports = exports;