"use client";

import { useState } from "react";

export function TestConnection() {
  const [status, setStatus] = useState<"idle" | "run" | "ok" | "err">("idle");
  const [detail, setDetail] = useState("");

  async function run() {
    setStatus("run");
    setDetail("");
    try {
      const init = await fetch("/api/mcp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }),
      });
      if (init.status === 429) throw new Error("Rate limited (429). Wait and retry.");
      const initJson = await init.json();
      const protocol = initJson?.result?.protocolVersion;
      if (!protocol) throw new Error("initialize did not return protocolVersion");
      const list = await fetch("/api/mcp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
      });
      const listJson = await list.json();
      const n = listJson?.result?.tools?.length ?? 0;
      setStatus("ok");
      setDetail(`protocol ${protocol} · ${n} listed tools · auth none`);
    } catch (error) {
      setStatus("err");
      setDetail(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <div className="panel rounded-xl p-4">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn-gold" onClick={run} disabled={status === "run"}>
          {status === "run" ? "Testing…" : "Test connection"}
        </button>
        <p className="text-sm text-ivory/70">
          POSTs initialize and tools/list to this origin’s /api/mcp. No API key.
        </p>
      </div>
      {detail ? (
        <p className={`mt-3 font-mono text-xs ${status === "err" ? "text-flare" : "text-ivory/80"}`}>{detail}</p>
      ) : null}
    </div>
  );
}
