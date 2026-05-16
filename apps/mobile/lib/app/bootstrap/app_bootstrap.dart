import 'dart:async';

import 'package:flutter/material.dart';
import '../view/my_city_app.dart';

void bootstrapApp() {
  FlutterError.onError = FlutterError.presentError;
  ErrorWidget.builder = (_) => const MaterialApp(
        home: Scaffold(
          body: Center(
            child: Text('Something went wrong. Please restart MyCity.'),
          ),
        ),
      );

  runZonedGuarded(
    () => runApp(const MyCityApp()),
    (error, stackTrace) {
      FlutterError.reportError(
        FlutterErrorDetails(
          exception: error,
          stack: stackTrace,
          library: 'my_city_app',
        ),
      );
    },
  );
}
