// Self-check: node --experimental-strip-types src/lib/admin-validate.check.ts
import assert from "node:assert/strict";

import { fileMatchesType, isLocalRequest, safeName, validateContent } from "./admin-validate.ts";

const project = {
  _id: "my-app",
  slug: "my-app",
  name: "My App",
  year: 2026,
  description: "",
  features: [],
  techStack: ["React"],
  thumbnail: "/images/projects/my-app.png",
  sortIndex: 1,
  hide: false,
};
assert.equal(validateContent("projects", [project]), null);
assert.match(validateContent("projects", [project, project]) ?? "", /already uses/);
assert.match(validateContent("projects", [{ ...project, slug: "My App" }]) ?? "", /URL name/);
assert.match(validateContent("projects", [{ ...project, liveUrl: "javascript:alert(1)" }]) ?? "", /https/);
assert.match(validateContent("projects", [{ ...project, thumbnail: "/../../.env" }]) ?? "", /screenshot/);
assert.match(validateContent("projects", { not: "a list" }) ?? "", /list/);

const job = { _id: "j1", title: "Dev", company: "Acme", startDate: "01/2025", endDate: "Present", sortIndex: 1, hide: false };
assert.equal(validateContent("experience", [job]), null);
assert.match(validateContent("experience", [{ ...job, company: " " }]) ?? "", /company/);

assert.equal(safeName("../../My Résumé (final).PDF"), "my-r-sum-final");
assert.equal(safeName("..."), "file");

// Uploads must really be the type they claim.
const bytes = (s: string | number[]) => new Uint8Array(typeof s === "string" ? [...s].map((c) => c.charCodeAt(0)) : s);
assert.ok(fileMatchesType("png", bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0])));
assert.ok(fileMatchesType("pdf", bytes("%PDF-1.4")));
assert.ok(fileMatchesType("webp", bytes("RIFF\0\0\0\0WEBPVP8 ")));
assert.ok(!fileMatchesType("png", bytes("<html><script>")), "HTML renamed to .png is refused");
assert.ok(!fileMatchesType("pdf", bytes("#!/bin/sh")), "script renamed to .pdf is refused");
assert.ok(!fileMatchesType("svg", bytes("<svg")), "unknown types are refused");

// Admin writes only from this computer's own page.
assert.ok(isLocalRequest("http://127.0.0.1:3240", "127.0.0.1:3240"));
assert.ok(isLocalRequest("http://localhost:3240", "localhost:3240"));
assert.ok(!isLocalRequest(null, "127.0.0.1:3240"), "no Origin header");
assert.ok(!isLocalRequest("null", "127.0.0.1:3240"), "sandboxed page (null origin)");
assert.ok(!isLocalRequest("https://evil.example", "127.0.0.1:3240"), "another website");
assert.ok(!isLocalRequest("http://evil.example:3240", "evil.example:3240"), "DNS rebinding");
assert.ok(!isLocalRequest("http://192.168.1.5:3240", "192.168.1.5:3240"), "another device on the network");

console.log("admin-validate checks pass");
