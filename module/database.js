console.log("导入模块");

// 引入mysql模块
const mysql = require('mysql');
const {ApiResponse} = require("../model/response");
const {randomInit} = require("mysql/lib/protocol/Auth");
const {ER_CANNOT_DISCARD_TEMPORARY_TABLE} = require("mysql/lib/protocol/constants/errors");

//创建连接
const connection = mysql.createConnection({
	host: '127.0.0.1',
	user: 'root',
	password: 'root',
	database: 'xplus'
});

//连接mysql
connection.connect(function (err) {
	console.log("连接中");
	//连接出错的处理
	if (err) {
		console.error('连接错误：' + err.stack);
		return;
	}
	console.log('连接成功，线程ID为：' + connection.threadId);
});

function addUser(user_name, password, client_ip, callback) {
	// 判断用户名规范 不规范输出True
	if (!(/^(?=[a-zA-Z0-9_]*)[a-zA-Z0-9_]*$/.exec(user_name))) {
		callback(new ApiResponse("用户名只能包含大小写字母,数字与下划线", {}, 403));
		return;
	}

	// Sql 查询是否已有相同 ip | name 的用户
	const hasNameAndIpSql = `select * from users where reg_ip = '${client_ip}' or name = '${user_name}' limit 1`;

	let returnResponse = new ApiResponse("未知错误", {}, 500);
	connection.query(hasNameAndIpSql,  (error, results) => {
		if (error) throw error;
		// 判断是否有重复ip或重复用户名
		if (results.length >= 1) {
			if (results[0]['reg_ip'] === client_ip) {
				returnResponse = new ApiResponse("一个IP只能注册一个用户", {}, 403);
			} else { // 否则 用户名相同
				returnResponse = new ApiResponse("用户已注册", {}, 403)
			}
			callback(returnResponse);
		} else { // 如果判断没有 相同用户 & 相同IP地址 则创建用户
			// Sql 创建用户
			const sql = `INSERT into users (name, password, reg_ip) values ('${user_name}', '${password}', '${client_ip}')`;
			connection.query(sql, (error) => {
				if (error) throw error;
				returnResponse = new ApiResponse("创建用户成功", {}, 201);
				callback(returnResponse);
			})
		}
	})
}

function loginUser(user_name, password, callback) {
	let returnResponse = new ApiResponse("未知错误", {}, 500);
	const hasUserSql = `select id,name,password from users where name = '${user_name}' and password = '${password}' limit 1;`
	connection.query(hasUserSql, (error, results)=>{
		if (error) throw error;
		if (results.length === 0) {
			returnResponse = new ApiResponse("用户或密码错误", {}, 403);
			callback(returnResponse);
		} else {
			let user_data = results[0];
			// 生成user_token
			const user_token = `${user_data.id}.${(Math.random() * 9999999999).toFixed(0)}.${Date.now()}`;
			const createTokenSql = `UPDATE users SET user_token = '${user_token}' where id = '${user_data.id}' limit 1`;
			connection.query(createTokenSql, (error)=>{
				if (error) throw error;
				returnResponse = new ApiResponse("登录成功", {
					"user_token": user_token,
				}, 201)
				callback(returnResponse)
			})
		}
	})
}

// 中间件一部分
function hasToken(id, user_token, callback) {
	const hasLoginSql = `SELECT * from users where id = ${id} and user_token like '%.${user_token}.%'`;
	connection.query(hasLoginSql, (error, results)=>{
		if (error) throw error;
		// 如果有用户返回true
		if (results.length === 1) {
			callback(true);
		} else {
			callback(new ApiResponse("身份验证失败", {}, 403));
		}
	})
}

module.exports.addUser = addUser;
module.exports.loginUser = loginUser;
module.exports.hasToken = hasToken;