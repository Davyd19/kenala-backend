const { Mission, MissionClue, UserClueProgress } = require('../models');
const { calculateDistance, isWithinRadius, formatDistance, getDistanceMessage } = require('../utils/helpers');

// Menyimpan state sementara di memori server (RAM)
// Format: { socketId: { userId, missionId, totalDistance, lastLat, lastLng, path: [] } }
const activeSessions = new Map();

module.exports = (io, socket) => {

    // 1. Event saat User MEMULAI Tracking (Join Room)
    socket.on('join_mission_tracking', async ({ userId, missionId }) => {
        try {
            console.log(`User ${userId} started tracking mission ${missionId}`);
            
            // Simpan user ke "Room" spesifik agar server bisa kirim pesan private
            const roomName = `mission_${missionId}_user_${userId}`;
            socket.join(roomName);

            // Inisialisasi state tracking
            activeSessions.set(socket.id, {
                userId,
                missionId,
                roomName,
                totalDistance: 0.0, // Akumulasi jarak tempuh real (meter)
                lastLat: null,
                lastLng: null,
                startTime: new Date()
            });

            // Kirim konfirmasi ke Android
            socket.emit('tracking_started', { status: 'active', message: 'Real-time tracking activated' });

        } catch (error) {
            console.error('Socket Join Error:', error);
        }
    });

    // 2. Event UTAMA: Update Lokasi Real-time (dipanggil terus menerus oleh Android)
    socket.on('update_location', async (data) => {
        const session = activeSessions.get(socket.id);
        if (!session) return; // Abaikan jika user belum join room

        const { latitude, longitude } = data;
        const currentLat = parseFloat(latitude);
        const currentLng = parseFloat(longitude);

        // --- A. HITUNG AKUMULASI JARAK (ODOMETER) ---
        let distanceDelta = 0;
        if (session.lastLat && session.lastLng) {
            distanceDelta = calculateDistance(session.lastLat, session.lastLng, currentLat, currentLng);
            
            // Filter GPS Noise: Hanya hitung jika bergerak > 2 meter dan < 100 meter (hindari lompatan sinyal)
            if (distanceDelta > 2 && distanceDelta < 150) {
                session.totalDistance += distanceDelta;
            }
        }

        // Update posisi terakhir session
        session.lastLat = currentLat;
        session.lastLng = currentLng;

        // --- B. CEK PROXIMITY KE CLUE BERIKUTNYA ---
        const statusCheck = await checkProximityLogic(session.userId, session.missionId, currentLat, currentLng);

        // --- C. KIRIM BALIK KE ANDROID (REAL-TIME FEEDBACK) ---
        io.to(session.roomName).emit('tracking_update', {
            // Data Statistik Real-time
            live_stats: {
                total_distance_traveled: session.totalDistance, // Meter (Gunakan ini untuk UI jarak tempuh)
                formatted_traveled: formatDistance(session.totalDistance),
                current_speed: data.speed || 0 // Jika Android kirim speed
            },
            // Data Navigasi (Jarak ke target)
            navigation: statusCheck
        });

        // Jika sampai di clue, kirim event khusus
        if (statusCheck.status === 'clue_reached' || statusCheck.status === 'all_clues_completed') {
            io.to(session.roomName).emit('mission_event', statusCheck);
        }
    });

    // 3. Event Stop Tracking
    socket.on('stop_tracking', () => {
        const session = activeSessions.get(socket.id);
        if (session) {
            console.log(`Tracking stopped for User ${session.userId}. Total Distance: ${session.totalDistance}m`);
            // Di sini Anda bisa menyimpan session.totalDistance ke Database jika mau update parsial
            activeSessions.delete(socket.id);
        }
    });

    socket.on('disconnect', () => {
        activeSessions.delete(socket.id);
    });
};

/**
 * Logika Pengecekan Radius (Dipindahkan dari Controller agar bisa reuse)
 */
async function checkProximityLogic(userId, missionId, lat, lng) {
    try {
        const clues = await MissionClue.findAll({
            where: { mission_id: missionId },
            order: [['clue_order', 'ASC']]
        });

        // Ambil progress user
        const completedClues = await UserClueProgress.findAll({ where: { user_id: userId, mission_id: missionId } });
        const completedClueIds = completedClues.map(c => c.clue_id);
        
        // Cari target berikutnya (clue yang belum selesai)
        const nextClue = clues.find(clue => !completedClueIds.includes(clue.id));

        // SKENARIO 1: Semua clue sudah selesai, target adalah Lokasi Akhir Misi
        if (!nextClue) {
            const mission = await Mission.findByPk(missionId);
            const distToDest = calculateDistance(lat, lng, parseFloat(mission.latitude), parseFloat(mission.longitude));
            const isArrived = isWithinRadius(distToDest, 30); // Radius 30m

            if (isArrived) {
                return {
                    status: 'all_clues_completed',
                    message: 'Anda telah sampai di tujuan akhir!',
                    target_name: mission.location_name,
                    distance_remaining: 0
                };
            }

            return {
                status: 'heading_to_finish',
                message: `Menuju lokasi akhir: ${mission.location_name}`,
                target_name: mission.location_name,
                distance_remaining: distToDest,
                formatted_remaining: formatDistance(distToDest),
                hint: "Pergi ke lokasi yang ditandai di peta"
            };
        }

        // SKENARIO 2: Masih ada Clue yang harus dicari
        const distToClue = calculateDistance(lat, lng, parseFloat(nextClue.latitude), parseFloat(nextClue.longitude));
        const isInRadius = isWithinRadius(distToClue, nextClue.radius_meters);

        if (isInRadius) {
            // Cek apakah baru saja sampai (belum tercatat di DB)
            // Kita lakukan pencatatan otomatis via socket agar user tidak perlu klik apa-apa
            const existing = await UserClueProgress.findOne({ where: { user_id: userId, clue_id: nextClue.id } });
            
            if (!existing) {
                await UserClueProgress.create({
                    user_id: userId,
                    mission_id: missionId,
                    clue_id: nextClue.id,
                    distance_from_clue: distToClue
                });
                
                return {
                    status: 'clue_reached',
                    clue_data: nextClue,
                    message: `Clue Ditemukan! ${nextClue.name}`,
                    points_earned: nextClue.points_reward
                };
            }
        }

        return {
            status: 'searching_clue',
            target_clue_order: nextClue.clue_order,
            distance_remaining: distToClue,
            formatted_remaining: formatDistance(distToClue),
            hint: nextClue.hint_text
        };

    } catch (error) {
        console.error("Proximity Check Error:", error);
        return { status: 'error', message: 'Gagal menghitung lokasi' };
    }
}