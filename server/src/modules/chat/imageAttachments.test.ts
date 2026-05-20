import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateImages } from "./imageAttachments.js";

describe("validateImages", () => {
  it("returns empty array when input is undefined", () => {
    assert.deepEqual(validateImages(undefined), []);
  });

  it("rejects too many images", () => {
    const images = Array.from({ length: 5 }, () => ({
      mimeType: "image/png",
      base64: Buffer.from("x").toString("base64")
    }));
    assert.throws(() => validateImages(images), /At most 4 images/);
  });

  it("rejects invalid mime types", () => {
    assert.throws(
      () =>
        validateImages([
          { mimeType: "image/gif", base64: Buffer.from("x").toString("base64") }
        ]),
      /Invalid image type/
    );
  });

  it("accepts valid png payload", () => {
    const base64 = Buffer.from("hello").toString("base64");
    const result = validateImages([{ mimeType: "image/png", base64 }]);
    assert.equal(result.length, 1);
    assert.equal(result[0]?.mimeType, "image/png");
    assert.equal(result[0]?.base64, base64);
  });
});
