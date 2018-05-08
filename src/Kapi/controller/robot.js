/***
 **                                                          _ooOoo_
 **                                                         o8888888o
 **                                                         88" . "88
 **                                                         (| -_- |)
 **                                                          O\ = /O
 **                                                      ____/`---'\____
 **                                                    .   ' \\| |// `.
 **                                                     / \\||| : |||// \
 **                                                   / _||||| -:- |||||- \
 **                                                     | | \\\ - /// | |
 **                                                   | \_| ''\---/'' | |
 **                                                    \ .-\__ `-` ___/-. /
 **                                                 ___`. .' /--.--\ `. . __
 **                                              ."" '< `.___\_<|>_/___.' >'"".
 **                                             | | : `- \`.;`\ _ /`;.`/ - ` : | |
 **                                               \ \ `-. \_ __\ /__ _/ .-` / /
 **                                       ======`-.____`-.___\_____/___.-`____.-'======
 **                                                          `=---='
 **
 **                                       .............................................
 **                                              佛祖保佑             永无BUG
 **                                      佛曰:
 **                                              写字楼里写字间，写字间里程序员；
 **                                              程序人员写程序，又拿程序换酒钱。
 **                                              酒醒只在网上坐，酒醉还来网下眠；
 **                                              酒醉酒醒日复日，网上网下年复年。
 **                                              但愿老死电脑间，不愿鞠躬老板前；
 **                                              奔驰宝马贵者趣，公交自行程序员。
 **                                              别人笑我忒疯癫，我笑自己命太贱；
 **                                              不见满街漂亮妹，哪个归得程序员？
 */
/**
 * Created by liangshan on 2017/11/13.
 */
const jwt = require('jsonwebtoken');
const secret = 'com.dei2';
const tokenExpiresIn = '7d';
let SSE_CLIENTS = {}
module.exports = class extends enkel.controller.base {
  init (http) {
    super.init(http);

    this.UserModel = this.models('Kapi/user');
    this.RobotModel = this.models('Kapi/robot');

    this.Op = this.Sequelize.Op;

    this.response.setHeader('Access-Control-Allow-Origin', '*');
    this.response.setHeader('Access-Control-Allow-Headers', 'content-type');
    this.response.setHeader('Access-Control-Allow-Methods', '*');
  }

  indexAction () {
    return this.json({status: 200, message: '成功222222'})
  }

  async checkLogin (args) {
    if (!args.token || args.token === '') {
      return false;
    }
    let _status = jwt.verify(args.token, secret, (err, decoded) => {
      return err || {};
    });
    if (_status.name === 'TokenExpiredError') {
      return false;
    } else {
      let loginUser = await this.UserModel.findOne({where: {username: args.username}});
      if (!loginUser) {
        loginUser = await this.UserModel.findOne({where: {phonenum: args.username}});
        if (!loginUser) {
          return false;
        } else {}
      } else {}
      if (loginUser.token === '') {
        return false;
      } else {
        let _storeTokenStatus = jwt.verify(args.token, secret, (err, decoded) => {
          return err || {};
        });
        if (_storeTokenStatus.name === 'TokenExpiredError') {
          return false;
        } else {
        }
        return true;
      }
    }
  }

  async loginAction () {
    if (!this.isPost()) {
      return this.json({status: 405, message: '请求方法不正确', data: {}});
    }
    let params = await this.post();
    if (params.username === '') {
      return this.json({status: 401, message: '用户名不能为空', data: {}});
    }
    if (params.password === '') {
      return this.json({status: 401, message: '密码不能为空', data: {}});
    }
    let loginWith = '';
    let loginUser = await this.UserModel.findOne({
      where: {username: params.username, password: params.password},
      attributes: {exclude: ['id', 'password']}
    });
    if (!loginUser) {
      loginUser = await this.UserModel.findOne({
        where: {phonenum: params.username, password: params.password},
        attributes: {exclude: ['id', 'password']}
      });
      if (!loginUser) {
        return this.json({status: 401, message: '账号或密码不正确', data: {}});
      } else {
        // 登录成功
        loginWith = 'phonenum';
      }
    } else {
      // 登录成功
      loginWith = 'username';
    }
    let loginToken = jwt.sign({
      data: {
        username: params.username
      }
    }, secret, { expiresIn: tokenExpiresIn });
    let searchCondition = {};
    searchCondition[loginWith] = params.username;
    searchCondition['password'] = params.password;
    let updateLoginStatus = await this.UserModel.update({
      token: loginToken,
      lastLoginTime: (+new Date())
    }, {
      where: searchCondition
    });
    let _returnUserInfo = JSON.parse(JSON.stringify(loginUser))
    if (updateLoginStatus[0] > 0) {
      // 更新用户登录token成功
      _returnUserInfo.token = loginToken;

      // 登录robot
      let robotPassword = String(Math.random()).slice(-6)
      let robotUUID = params.robot
      let robotData = await this.RobotModel.find({
        where: {
          uuid: robotUUID
        },
        attributes: {exclude: ['id']}
      })
      if (robotData) {
        // 已经注册过
        await this.RobotModel.update({
          password: robotPassword
        }, {
          where: {
            uuid: robotUUID
          }
        })
        robotData.password = robotPassword
      } else {
        robotData = await this.RobotModel.create({
          username: 'robot_' + String(Math.random()).slice(-10),
          uuid: robotUUID,
          password: robotPassword
        })
        if (robotData.id) {
          delete robotData.id
        }
      }
      _returnUserInfo = Object.assign({}, _returnUserInfo, {
        robot: robotData
      })
    }
    return this.json({status: 200, message: '登录成功', data: _returnUserInfo || {}})
  }

  async listAction () {
    if (!this.isPost()) {
      return this.json({status: 405, message: '请求方法不正确', data: {}});
    }
    let params = await this.post();

    if (params.phonenum === '') {
      return this.json({status: 401, message: '手机号不能为空', data: {}});
    } else {
      if (!params.phonenum.match(/^1[345789]\d{9}$/)) {
        return this.json({status: 401, message: '手机号格式不正确', data: {}});
      }
    }
    if (params.password === '') {
      return this.json({status: 401, message: '密码不能为空', data: {}});
    }
    let robotList = await this.RobotModel.findAll({
      attributes: {exclude: ['id', 'password']}
    })
    return this.json({status: 200, message: '成功', data: {
      list: robotList || []
    }})
  }

    /**
     * 前端页面连接robot
     * @returns {Promise<JSON | Promise<any>>}
     */
  async connectAction () {
      if (!this.isPost()) {
          return this.json({status: 405, message: '请求方法不正确', data: {}});
      }
      let params = await this.post();
      if (!params.uuid || params.uuid === '') {
        return this.json({status: 401, message: 'robot设备id不能为空', data: {}});
      }
      if (!params.password || params.password === '') {
        return this.json({status: 401, message: '密码不能为空', data: {}});
      }
      let robotCount = await this.RobotModel.count({
          where: {
            uuid: params.uuid,
              password: params.password
          }
      })
      if (robotCount > 0) {
        return this.json({status: 200, message: '成功', data: {username: params.username}});
      } else {
        return this.json({status: 401, message: '连接失败，密码不正确', data: {username: params.username}});
      }
  }

  async sseAction () {
    function everyClient(fn) {
      Object.keys(SSE_CLIENTS).forEach(function(id) {
        fn(SSE_CLIENTS[id].client);
      });
    }
    if (this.get('message')) {
      // 试图通过get方式 发送事件
      return this.json({status: 1001, message: '请求方式不正确'})
    }
    let params = await this.post();
    // 优先从get请求中获取id
    let clientId = this.get('id') || params.id;
    if (params.message) {
        everyClient(function(client) {
          client.write('event: ' + params.type + '\n');
          client.write("data: " + params.message + "\n\n");
        });
      return this.json({status: 200})
    } else {
      if (SSE_CLIENTS[clientId]) {
        clearInterval(SSE_CLIENTS[clientId].interval)
        delete SSE_CLIENTS[clientId]
      }
      SSE_CLIENTS[clientId] = {}
      this.response.setHeader('Content-Type', 'text/event-stream');
      this.response.setHeader('Cache-Control', 'no-cache');
      this.response.setHeader('Connection', 'keep-alive');
      this.response.write('retry: 5000\n');
      let messageType = this.get('mt')
      if (messageType) {
        this.response.write('event: ' + messageType + '\n');
      }
      SSE_CLIENTS[clientId].client = this.response
      SSE_CLIENTS[clientId].client.write('data: connected\n\n');
      SSE_CLIENTS[clientId].interval = setInterval(function heartbeatTick() {
        everyClient(function(client) {
          client.write('event: heartbeats\n');
          client.write("data: \uD83D\uDC93\n\n");
        });
      }, 5000).unref();
    }
  }
}
