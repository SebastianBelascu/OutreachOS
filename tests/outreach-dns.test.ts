import assert from "node:assert/strict";
import test from "node:test";

import { evaluateDomainDns, type DnsResolver } from "@/lib/outreach/dns";

const passingResolver: DnsResolver = {
  resolveTxt: async (host) => {
    if (host === "example.com") return [["v=spf1 include:spf.brevo.com ~all"]];
    if (host === "mail._domainkey.example.com") return [["v=DKIM1; k=rsa; p=MIGf"]];
    if (host === "_dmarc.example.com") return [["v=DMARC1; p=none; rua=mailto:dmarc@example.com"]];
    return [];
  },
  resolveMx: async (host) => (host === "example.com" ? [{ exchange: "mx.example.com", priority: 10 }] : []),
  resolveCname: async () => {
    throw new Error("no cname");
  },
};

const emptyResolver: DnsResolver = {
  resolveTxt: async () => [],
  resolveMx: async () => [],
  resolveCname: async () => {
    throw new Error("no cname");
  },
};

test("all DNS checks pass for a correctly configured domain", async () => {
  const result = await evaluateDomainDns("example.com", { resolver: passingResolver });
  assert.equal(result.spf.pass, true);
  assert.equal(result.dkim.pass, true);
  assert.equal(result.dkim.selector, "mail");
  assert.equal(result.dmarc.pass, true);
  assert.equal(result.mx.pass, true);
  assert.equal(result.allPass, true);
});

test("missing records fail and allPass is false", async () => {
  const result = await evaluateDomainDns("broken.com", { resolver: emptyResolver });
  assert.equal(result.spf.pass, false);
  assert.equal(result.dkim.pass, false);
  assert.equal(result.dmarc.pass, false);
  assert.equal(result.mx.pass, false);
  assert.equal(result.allPass, false);
});

test("SPF passes for any valid v=spf1 record (host-agnostic, e.g. cPanel/Google)", async () => {
  const resolver: DnsResolver = {
    ...emptyResolver,
    resolveTxt: async (host) => (host === "x.com" ? [["v=spf1 +a +mx +ip4:1.2.3.4 ~all"]] : []),
  };
  const result = await evaluateDomainDns("x.com", { resolver });
  assert.equal(result.spf.pass, true);
});

test("DKIM via cPanel default selector is detected", async () => {
  const resolver: DnsResolver = {
    resolveTxt: async (host) =>
      host === "cp.com"
        ? [["v=spf1 +mx ~all"]]
        : host === "default._domainkey.cp.com"
          ? [["v=DKIM1; k=rsa; p=MIGf"]]
          : host === "_dmarc.cp.com"
            ? [["v=DMARC1; p=none"]]
            : [],
    resolveMx: async () => [{ exchange: "mail.cp.com", priority: 10 }],
    resolveCname: async () => {
      throw new Error("no cname");
    },
  };
  const result = await evaluateDomainDns("cp.com", { resolver });
  assert.equal(result.dkim.pass, true);
  assert.equal(result.dkim.selector, "default");
});

test("DKIM via brevo CNAME flow is detected", async () => {
  const resolver: DnsResolver = {
    resolveTxt: async (host) =>
      host === "cn.com" ? [["v=spf1 include:spf.brevo.com ~all"]] : host === "_dmarc.cn.com" ? [["v=DMARC1; p=none"]] : [],
    resolveMx: async () => [{ exchange: "mx.cn.com", priority: 10 }],
    resolveCname: async (host) => (host === "brevo1._domainkey.cn.com" ? ["b1.dkim.brevo.com"] : []),
  };
  const result = await evaluateDomainDns("cn.com", { resolver });
  assert.equal(result.dkim.pass, true);
  assert.equal(result.dkim.selector, "brevo1");
});
