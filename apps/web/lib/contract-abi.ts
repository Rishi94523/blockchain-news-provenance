export const newsProvenanceAbi = [
  {
    type: "function",
    name: "approvePublisher",
    stateMutability: "nonpayable",
    inputs: [
      { name: "wallet", type: "address" },
      { name: "publisherId", type: "string" },
      { name: "displayName", type: "string" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "revokePublisher",
    stateMutability: "nonpayable",
    inputs: [{ name: "wallet", type: "address" }],
    outputs: []
  },
  {
    type: "function",
    name: "publishArticle",
    stateMutability: "nonpayable",
    inputs: [
      { name: "externalId", type: "string" },
      { name: "contentHash", type: "bytes32" },
      { name: "contentRef", type: "string" }
    ],
    outputs: [{ name: "articleId", type: "uint256" }]
  },
  {
    type: "function",
    name: "reviseArticle",
    stateMutability: "nonpayable",
    inputs: [
      { name: "articleId", type: "uint256" },
      { name: "expectedRevision", type: "uint256" },
      { name: "newHash", type: "bytes32" },
      { name: "previousHash", type: "bytes32" },
      { name: "changeNote", type: "string" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "getArticleHead",
    stateMutability: "view",
    inputs: [{ name: "articleId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "articleId", type: "uint256" },
          { name: "externalId", type: "string" },
          { name: "publisherWallet", type: "address" },
          { name: "publisherId", type: "string" },
          { name: "currentRevision", type: "uint256" },
          { name: "currentHash", type: "bytes32" },
          { name: "previousHash", type: "bytes32" },
          { name: "contentRef", type: "string" },
          { name: "createdAt", type: "uint256" },
          { name: "updatedAt", type: "uint256" }
        ]
      }
    ]
  },
  {
    type: "event",
    anonymous: false,
    name: "ArticlePublished",
    inputs: [
      { indexed: true, name: "articleId", type: "uint256" },
      { indexed: false, name: "externalId", type: "string" },
      { indexed: false, name: "publisherId", type: "string" },
      { indexed: true, name: "publisherWallet", type: "address" },
      { indexed: false, name: "revisionNumber", type: "uint256" },
      { indexed: false, name: "contentHash", type: "bytes32" },
      { indexed: false, name: "previousHash", type: "bytes32" },
      { indexed: false, name: "contentRef", type: "string" },
      { indexed: false, name: "timestamp", type: "uint256" }
    ]
  },
  {
    type: "event",
    anonymous: false,
    name: "ArticleRevised",
    inputs: [
      { indexed: true, name: "articleId", type: "uint256" },
      { indexed: false, name: "externalId", type: "string" },
      { indexed: false, name: "publisherId", type: "string" },
      { indexed: true, name: "publisherWallet", type: "address" },
      { indexed: false, name: "revisionNumber", type: "uint256" },
      { indexed: false, name: "contentHash", type: "bytes32" },
      { indexed: false, name: "previousHash", type: "bytes32" },
      { indexed: false, name: "changeNote", type: "string" },
      { indexed: false, name: "timestamp", type: "uint256" }
    ]
  }
] as const;
