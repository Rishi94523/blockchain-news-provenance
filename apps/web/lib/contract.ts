import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  http,
  publicActions
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { env } from "./env";
import { newsProvenanceAbi } from "./contract-abi";

export const transport = http(env.rpcUrl);

export const localChain = {
  id: env.chainId,
  name: "Local EVM",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18
  },
  rpcUrls: {
    default: {
      http: [env.rpcUrl]
    }
  }
} as const;

export const publicClient = createPublicClient({
  transport,
  chain: localChain
});

export const adminAccount = privateKeyToAccount(env.adminPrivateKey);

export const adminWalletClient = createWalletClient({
  account: adminAccount,
  chain: localChain,
  transport
}).extend(publicActions);

export async function ensureAdminWalletFunded() {
  const balance = await publicClient.getBalance({ address: adminAccount.address });
  if (balance === 0n) {
    throw new Error(
      `Admin wallet ${adminAccount.address} is not funded on the local chain.`
    );
  }
}

type AdminWriteRequest =
  | {
      functionName: "approvePublisher";
      args: readonly [`0x${string}`, string, string];
    }
  | {
      functionName: "revokePublisher";
      args: readonly [`0x${string}`];
    };

export async function writeAdminContract({
  functionName,
  args
}: AdminWriteRequest) {
  await ensureAdminWalletFunded();
  const hash = await adminWalletClient.writeContract({
    address: env.contractAddress,
    abi: newsProvenanceAbi,
    functionName,
    args
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return { hash, receipt };
}

export async function readArticleHead(articleId: bigint) {
  return publicClient.readContract({
    address: env.contractAddress,
    abi: newsProvenanceAbi,
    functionName: "getArticleHead",
    args: [articleId]
  });
}

export async function decodeReceiptLogs(hash: `0x${string}`) {
  const receipt = await publicClient.getTransactionReceipt({ hash });

  const logs = receipt.logs.flatMap((log) => {
    try {
      return [
        decodeEventLog({
          abi: newsProvenanceAbi,
          data: log.data,
          topics: log.topics
        })
      ];
    } catch {
      return [];
    }
  });

  return { receipt, logs };
}
