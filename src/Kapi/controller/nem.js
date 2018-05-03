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
 * NetEase Music Api
 * 网易云音乐api
 * https://github.com/sqaiyan/netmusic-node
 */
const querystring = require('querystring');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Encrypt = require('../../../Static/crypt');
const secret = 'com.dei2';
const tokenExpiresIn = '7d';

let cookie = null;
let publicHeaders = {
  'Accept': '*/*',
  'Accept-Language': 'zh-CN,zh;q=0.8,gl;q=0.6,zh-TW;q=0.4',
  'Connection': 'keep-alive',
  'Content-Type': 'application/x-www-form-urlencoded',
  'Referer': 'http://music.163.com',
  'Host': 'music.163.com',
  // 'Cookie': cookie,
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1'
};

const NEM_APIS = {
  search: '/weapi/cloudsearch/get/web', // 搜索歌曲
  detail: '/weapi/v3/song/detail', // 单曲详情
  url: '/weapi/song/enhance/player/url', // 歌曲的真实地址
};
const BASE_URL = 'http://music.163.com';

module.exports = class extends enkel.controller.base {
  init (http) {
    super.init(http);

    this.UserModel = this.models('Kapi/user');
    this.RobotModel = this.models('Kapi/robot');

    this.Op = this.Sequelize.Op;

    // this.axios = enkel.axios;
    this.nemRequest = enkel.axios;
    this.nemRequest.defaults.timeout = 5000
    this.nemRequest.defaults.baseURL = BASE_URL;
    this.nemRequest.defaults.headers = Object.assign({}, publicHeaders);

    this.response.setHeader('Access-Control-Allow-Origin', '*');
    this.response.setHeader('Access-Control-Allow-Headers', 'content-type');
    this.response.setHeader('Access-Control-Allow-Methods', '*');
  }

  indexAction () {
    return this.json({status: 200, message: '成功'})
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
    if (updateLoginStatus[0] > 0) {
      // 更新用户登录token成功
      loginUser.dataValues.token = loginToken;
    }
    return this.json({status: 200, message: '登录成功', data: loginUser.dataValues || {}})
  }

  async registerAction () {
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
    let loginWith = '';
    let loginUserCount = await this.UserModel.count({
      where: {phonenum: params.phonenum},
      attributes: {exclude: ['id', 'password']}
    });
    if (loginUserCount < 1) {
      // 注册新用户
      await this.UserModel.create({
        username: params.phonenum,
        password: params.password,
        phonenum: params.phonenum,
        nickname: '',
        gender: 1,
        plugins: '',
        role: 3
      });
      let count = await this.UserModel.count({where: {phonenum: params.phonenum}});
      return this.json({status: 200, message: count > 0 ? '注册成功' : '注册失败', data: {}});
    } else {
      // 用户名已存在
      return this.json({status: 401, message: '手机号已存在', data: {}});
    }
  }

  /**
   * 搜索歌曲
   * 关键词
   * @returns {Promise.<*|{line, column}|number>}
   */
  async searchAction () {
    let params = this.get();
    let keywords = params.key || '远走高飞';
    let type = params.type || 1;
    let offset = params.pageIndex || 0;
    let limit = params.pageSize || 40;
    let data = {
      's': keywords,
      'offset': offset,
      'limit': limit,
      'type': type
    }
    let musicData = await this.nemRequest({
      url: NEM_APIS.search,
      method: 'post',
      data: Encrypt(data)
    }).catch(err => {
      console.log(err.message)
    });
    return this.json({status: 200, data: musicData ? musicData.data : {}});
  }

  /**
   * 通过音乐id获取音频真实地址
   * @returns {Promise.<*|{line, column}|number>}
   */
  async urlAction () {
    let params = this.get();
    let id = parseInt(params.id);
    let br = parseInt(params.br); // 音频的采样率，影响音质
    let data = {
      'ids': [id],
      'br': br,
      'csrf_token': ''
    };
    let urlData = await this.nemRequest({
      url: NEM_APIS.url,
      method: 'post',
      data: Encrypt(data)
    }).catch(err => {
      console.log(err.message)
    });
    return this.json({status: 200, data: urlData ? urlData.data : {}});
  }

  /**
   * 通过音乐id获取音乐详情
   * @returns {Promise.<*|{line, column}|number>}
   */
  async detailAction () {
    let params = this.get();
    let id = parseInt(params.id) || 474567580;
    let data = {
      'id': id,
      'c': JSON.stringify([
        {
          id: id
        }
      ]),
      'ids': [id],
      'csrf_token': ''
    };
    let detailData = await this.nemRequest({
      url: NEM_APIS.detail,
      method: 'post',
      data: Encrypt(data)
    }).catch(err => {
      console.log(err.message)
    });
    return this.json({status: 200, data: detailData.data});
  }
}
