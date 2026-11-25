# PayeeLock
An invoice-payment smart-contract prototype for the Aevum tUSD8 flow: immutable recipient, exact six-decimal amount, optional designated payer, expiry and terms hash.

Settlement transfers directly to the payee. The contract checks invoice identity, payer, expiry, cancellation and duplicate settlement. An address or terms match does not establish legal identity or delivery of goods.

## Verify locally
Node.js 24 recommended (minimum 22).
~~~sh
npm ci --ignore-scripts --no-audit --no-fund
npm test
node cli.mjs deploy
~~~
The CLI only emits unsigned transaction envelopes. It does not connect to RPC, create a wallet, request funds, sign or broadcast. Unit tests execute real compiled bytecode with a test-only token in an in-memory EVM, not genuine tUSD8 settlement.

Not deployed or submitted to a competition; no acceptance, prize or production payment is claimed. Configure and verify genuine chain/address/terms inputs independently before any deployment.

MIT licensed. The inherited copyright notice is preserved. Original implementation developed with AI assistance.

## Continuous integration
A reference GitHub Actions workflow is included at ci/github-actions.yml. To activate it in your own repository, place it under .github/workflows/. Its presence as a reference does not mean hosted CI is enabled or has passed.
