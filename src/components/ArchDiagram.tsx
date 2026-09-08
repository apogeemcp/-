export function ArchDiagram({ variant }: { variant: "mcp" | "integrate" | "data" }) {
  if (variant === "mcp") {
    return (
      <ol className="arch">
        <li>AI application</li>
        <li>MCP client (Cursor, Claude, VS Code, custom)</li>
        <li>Apogee MCP server · POST /api/mcp</li>
        <li>Listed tools + 3000 catalog aliases</li>
        <li>RPC · DexScreener · Gecko · RHJ · pons factories</li>
        <li>Structured JSON result</li>
        <li>AI application</li>
      </ol>
    );
  }
  if (variant === "integrate") {
    return (
      <ol className="arch">
        <li>Your application</li>
        <li>Your agent / backend</li>
        <li>MCP client or REST /api/v1</li>
        <li>Apogee MCP</li>
        <li>Robinhood Chain 4663 + market providers</li>
      </ol>
    );
  }
  return (
    <ol className="arch">
      <li>Blockchain (EIP-155 4663)</li>
      <li>RPC / DexScreener / Gecko / RHJ / explorer</li>
      <li>Apogee dispatch + short in-memory caches</li>
      <li>MCP tools / REST / Orbit</li>
      <li>Applications and AI agents</li>
    </ol>
  );
}
