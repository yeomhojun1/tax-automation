import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

const SIGNED_URL_EXPIRY_SECONDS = 86400; // 24 hours

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: Minio.Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.client = new Minio.Client({
      endPoint: this.configService.get<string>('minio.endpoint') ?? 'localhost',
      port: this.configService.get<number>('minio.port') ?? 9000,
      useSSL: false,
      accessKey: this.configService.get<string>('minio.accessKey') ?? '',
      secretKey: this.configService.get<string>('minio.secretKey') ?? '',
    });
    this.bucket = this.configService.get<string>('minio.bucket') ?? 'tax-files';
  }

  async onModuleInit(): Promise<void> {
    await this.ensureBucketExists();
  }

  async uploadFile(
    _bucket: string,
    key: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    await this.client.putObject(this.bucket, key, buffer, buffer.length, {
      'Content-Type': contentType,
    });
    return key;
  }

  async getSignedUrl(key: string): Promise<string> {
    return this.client.presignedGetObject(this.bucket, key, SIGNED_URL_EXPIRY_SECONDS);
  }

  async deleteFile(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
  }

  private async ensureBucketExists(): Promise<void> {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket, 'us-east-1');
        this.logger.log(`Bucket "${this.bucket}" created`);
      }
    } catch (error) {
      this.logger.warn(`MinIO bucket check failed: ${error}`);
    }
  }
}
