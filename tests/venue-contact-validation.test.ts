import {
  validateOptionalBusinessAddress,
  validateOptionalBusinessPhone,
  validateRequiredBusinessAddress,
} from "@/lib/venue-contact-validation";

describe("validateRequiredBusinessAddress", () => {
  it("accepts a normal street + city + state", () => {
    const r = validateRequiredBusinessAddress("123 Main St, Boston, MA 02101");
    expect(r).toEqual({ ok: true, value: "123 Main St, Boston, MA 02101" });
  });

  it("rejects street-only address", () => {
    const r = validateRequiredBusinessAddress("123 Main St");
    expect(r.ok).toBe(false);
  });

  it("rejects street + city when state/region is missing", () => {
    const r = validateRequiredBusinessAddress("xxx street, Pittsburgh");
    expect(r.ok).toBe(false);
  });

  it("rejects too short", () => {
    const r = validateRequiredBusinessAddress("123 St");
    expect(r.ok).toBe(false);
  });

  it("rejects obvious placeholders", () => {
    expect(validateRequiredBusinessAddress("n/a").ok).toBe(false);
    expect(validateRequiredBusinessAddress("test").ok).toBe(false);
  });

  it("rejects no letters", () => {
    expect(validateRequiredBusinessAddress("123 45 78 00").ok).toBe(false);
  });

  it("requires a digit or comma when the line is not long enough to be a landmark-only description", () => {
    expect(validateRequiredBusinessAddress("Downtown block").ok).toBe(false);
  });

  it("rejects a no-comma format even when city/state/postal are present", () => {
    const r = validateRequiredBusinessAddress("123 Main St Boston MA 02101");
    expect(r.ok).toBe(false);
  });

  it("rejects Pittsburgh-style address without commas (regression)", () => {
    expect(
      validateRequiredBusinessAddress("4500 Centre Ave Pittsburgh PA 15213").ok,
    ).toBe(false);
  });

  it("accepts comma-separated Pittsburgh address", () => {
    const r = validateRequiredBusinessAddress(
      "4500 Centre Ave, Pittsburgh, PA 15213",
    );
    expect(r).toEqual({
      ok: true,
      value: "4500 Centre Ave, Pittsburgh, PA 15213",
    });
  });
});

describe("validateOptionalBusinessAddress", () => {
  it("allows empty", () => {
    expect(validateOptionalBusinessAddress("  ")).toEqual({
      ok: true,
      value: "",
    });
  });
});

describe("validateOptionalBusinessPhone", () => {
  it("allows empty", () => {
    expect(validateOptionalBusinessPhone("")).toEqual({ ok: true, value: "" });
  });

  it("accepts 10-digit US/Canada numbers with valid NANP", () => {
    const r = validateOptionalBusinessPhone("(234) 567-8900");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe("(234) 567-8900");
  });

  it("rejects 10 digits with invalid area code (leading 0)", () => {
    expect(validateOptionalBusinessPhone("(034) 567-8900").ok).toBe(false);
  });

  it("rejects 10 digits when area code starts with 1 (e.g. 1234567890)", () => {
    const r = validateOptionalBusinessPhone("1234567890");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("area code");
  });

  it("rejects 11 digits that are not 1 + NANP", () => {
    expect(validateOptionalBusinessPhone("45685688992").ok).toBe(false);
  });

  it("accepts 1 + us number", () => {
    const r = validateOptionalBusinessPhone("1 (234) 567-8900");
    expect(r.ok).toBe(true);
  });

  it("rejects too few digits", () => {
    const r = validateOptionalBusinessPhone("12");
    expect(r.ok).toBe(false);
  });

  it("rejects 12+ digits (non US/Canada format)", () => {
    const r = validateOptionalBusinessPhone("2035719811123");
    expect(r.ok).toBe(false);
  });

  it("rejects all the same digit", () => {
    const r = validateOptionalBusinessPhone("2".repeat(10));
    expect(r.ok).toBe(false);
  });
});
