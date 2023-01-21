"use strict";

const express = require('express')
const fileUpload = require('express-fileupload');

const { addUser, loginUser, hasToken } = require("./module/database");

const { ApiResponse } = require("./model/response.js");

const fs = require("node:fs");

const app = express();

app.use(fileUpload({
	createParentPath: true,
}))

app.use(express.static('upload'));

// 允许跨域
app.all('*', function(req, res, next) {
	res.header("Access-Control-Allow-Origin", '*');
	res.header("Access-Control-Allow-Headers", "Content-Type,Content-Length, Authorization, Accept,X-Requested-With");
	res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
	res.header("Access-Control-Allow-Credentials", "true");
	res.header("X-Powered-By", ' 3.2.1')
	if (req.method === "OPTIONS") res.send(200);/*让options请求快速返回*/
	else next();
})

app.use(express.json())
app.use(express.urlencoded({ extended: false }))

// function decodeBase64(string) {
// 	return Buffer.from(string, 'base64').toString('utf-8');
// }


app.get('/', (req, res) => {
	res.send("这里啥都没有")
});


/* 登录注册 */
app.post('/reg', (req, res)=>{
	const { username, password } = req.body;
	const client_ip = req.ip;
	addUser(username, password, client_ip, result=>{
		res.status(result.code);
		res.send(result);
		console.log(`注册了${username}用户`);
	});
})


app.post('/login', (req, res)=>{
	const { user_name, password } = req.body;
	const client_ip = req.ip;
	console.log(`${user_name}用户登录——ip: ${client_ip}`)
	loginUser(user_name, password, result=>{
		res.status(result.code);
		res.send(result);
	});
})

const isLogin = function (req, res, next) {
	// 获取到token
	const AuthToken = req.get('Authorization').replace('Bearer ', '');

	const tokenArr = AuthToken.split('.');
	const id = tokenArr[0];
	const user_token = tokenArr[1];
	const time_stamp = tokenArr[2];

	hasToken(id, user_token, result=>{
		if (result === true) {
			next();
		} else {
			res.status(result.code);
			res.send(result);
		}
	})
}

// app.use('/admin', isLogin);
app.post('/admin', (req, res)=>{
	console.log("全部通过")
	res.status(200);
	res.send({
		data: "ok",
	})
})

// 处理上传文件服务
app.post('/upload', (req, res) => {
	// console.log(req)
	console.log('------------------------------------------------------');
	console.log(req.files)

	if (!req.files) {
		res.send(new ApiResponse("没有文件上传", {}, 500));
	} else {
		let avatar = req.files.file;
		avatar.mv('./upload/' + avatar.name);

		res.send(new ApiResponse("成功上传", {
			name: avatar.name,
			size: avatar.size,
			mimetype: avatar.mimetype,
		}, 201));
	}
});

app.get("/folder_list/*", (req, res) => {
	// 获得用户访问的主路径
	let main_path = `./upload/${req.params[0]}`;
	// 声明一个文件列表
	let file_list_arr = [];

	fs.readdir(main_path, async (err, files) => {
		if (err) throw err;
		await files.forEach(file => {
			fs.lstat(`${main_path}/${file}`, (err, stats) => {
				file_list_arr.push({
					folder: stats.isDirectory(),
					name: file,
				})
			})
		});
		res.send(new ApiResponse("数据已发送", {
			file_list_arr,
			url: req.params,
		}, 200))
		console.log('------------------------------------------------------');
	})
})


app.listen(9000, function () {
	console.log('------------------------------------------------------');
	console.log('服务启动成功：http://localhost:9000');
});