import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:my_city_mobile/app/view/my_city_app.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('renders sign-in screen for a signed-out user',
      (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({});

    await tester.pumpWidget(const MyCityApp());
    await tester.pumpAndSettle();

    expect(find.text('MyCity'), findsOneWidget);
    expect(find.text('City service desk'), findsOneWidget);
    expect(find.widgetWithText(FilledButton, 'Sign in'), findsOneWidget);
    expect(find.text('Email or phone'), findsOneWidget);
  });
}
