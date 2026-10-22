# Go live

This is the list of steps the owner does by hand to put the site on Cloudflare. The repository does not
create accounts, tokens or DNS records, and no step here can be done from the code.

## 1. Cloudflare account

Create a Cloudflare account, or use an existing one, and note its account id. The account id is shown in
the Cloudflare dashboard.

## 2. API token

Create an API token with permission to edit Workers on that account. Scope it to the account that holds
the Worker and nothing wider. The token is shown once, so store it at once.

## 3. Repository secrets

In the GitHub repository settings, add two repository secrets:

- `CLOUDFLARE_API_TOKEN`: the API token from step 2.
- `CLOUDFLARE_ACCOUNT_ID`: the account id from step 1.

Wrangler reads these two names from the environment, and the `deploy` script in `package.json` runs
`wrangler deploy`. No workflow in this repository reads these secrets yet. Releases deploy from the
release pull request, as described in [CONTRIBUTING.md](CONTRIBUTING.md).

## 4. Worker settings

The Worker is configured in `wrangler.jsonc`. Today it sets the exam size and length in `vars`:
`EXAM_QUESTIONS` (65) and `EXAM_MINUTES` (90). The following are optional and are not set today; the owner
adds them by hand if wanted:

- **Custom domain.** Add a `routes` entry to `wrangler.jsonc` with the hostname and `"custom_domain": true`.
  The domain must already be on the Cloudflare account.
- **`workers_dev`.** A boolean that turns the `workers.dev` address on or off.
- **`preview_urls`.** A boolean that turns preview URLs on or off.

## 5. Optional access control

To keep the site behind a login, the owner adds a Cloudflare Access application and policy in the
Cloudflare dashboard. Nothing in the repository configures Access.
