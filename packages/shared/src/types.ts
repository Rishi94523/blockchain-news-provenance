export type PublisherStatus = "APPROVED" | "REVOKED";
export type ArticleStatus = "DRAFT" | "PUBLISHED";
export type VerificationStatus = "verified" | "mismatch" | "not_found";

export interface Publisher {
  id: string;
  displayName: string;
  walletAddress: string;
  status: PublisherStatus;
  createdAt: string;
}

export interface Article {
  id: string;
  slug: string;
  chainArticleId: string | null;
  publisherId: string;
  title: string;
  status: ArticleStatus;
  currentRevision: number;
  publishedAt: string | null;
}

export interface ArticleContent {
  title: string;
  body: string;
  summary: string;
  sourceLinks: string[];
}

export interface Revision {
  id: string;
  articleId: string;
  revisionNumber: number;
  contentJson: ArticleContent;
  contentHash: string;
  previousHash: string;
  changeNote: string;
  editorWallet: string;
  txHash: string;
  blockNumber: bigint | number;
  createdAt: string;
}

export interface VerificationResult {
  status: VerificationStatus;
  articleId: string;
  dbHash: string | null;
  chainHash: string | null;
  publisher: {
    id: string;
    displayName: string;
    walletAddress: string;
  } | null;
  publishedAt: string | null;
  lastModifiedAt: string | null;
  revisionCount: number;
}
