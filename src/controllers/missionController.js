const { Mission, MissionCompletion, User, Badge, UserBadge } = require('../models');
const { Op } = require('sequelize');
const admin = require('../config/firebase');

// Helper untuk format tanggal YYYY-MM-DD
const getToday = () => new Date().toISOString().split('T')[0];
const getYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
};

/**
 * Mengambil daftar misi dengan filter kategori, budget, dan jarak
 */
exports.getMissions = async (req, res) => {
    try {
        const { category, budget, distance } = req.query;
        const where = { is_active: true };

        if (category && category !== 'Acak') where.category = category;
        if (budget && budget !== 'Acak') where.budget_category = budget;
        
        if (distance && distance !== 'Acak') {
            const distanceRanges = {
                'Sangat Dekat': [0, 2],
                'Dekat': [2, 5],
                'Sedang': [5, 10],
                'Jauh': [10, 999]
            };
            const range = distanceRanges[distance];
            if (range) {
                where.estimated_distance = { [Op.between]: range };
            }
        }

        const missions = await Mission.findAll({
            where,
            order: [['created_at', 'DESC']],
            limit: 20
        });
        res.json(missions);
    } catch (error) {
        console.error('Fetch missions error:', error);
        res.status(500).json({ error: 'Failed to fetch missions' });
    }
};

/**
 * Mengambil satu misi secara acak untuk fitur Gacha
 */
exports.getRandomMission = async (req, res) => {
    try {
        const { category, budget, distance } = req.query;
        const where = { is_active: true };

        if (category && category !== 'Acak') where.category = category;
        if (budget && budget !== 'Acak') where.budget_category = budget;
        
        // Logika filter jarak untuk gacha jika diperlukan
        if (distance && distance !== 'Acak') {
            const distanceRanges = {
                'Sangat Dekat': [0, 2],
                'Dekat': [2, 5],
                'Sedang': [5, 10],
                'Jauh': [10, 999]
            };
            const range = distanceRanges[distance];
            if (range) {
                where.estimated_distance = { [Op.between]: range };
            }
        }

        const missions = await Mission.findAll({ where });

        if (missions.length === 0) {
            return res.status(404).json({ error: 'No missions found' });
        }

        const randomMission = missions[Math.floor(Math.random() * missions.length)];
        res.json(randomMission);
    } catch (error) {
        console.error('Random mission error:', error);
        res.status(500).json({ error: 'Failed to get mission' });
    }
};

/**
 * Mendapatkan detail satu misi berdasarkan ID
 */
exports.getMission = async (req, res) => {
    try {
        const mission = await Mission.findByPk(req.params.id);
        if (!mission) {
            return res.status(404).json({ error: 'Mission not found' });
        }
        res.json(mission);
    } catch (error) {
        console.error('Get mission error:', error);
        res.status(500).json({ error: 'Failed to fetch mission' });
    }
};

/**
 * LOGIKA UTAMA: Menyelesaikan misi, update statistik, streak, dan pemberian badge
 * @route   POST /api/missions/complete
 */
exports.completeMission = async (req, res) => {
    try {
        const mission_id = req.body.missionId || req.body.mission_id;
        const real_distance_meters = req.body.realDistanceMeters || req.body.real_distance_meters;
        const userId = req.user.id;

        if (!mission_id) {
            return res.status(400).json({ error: 'Mission ID is required' });
        }

        const mission = await Mission.findByPk(mission_id);
        if (!mission) return res.status(404).json({ error: 'Mission not found' });

        await MissionCompletion.create({
            user_id: userId,
            mission_id: mission_id,
            completed_at: new Date()
        });

        const user = await User.findByPk(userId);
        const today = getToday();
        const yesterday = getYesterday();

        let distanceToAdd = (real_distance_meters && real_distance_meters > 0) 
            ? (real_distance_meters / 1000) 
            : (mission.estimated_distance || 0);

        let updateData = {
            total_missions: (user.total_missions || 0) + 1,
            total_distance: (user.total_distance || 0) + distanceToAdd
        };

        if (user.last_active_date !== today) {
            updateData.total_active_days = (user.total_active_days || 0) + 1;
            updateData.current_streak = (user.last_active_date === yesterday) ? (user.current_streak + 1) : 1;
            
            if (updateData.current_streak > (user.longest_streak || 0)) {
                updateData.longest_streak = updateData.current_streak;
            }
            updateData.last_active_date = today;
        }

        await user.update(updateData);
        
        const newBadges = await checkAndAwardBadges(user, mission);

        res.status(200).json({
            message: 'Mission completed and stats updated',
            stats: updateData,
            new_badges: newBadges
        });

    } catch (error) {
        console.error('Complete mission error:', error);
        res.status(500).json({ error: 'Failed to complete mission' });
    }
};

async function checkAndAwardBadges(user, completedMission) {
    try {
        await user.reload({ include: [{ model: Badge, as: 'badges' }] });
        const ownedBadgeIds = user.badges ? user.badges.map(b => b.id) : [];

        const badgesToCheck = await Badge.findAll({ 
            where: { id: { [Op.notIn]: ownedBadgeIds } } 
        });

        const badgesAwarded = [];

        for (const badge of badgesToCheck) {
            let isQualified = false;

            switch (badge.requirement_type) {
                case 'missions_completed':
                    if (user.total_missions >= badge.requirement_value) isQualified = true;
                    break;
                case 'distance_traveled':
                    if (user.total_distance >= badge.requirement_value) isQualified = true;
                    break;
                case 'streak_days':
                    if (user.current_streak >= badge.requirement_value) isQualified = true;
                    break;
                case 'category_specific':
                    if (completedMission && badge.requirement_category === completedMission.category) {
                        const count = await MissionCompletion.count({
                            where: { user_id: user.id },
                            include: [{
                                model: Mission,
                                as: 'mission',
                                where: { category: badge.requirement_category }
                            }]
                        });
                        if (count >= badge.requirement_value) isQualified = true;
                    }
                    break;
                case 'journals_written':
                    const { Journal } = require('../models');
                    const journalCount = await Journal.count({ where: { user_id: user.id } });
                    if (journalCount >= badge.requirement_value) isQualified = true;
                    break;
            }

            if (isQualified) {
                await user.addBadges(badge.id);
                badgesAwarded.push({
                    id: badge.id,
                    name: badge.name,
                    icon: badge.icon_name
                });
            }
        }

        return badgesAwarded;

    } catch (error) {
        console.error('Error awarding badges:', error);
        return [];
    }
}

exports.createMission = async (req, res) => {
    try {
        const { 
            name, description, category, location_name, latitude, 
            longitude, address, image_url, budget_category, 
            estimated_distance, difficulty_level, points 
        } = req.body;
        
        if (!name || !category || !location_name || !latitude || !longitude) {
            return res.status(400).json({ error: 'Required fields are missing' });
        }

        const mission = await Mission.create({
            name, description, category, location_name, latitude, 
            longitude, address, image_url, budget_category, 
            estimated_distance, difficulty_level, points,
            is_active: true
        });

        res.status(201).json(mission);
    } catch (error) {
        console.error('Create mission error:', error);
        res.status(500).json({ error: 'Failed to create new mission' });
    }
};

exports.updateMission = async (req, res) => {
    try {
        const mission = await Mission.findByPk(req.params.id);
        if (!mission) return res.status(404).json({ error: 'Mission not found' });
        
        await mission.update(req.body);
        res.json(mission);
    } catch (error) {
        console.error('Update mission error:', error);
        res.status(500).json({ error: 'Failed to update mission' });
    }
};

exports.deleteMission = async (req, res) => {
    try {
        const mission = await Mission.findByPk(req.params.id);
        if (!mission) return res.status(404).json({ error: 'Mission not found' });
        
        await mission.destroy();
        res.status(204).send();
    } catch (error) {
        console.error('Delete mission error:', error);
        res.status(500).json({ error: 'Failed to delete mission' });
    }
};

exports.publishMission = async (req, res) => {
    try {
        const { id } = req.params; 
        
        const mission = await Mission.findByPk(id);
        if (!mission) {
            return res.status(404).json({ error: 'Mission not found' });
        }

        const message = {
        data: {
        title: '🎲 Lokasi Baru Terdeteksi!',
        body: `Lokasi "${mission.name}" baru saja masuk ke sistem! Coba keberuntunganmu sekarang!`,
        type: 'mission_alert' 
         },
        topic: 'all_users'
};

        const response = await admin.messaging().send(message);

        console.log('✅ Notifikasi sukses dikirim:', response);
        
        res.status(200).json({ 
            message: 'Misi berhasil dipublikasikan dan notifikasi dikirim!',
            firebase_response: response 
        });

    } catch (error) {
        console.error('Publish mission error:', error);
        res.status(500).json({ error: 'Failed to publish mission: ' + error.message });
    }
};