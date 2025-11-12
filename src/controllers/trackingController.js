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
          order: [['clue_order', 'ASC']]
        }
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

    res.json({
      mission: {
        ...mission.toJSON(),
        clues: cluesWithStatus
      },
      progress: {
        completed_clues: completedClueIds.length,
        total_clues: mission.clues.length,
        is_mission_completed: completedClueIds.length === mission.clues.length
      }
    });
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
      return res.status(404).json({ error: 'Tidak ada clue untuk misi ini' });
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
          latitude: mission.latitude,
          longitude: mission.longitude,
          distance: distanceToDestination,
          formatted_distance: formatDistance(distanceToDestination),
          message: getDistanceMessage(distanceToDestination),
          is_arrived: isWithinRadius(distanceToDestination, 50)
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

    // Jika dalam radius, otomatis mark sebagai completed
    if (isInRadius) {
      await UserClueProgress.create({
        user_id: req.user.id,
        mission_id,
        clue_id: nextClue.id,
        distance_from_clue: distanceToClue
      });

      // Update user points
      await User.increment('total_missions', {
        by: nextClue.points_reward,
        where: { id: req.user.id }
      });
    }

    res.json({
      status: isInRadius ? 'clue_reached' : 'tracking',
      clue_reached: isInRadius,
      current_clue: {
        id: nextClue.id,
        order: nextClue.clue_order,
        name: nextClue.name,
        description: nextClue.description,
        hint: nextClue.hint_text,
        image_url: nextClue.image_url,
        latitude: nextClue.latitude,
        longitude: nextClue.longitude,
        radius: nextClue.radius_meters,
        points: nextClue.points_reward
      },
      distance: {
        meters: distanceToClue,
        formatted: formatDistance(distanceToClue),
        message: getDistanceMessage(distanceToClue)
      },
      progress: {
        completed: completedClueIds.length,
        total: clues.length,
        next_clue_number: nextClue.clue_order
      }
    });
  } catch (error) {
    console.error('Check location error:', error);
    res.status(500).json({ error: 'Gagal mengecek lokasi' });
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