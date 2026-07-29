// Interface minimale du module Storage (Section K). Aucune implementation en BUILD-001 :
// ni upload reel, ni recuperation, ni suppression logique cablee a un stockage physique.

export interface StorageUploadInput {
  organizationId: string;
  filename: string;
  mimeType: string;
  content: Buffer;
}

export interface StoragePort {
  upload(input: StorageUploadInput): Promise<{ id: string }>;
  retrieve(id: string): Promise<Buffer>;
  softDelete(id: string): Promise<void>;
}
