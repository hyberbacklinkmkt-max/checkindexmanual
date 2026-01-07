export enum IndexStatus {
  PENDING = 'PENDING',
  INDEXED = 'INDEXED',
  NOT_INDEXED = 'NOT_INDEXED',
  CHECKING = 'CHECKING'
}

export interface LinkData {
  id: string;
  originalUrl: string;
  siteUrl: string;
  status: IndexStatus;
}
