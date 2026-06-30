import { AwsClient } from "aws4fetch";

// Worker R2 client — its OWN client over the SAME bucket the app presigns into (the
// contract: worker reads the captured original + writes the normalized output). Mirrors
// the app's src/lib/r2.ts config (same 5 R2_* env vars); lazy, so a missing var only
// throws when an object is actually moved.

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

function getConfig(): R2Config {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      "R2 is not configured on the worker. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET.",
    );
  }
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

function endpoint(cfg: R2Config, key: string): string {
  return `https://${cfg.accountId}.r2.cloudflarestorage.com/${cfg.bucket}/${key}`;
}

function client(cfg: R2Config): AwsClient {
  return new AwsClient({
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    service: "s3",
    region: "auto", // R2 convention
  });
}

// Download an object's bytes (the captured original at `key`).
export async function getObject(key: string): Promise<Uint8Array> {
  const cfg = getConfig();
  const res = await client(cfg).fetch(endpoint(cfg, key), { method: "GET" });
  if (!res.ok) {
    throw new Error(`R2 GET ${key} failed: ${res.status}`);
  }
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

// Upload bytes to a deterministic `key` (a retry overwrites the SAME object — never a
// duplicate). contentType lets R2 serve it correctly later.
export async function putObject(
  key: string,
  body: Uint8Array,
  contentType: string,
): Promise<void> {
  const cfg = getConfig();
  const res = await client(cfg).fetch(endpoint(cfg, key), {
    method: "PUT",
    headers: { "content-type": contentType },
    // Buffer (a Uint8Array subclass, zero-copy view) is an unambiguous fetch BodyInit;
    // aws4fetch hashes it for the SigV4 signature.
    body: Buffer.from(body),
  });
  if (!res.ok) {
    throw new Error(`R2 PUT ${key} failed: ${res.status}`);
  }
}
