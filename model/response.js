"use strict";

/* 响应请求 */
class ApiResponse {
	constructor(message, data = {}, code) {
		this.message = message;
		this.data = data;
		this.code = code;
	}
}

module.exports.ApiResponse = ApiResponse;