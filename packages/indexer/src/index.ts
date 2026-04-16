import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import { createPublicClient, decodeEventLog, http } from "viem";

const prisma = new PrismaClient();

const abi = [
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
  },
  {
    type: "event",
    anonymous: false,
    name: "PublisherApproved",
    inputs: [
      { indexed: true, name: "wallet", type: "address" },
      { indexed: false, name: "publisherId", type: "string" },
      { indexed: false, name: "displayName", type: "string" },
      { indexed: false, name: "approvedAt", type: "uint256" }
    ]
  },
  {
    type: "event",
    anonymous: false,
    name: "PublisherRevoked",
    inputs: [
      { indexed: true, name: "wallet", type: "address" },
      { indexed: false, name: "publisherId", type: "string" },
      { indexed: false, name: "revokedAt", type: "uint256" }
    ]
  }
] as const;

const rpcUrl = process.env.RPC_URL;
const contractAddress = process.env.CONTRACT_ADDRESS as `0x${string}` | undefined;
const chainId = Number(process.env.CHAIN_ID ?? "31337");

if (!rpcUrl || !contractAddress) {
  throw new Error("RPC_URL and CONTRACT_ADDRESS are required for the indexer.");
}

const publicClient = createPublicClient({
  transport: http(rpcUrl),
  chain: {
    id: chainId,
    name: "Local EVM",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18
    },
    rpcUrls: {
      default: {
        http: [rpcUrl]
      }
    }
  }
});

function jsonSafe(value: unknown) {
  return JSON.parse(
    JSON.stringify(value, (_, nestedValue) =>
      typeof nestedValue === "bigint" ? nestedValue.toString() : nestedValue
    )
  );
}

async function syncOnce() {
  const latest = await prisma.chainEvent.findFirst({
    orderBy: {
      blockNumber: "desc"
    }
  });

  const fromBlock = latest ? latest.blockNumber + 1n : 0n;
  const toBlock = await publicClient.getBlockNumber();

  if (fromBlock > toBlock) {
    return;
  }

  const logs = await publicClient.getLogs({
    address: contractAddress,
    fromBlock,
    toBlock
  });

  for (const log of logs) {
    const decoded = decodeEventLog({
      abi,
      data: log.data,
      topics: log.topics
    });

    await prisma.chainEvent.upsert({
      where: {
        txHash_logIndex: {
          txHash: log.transactionHash,
          logIndex: log.logIndex
        }
      },
      update: {
        payload: jsonSafe(decoded.args)
      },
      create: {
        eventName: decoded.eventName,
        articleId:
          "articleId" in decoded.args && decoded.args.articleId
            ? BigInt(decoded.args.articleId)
            : null,
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
        logIndex: log.logIndex,
        payload: jsonSafe(decoded.args)
      }
    });
  }

  if (logs.length > 0) {
    console.log(`Indexed ${logs.length} event(s) through block ${toBlock.toString()}.`);
  }
}

async function main() {
  console.log("Origin Ledger indexer started.");
  await syncOnce();
  setInterval(() => {
    void syncOnce().catch((error) => {
      console.error("Indexer sync error:", error);
    });
  }, 5000);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
