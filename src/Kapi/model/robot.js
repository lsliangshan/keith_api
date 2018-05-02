/**
 * Created by liangshan on 2017/11/27.
 */
const Sequelize = enkel.Sequelize
module.exports = {
  safe: true,
  fields: {
    username: {
      type: Sequelize.STRING,
      allowNull: false,
      validate: {
        is: /^[a-z_0-9]+$/i,
        notEmpty: true,
      }
    },
    nickname: {
      type: Sequelize.STRING,
        defaultValue: ''
    },
    password: {
      type: Sequelize.STRING,
      defaultValue: ''
    },
    headIcon: {
      type: Sequelize.STRING,
        defaultValue: ''
    },
    token: {
      type: Sequelize.TEXT,
        defaultValue: ''
    },
    uuid: {
      type: Sequelize.STRING,
      unique: true
    }
  },
  relations: {
  }
};
