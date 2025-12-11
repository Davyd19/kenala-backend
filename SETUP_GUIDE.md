# Kenala Backend - Setup Guide

## Prerequisites
- Node.js v14+ 
- MySQL 5.7+
- npm atau yarn

## Installation Steps

### 1. Clone & Install Dependencies
```bash
git clone <repository-url>
cd kenala-backend
npm install
```

### 2. Database Setup
```bash
# Buat database MySQL
mysql -u root -p
CREATE DATABASE kenala_db;
exit;
```

### 3. Environment Configuration
```bash
# Copy file .env.example ke .env
cp .env.example .env

# Edit .env dan sesuaikan dengan konfigurasi Anda
nano .env
```

**Konfigurasi yang perlu disesuaikan:**
- `DB_PASSWORD`: Password MySQL Anda
- `JWT_SECRET`: Generate random string yang aman
- `ADMIN_EMAILS`: Email admin (pisahkan dengan koma)

### 4. Run Migrations
```bash
# Jalankan migrations untuk membuat tabel
npm run db:migrate

# Atau jika belum ada database
npm run db:create
npm run db:migrate
```

### 5. Run Seeders
```bash
# Seed data demo (missions, badges, dll)
npm run db:seed

# Buat admin user
npx sequelize-cli db:seed --seed src/seeders/create-admin-user.js
```

### 6. Start Server
```bash
# Development mode dengan hot reload
npm run dev

# Production mode
npm start
```

Server akan berjalan di: `http://localhost:5000`

## Admin Dashboard

### Access Admin Dashboard
Buka browser dan akses: `http://localhost:5000/admin`

### Default Admin Credentials
```
Email: admin@kenala.com
Password: admin123
```

**⚠️ PENTING:** Segera ubah password admin setelah login pertama kali!

## API Endpoints

### Public Endpoints
- `POST /api/auth/register` - Register user baru
- `POST /api/auth/login` - Login user

### Protected Endpoints (Require JWT Token)
- `GET /api/missions` - Get all missions
- `GET /api/missions/:id` - Get mission detail
- `POST /api/missions/complete` - Complete mission
- `GET /api/journals` - Get user journals
- `POST /api/journals` - Create journal
- `GET /api/profile` - Get user profile
- `GET /api/tracking/mission/:missionId` - Get mission with clues
- `POST /api/tracking/check-location` - Check user location

### Admin Endpoints (Require Admin JWT Token)
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/users` - Get all users
- `GET /api/admin/users/:id` - Get user detail
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user
- `POST /api/admin/badges` - Create badge
- `PUT /api/admin/badges/:id` - Update badge
- `DELETE /api/admin/badges/:id` - Delete badge
- `DELETE /api/admin/clues/:id` - Delete clue
- `GET /api/admin/analytics` - Get analytics data

## Database Structure

### Main Tables
1. **users** - User data dan stats
2. **missions** - Mission/tempat wisata
3. **mission_clues** - Checkpoint untuk missions
4. **journals** - User journals/cerita
5. **badges** - Achievement badges
6. **user_badges** - User badge unlocks
7. **mission_completions** - Mission completion records
8. **user_clue_progress** - User clue progress tracking

## Features

### Admin Dashboard Features
✅ **Dashboard Overview**
- Total statistics (users, missions, journals, badges)
- Recent activity monitoring

✅ **Mission Management**
- Create, Read, Update, Delete missions
- Set coordinates, category, budget, difficulty
- Upload mission images

✅ **Clue Management**
- Add checkpoints to missions
- Set clue order and radius
- Configure points and hints

✅ **User Management**
- View all users and their stats
- Update user admin status
- Delete users (with protection for admins)

✅ **Badge Management**
- Create achievement badges
- Set requirements (missions, streak, distance, etc.)
- Configure badge icons and colors

✅ **Journal Moderation**
- View all user journals
- Delete inappropriate content

### Mobile App Features (API)
✅ **Authentication**
- User registration and login
- JWT token-based auth

✅ **Mission System**
- Browse missions by category/budget/distance
- Random mission (gacha)
- Track mission progress with clues
- Location-based checkpoint detection

✅ **Journal System**
- Create travel journals
- Upload photos
- Link to missions

✅ **Profile & Progress**
- View user stats
- Badge collection
- Streak tracking

✅ **Real-time Tracking**
- GPS-based location tracking
- Distance calculation
- Proximity detection for clues

## Development

### Project Structure
```
kenala-backend/
├── src/
│   ├── config/          # Database config
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Auth & admin middleware
│   ├── migrations/      # Database migrations
│   ├── models/          # Sequelize models
│   ├── routes/          # API routes
│   ├── seeders/         # Database seeders
│   ├── utils/           # Helper functions
│   └── app.js          # Main app file
├── admin_dashboard.html # Admin dashboard
├── .env.example        # Environment template
├── package.json        # Dependencies
└── README.md          # Documentation
```

### Adding New Features

#### 1. Create Migration
```bash
npx sequelize-cli migration:generate --name your-migration-name
```

#### 2. Create Model
```bash
# Edit src/models/YourModel.js
```

#### 3. Create Controller
```bash
# Edit src/controllers/yourController.js
```

#### 4. Create Routes
```bash
# Edit src/routes/yourRoutes.js
```

## Troubleshooting

### Database Connection Error
```bash
# Check MySQL is running
sudo systemctl status mysql

# Check credentials in .env file
```

### Migration Failed
```bash
# Reset database (WARNING: Deletes all data!)
npm run db:reset
```

### Admin Can't Login
```bash
# Re-run admin seeder
npx sequelize-cli db:seed --seed src/seeders/create-admin-user.js
```

### Port Already in Use
```bash
# Change PORT in .env file
PORT=3000
```

## Security Notes

1. **Change Default Passwords**: Always change default admin password
2. **JWT Secret**: Use strong, random JWT_SECRET in production
3. **CORS**: Configure specific origins in production (not *)
4. **HTTPS**: Always use HTTPS in production
5. **Environment Variables**: Never commit .env file
6. **SQL Injection**: Sequelize ORM provides protection
7. **Input Validation**: Always validate user input

## Production Deployment

### Recommended Steps
1. Set `NODE_ENV=production` in .env
2. Use strong JWT_SECRET
3. Configure specific CORS_ORIGIN
4. Use process manager (PM2)
5. Set up reverse proxy (Nginx)
6. Enable HTTPS
7. Regular database backups
8. Monitor error logs

### PM2 Setup
```bash
npm install -g pm2
pm2 start src/app.js --name kenala-backend
pm2 save
pm2 startup
```

## Support & Contribution

Untuk pertanyaan atau kontribusi, silakan buat issue di repository.

## License

ISC License