-- Unique payment signatures so one Solscan tx cannot unlock twice.
create unique index if not exists apogee_mcp_purchases_tx_signature_uq
  on public.apogee_mcp_purchases (tx_signature)
  where tx_signature is not null;
