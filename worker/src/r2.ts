import { AwsClient } from "aws4fetch";

// Worker R2 client — its OWN client over the PRIVATE customer-media bucket (T7.4a). The
// worker ONLY ever touches consent-bearing customer media (it reads the captured original +
// writes the normalized output + deletes its own orphaned output on the withdrawal race),
// so it points WHOLLY at R2_CAPTURES_BUCKET — never the public brand-assets bucket. Same
// account + token as the app (D7). Lazy, so a missing var only throws when an object is
// actually moved.

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
  // T7.4a — the PRIVATE captures bucket (was R2_BUCKET). The worker never touches public
  // brand assets, so it binds the captures bucket exclusively.
  const bucket = process.env.R2_CAPTURES_BUCKET;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      "R2 captures bucket is not configured on the worker. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_CAPTURES_BUCKET.",
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

// HARD-DELETE an object (T7.4a / D6). Used by the normalize self-cascade: when consent is
// withdrawn mid-encode, the atomic markNormalized matches 0 rows and the worker deletes its
// OWN just-produced normalized object so no orphan is left. IDEMPOTENT — a 404 (already
// gone) is success.
export async function deleteObject(key: string): Promise<void> {
  const cfg = getConfig();
  const res = await client(cfg).fetch(endpoint(cfg, key), { method: "DELETE" });
  if (!res.ok && res.status !== 404) {
    throw new Error(`R2 DELETE ${key} failed: ${res.status}`);
  }
}
