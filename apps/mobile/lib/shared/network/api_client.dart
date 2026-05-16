import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'api_exception.dart';

class ApiClient {
  ApiClient({String? baseUrl}) : baseUrl = baseUrl ?? _defaultBaseUrl();

  final String baseUrl;
  static const _requestTimeout = Duration(seconds: 20);

  static String _defaultBaseUrl() {
    const configured = String.fromEnvironment('API_BASE_URL', defaultValue: '');
    if (configured.isNotEmpty) {
      return configured;
    }

    if (kIsWeb) {
      return 'http://127.0.0.1:4000/api/v1';
    }

    if (Platform.isAndroid) {
      return 'http://10.0.2.2:4000/api/v1';
    }

    return 'http://127.0.0.1:4000/api/v1';
  }

  Future<dynamic> get(
    String path, {
    String? token,
    Map<String, dynamic>? queryParameters,
  }) {
    return _send(
      () => http.get(
        _buildUri(path, queryParameters),
        headers: _headers(token),
      ),
    );
  }

  Future<dynamic> post(
    String path, {
    required Map<String, dynamic> body,
    String? token,
  }) {
    return _send(
      () => http.post(
        _buildUri(path, null),
        headers: _headers(token),
        body: jsonEncode(body),
      ),
    );
  }

  Future<dynamic> patch(
    String path, {
    required Map<String, dynamic> body,
    String? token,
  }) {
    return _send(
      () => http.patch(
        _buildUri(path, null),
        headers: _headers(token),
        body: jsonEncode(body),
      ),
    );
  }

  Future<dynamic> _send(Future<http.Response> Function() request) async {
    late final http.Response response;

    try {
      response = await request().timeout(_requestTimeout);
    } on TimeoutException {
      throw ApiException(
        statusCode: 0,
        message: 'The server took too long to respond.',
      );
    } on SocketException {
      throw ApiException(
        statusCode: 0,
        message: 'Check your internet connection and try again.',
      );
    } on http.ClientException {
      throw ApiException(
        statusCode: 0,
        message: 'Unable to reach the server.',
      );
    }

    final payload = _decodePayload(response.body);

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return payload;
    }

    throw ApiException(
      statusCode: response.statusCode,
      message: _extractMessage(payload),
    );
  }

  dynamic _decodePayload(String body) {
    if (body.isEmpty) {
      return null;
    }

    try {
      return jsonDecode(body);
    } on FormatException {
      return body;
    }
  }

  Uri _buildUri(String path, Map<String, dynamic>? queryParameters) {
    final uri = Uri.parse('$baseUrl$path');
    if (queryParameters == null || queryParameters.isEmpty) {
      return uri;
    }

    return uri.replace(
      queryParameters: queryParameters.map(
        (key, value) => MapEntry(key, value.toString()),
      ),
    );
  }

  Map<String, String> _headers(String? token) {
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  String _extractMessage(dynamic payload) {
    if (payload is String && payload.trim().isNotEmpty) {
      return payload.trim();
    }

    if (payload is Map<String, dynamic>) {
      final error = payload['error'];
      if (error is String && error.isNotEmpty) {
        return error;
      }

      if (error is Map<String, dynamic>) {
        final message = error['message'];
        if (message is String && message.isNotEmpty) {
          return message;
        }
        if (message is List && message.isNotEmpty) {
          return message.join(', ');
        }
      }
    }

    return 'Request failed';
  }
}
