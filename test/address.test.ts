import assert from "node:assert/strict";
import test from "node:test";
import { detectAddressFamily, normalizeRequest } from "../src/address.js";

test("detects EVM and Solana address families", () => {
  assert.equal(detectAddressFamily("0x21cfcfc3d8f98fc728f48341d10ad8283f6eb7ab"), "evm");
  assert.equal(detectAddressFamily("So11111111111111111111111111111111111111112"), "solana");
  assert.equal(detectAddressFamily("not-an-address"), null);
});

test("requires an explicit network for an EVM address", () => {
  assert.throws(
    () => normalizeRequest({ address: "0x21cfcfc3d8f98fc728f48341d10ad8283f6eb7ab" }),
    /network-ambiguous/
  );
});

test("normalizes EVM casing and infers Solana", () => {
  assert.deepEqual(normalizeRequest({
    address: "0x21CfCFC3D8F98fc728F48341D10AD8283F6EB7Ab",
    chain: "base"
  }), {
    address: "0x21cfcfc3d8f98fc728f48341d10ad8283f6eb7ab",
    chain: "base",
    family: "evm"
  });

  assert.equal(normalizeRequest({
    address: "So11111111111111111111111111111111111111112"
  }).chain, "solana");
});
