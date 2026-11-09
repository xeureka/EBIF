import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { InvalidQrPayloadError, parseTicketFromQr } from "./ticket-qr";

const EXPECTED = "K7M29QXA4TWB";

describe("parseTicketFromQr", () => {
  it("accepts a raw formatted ticket code", () => {
    assert.equal(parseTicketFromQr("K7M2-9QXA-4TWB"), EXPECTED);
  });

  it("accepts a raw unformatted ticket code", () => {
    assert.equal(parseTicketFromQr("K7M29QXA4TWB"), EXPECTED);
  });

  it("normalises lowercase and surrounding whitespace/newlines", () => {
    assert.equal(parseTicketFromQr("  \n k7m2-9qxa-4twb \r\n"), EXPECTED);
  });

  it("parses a ticket URL", () => {
    assert.equal(parseTicketFromQr("https://ebif.example.com/ticket/K7M2-9QXA-4TWB"), EXPECTED);
  });

  it("parses an unformatted ticket URL", () => {
    assert.equal(
      parseTicketFromQr("https://ebif.example.com/ticket/K7M29QXA4TWB?utm=email"),
      EXPECTED,
    );
  });

  it("parses a URL query parameter", () => {
    assert.equal(
      parseTicketFromQr("https://ebif.example.com/check-in?code=K7M2-9QXA-4TWB"),
      EXPECTED,
    );
  });

  it("parses a JSON payload", () => {
    assert.equal(parseTicketFromQr('{"ticketCode":"K7M2-9QXA-4TWB"}'), EXPECTED);
    assert.equal(parseTicketFromQr('{"code":"k7m29qxa4twb"}'), EXPECTED);
  });

  it("parses a prefixed payload", () => {
    assert.equal(parseTicketFromQr("TICKET: K7M2-9QXA-4TWB"), EXPECTED);
    assert.equal(parseTicketFromQr("code=k7m2-9qxa-4twb"), EXPECTED);
  });

  it("rejects a payload without a ticket code", () => {
    assert.throws(() => parseTicketFromQr("hello world"), InvalidQrPayloadError);
    assert.throws(() => parseTicketFromQr("https://example.com/"), InvalidQrPayloadError);
    assert.throws(() => parseTicketFromQr(""), InvalidQrPayloadError);
  });

  it("rejects codes with characters outside the Crockford alphabet", () => {
    assert.throws(() => parseTicketFromQr("IIII-IIII-IIII"), InvalidQrPayloadError);
    assert.throws(() => parseTicketFromQr("K7M2-9QXA-4TWL"), InvalidQrPayloadError);
  });
});
