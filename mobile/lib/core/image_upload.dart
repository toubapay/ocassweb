import 'dart:convert';
import 'package:image_picker/image_picker.dart';

String _mediaTypeForPath(String path) {
  final lower = path.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

/// Picks an image from the gallery, downsizes+compresses it on-device
/// (`maxWidth`/`imageQuality`, same as the carte grise OCR capture in
/// insurance_auto_screen.dart), and returns it as a data URI. There's no
/// upload endpoint or object storage anywhere in this app - the data URI
/// is stored directly in the same imageUrl/images field a pasted URL
/// would use (mirrors src/utils/imageFile.js on web). Returns null if the
/// user cancels the picker.
Future<String?> pickAndEncodeImage(ImagePicker picker) async {
  final file = await picker.pickImage(
    source: ImageSource.gallery,
    imageQuality: 80,
    maxWidth: 1000,
  );
  if (file == null) return null;
  final bytes = await file.readAsBytes();
  final mediaType = _mediaTypeForPath(file.path);
  return 'data:$mediaType;base64,${base64Encode(bytes)}';
}
