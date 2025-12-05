const { Mission, MissionClue, UserClueProgress, User } = require('../models');
const { calculateDistance, isWithinRadius, formatDistance, getDistanceMessage } = require('../utils/helpers');
const { Op } = require('sequelize');

/**
 * @route   GET /api/tracking/mission/:missionId
 * @desc    Mendapatkan detail misi beserta status clue yang sudah diselesaikan user
 * @access  Private
 */
exports.getMissionWithClues = async (req, res) => {
  try {
    const { missionId } = req.params;
    const mission = await Mission.findByPk(missionId);

    if (!mission) {
      return res.status(404).json({ error: 'Misi tidak ditemukan' });
    }

    const clues = await MissionClue.findAll({
      where: { mission_id: missionId },
      order: [['clue_order', 'ASC']]
    });

    const userProgress = await UserClueProgress.findAll({
      where: {
        user_id: req.user.id,
        mission_id: missionId
      }
    });

    const completedClueIds = userProgress.map(p => p.clue_id);

    const cluesWithStatus = clues.map(clue => ({
      id: clue.id,
      order: clue.clue_order,
      name: clue.name,
      description: clue.description,
      hint: clue.hint_text,
      image_url: clue.image_url, // URL gambar clue (misal: patung, gedung)
      latitude: clue.latitude,
      longitude: clue.longitude,
      radius: clue.radius_meters,
      points: clue.points_reward,
      is_completed: completedClueIds.includes(clue.id)
    }));

    res.json({
      mission: {
        id: mission.id,
        name: mission.name,
        description: mission.description,
        location: mission.location_name,
        latitude: mission.latitude,
        longitude: mission.longitude,
        image_url: mission.image_url
      },
      clues: cluesWithStatus,
      progress: {
        completed: completedClueIds.length,
        total: clues.length
      }
    });

  } catch (error) {
    console.error('Get mission tracking error:', error);
    res.status(500).json({ error: 'Gagal memuat data tracking misi' });
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

    const clues = await MissionClue.findAll({
      where: { mission_id },
      order: [['clue_order', 'ASC']]
    });

    // Handle jika misi tidak punya clue (langsung ke lokasi tujuan)
    if (clues.length === 0) {
        const mission = await Mission.findByPk(mission_id);
        const distanceToDestination = calculateDistance(latitude, longitude, parseFloat(mission.latitude), parseFloat(mission.longitude));
        
        // Radius diperketat jadi 30m untuk validasi kedatangan
        const isArrived = isWithinRadius(distanceToDestination, 30); 

        return res.json({
            status: 'all_clues_completed',
            message: 'Langsung ke tujuan akhir.',
            next_target: 'destination',
            destination: {
                name: mission.location_name,
                latitude: mission.latitude.toString(),
                longitude: mission.longitude.toString(),
                distance: distanceToDestination,
                formatted_distance: formatDistance(distanceToDestination),
                message: getDistanceMessage(distanceToDestination),
                is_arrived: isArrived
            },
            current_clue: null,
            distance: { meters: distanceToDestination, formatted: formatDistance(distanceToDestination), message: getDistanceMessage(distanceToDestination) },
            progress: { completed: 0, total: 0, next_clue_number: null }
        });
    }

    const completedClues = await UserClueProgress.findAll({ where: { user_id: req.user.id, mission_id } });
    const completedClueIds = completedClues.map(c => c.clue_id);
    const nextClue = clues.find(clue => !completedClueIds.includes(clue.id));

    if (!nextClue) {
      // Semua clue selesai, cek jarak ke tujuan akhir
      const mission = await Mission.findByPk(mission_id);
      const distanceToDestination = calculateDistance(latitude, longitude, parseFloat(mission.latitude), parseFloat(mission.longitude));
      
      // Radius diperketat jadi 30m
      const isArrived = isWithinRadius(distanceToDestination, 30);

      return res.json({
        status: 'all_clues_completed',
        message: 'Semua clue selesai!',
        next_target: 'destination',
        destination: {
          name: mission.location_name,
          latitude: mission.latitude.toString(),
          longitude: mission.longitude.toString(),
          distance: distanceToDestination,
          formatted_distance: formatDistance(distanceToDestination),
          message: getDistanceMessage(distanceToDestination),
          is_arrived: isArrived
        },
        current_clue: null,
        distance: { meters: distanceToDestination, formatted: formatDistance(distanceToDestination), message: getDistanceMessage(distanceToDestination) },
        progress: { completed: clues.length, total: clues.length, next_clue_number: null }
      });
    }

    // Cek jarak ke clue berikutnya
    const distanceToClue = calculateDistance(latitude, longitude, parseFloat(nextClue.latitude), parseFloat(nextClue.longitude));
    const isInRadius = isWithinRadius(distanceToClue, nextClue.radius_meters);
    let justReached = false;

    if (isInRadius) {
      const existingProgress = await UserClueProgress.findOne({ where: { user_id: req.user.id, clue_id: nextClue.id } });
      if (!existingProgress) {
        justReached = true; // Baru saja sampai
        // Catat progress
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
      distance: { meters: distanceToClue, formatted: formatDistance(distanceToClue), message: getDistanceMessage(distanceToClue) },
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

    // 1. Ambil semua clues untuk misi ini UNTUK PENGECEKAN
    const clues = await MissionClue.findAll({
      where: { mission_id },
      order: [['clue_order', 'ASC']]
    });

    // 2. Cek apakah ini adalah clue terakhir?
    // Jika clue ini adalah clue terakhir dalam array, maka skip TIDAK BOLEH dilakukan
    // karena setelah ini user harus ke tujuan akhir.
    // Kita asumsikan clue_id yang dikirim adalah integer atau string angka
    const isLastClue = clues[clues.length - 1].id == clue_id;

    if (isLastClue) {
        return res.status(403).json({ 
            error: 'Clue terakhir tidak dapat dilewati. Anda harus pergi ke lokasi tujuan untuk menyelesaikan misi.' 
        });
    }

    // 3. Jika bukan clue terakhir, lanjutkan proses skip normal
    const existingProgress = await UserClueProgress.findOne({
      where: { user_id: req.user.id, clue_id: clue_id }
    });

    if (!existingProgress) {
      await UserClueProgress.create({
        user_id: req.user.id,
        mission_id,
        clue_id: clue_id,
        distance_from_clue: 0, // 0 karena diskip
        reached_at: new Date()
      });
    }

    // Ambil progress user SETELAH di-skip untuk mendapatkan next clue
    const completedClues = await UserClueProgress.findAll({
      where: { user_id: req.user.id, mission_id }
    });
    const completedClueIds = completedClues.map(c => c.clue_id);

    // Cari clue berikutnya
    const nextClue = clues.find(clue => !completedClueIds.includes(clue.id));

    // Response jika ada clue berikutnya (karena kita sudah blokir skip clue terakhir, nextClue HARUS ada)
    if (nextClue) {
      return res.json({
        status: 'clue_reached',
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
        distance: { meters: 0, formatted: "0 m", message: "Clue sebelumnya dilewati." },
        progress: { completed: completedClueIds.length, total: clues.length, next_clue_number: nextClue.clue_order },
        destination: null
      });
    } 
    
    // Fallback logic (seharusnya tidak terpanggil jika logika isLastClue benar)
    res.status(400).json({ error: "Terjadi kesalahan logika navigasi." });

  } catch (error) {
    console.error('Skip clue error:', error);
    res.status(500).json({ error: 'Gagal melewati clue' });
  }
};

/**
 * @route   POST /api/tracking/reset-progress
 * @desc    Mereset progress misi (untuk testing)
 * @access  Private
 */
exports.resetProgress = async (req, res) => {
    try {
        const { mission_id } = req.body;
        await UserClueProgress.destroy({
            where: {
                user_id: req.user.id,
                mission_id: mission_id
            }
        });
        res.json({ message: 'Progress misi direset' });
    } catch (error) {
        res.status(500).json({ error: 'Gagal reset progress' });
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