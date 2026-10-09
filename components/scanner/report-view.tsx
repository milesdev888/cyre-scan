"use client";

import { ExternalLink, Lock, LockOpen } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { GradeMark } from "@/components/scanner/grade-mark";
import { BadgeSealCorner } from "@/components/scanner/badge-seal";
import { buttonVariants } from "@/components/ui/button";
import { formatAge, formatPct, formatProvenYears, formatUsd, readAgeDays, shorten } from "@/lib/guardian/grade";
import { GRADE_HEX } from "@/lib/guardian/grade-colors";
import type {
  Check,
  GuardianReport,
  LpTier,
  PresenceMatch,
  ScanResponse,
} from "@/lib/guardian/types";
import { cn } from "@/lib/utils";

const SEVERITY: Record<string, string> = {
  info: "border-border text-muted-foreground",
  watch: "border-sky-500/40 text-sky-200",
  caution: "border-amber-400/40 text-amber-200",
  critical: "border-red-500/45 text-red-300",
};

type LockTone = "green" | "gold" | "red" | "gray";

const LOCK_TONE_CLASS: Record<LockTone, string> = {
  green: "text-emerald-400",
  gold: "text-amber-300",
  red: "text-red-400",
  gray: "text-muted-foreground",
};

/** Green/gold LP chrome from Phase 1 classifyLp tiers — never RugCheck lock %. */
function lockToneFromTier(tier: LpTier | null | undefined, grade: Check["grade"]): LockTone {
  if (tier === "PERMANENT" || tier === "BURNED") return "green";
  if (tier === "TIMED") return "gold";
  if (tier === "UNVERIFIED") return grade === "U" ? "gray" : "red";
  if (grade === "AA" || grade === "A") return "green";
  if (grade === "B") return "gold";
  if (grade === "U") return "gray";
  return "red";
}

export function ScanResultView({
  result,
  activeChain,
}: {
  result: Extract<ScanResponse, { kind: "report" }>;
  activeChain?: string;
}) {
  const report =
    result.reports.find((item) => item.chain.id === activeChain) ?? result.reports[0];
  if (!report) return null;
  return (
    <div className="min-w-0 space-y-6">
      <PresenceBar
        presence={result.presence}
        family={result.family}
        active={report.chain.id}
        address={result.address}
      />
      <ReportView report={report} />
    </div>
  );
}

function PresenceBar({
  presence,
  family,
  active,
  address,
}: {
  presence: PresenceMatch[];
  family: string;
  active?: string;
  address: string;
}) {
  if (family === "solana" || family === "xrpl") return null;
  return (
    <div className="flex min-w-0 flex-wrap gap-2">
      {presence.map((row) => {
        const selected = row.chainId === active;
        const href = row.exists
          ? `/app?address=${encodeURIComponent(address)}&chain=${encodeURIComponent(row.chainId)}`
          : undefined;
        const className = cn(
          buttonVariants({ variant: selected ? "default" : "outline" }),
          "h-11 min-h-11 rounded-xl px-3 text-xs",
          !row.exists && "pointer-events-none opacity-50",
        );
        if (!href) {
          return (
            <span key={row.chainId} className={className}>
              {row.chainName} · empty
            </span>
          );
        }
        return (
          <a key={row.chainId} href={href} className={className}>
            {row.chainName}
            {selected ? " · report" : " · contract"}
          </a>
        );
      })}
    </div>
  );
}

function CheckCard({ item, lpTier }: { item: Check; lpTier?: LpTier | null }) {
  const isLp = item.id === "lp_lock";
  const tier = (
    typeof item.evidence?.tier === "string" ? item.evidence.tier : lpTier
  ) as LpTier | null | undefined;
  const tone = isLp ? lockToneFromTier(tier, item.grade) : null;

  return (
    <div className="flex min-w-0 gap-3 rounded-xl border border-border/80 bg-card/60 p-3 sm:p-4">
      <GradeMark grade={item.grade} size="sm" className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <h3 className="font-medium text-pretty break-words">{item.title}</h3>
          <span className="text-xs text-muted-foreground">
            grade {item.grade} · {item.status}
          </span>
          {isLp && tone ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs font-medium",
                LOCK_TONE_CLASS[tone],
              )}
              title={`LP lock tone: ${tone}${tier ? ` · ${tier}` : ""}`}
            >
              {tone === "gray" || tone === "red" ? (
                <LockOpen className="size-3.5" aria-hidden />
              ) : (
                <Lock className="size-3.5" aria-hidden />
              )}
              {tier ?? null}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-pretty break-words">{item.summary}</p>
        <p className="mt-1 text-xs text-pretty break-words text-muted-foreground">{item.detail}</p>
      </div>
    </div>
  );
}

export function ReportView({ report }: { report: GuardianReport }) {
  const concentration = report.concentration;
  const lpTier = report.lp?.tier ?? null;
  const ageDays = readAgeDays(report.checks);
  const provenYears = report.grade === "AA" ? formatProvenYears(ageDays) : null;
  const gradeAccent = GRADE_HEX[report.grade] ?? GRADE_HEX.U;

  return (
    <div className="relative min-w-0 space-y-6 pb-28">
      <BadgeSealCorner mint={report.token.address} />
      <Card className="min-w-0 overflow-hidden border-border/80 bg-card/80">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-3 sm:gap-4">
            <GradeMark grade={report.grade} size="lg" labeled className="shrink-0" />
            <div className="min-w-0">
              <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
                {report.chain.name}
                {report.chain.family &&
                report.chain.family.toLowerCase() !== report.chain.name.toLowerCase()
                  ? ` · ${report.chain.family}`
                  : ""}
              </p>
              <CardTitle className="font-heading mt-1 text-2xl text-pretty break-words sm:text-3xl">
                {report.token.name ?? "Unknown token"}{" "}
                {report.token.symbol ? (
                  <span className="text-muted-foreground">${report.token.symbol}</span>
                ) : null}
              </CardTitle>
              <p className="mt-1 text-sm" style={{ color: report.grade === "A" ? "#8FB0DE" : gradeAccent }}>
                Grade {report.grade}
                <span className="text-muted-foreground"> · composite {report.score}/100</span>
              </p>
              {provenYears ? (
                <p
                  className="mt-1 text-xs font-medium tracking-[0.14em] uppercase"
                  style={{ color: GRADE_HEX.AA }}
                >
                  Proven · {provenYears} yrs on-chain
                </p>
              ) : null}
              {lpTier ? (
                <p
                  className={cn(
                    "mt-2 inline-flex max-w-full flex-wrap items-center gap-1.5 text-sm font-medium",
                    LOCK_TONE_CLASS[lockToneFromTier(lpTier, report.grade)],
                  )}
                >
                  {lpTier === "UNVERIFIED" ? (
                    <LockOpen className="size-4 shrink-0" aria-hidden />
                  ) : (
                    <Lock className="size-4 shrink-0" aria-hidden />
                  )}
                  <span className="break-words">
                    LP {lpTier}
                    {typeof report.lp?.lockedPct === "number"
                      ? ` · ${Math.round(report.lp.lockedPct)}% locked`
                      : null}
                  </span>
                </p>
              ) : null}
              <p className="mt-2 font-mono text-xs break-all text-muted-foreground">
                {report.token.address}
              </p>
              <p className="mt-3 max-w-xl text-sm text-pretty break-words text-foreground/80 capitalize">
                {report.headline}
              </p>
            </div>
          </div>
          <a
            href={report.chain.explorerUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-1 text-xs text-primary hover:underline sm:min-h-0"
          >
            Explorer <ExternalLink className="size-3" />
          </a>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-pretty text-muted-foreground">{report.disclaimer}</p>
        </CardContent>
      </Card>

      {report.patterns.length > 0 ? (
        <div className="flex min-w-0 flex-wrap gap-2">
          {report.patterns.map((item) => (
            <Badge
              key={item.id}
              variant="outline"
              className={cn("h-auto max-w-full py-1 text-pretty whitespace-normal", SEVERITY[item.severity])}
            >
              {item.title}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No extra patterns beyond the check table.</p>
      )}

      <div className="grid min-w-0 gap-3">
        {report.checks.map((item) => (
          <CheckCard key={item.id} item={item} lpTier={lpTier} />
        ))}
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>Top holders</CardTitle>
            {concentration ? (
              <p className="text-sm text-pretty text-muted-foreground">
                Top 10 hold {formatPct(concentration.rawTop10)} raw ·{" "}
                {formatPct(concentration.adjustedTop10)} excluding locked &amp; LP
                {concentration.excludedPct > 0
                  ? ` (excluded ${formatPct(concentration.excludedPct)})`
                  : ""}
              </p>
            ) : null}
          </CardHeader>
          <CardContent className="min-w-0">
            {report.holders.length ? (
              <ul className="space-y-2">
                {report.holders.map((holder, index) => (
                  <li
                    key={`${holder.address}-${index}`}
                    className="flex min-w-0 items-center justify-between gap-3 text-sm"
                  >
                    <span className="min-w-0 truncate text-xs text-muted-foreground">
                      {holder.tag ? (
                        <>
                          <span className="text-foreground/90">{holder.tag}</span>
                          <span className="font-mono">
                            {" "}
                            · {shorten(holder.address || "unknown", 4)}
                          </span>
                        </>
                      ) : (
                        <span className="font-mono">{shorten(holder.address || "unknown", 5)}</span>
                      )}
                    </span>
                    <span className="shrink-0 tabular-nums">{formatPct(holder.percent)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyNote text="Holder table not returned for this chain." />
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>Pools</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0">
            {report.pools.length ? (
              <ul className="space-y-2">
                {report.pools.map((pool) => (
                  <li key={pool.pairAddress} className="min-w-0 text-sm">
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <span className="min-w-0 truncate">
                        {pool.dex} / {pool.quote}
                      </span>
                      <span className="shrink-0 tabular-nums">{formatUsd(pool.liquidityUsd)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatAge(pool.createdAt)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyNote text="No DEX pools in the current window." />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle>Same-ticker copies</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0">
          {report.copycats.length ? (
            <div className="max-w-full min-w-0 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
              <table className="w-full min-w-0 table-fixed text-left text-sm sm:min-w-[32rem] sm:table-auto">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="w-[40%] pb-2 pr-2 font-medium sm:w-auto">Token</th>
                    <th className="hidden pb-2 pr-2 font-medium sm:table-cell">DEX</th>
                    <th className="w-[22%] pb-2 pr-2 font-medium sm:w-auto">Liquidity</th>
                    <th className="w-[18%] pb-2 pr-2 font-medium sm:w-auto">Age</th>
                    <th className="w-[20%] pb-2 font-medium sm:w-auto">Flag</th>
                  </tr>
                </thead>
                <tbody>
                  {report.copycats.map((row) => (
                    <tr key={row.address} className="border-t border-border/60">
                      <td className="py-2 pr-2 align-top">
                        <div className="break-words">{row.name ?? row.symbol}</div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {shorten(row.address, 6)}
                        </div>
                        <div className="mt-0.5 text-xs break-words text-muted-foreground sm:hidden">
                          {row.dex ?? "—"}
                        </div>
                      </td>
                      <td className="hidden py-2 pr-2 align-top sm:table-cell">{row.dex ?? "—"}</td>
                      <td className="py-2 pr-2 align-top whitespace-nowrap tabular-nums">
                        {formatUsd(row.liquidityUsd)}
                      </td>
                      <td className="py-2 pr-2 align-top whitespace-nowrap">
                        {formatAge(row.createdAt)}
                      </td>
                      <td className="space-x-1 py-2 align-top">
                        {row.flags
                          .filter((flag) => flag !== "same-chain")
                          .map((flag) => (
                            <Badge key={flag} variant="outline" className="capitalize">
                              {flag}
                            </Badge>
                          ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyNote text="No same-ticker copies in the search window." />
          )}
        </CardContent>
      </Card>

      <Accordion>
        <AccordionItem value="sources">
          <AccordionTrigger>Data sources</AccordionTrigger>
          <AccordionContent>
            <ul className="space-y-1 text-sm">
              {report.sources.map((source) => (
                <li key={source.id} className="flex justify-between gap-3">
                  <span>{source.id}</span>
                  <span className="text-muted-foreground">
                    {source.ok ? "ok" : source.error ?? "miss"}
                  </span>
                </li>
              ))}
            </ul>
            <Separator className="my-3" />
            <p className="text-xs text-muted-foreground">
              Scanned {new Date(report.scannedAt).toLocaleString()} · schema {report.schema}
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}
