import { expect } from "chai";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { ethers } from "hardhat";

describe("NewsProvenanceRegistry", () => {
  it("approves publishers and allows publish + revise", async () => {
    const [owner, publisher] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("NewsProvenanceRegistry");
    const contract = await factory.deploy();
    await contract.waitForDeployment();

    await contract.approvePublisher(
      publisher.address,
      "daily-ledger",
      "Daily Ledger"
    );

    const initialHash = ethers.keccak256(ethers.toUtf8Bytes("v1"));
    const revisedHash = ethers.keccak256(ethers.toUtf8Bytes("v2"));

    await expect(
      contract
        .connect(publisher)
        .publishArticle("breaking-news", initialHash, "article://breaking-news")
    )
      .to.emit(contract, "ArticlePublished")
      .withArgs(
        1n,
        "breaking-news",
        "daily-ledger",
        publisher.address,
        1n,
        initialHash,
        ethers.ZeroHash,
        "article://breaking-news",
        anyValue
      );

    await expect(
      contract
        .connect(publisher)
        .reviseArticle(1, 1, revisedHash, initialHash, "Corrected headline")
    )
      .to.emit(contract, "ArticleRevised")
      .withArgs(
        1n,
        "breaking-news",
        "daily-ledger",
        publisher.address,
        2n,
        revisedHash,
        initialHash,
        "Corrected headline",
        anyValue
      );

    const head = await contract.getArticleHead(1);
    expect(head.currentRevision).to.equal(2n);
    expect(head.currentHash).to.equal(revisedHash);
    expect(head.previousHash).to.equal(initialHash);
    expect(owner.address).to.not.equal(publisher.address);
  });

  it("rejects unapproved publishers", async () => {
    const [, publisher] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("NewsProvenanceRegistry");
    const contract = await factory.deploy();
    await contract.waitForDeployment();

    await expect(
      contract
        .connect(publisher)
        .publishArticle("story", ethers.keccak256(ethers.toUtf8Bytes("v1")), "ref")
    ).to.be.revertedWith("Publisher not approved");
  });

  it("rejects stale revision numbers", async () => {
    const [, publisher] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("NewsProvenanceRegistry");
    const contract = await factory.deploy();
    await contract.waitForDeployment();

    await contract.approvePublisher(publisher.address, "wire", "Wire");
    const v1 = ethers.keccak256(ethers.toUtf8Bytes("v1"));
    const v2 = ethers.keccak256(ethers.toUtf8Bytes("v2"));

    await contract.connect(publisher).publishArticle("story", v1, "ref");

    await expect(
      contract.connect(publisher).reviseArticle(1, 2, v2, v1, "Bad revision")
    ).to.be.revertedWith("Revision mismatch");
  });
});
