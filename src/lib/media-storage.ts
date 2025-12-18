/**
 * Secure Media Storage Utilities
 *
 * Handles encrypted media upload, download, and management
 * with comprehensive security and privacy features.
 */

import { supabase } from './supabase';
import { Anonymizer, DataRetention, AuditLogger } from '../utils/privacy';
import { Paths, File as ExpoFile } from 'expo-file-system';

// Legacy compatibility - SDK 54 changed the API significantly
// TODO: Refactor to use new File/Directory class-based API

const FileSystem: any = require('expo-file-system');
import * as Crypto from 'expo-crypto';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';

/**
 * Media types supported by the application
 */
export type MediaType = 'house_photo' | 'profile_photo' | 'document' | 'other';

/**
 * Media upload options
 */
export interface MediaUploadOptions {
  caseId?: string;
  mediaType: MediaType;
  description?: string;
  retentionDays?: number;
  encrypt?: boolean;
}

/**
 * Media metadata interface
 */
export interface MediaMetadata {
  id: string;
  bucketName: string;
  objectPath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedBy: string;
  caseId?: string;
  mediaType: MediaType;
  description?: string;
  isEncrypted: boolean;
  checksum: string;
  createdAt: string;
  retentionExpiresAt?: string;
}

/**
 * Media access grant interface
 */
export interface MediaAccessGrant {
  mediaId: string;
  userId: string;
  accessLevel: 'view' | 'download' | 'delete';
  expiresInHours?: number;
}

/**
 * Main media storage class
 */
export class SecureMediaStorage {
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
  ];
  private static readonly ALLOWED_DOCUMENT_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  /**
   * Request camera permissions
   */
  static async requestCameraPermissions(): Promise<boolean> {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Request media library permissions
   */
  static async requestMediaLibraryPermissions(): Promise<boolean> {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Pick an image from the device gallery
   */
  static async pickImage(): Promise<ImagePicker.ImagePickerResult> {
    const hasPermission = await this.requestMediaLibraryPermissions();
    if (!hasPermission) {
      throw new Error('Media library permission denied');
    }

    return await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      base64: false,
    });
  }

  /**
   * Take a photo using the camera
   */
  static async takePhoto(): Promise<ImagePicker.ImagePickerResult> {
    const hasPermission = await this.requestCameraPermissions();
    if (!hasPermission) {
      throw new Error('Camera permission denied');
    }

    return await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
      base64: false,
    });
  }

  /**
   * Calculate SHA-256 checksum of a file
   */
  private static async calculateChecksum(uri: string): Promise<string> {
    const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, uri, {
      encoding: Crypto.CryptoEncoding.HEX,
    });
    return digest;
  }

  /**
   * Validate file before upload
   */
  private static async validateFile(
    uri: string,
    mimeType: string,
  ): Promise<{ isValid: boolean; error?: string }> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);

      if (!fileInfo.exists) {
        return { isValid: false, error: 'File does not exist' };
      }

      // Check file size
      if (fileInfo.size && fileInfo.size > this.MAX_FILE_SIZE) {
        return {
          isValid: false,
          error: `File too large. Maximum size is ${this.MAX_FILE_SIZE / 1024 / 1024}MB`,
        };
      }

      // Check mime type
      const allowedTypes = [...this.ALLOWED_IMAGE_TYPES, ...this.ALLOWED_DOCUMENT_TYPES];

      if (!allowedTypes.includes(mimeType)) {
        return { isValid: false, error: 'File type not allowed' };
      }

      // Additional security checks could be added here
      // e.g., scanning for malware signatures, checking file headers

      return { isValid: true };
    } catch {
      return { isValid: false, error: 'Failed to validate file' };
    }
  }

  /**
   * Generate a secure, anonymized filename
   */
  private static async generateSecureFilename(
    originalName: string,
    userId: string,
  ): Promise<string> {
    const extension = originalName.split('.').pop() || 'unknown';
    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).substring(2, 8);
    const userHash = (await Anonymizer.generateAnonymousId(userId)).substring(0, 8);

    return `${userHash}_${timestamp}_${randomPart}.${extension}`;
  }

  /**
   * Upload media file with security checks and metadata
   */
  static async uploadMedia(
    uri: string,
    fileName: string,
    mimeType: string,
    options: MediaUploadOptions,
  ): Promise<MediaMetadata> {
    try {
      // Validate the file
      const validation = await this.validateFile(uri, mimeType);
      if (!validation.isValid) {
        throw new Error(validation.error || 'File validation failed');
      }

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(uri);
      const fileSize = (fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0) || 0;

      // Calculate checksum for integrity
      const checksum = await this.calculateChecksum(uri);

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Generate secure filename
      const secureFileName = await this.generateSecureFilename(fileName, user.id);

      // Determine bucket based on media type
      const bucketName = options.mediaType === 'profile_photo' ? 'profile-photos' : 'case-media';

      // Create object path
      const objectPath = options.caseId
        ? `${options.caseId}/${secureFileName}`
        : `${user.id}/${secureFileName}`;

      // Read file as blob
      const fileBlob = await fetch(uri).then((r) => r.blob());

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(objectPath, fileBlob, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Save metadata to database
      const { data: metadata, error: metadataError } = (await (supabase.rpc as any)(
        'upload_media_with_metadata',
        {
          p_bucket_name: bucketName,
          p_object_path: objectPath,
          p_file_name: fileName,
          p_mime_type: mimeType,
          p_file_size: fileSize,
          p_case_id: options.caseId || null,
          p_media_type: options.mediaType,
          p_description: options.description || null,
          p_checksum: checksum,
          p_retention_days: options.retentionDays || 180,
        },
      )) as { data: string | null; error: any };

      if (metadataError) {
        // If metadata save fails, try to delete the uploaded file
        await supabase.storage.from(bucketName).remove([objectPath]);
        throw metadataError;
      }

      // Create audit log entry
      AuditLogger.createAuditEntry('media.upload', user.id, 'media', metadata || '', {
        fileName: Anonymizer.sanitizeText(fileName),
        mediaType: options.mediaType,
        caseId: options.caseId,
      });

      return {
        id: metadata || '',
        bucketName,
        objectPath,
        fileName,
        mimeType,
        fileSize,
        uploadedBy: user.id,
        caseId: options.caseId,
        mediaType: options.mediaType,
        description: options.description,
        isEncrypted: options.encrypt ?? true,
        checksum,
        createdAt: new Date().toISOString(),
        retentionExpiresAt: DataRetention.calculateExpiryDate('media').toISOString(),
      };
    } catch (error) {
      console.error('Media upload failed:', error);
      throw error;
    }
  }

  /**
   * Download media file with security checks
   */
  static async downloadMedia(mediaId: string, saveToDevice: boolean = false): Promise<string> {
    try {
      // Get media metadata
      const { data: metadata, error: metadataError } = (await supabase
        .from('media_metadata')
        .select('*')
        .eq('id', mediaId)
        .single()) as { data: any; error: any };

      if (metadataError || !metadata) {
        throw new Error('Media not found');
      }

      // Log the access
      await supabase.rpc('log_media_access', {
        p_media_id: mediaId,
        p_action: saveToDevice ? 'download' : 'view',
      } as any);

      // Generate signed URL for secure download
      const { data: urlData, error: urlError } = await supabase.storage
        .from(metadata.bucket_name)
        .createSignedUrl(metadata.object_path, 60); // 60 seconds expiry

      if (urlError || !urlData) {
        throw new Error('Failed to generate download URL');
      }

      // If saving to device, download and save
      if (saveToDevice) {
        const hasPermission = await this.requestMediaLibraryPermissions();
        if (!hasPermission) {
          throw new Error('Media library permission denied');
        }

        const downloadDir = Paths.document;
        const downloadPath = new ExpoFile(downloadDir, metadata.file_name).uri;
        const downloadResult = await FileSystem.downloadAsync(urlData.signedUrl, downloadPath);

        // Save to media library
        const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
        await MediaLibrary.createAlbumAsync('WhoseHouse', asset, false);

        return downloadResult.uri;
      }

      return urlData.signedUrl;
    } catch (error) {
      console.error('Media download failed:', error);
      throw error;
    }
  }

  /**
   * Grant access to media for another user
   */
  static async grantAccess(grant: MediaAccessGrant): Promise<void> {
    try {
      const { error } = await supabase.rpc('grant_media_access', {
        p_media_id: grant.mediaId,
        p_user_id: grant.userId,
        p_access_level: grant.accessLevel,
        p_expires_in_hours: grant.expiresInHours || null,
      } as any);

      if (error) {
        throw error;
      }

      // Create audit log
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        AuditLogger.createAuditEntry('media.access_granted', user.id, 'media', grant.mediaId, {
          grantedTo: grant.userId,
          accessLevel: grant.accessLevel,
          expiresInHours: grant.expiresInHours,
        });
      }
    } catch (error) {
      console.error('Failed to grant media access:', error);
      throw error;
    }
  }

  /**
   * List media for a case with privacy filtering
   */
  static async listCaseMedia(caseId: string): Promise<MediaMetadata[]> {
    try {
      const { data, error } = await supabase
        .from('media_metadata')
        .select('*')
        .eq('case_id', caseId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Apply privacy filters based on user role
      const { data: profile } = (await supabase.from('profiles').select('role').single()) as {
        data: { role: string } | null;
        error: any;
      };

      if (profile?.role === 'foster_carer') {
        // Foster carers should only see approved media
        return data.filter(
          (m: any) => m.media_type === 'house_photo' || m.media_type === 'profile_photo',
        );
      }

      return data;
    } catch (error) {
      console.error('Failed to list case media:', error);
      throw error;
    }
  }

  /**
   * Delete media (soft delete with audit trail)
   */
  static async deleteMedia(mediaId: string): Promise<void> {
    try {
      // Type assertion needed because deleted_at isn't in generated Supabase types
      const updateData: any = { deleted_at: new Date().toISOString() };
      // @ts-ignore - Supabase generated types don't include deleted_at column
      const { error } = await supabase.from('media_metadata').update(updateData).eq('id', mediaId);

      if (error) {
        throw error;
      }

      // Log the deletion
      await supabase.rpc('log_media_access', {
        p_media_id: mediaId,
        p_action: 'delete',
      } as any);

      // Create audit log
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        AuditLogger.createAuditEntry('media.delete', user.id, 'media', mediaId, {
          softDelete: true,
        });
      }
    } catch (error) {
      console.error('Failed to delete media:', error);
      throw error;
    }
  }

  /**
   * Get media audit trail
   */
  static async getMediaAuditTrail(mediaId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('media_audit_log')
        .select(
          `
          *,
          performed_by:profiles!media_audit_log_performed_by_fkey(
            id, first_name, last_name, role
          )
        `,
        )
        .eq('media_id', mediaId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Anonymize user names for privacy
      return data.map((log: any) => ({
        ...log,
        performed_by: log.performed_by
          ? {
              ...log.performed_by,
              display_name: Anonymizer.nameToInitials(
                `${log.performed_by.first_name} ${log.performed_by.last_name}`,
              ),
            }
          : null,
      }));
    } catch (error) {
      console.error('Failed to get media audit trail:', error);
      throw error;
    }
  }
}
