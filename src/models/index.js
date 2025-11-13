const { Sequelize } = require('sequelize');
const config = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    pool: dbConfig.pool,
    define: dbConfig.define
  }
);

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import models
db.User = require('./User')(sequelize, Sequelize);
db.Journal = require('./Journal')(sequelize, Sequelize);
db.Mission = require('./Mission')(sequelize, Sequelize);
db.Badge = require('./Badge')(sequelize, Sequelize);
db.UserBadge = require('./UserBadge')(sequelize, Sequelize);
db.MissionCompletion = require('./MissionCompletion')(sequelize, Sequelize);
db.MissionClue = require('./MissionClue')(sequelize, Sequelize);
db.UserClueProgress = require('./UserClueProgress')(sequelize, Sequelize);
db.Suggestion = require('./Suggestion')(sequelize, Sequelize); // <-- TAMBAHAN BARU

// Define associations
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

module.exports = db;