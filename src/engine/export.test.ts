import { describe, it, expect } from "vitest";
import { zipFiles } from "./export";
describe("manufacturing archive", () => {
  it("writes valid local headers, CRC and central directory", () => {
    const bytes = zipFiles({
      "test.txt": new TextEncoder().encode("123456789"),
    });
    const v = new DataView(bytes.buffer);
    expect(v.getUint32(0, true)).toBe(0x04034b50);
    expect(v.getUint32(14, true)).toBe(0xcbf43926);
    expect(v.getUint32(18, true)).toBe(9);
    const end = bytes.length - 22;
    expect(v.getUint32(end, true)).toBe(0x06054b50);
    expect(v.getUint16(end + 10, true)).toBe(1);
    expect(v.getUint32(v.getUint32(end + 16, true), true)).toBe(0x02014b50);
  });
});
