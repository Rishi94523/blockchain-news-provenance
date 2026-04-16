// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract NewsProvenanceRegistry {
    struct PublisherProfile {
        string publisherId;
        string displayName;
        bool approved;
        uint256 approvedAt;
    }

    struct ArticleHead {
        uint256 articleId;
        string externalId;
        address publisherWallet;
        string publisherId;
        uint256 currentRevision;
        bytes32 currentHash;
        bytes32 previousHash;
        string contentRef;
        uint256 createdAt;
        uint256 updatedAt;
    }

    address public immutable owner;
    uint256 public articleCount;

    mapping(address => PublisherProfile) public publishers;
    mapping(uint256 => ArticleHead) private articleHeads;

    event PublisherApproved(
        address indexed wallet,
        string publisherId,
        string displayName,
        uint256 approvedAt
    );

    event PublisherRevoked(address indexed wallet, string publisherId, uint256 revokedAt);

    event ArticlePublished(
        uint256 indexed articleId,
        string externalId,
        string publisherId,
        address indexed publisherWallet,
        uint256 revisionNumber,
        bytes32 contentHash,
        bytes32 previousHash,
        string contentRef,
        uint256 timestamp
    );

    event ArticleRevised(
        uint256 indexed articleId,
        string externalId,
        string publisherId,
        address indexed publisherWallet,
        uint256 revisionNumber,
        bytes32 contentHash,
        bytes32 previousHash,
        string changeNote,
        uint256 timestamp
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyApprovedPublisher() {
        require(publishers[msg.sender].approved, "Publisher not approved");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function approvePublisher(
        address wallet,
        string calldata publisherId,
        string calldata displayName
    ) external onlyOwner {
        require(wallet != address(0), "Invalid wallet");
        require(bytes(publisherId).length > 0, "Publisher ID required");
        require(bytes(displayName).length > 0, "Display name required");

        publishers[wallet] = PublisherProfile({
            publisherId: publisherId,
            displayName: displayName,
            approved: true,
            approvedAt: block.timestamp
        });

        emit PublisherApproved(wallet, publisherId, displayName, block.timestamp);
    }

    function revokePublisher(address wallet) external onlyOwner {
        PublisherProfile storage profile = publishers[wallet];
        require(profile.approved, "Publisher not approved");

        profile.approved = false;

        emit PublisherRevoked(wallet, profile.publisherId, block.timestamp);
    }

    function publishArticle(
        string calldata externalId,
        bytes32 contentHash,
        string calldata contentRef
    ) external onlyApprovedPublisher returns (uint256 articleId) {
        require(bytes(externalId).length > 0, "External ID required");
        require(bytes(contentRef).length > 0, "Content ref required");
        require(contentHash != bytes32(0), "Content hash required");

        articleCount += 1;
        articleId = articleCount;

        PublisherProfile memory publisher = publishers[msg.sender];

        articleHeads[articleId] = ArticleHead({
            articleId: articleId,
            externalId: externalId,
            publisherWallet: msg.sender,
            publisherId: publisher.publisherId,
            currentRevision: 1,
            currentHash: contentHash,
            previousHash: bytes32(0),
            contentRef: contentRef,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        emit ArticlePublished(
            articleId,
            externalId,
            publisher.publisherId,
            msg.sender,
            1,
            contentHash,
            bytes32(0),
            contentRef,
            block.timestamp
        );
    }

    function reviseArticle(
        uint256 articleId,
        uint256 expectedRevision,
        bytes32 newHash,
        bytes32 previousHash,
        string calldata changeNote
    ) external onlyApprovedPublisher {
        require(newHash != bytes32(0), "New hash required");
        require(bytes(changeNote).length > 0, "Change note required");

        ArticleHead storage head = articleHeads[articleId];
        require(head.articleId != 0, "Article not found");
        require(head.publisherWallet == msg.sender, "Not publisher owner");
        require(head.currentRevision == expectedRevision, "Revision mismatch");
        require(head.currentHash == previousHash, "Previous hash mismatch");

        head.previousHash = head.currentHash;
        head.currentHash = newHash;
        head.currentRevision += 1;
        head.updatedAt = block.timestamp;

        emit ArticleRevised(
            articleId,
            head.externalId,
            head.publisherId,
            msg.sender,
            head.currentRevision,
            newHash,
            previousHash,
            changeNote,
            block.timestamp
        );
    }

    function getArticleHead(uint256 articleId) external view returns (ArticleHead memory) {
        require(articleHeads[articleId].articleId != 0, "Article not found");
        return articleHeads[articleId];
    }
}
