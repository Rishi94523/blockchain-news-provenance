function read(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  databaseUrl: process.env.DATABASE_URL,
  rpcUrl: read("RPC_URL"),
  chainId: Number(read("CHAIN_ID")),
  contractAddress: read("CONTRACT_ADDRESS") as `0x${string}`,
  adminPrivateKey: read("ADMIN_PRIVATE_KEY") as `0x${string}`,
  adminWalletAddress: read("ADMIN_WALLET_ADDRESS").toLowerCase(),
  sessionSecret: read("SESSION_SECRET"),
  appUrl: read("NEXT_PUBLIC_APP_URL")
};
