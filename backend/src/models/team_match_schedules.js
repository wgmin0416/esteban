'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TeamMatchSchedule extends Model {
    static associate(models) {
      TeamMatchSchedule.belongsTo(models.Team, { foreignKey: 'team_id', as: 'team' });
    }
  }

  TeamMatchSchedule.init(
    {
      id: { type: DataTypes.INTEGER, allowNull: false, autoIncrement: true, primaryKey: true },
      team_id: { type: DataTypes.INTEGER, allowNull: false, comment: '팀 ID' },
      weekday: { type: DataTypes.TINYINT, allowNull: false, comment: '요일 0(일)~6(토)' },
      time: { type: DataTypes.STRING(5), allowNull: false, comment: 'HH:MM' },
      title: { type: DataTypes.STRING(128), allowNull: false, defaultValue: '정기 경기' },
      location: { type: DataTypes.STRING(255), allowNull: true },
      quarter_count: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 4 },
      lead_days: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 7, comment: '며칠 전에 생성' },
      is_active: { type: DataTypes.TINYINT(1), allowNull: false, defaultValue: 1 },
      last_created_date: { type: DataTypes.STRING(10), allowNull: true },
      created_by: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      sequelize,
      modelName: 'TeamMatchSchedule',
      tableName: 'team_match_schedules',
      timestamps: true,
      paranoid: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
    }
  );

  return TeamMatchSchedule;
};
